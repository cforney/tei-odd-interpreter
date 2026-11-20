/**
 * Conformance fixtures: each `fixtures/tei/<case>.xml`, rendered with
 * `fixtures/pm.odd`, must give `fixtures/<case>.html` — the page and the notes it
 * collects for the apparatus — and `fixtures/<case>.txt`, the ODD's `plain`
 * output, which is what a search would index.
 *
 *     npm test -- test/fixtures.test.ts
 *     UPDATE_FIXTURES=1 npm test -- test/fixtures.test.ts
 *
 * The second form rewrites the expected files: run it after an intended change
 * and read the diff. The ODD and the TEI cases come from the compiler's own
 * suite; see `fixtures/README.md` for what they cover and where the two
 * renderings differ.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { createProcessor, parse, readOdd, renderTei, type RenderResult } from '../src/index.ts'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const read = (odd: string) => readOdd(readFileSync(join(dir, odd), 'utf8'), { ignoredOutputs: [] })
const processor = createProcessor(read('pm.odd'))

/** The page, and below it every note body, as the apparatus would hold it, and what had no model. */
const page = (r: RenderResult) =>
  [
    r.html,
    ...r.notes.map((n) => `<!-- note ${n.number ?? '–'}, place ${n.place} -->\n${n.html}`),
    ...(r.unmapped.length ? [`<!-- unmapped: ${r.unmapped.join(', ')} -->`] : []),
  ].join('\n')

/** The expected file, written first where the run is an update. */
function expected(name: string, actual: string): string {
  const file = join(dir, name)
  if (process.env.UPDATE_FIXTURES) writeFileSync(file, actual, 'utf8')
  return readFileSync(file, 'utf8')
}

for (const file of readdirSync(join(dir, 'tei'))) {
  const name = basename(file, '.xml')
  test(name, () => {
    const result = renderTei(parse(readFileSync(join(dir, 'tei', file), 'utf8')), processor)
    assert.deepEqual(result.warnings, [])
    assert.equal(page(result) + '\n', expected(`${name}.html`, page(result) + '\n'))
    assert.equal(result.text + '\n', expected(`${name}.txt`, result.text + '\n'))
  })
}

// What each ODD costs: for `invalid.odd` every problem in it, once; for `pm.odd` what it asks beyond this package.
for (const odd of ['pm.odd', 'invalid.odd']) {
  test(odd, () => {
    const findings = read(odd).findings.map((f) => `${f.code}: ${f.message}`).join('\n') + '\n'
    assert.equal(findings, expected(`${basename(odd, '.odd')}.findings.txt`, findings))
  })
}
