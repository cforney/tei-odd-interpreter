// The package as a consumer gets it: pack it, install the tarball into an empty project,
// render a fixture with plain Node, and type-check a use of it under NodeNext without skipLibCheck.
//
//     npm run smoke
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = mkdtempSync(join(tmpdir(), 'tei-odd-interpreter-'))
const run = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })

try {
  const [{ filename }] = JSON.parse(run(`npm pack --json --pack-destination "${tmp}"`, root))
  const app = join(tmp, 'app')
  mkdirSync(app)
  writeFileSync(join(app, 'package.json'), '{"name":"app","private":true,"type":"module"}')
  run(`npm i --ignore-scripts --no-audit --no-fund "${join(tmp, filename)}"`, app)

  writeFileSync(join(app, 'render.mjs'), `
    import { readFileSync } from 'node:fs'
    import { createProcessor, parse, readOdd, renderTei } from 'tei-odd-interpreter'
    const [odd, doc] = process.argv.slice(2).map((f) => readFileSync(f, 'utf8'))
    const r = renderTei(parse(doc), createProcessor(readOdd(odd)))
    console.log(JSON.stringify({ html: r.html, warnings: r.warnings.length }))`)
  const fixtures = join(root, 'test', 'fixtures')
  const out = JSON.parse(run(`node render.mjs "${join(fixtures, 'pm.odd')}" "${join(fixtures, 'tei', 'structure.xml')}"`, app))
  assert.equal(out.warnings, 0)
  assert.ok(out.html.startsWith(readFileSync(join(fixtures, 'structure.html'), 'utf8').slice(0, 200)))

  writeFileSync(join(app, 'use.ts'), `import { readOdd, type Finding, type RenderResult } from 'tei-odd-interpreter'
export const f: Finding[] = readOdd('').findings
export const t = (r: RenderResult) => r.hast.children.length + (r.notes[0]?.html.length ?? 0)\n`)
  writeFileSync(join(app, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, types: [],
  }, files: ['use.ts'] }))
  run(`node "${join(root, 'node_modules', 'typescript', 'bin', 'tsc')}" -p .`, app)
  console.log(`${filename}: installs, renders and type-checks`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
