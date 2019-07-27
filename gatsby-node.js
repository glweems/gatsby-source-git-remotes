const Git = require('simple-git/promise');
const fastGlob = require('fast-glob');
const fs = require('fs');
const { createFileNode } = require('gatsby-source-filesystem/create-file-node');
const GitUrlParse = require('git-url-parse');
const Path = require('path');

async function isAlreadyCloned(remote, path) {
  const existingRemote = await Git(path).listRemote(['--get-url']);
  return existingRemote.trim() === remote.trim();
}

async function getTargetBranch(repo, branch) {
  if (typeof branch === 'string') {
    return `origin/${branch}`;
  }
  return repo.raw(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
}

async function getRepo(path, remote, branch) {
  // If the directory doesn't exist or is empty, clone. This will be the case if
  // our config has changed because Gatsby trashes the cache dir automatically
  // in that case.
  if (!fs.existsSync(path) || fs.readdirSync(path).length === 0) {
    const opts = ['--depth', '1'];
    if (typeof branch === 'string') {
      opts.push('--branch', branch);
    }
    await Git().clone(remote, path, opts);
    return Git(path);
  }
  if (await isAlreadyCloned(remote, path)) {
    const repo = await Git(path);
    const target = await getTargetBranch(repo, branch);
    // Refresh our shallow clone with the latest commit.
    await repo.fetch(['--depth', '1']).then(() => repo.reset(['--hard', target]));
    return repo;
  }
  throw new Error(`Can't clone to target destination: ${path}`);
}

/*
THE
EXPORTED
REPO
NODES
*/

exports.sourceNodes = async (
  {
    actions: { createNode }, store, createNodeId, createContentDigest, reporter,
  },
  { repos },
) => {
  const cloneRepo = async ({
    name, remote, branch, patterns,
  }) => {
    const programDir = store.getState().program.directory;
    const localPath = Path.join(programDir, '.cache', 'gatsby-source-git', name);
    const parsedRemote = GitUrlParse(remote);

    let repo;
    try {
      repo = await getRepo(localPath, remote, branch);
    } catch (e) {
      return reporter.error(e);
    }

    parsedRemote.git_suffix = false;
    parsedRemote.webLink = parsedRemote.toString('https');
    delete parsedRemote.git_suffix;
    const ref = await repo.raw(['rev-parse', '--abbrev-ref', 'HEAD']);
    parsedRemote.ref = ref.trim();

    const repoFiles = await fastGlob(patterns, {
      cwd: localPath,
      absolute: true,
    });

    const remoteId = createNodeId(`git-remote-${name}`);

    // Create a single graph node for this git remote.
    // Filenodes sourced from it will get a field pointing back to it.
    await createNode(
      Object.assign(parsedRemote, {
        id: remoteId,
        sourceInstanceName: name,
        parent: null,
        children: [],
        internal: {
          type: 'GitRemote',
          content: JSON.stringify(parsedRemote),
          contentDigest: createContentDigest(parsedRemote),
        },
      }),
    );

    const createAndProcessNode = path => createFileNode(path, createNodeId, {
      name,
      path: localPath,
    }).then(fileNode => createNode({ ...fileNode, gitRemote__NODE: remoteId }, {
      name: 'gatsby-source-filesystem',
    }));

    return repoFiles.map(createAndProcessNode);
  };

  return Promise.all(repos.map((repository) => {
    reporter.info(`Cloning ${repository.name}`);
    return cloneRepo(repository);
  }));
};
