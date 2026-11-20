# Conformance fixtures

One ODD, eight TEI cases, an ODD that should be refused, and what this package makes of
them. `npm test` checks each case against `<case>.html` (the page, below it the notes it
collects for the apparatus, and what had no model) and `<case>.txt` (the ODD's `plain`
output, which is what a search would index), and each ODD against `<odd>.findings.txt`.
`UPDATE_FIXTURES=1 npm test` rewrites the expected files, so an intended change is reviewed
as a diff.

## Where they come from

`pm.odd`, `invalid.odd` and `tei/*.xml` are the conformance suite of
[odd-rendering-compiler](https://github.com/cforney/odd-rendering-compiler)
(`compiler-js/test/fixtures/`, BSD-2-Clause; see its `docs/conformance-suite.md`), which
compiles the same kind of ODD into XSLT, unified handlers and CETEIcean behaviours. They
cover the Processing Model one feature at a time, not one edition.

| Case | What it covers |
| --- | --- |
| `structure` | a spec's only model; a model group with an inherited source rendition; `@cssClass`; document order (the first model wins, the next predicate is never asked); a `modelSequence` with the id on its first part; a block inside phrasing content |
| `outputs` | `@output`: an output's models take precedence there, a view laid over the page (`omit`, added classes, the readings of an `alternate`), and a model marked `web` |
| `params` | params as CSS custom properties and as attributes; node-valued params, including one that selects the element itself; predicates with positions, value comparisons and conditionals; breaks, labels, and the hyphen at a joined line end; `link` and `graphic` |
| `notes` | notes numbered in document order, the outer before the inner; a note in the margin; a range closed by `@targetEnd`; a note's `xml:id` on its marker, or on its body |
| `groups` | a group's first member that holds wins; a model after the group; a group's `@output`; a sequence in a group |
| `namespaces` | a prefixed TEI source renders as an unprefixed one; a same-named element of another namespace is distinct; `elementSpec/@ns`; prefixes in a predicate |
| `whitespace` | the nearest `xml:space` decides, through alternating `preserve` and `default` |
| `behaviours` | `figure`; TEI Publisher's `pass-through` and `<pb:template>`; engine prefixes on `@output` |
| `invalid.odd` | no `@behaviour`, `@ident` or param `@name`; an empty `modelSequence`; a base ODD not found |

**Kept up to date by hand.** The files are a copy, not a submodule; refresh them from that
repository when its suite grows, re-apply the changes below, and compare again.

## What was changed, and why

`pm.odd` is verbatim apart from two additions, each a difference in what the two
implementations accept:

* **`elementSpec`s for `TEI`, `text`, `body`, `sic` and `corr`**, with the behaviour `text`.
  An element with no model passes its content through in the compiler; here it is reported
  and rendered as a span, so these pass theirs through by a model.
* **`@cssClass` on the second `head` model.** A styled model among others must name its class
  here, where the compiler falls back to a positional one (`head-2`, the name used here).

## Where the two renderings differ

The expected files are this package's. Its conventions differ from the compiler's in
classes, in the source's attributes (mirrored here as `data-*`), and around the text (the
compiler's `tei-edition` wrapper and view switches, which are left to the consumer here).
Those are names, not meaning, so the compiler's runner compares at the structure level,
tags and text without attributes:

```sh
node ../odd-rendering-compiler/compiler-js/conformance.mjs --level structure \
  --suite ../odd-rendering-compiler/compiler-js/test/fixtures \
  --run 'node --import tsx scripts/render-case.ts test/fixtures/pm.odd "{tei}" {output} > "{out}/{case}.html"'
```

`structure`, `outputs`, `params`, `groups` and `whitespace` agree. The `plain` output renders
as text here, not HTML, so it is not compared. What differs is a difference in meaning:

| Case | This package | The compiler |
| --- | --- | --- |
| `notes` | collected into `result.notes`, placed by the consumer; a margin note numbered, with a marker unless its `marker` param is false; a commented range wrapped in a span | a `tei-footnotes` section in the page; a note elsewhere than foot or end without number or marker; the range left as text |
| `namespaces` | an element with no model is a span, and reported | its content passes through |
| `behaviours` | `pb:template` is not read, `pass-through` is unknown (both in `pm.findings.txt`) | both rendered as TEI Publisher does |
| `groups` | a reached `modelGrp` decides: where none of its members holds, nothing does, and `ab` is unmapped | a model after the group is the fallback |

The last agrees at the structure level only because an unmapped element is a span here too:
its classes, and `pm.findings.txt` (`ab-3` never reached), show the difference.
