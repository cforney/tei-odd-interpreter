# Changelog

Each version's section becomes the notes of its GitHub release. 0.x may break with any minor version.

## Unreleased

The params TEI defines for four behaviours, which were reported as not read:

- `graphic`: `title` is the image's `alt`, `width` and `height` its CSS size, `scale` its zoom.
- `glyph`: `uri` (`#id`) renders the element it points to, by that element's own models; a reference
  that leads nowhere is the new warning `reference-unresolved`.
- `note`: `label` marks the note instead of its number, and is passed on as `notes[].label`.
- `anchor`: `id`, else the `xml:id` as before.

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
