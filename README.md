# tei-odd-interpreter

Reads a TEI ODD and renders TEI documents by its Processing Model, in Node or a
bundler, without generating code. It knows no TEI element by name: the ODD says how
everything renders, and what the ODD gets wrong is reported instead of stopping the run.

```sh
npm add https://github.com/cforney/tei-odd-interpreter/releases/download/v0.3.0/tei-odd-interpreter-0.3.0.tgz
```

Until 1.0 the package is released on GitHub, not on npm: install a release by its tarball's URL,
which works with `npm`, `npm ci` and `pnpm`, needs no build, and pins the version, as any 0.x
release may break. See [the releases](https://github.com/cforney/tei-odd-interpreter/releases) and
[CHANGELOG.md](CHANGELOG.md). Node 20 or later, or any bundler.

```ts
import { readFileSync } from 'node:fs'
import { createProcessor, parse, readOdd, renderTei } from 'tei-odd-interpreter'

const odd = readOdd(readFileSync('my.odd', 'utf8'))
const processor = createProcessor(odd) // once per build

const result = renderTei(parse(readFileSync('doc.xml', 'utf8')), processor)
result.html // the page; odd.css styles it
```

An ODD is read from its first `schemaSpec`, through the `specGrp`s it refers to in the same
file. A chain to another ODD (`schemaSpec/@source`) is not followed and is reported: flatten
such an ODD first, with `odd2odd` from the TEI Stylesheets.

Names go by namespace, in the ODD and in the documents, however they are prefixed. A spec is for
TEI's element of its `@ident`, or with `elementSpec/@ns` for that namespace's. An element of another
namespace, such as SVG's `title`, takes no TEI model; it is listed in `unmapped` as
`Q{uri}local`, and so named for `findFirst` and `findAll`. An element in no namespace counts as
TEI's, so a document without `xmlns` still renders. An `egXML` is in TEI's Examples namespace, so
no spec is read from it.

## API

| Function | Returns |
| --- | --- |
| `readOdd(xml, { tokensCss?, behaviours?, ignoredOutputs?, checkedValueLists? })` | The ODD as an `Odd`: its models, `css`, `views`, `availability`, `findings` |
| `createProcessor(odd)` | The processor for one ODD |
| `parse(xml)` | TEI as xast, each element with its `position` (line and column); throws on XML that is not well-formed |
| `renderTei(tree, processor, decisions?)` | One document as a `RenderResult` |
| `coverage(odd)` | After rendering: the models that never fired, the elements without one |
| `idFindings(tree)` | Ids used twice, and ids that are no NCName |
| `toHtml(hast)` | hast as HTML, for a tree you changed |

`RenderResult` holds:

| Field | Holds |
| --- | --- |
| `html`, `hast` | The page, as a string and as a tree to map to your own components; an element of the tree has the `position` of the source element it renders, to link back to the source |
| `text` | The `plain` output, for any search index |
| `notes` | In document order: `place`, `number` and `id` where numbered, `label` where the model gives one, `html`, `hast` |
| `page` | The params of the root element's `page` model, each as strings |
| `warnings` | Findings about this document |
| `unmapped` | Elements the ODD has no model for; they render as `span.tei-<name>.tei-unmapped` |
| `decisions` | Per element the model that won, with its classes and params, when asked for |

`tokensCss` is the stylesheet that defines the custom properties your ODD's CSS reads. It
is only used to check them, and is not added to `odd.css`. A value outside its `valList` is a
warning where the list is `closed`; `checkedValueLists: ['closed', 'semi']` also reports the
values a `semi` list does not suggest.

## Findings

`odd.findings`, `result.warnings`, `coverage(odd)` and `idFindings(tree)` all return
`{ code, severity, args, message, lines? }`. `severity` is `error` (a rule is lost), `warning` (the
result may not be what the ODD means) or `info` (it works, but may need a look). `message` is
in English; to report in another language, format `code` and `args`. `result.warnings` holds
each finding once, with its `count` where it repeats, as a `rendition` the ODD does not declare
does on every element that names it. `lines` are where it occurs, one per occurrence: in the
document, or for `odd.findings` in the ODD, so a report can link each to its source line. An expression that
cannot be evaluated counts as empty, and a behaviour that is not known, or missing, renders as
`inline`, so one flaw costs one rule, not the document. Only XML that is not well-formed throws.

## Behaviours

`alternate`, `anchor`, `block`, `body`, `break`, `cell`, `cit`, `document`, `figDesc`,
`figure`, `glyph`, `graphic`, `heading`, `index`, `inline`, `link`, `list`, `listItem`,
`metadata`, `note`, `omit`, `paragraph`, `row`, `section`, `table`, `text`, `title`.

`index` renders nothing; the list TEI describes is yours to generate, as in
the example under [Beyond the Processing Model](#beyond-the-processing-model). `list` gives `ol`
where its `type` param is `ordered`, else `ul`, and puts what comes before the first item, such
as a head, before the list. `cell` gives `th` where its `heading` param is true, with `cols` and
`rows` as `colspan` and `rowspan`. A `break` of `type` `line` puts its `label` at the start of the
new line, as a line number, unless the model joins the lines (`join`): then the label ends the line,
as the print's hyphen. `note` collects
its body, `place` and `label` into `result.notes` and leaves a numbered marker in the text, unless the
model's `marker` param is false, as for a note placed elsewhere on the page; a `label`, such as the
print's `(a)`, marks it instead of the number. `graphic` gives an `img`: `title` is its text
alternative, `width` and `height` are CSS lengths, `scale` zooms it. `glyph` renders the element its
`uri` points to (`#id`, in the same document), by that element's own models, so the ODD says how a
`char` or `glyph` shows; without a `uri`, its content. `anchor` takes its `id` param, else its `xml:id`.
`figure` puts its `title`, where it selects anything, after the content as the caption.

A project adds behaviours, or replaces one. One that only wraps needs a `tag`, any other a
`render`, which is given the element's params, its `content` and the rest of
`BehaviourContext`. `flow` decides how whitespace and line breaks around it are treated; where
the nearest `xml:space` is `preserve`, whitespace is kept as encoded.

```ts
import { h, readOdd } from 'tei-odd-interpreter'

const odd = readOdd(xml, { behaviours: {
  verse: { tag: 'blockquote', flow: 'block' },
  stamp: { flow: 'block', params: ['by'], render: (c) => h('aside', c.props, c.content('aside')) },
} })
```

## Params and the XPath subset

Besides what a behaviour reads, a param named `--…` becomes a CSS custom property of the
rendered element, and one named `data-…` its attribute. `content` replaces the element's
content. A param that selects nothing has no value: a `break` whose `label` is `@n` on a line
without one is a plain break, while a `label` of `''` gives an empty element.

Predicates and params use a subset of XPath:

- **Paths:** `.`, `..`, `@name`, `name`, `*`, `node()`, `text()`, `/`, `//`, absolute paths,
  `[predicate]`, and a function call as a step or a path's start (`root(.)//title`,
  `id('a')/@n`, `.//p/local-name()`). An unprefixed name is TEI's; a prefix means what the ODD
  binds it to where the expression stands (`xmlns:f="…"` on the `elementSpec`, say), and one it
  does not bind is ignored.
- **Axes:** `self`, `child`, `parent`, `ancestor`, `ancestor-or-self`, `descendant`,
  `descendant-or-self`, `preceding-sibling`, `following-sibling`, `preceding`, `following`.
- **Operators:** `or`, `and`, `=`, `!=`, `<`, `<=`, `>`, `>=`, `eq`, `ne`, `lt`, `le`, `gt`,
  `ge`, `||`, `+`, `-`, `mod`, `|` (or `union`), `except`, `if (…) then … else …`, sequences
  `(a, b)`. A union or `except` gives its nodes once each, in document order.
- **Functions:** `position`, `last`, `exists`, `empty`, `local-name`, `string-length`,
  `ends-with`, `matches`, `replace`, `not`, `count`, `concat`, `contains`, `contains-token`,
  `starts-with`, `normalize-space`, `translate`, `string`, `true`, `false`, `head`, `root`,
  `id`, `tokenize`, `substring-after`, `distinct-values`, `string-join`, `subsequence`, `max`.

Variables (`$parameters`), `let`, `for`, `!` and maps are outside it: such an expression counts as
empty and is reported.

## Beyond the Processing Model

TEI's Processing Model does not cover everything an edition needs. These are this package's own
conventions; an ODD that does not use them renders as TEI describes.

| Convention | Meaning |
| --- | --- |
| `page` output | Params of the root element's `page` model describe the page: `result.page`, each as strings. |
| `join` param of a `break` | The line joins the next: the spaces around it go, and a last character of the text that the param names, such as a hyphen |
| `marker` param of a `note` | False: the note is collected without a marker in the text |
| `place` param of a `note` | Where the note belongs, passed on to `result.notes` |
| `range` param of a `note` | The element its commented range starts at; the text between becomes `.note-range` |
| `data-region` param | `start` and `end` bracket a region: what stands between moves into the start |
| `--…` and `data-…` params | A CSS custom property and an attribute of the rendered element |

**A title without a `page` model:** take it from the parsed tree.

```ts
import { findFirst, parse, plainText } from 'tei-odd-interpreter'

const tree = parse(xml)
const title = plainText(findFirst(findFirst(tree, 'titleStmt'), 'title'))
```

**A table of contents:** the headings of `result.hast`, each given an id to link to.

```ts
import type { Root, RootContent } from 'hast'
import { plainText, toHtml } from 'tei-odd-interpreter'

const contents: { id: string; level: number; text: string }[] = []
const walk = (node: Root | RootContent) => {
  if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
    node.properties.id ??= `h-${contents.length + 1}`
    contents.push({ id: String(node.properties.id), level: Number(node.tagName[1]), text: plainText(node) })
  }
  if ('children' in node) node.children.forEach(walk)
}
walk(result.hast)
const html = toHtml(result.hast) // the page, its headings with their ids
```

## Outputs

Models with `@output` belong to the outputs it lists, and take precedence over the base models
there.

| Output | Meaning |
| --- | --- |
| `web` | The page itself, the same as no `@output` |
| `plain` | Rendered on its own: `result.text` |
| `page` | Not rendered. The root element's params describe the page: `result.page` |
| `print`, `latex`, `fo`, `epub`, `markdown` | Other media: their models are not read. `ignoredOutputs` changes the list |
| any other | A **view** over the page, listed in `odd.views`: its label is the model's first `<desc>`, its explanation the second |

A view renders in the same HTML and is switched by CSS: set `data-<output>="on"` on an
ancestor, or check an element with the id `view-<output>`. No script is needed.

## The HTML

You can rely on these, and they follow semantic versioning:

| Class or attribute | Marks |
| --- | --- |
| `.tei-<element>` | On every element rendered, by its local name |
| `.r-<id>`, `style` | A `@rendition` (`#id`, or a prefix the ODD's `prefixDef` resolves) and the source's `@style`, where the model has `@useSourceRendition="true"` |
| `id`, `lang` | From `xml:id` and `xml:lang`, the only attributes passed on without a param |
| `.<ident>-group`, `@cssClass` | A `modelGrp` beyond an element's only entry, and a styled model among several |
| `.pm-block` | A block set inside phrasing content, rendered as a span |
| `.pm-alt`, `.<output>-default`, `.<output>-alternate` | The readings of an `alternate`; `pm` stands for the page |
| `.<output>-omit` | An element a view leaves out |
| `a.note-marker` | A note's marker, with `id="ref-note-<n>"`, `href="#note-<n>"`, `role="doc-noteref"`, `data-note` and, for a range, `data-range` |
| `.note-range` | The text of a commented range, with the `data-note` of its note |
| `data-region` | A param with `start` and `end`: what stands between moves into the start |

## In a site (Astro, SvelteKit)

Render at build time or on the server. Read the ODD and create the processor once, then
render each document with it.

```ts
// src/lib/edition.ts
import { readFileSync } from 'node:fs'
import { createProcessor, parse, readOdd, renderTei } from 'tei-odd-interpreter'

// The ODD and the documents in `edition/`, beside `package.json`: the build runs there.
const read = (path: string) => readFileSync(`edition/${path}`, 'utf8')
export const odd = readOdd(read('my.odd'))
const processor = createProcessor(odd)
export const render = (name: string) => renderTei(parse(read(`${name}.xml`)), processor)
```

**Astro**: `src/pages/[doc].astro`

```astro
---
import { odd, render } from '../lib/edition'
export const getStaticPaths = () => ['first', 'second'].map((doc) => ({ params: { doc } }))
const { html, page } = render(Astro.params.doc)
---
<Fragment set:html={`<style>${odd.css}</style>`} />
<h1>{page.title?.[0]}</h1>
<div set:html={html} />
```

**SvelteKit**: `src/routes/[doc]/+page.server.ts` and `+page.svelte`

```ts
import { odd, render } from '../../lib/edition'
import type { EntryGenerator, PageServerLoad } from './$types'

export const prerender = true
export const entries: EntryGenerator = () => [{ doc: 'first' }, { doc: 'second' }]
export const load: PageServerLoad = ({ params }) => {
  const { html, page } = render(params.doc)
  return { html, title: page.title?.[0], css: odd.css }
}
```

```svelte
<script>
  let { data } = $props()
</script>
<svelte:head>{@html `<style>${data.css}</style>`}</svelte:head>
<h1>{data.title}</h1>
<div>{@html data.html}</div>
```

## Contributing and licence

How to test, develop against a consumer and release: [CONTRIBUTING.md](CONTRIBUTING.md).
BSD-2-Clause, see [LICENSE](LICENSE).
