## Dependabot alerts

Dependabot creates pull requests to keep your dependencies secure and up-to-date. Ours can be found here:

https://github.com/TeamCodeStream/codestream/network/alerts

https://github.com/TeamCodeStream/codestream-server/network/alerts

These issues can be addressed in a few ways:

- By accepting the pull request as is
- By manually addressing issues with `npm`

### Accepting the pull request as is test

- decide if you can use the PR as is, if so continue (if not see `Manually addressing issues` below, or the `Notes` area below)
- choose the `Rebase & Merge` option (it should be pre-selected)
- watch the various internal builds for any errors related to the app that was just changed

### Manually addressing issues

Alternatively, instead of accepting pull requests from the dependabot directly, these security concerns can be addressed by running `npm audit` in the directory of the node app that has a security warning.

Many times these issues can be automatically fixed with `npm audit fix`, npm will tell you. In other cases npm will give you a specific command to run like `npm update foobar-webpack-plugin --depth 2` to address a nested dependency.

After these fixes have been applied to the base branch, the dependabot's PR should automatically close, requiring no user intervention.

### Resolving conflicts

If a dependabot cannot be automatically applied, there's usually conflicts that must be resolved. You can checkout the branch it has created and rebase `develop`

```
git checkout develop
git pull
git checkout dependabot/the-name-of-the-branch-it-created
git rebase develop
# address any conflicts
git push --force-with-lease
```

Continue on and decide if you want to auto accept the PR or deal with it manually.

You can check on the dependency chain with `npm ls <packageName>`.

If for some reason you cannot update a nested dependency, you can try uninstalling and then installing it again.

### Notes

Any dependabot pull requests that change the `package-lock.json` file are _usually_ low risk\*

\* use your best judgment here, minor or patch changes should be fully backward compatible, though changes in the minor might suggest either slightly more burn-in time and/or ensuring the test-suites run OK.

Changes that alter the `package.json` file itself and target _major_ revisions must take extra care when deciding to pick -- often these should probably be done manually as there could be app code and/or api breakages and/or runtime issues.
