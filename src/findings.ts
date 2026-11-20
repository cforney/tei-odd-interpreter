/**
 * What the package reports: a code to act on, how much it matters, the values it is
 * about, and a message in English. A consumer that reports in another language formats
 * `code` and `args`.
 *
 * An `error` loses a rule of the ODD or a guarantee of the output; a `warning` gives a
 * result that may not be what was meant; an `info` works, and may deserve a look.
 */

export type Severity = 'error' | 'warning' | 'info'

type Args = Record<string, string>

const MESSAGES = {
  // The ODD itself.
  'predicate-unreadable': ['error', (a) => `Model ${a.model}: predicate cannot be evaluated, counts as empty — ${a.error}`],
  'param-unreadable': ['error', (a) => `Model ${a.model}: param "${a.param}" cannot be evaluated, counts as empty — ${a.error}`],
  'param-unread': ['warning', (a) => `Model ${a.model}: "${a.behaviour}" does not read the param "${a.param}"`],
  'behaviour-unknown': ['warning', (a) => `Model ${a.model}: unknown behaviour "${a.behaviour}", renders as inline`],
  'behaviour-missing': ['warning', (a) => `Model ${a.model}: no @behaviour, renders as inline`],
  'sequence-empty': ['warning', (a) => `Model ${a.model}: an empty modelSequence renders nothing`],
  'param-name-missing': ['error', (a) => `Model ${a.model}: a param without @name is skipped`],
  'ident-missing': ['error', () => 'An elementSpec without @ident is skipped'],
  'css-class-missing': ['info', (a) => `Model ${a.model}: a styled model among several has no @cssClass, styled as .${a.model}`],
  'model-unreachable': ['warning', (a) => `Model ${a.model}: never reached, ${a.by} already decides`],
  'model-unreachable-group': ['warning', (a) => `Model ${a.model}: never reached, the group from ${a.by} already decides`],
  'css-property-undefined': ['warning', (a) => `CSS: ${a.property} is not defined anywhere`],
  'chain-not-followed': ['error', (a) => `schemaSpec "${a.ident}": @source "${a.source}" is not followed, the ODD must be flattened first`],
  'schema-spec-ignored': ['warning', (a) => `schemaSpec "${a.ident}" is ignored: only the first one is read`],
  'spec-group-not-found': ['error', (a) => `specGrpRef "${a.target}" leads to no specGrp in this file`],
  'no-models': ['error', () => 'The ODD has no models at all'],
  // The ODD against what was rendered.
  'element-absent': ['info', (a) => `<${a.element}>: not in the corpus, ${a.count} model(s) unused`],
  'model-unused': ['info', (a) => `Model ${a.model}: never fires`],
  'element-no-match': ['warning', (a) => `<${a.element}>: has models, none applies`],
  'element-no-model': ['warning', (a) => `<${a.element}>: no model in the ODD`],
  // A document.
  'value-not-listed': ['warning', (a) => `Value not in the ODD's list: ${a.element}/@${a.attribute}="${a.value}"`],
  'rendition-undeclared': ['warning', (a) => `Rendition not declared in the ODD: #${a.rendition}`],
  'range-no-start': ['warning', (a) => `Commented range without a start: ${a.ids}`],
  'reference-unresolved': ['warning', (a) => `Reference that leads to no element in the document: ${a.uri}`],
  'anchor-unused': ['info', (a) => `Anchor no note points to: ${a.ids}`],
  'region-unpaired': ['warning', (a) => `Region marker without a partner (${a.count}×)`],
  'id-twice': ['error', (a) => `xml:id used twice, links land in the wrong place: ${a.id}`],
  'id-invalid': ['error', (a) => `xml:id is no NCName, XML tools refuse the file: ${a.id}`],
} satisfies Record<string, [Severity, (args: Args) => string]>

export type FindingCode = keyof typeof MESSAGES

export interface Finding {
  code: FindingCode
  severity: Severity
  args: Args
  message: string
  /** How often it occurs, where more than once. */
  count?: number
  /** The source lines it occurs at, in the TEI or the ODD, where known: one per occurrence. */
  lines?: number[]
}

/** `at`: the parsed nodes it occurs at; their `position` gives `lines`. */
export function finding(code: FindingCode, args: Args = {}, at: unknown[] = []): Finding {
  const [severity, message] = MESSAGES[code]
  const lines = at.flatMap((n) => (n as { position?: { start: { line: number } } })?.position?.start.line ?? [])
  return { code, severity, args, message: message(args), ...(lines.length ? { lines } : {}) }
}

/** Each finding once, in order of first occurrence, counted where it repeats, with the lines of all. */
export function tally(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>()
  for (const f of findings) {
    const key = f.code + JSON.stringify(f.args)
    const first = seen.get(key)
    if (!first) seen.set(key, { ...f })
    else {
      first.count = (first.count ?? 1) + 1
      if (f.lines) first.lines = [...(first.lines ?? []), ...f.lines]
    }
  }
  return [...seen.values()]
}
