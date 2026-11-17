# Contributing

```sh
npm ci
npm test           # the conformance fixtures, reading the ODD, regions
npm run check      # types, sources and tests
npm run smoke      # pack, install the tarball into an empty project, render, type-check
```

- **The code knows no TEI element by name.** What an element becomes is the ODD's to say; the
  package supplies behaviours, the XPath subset and findings.
- **A flaw is a finding, not an exception.** Only XML that is not well-formed throws.
- **The sources name the file they import** (`./odd/odd.ts`): they run as they are under a
  TypeScript loader, and `npm run build` rewrites the imports to `.js` in `dist/`.
- **The fixtures** in `test/fixtures/` pin the HTML. After an intended change,
  `UPDATE_FIXTURES=1 npm test` rewrites them; review the diff. Where they come from is in
  [test/fixtures/README.md](test/fixtures/README.md).
- **Consumers compare before and after.** A change in the HTML is a change for every edition built
  with the package: say so in `CHANGELOG.md`.

## Developing against a consumer

Link the working copy instead of the released tarball, and rebuild after each change:

```sh
npm run build
cd ../my-edition && npm link ../tei-odd-interpreter    # undo: npm install
```

## Releasing

1. Add the version's section to `CHANGELOG.md` (`## 0.2.0`) and set `version` in `package.json`
   (`npm version 0.2.0 --no-git-tag-version`); commit.
2. Tag and push: `git tag v0.2.0 && git push origin main v0.2.0`.
3. `release.yml` runs the tests on every Node version, checks that the tag matches `package.json`,
   packs, and creates the GitHub release with the tarball and the changelog section as notes.

Consumers install the release by its URL, and update by changing it:

```sh
npm add https://github.com/cforney/tei-odd-interpreter/releases/download/v0.2.0/tei-odd-interpreter-0.2.0.tgz
```
