/**
 * One TEI document rendered with one ODD, the page's HTML to stdout: the command the compiler's
 * conformance runner calls (see test/fixtures/README.md). Only `web`: `plain` renders here as text.
 *
 *     node --import tsx scripts/render-case.ts <odd> <tei> [output]
 */

import { readFileSync } from 'node:fs'

import { createProcessor, parse, readOdd, renderTei } from '../src/index.ts'

const [odd, tei, output = 'web'] = process.argv.slice(2)
if (output !== 'web') {
  console.error(`only web renders as HTML here, not ${output}`)
  process.exit(1)
}
const processor = createProcessor(readOdd(readFileSync(odd, 'utf8'), { ignoredOutputs: [] }))
process.stdout.write(renderTei(parse(readFileSync(tei, 'utf8')), processor).html)
