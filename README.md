# gatsby-source-git-remotes

Source plugin for pulling files into the Gatsby graph from abitrary Git repositories (hosted anywhere). This is useful if the markdown files you wish to render can't live within your gatsby codebase, or if need to aggregate content from disparate repositories.

It clones the repo(s) you configure (a shallow clone, into your cache folder if
you're interested), and then sucks the files into the graph as `File` nodes, as
if you'd configured
[`gatsby-source-filesystem`](https://www.gatsbyjs.org/packages/gatsby-source-filesystem/)
on that directory. As such, all the tranformer plugins that operate on files
should work exactly as they do with `gatsby-source-filesystem` eg with
`gatsby-transformer-remark`, `gatsby-transformer-json` etc.

The only difference is that the `File` nodes created by this plugin will
also have a `gitRemote` field, which will provide you with various bits of
Git related information. The fields on the `gitRemote` node are
mostly provided by
[IonicaBazau/git-url-parse](https://github.com/IonicaBizau/git-url-parse), with
the addition of `ref` and `weblink` fields, which are
the 2 main things you probably want if you're constructing "edit on github"
style links.

## Requirements

Requires [git](http://git-scm.com/downloads) to be installed, and to be callable using the command `git`.

Ideally we'd use [nodegit](https://github.com/nodegit/nodegit), but it doesn't support shallow clones (see [libgit2/libgit2#3058](https://github.com/libgit2/libgit2/issues/3058)) which would have a significant effect on build times if you wanted to read files from git repositories with large histories.

Only public repositories are supported right now. But a PR should be simple enough if you want that.

## Install

Not published on npm yet, so for now:

`npm install --save gatsby-source-git-remotes`

or

`yarn add gatsby-source-git-remotes`
## How to use

```javascript
// In your gatsby-config.js
module.exports = {
  plugins: [
   {
      resolve: `gatsby-source-git`,
      options: {
        repos: [
          {
            name: `react-peekaboo-navbar`,
            remote: `https://github.com/gwtuts/react-peekaboo-navbar.git`,
            patterns: [`*.jpg`],
          },
          {
            name: `react-navbar-scroller`,
            remote: `https://github.com/gwtuts/react-navbar-scroller.git`,
            patterns: [`*.jpg`],
          },
          {
            name: `gatsby-darkmode`,
            remote: `https://github.com/gwtuts/gatsby-darkmode.git`,
            patterns: [`*.jpg`],
          },
          {
            name: `styled-container`,
            remote: `https://github.com/gwtuts/styled-container.git`,
            patterns: [`*.md`],
          },
        ],
      },
    },
  ]
};
```

## How to query

You can query file nodes exactly as you would node query for nodes created with
[`gatsby-source-filesystem`](https://www.gatsbyjs.org/packages/gatsby-source-filesystem/),
eg:

```graphql
{
  allFile {
    edges {
      node {
        extension
        dir
        modifiedTime
      }
    }
  }
}
```

Similarly, you can filter by the `name` you specified in the config by using
`sourceInstanceName`:

```graphql
{
  allFile(filter: { sourceInstanceName: { eq: "repo-one" } }) {
    edges {
      node {
        extension
        dir
        modifiedTime
      }
    }
  }
}
```

And access some information about the git repo:

```graphql
{
  allFile {
    edges {
      node {
        gitRemote {
          webLink
          ref
        }
      }
    }
  }
}
```
