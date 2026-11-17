# Changelog

Each version's section becomes the notes of its GitHub release. 0.x may break with any minor version.

## 0.1.0

The first release:

- `readOdd`, `createProcessor`, `renderTei`: an ODD's Processing Model applied to TEI, returning
  HTML, `hast`, the `plain` text, the collected notes and the `page` params.
- Findings as data (`code`, `severity`, `args`, an English `message`) instead of exceptions:
  one flaw in the ODD costs one rule.
- 27 behaviours, extensible and replaceable per project; an XPath subset for predicates and params.
- Views over the page from custom `@output`s, switched by CSS.
- Tested on Node 20 to 26, in Vite SSR, Astro and SvelteKit, and in the browser; renders TEI Simple
  Print straight from the TEI release.
