# Changelog

Each version's section becomes the notes of its GitHub release. 0.x may break with any minor version.

## Unreleased

Source positions: `parse` gives each element its `position` (line and column, as unist has it), and
an element of `result.hast` the position of the source element it renders, so a page can link back to
the source line. The HTML is unchanged.

## 0.2.0

The params TEI defines for four behaviours, which were reported as not read:

- `graphic`: `title` is the image's `alt`, `width` and `height` its CSS size, `scale` its zoom.
- `glyph`: `uri` (`#id`) renders the element it points to, by that element's own models; a reference
  that leads nowhere is the new warning `reference-unresolved`.
- `note`: `label` marks the note instead of its number, and is passed on as `notes[].label`.
- `anchor`: `id`, else the `xml:id` as before.

The XPath subset grows:

- Functions `head`, `root`, `id`, `tokenize`, `substring-after`, `distinct-values`, `string-join`,
  `subsequence`, `max`.
- Operators `|` (`union`) and `except`, which give nodes once each in document order, and `||`.
- A function call as a step or at a path's start: `root(.)//title`, `id('a')/@n`.

Names by namespace, not by prefix:

- An element of another namespace with a TEI name, such as SVG's `title`, no longer takes TEI's
  model: it is unmapped, and named `Q{uri}local` in `unmapped`, `findFirst` and `findAll`.
- `elementSpec/@ns` gives a spec to that namespace's element; the class stays `tei-<ident>`.
- A prefix in a predicate or param means what the ODD binds it to; an unbound one is ignored, as
  before. A prefixed TEI source or ODD reads as an unprefixed one.
- `egXML` is recognised by TEI's Examples namespace, not by its name.

The nearest `xml:space` decides, as XML says: `default` inside `preserve` collapses whitespace again.

The conformance fixtures follow the compiler's suite again, now with `behaviours`, `groups`,
`namespaces`, `whitespace` and `invalid.odd`; where the two differ is measured, not listed:

- `figure` puts its caption after the content, and none where `title` selects nothing.
- An `elementSpec` without `@ident`, a `param` without `@name` and an empty `modelSequence` are the
  new findings `ident-missing`, `param-name-missing` and `sequence-empty`; the first two threw.

`result.warnings` holds each finding once, with its new `count` where it repeats: an undeclared
`rendition` named on every page was one warning per element.

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
