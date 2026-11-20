/** The xast (XML AST) the pipeline works on, and small helpers over it. */

import { parseXml, XmlElement, XmlText, type XmlNode } from '@rgrove/parse-xml'
import type { Element, ElementContent, Nodes, Parents, Root, RootContent, Text } from 'xast'

import { finding, type Finding } from '../findings.ts'

export type { Element, ElementContent, Nodes, Parents, Root, RootContent, Text }

declare module 'xast' {
  interface TextData {
    /** The text as encoded, where a transform changed what renders. */
    source?: string
  }
  interface ElementData {
    /** The name by namespace, as `nameOf` gives it. */
    name?: string
    /** The namespaces in scope, by prefix; `''` is the default. */
    ns?: Record<string, string>
  }
}

export const TEI_NS = 'http://www.tei-c.org/ns/1.0'

/** A qualified name by the namespaces in scope: TEI's, or none, is the local name, any other `Q{uri}local`. */
export function qualify(qname: string, ns: Record<string, string>): string {
  const colon = qname.indexOf(':')
  const uri = ns[colon < 0 ? '' : qname.slice(0, colon)]
  const local = qname.slice(colon + 1)
  return !uri || uri === TEI_NS ? local : `Q{${uri}}${local}`
}

/**
 * XML → xast: elements and text, all the pipeline reads, each element with its `position`
 * in the source. Attribute values are tokens and pointers, so a line break in one is not
 * part of it.
 */
export function parse(xml: string): Root {
  const tokens = (attributes: Record<string, string>) =>
    Object.fromEntries(Object.entries(attributes).map(([k, v]) => [k, v.replace(/\s+/g, ' ').trim()]))
  const lines = [0]
  for (let i = xml.indexOf('\n'); i >= 0; i = xml.indexOf('\n', i + 1)) lines.push(i + 1)
  /** An offset as line and column, by binary search over the line starts. */
  const point = (offset: number) => {
    let lo = 0
    for (let hi = lines.length - 1; lo < hi;) {
      const mid = (lo + hi + 1) >> 1
      if (lines[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return { line: lo + 1, column: offset - lines[lo] + 1, offset }
  }
  const convert = (node: XmlNode, scope: Record<string, string>): ElementContent[] => {
    if (node instanceof XmlText) return [{ type: 'text', value: node.text }]
    if (!(node instanceof XmlElement)) return []
    const declared = Object.entries(node.attributes).filter(([k]) => k === 'xmlns' || k.startsWith('xmlns:'))
    const ns = declared.length ? { ...scope, ...Object.fromEntries(declared.map(([k, v]) => [k.slice(6), v])) } : scope
    return [{
      type: 'element',
      name: node.name,
      attributes: tokens(node.attributes),
      children: node.children.flatMap((c) => convert(c, ns)),
      data: { name: qualify(node.name, ns), ns },
      position: { start: point(node.start), end: point(node.end) },
    }]
  }
  return { type: 'root', children: parseXml(xml, { includeOffsets: true }).children.flatMap((c) => convert(c, {})) }
}

/** Strip a namespace prefix: `tei:head` → `head`. */
export function localName(qname: string | null | undefined): string {
  if (!qname) return ''
  const colon = qname.indexOf(':')
  return colon === -1 ? qname : qname.slice(colon + 1)
}

/** An element's name by namespace: `head` for TEI's (or none), `Q{http://www.w3.org/2000/svg}title` for another's. */
export const nameOf = (node: Element): string => node.data?.name ?? localName(node.name)

export function isElement(node: unknown, name?: string): node is Element {
  const n = node as Nodes | undefined
  if (n?.type !== 'element') return false
  return !name || nameOf(n) === name
}

export function isText(node: unknown): node is Text {
  return (node as Nodes | undefined)?.type === 'text'
}

export function children(node: unknown): RootContent[] {
  const n = node as Parents | undefined
  return n && 'children' in n && Array.isArray(n.children) ? (n.children as RootContent[]) : []
}

export function attr(node: Element, name: string): string | undefined {
  const value = node.attributes?.[name]
  return value ?? undefined
}

/** Element children with the given name. */
export function elementChildren(node: unknown, name?: string): Element[] {
  return children(node).filter((c): c is Element => isElement(c, name))
}

/** All descendant elements with the given name, in document order. */
export function findAll(node: unknown, name: string, acc: Element[] = []): Element[] {
  for (const child of children(node)) {
    if (isElement(child, name)) acc.push(child)
    findAll(child, name, acc)
  }
  return acc
}

/** First descendant element with the given name. */
export function findFirst(node: unknown, name: string): Element | undefined {
  for (const child of children(node)) {
    if (isElement(child, name)) return child
    const hit = findFirst(child, name)
    if (hit) return hit
  }
  return undefined
}

/** Flattened text content of a subtree, as encoded. */
export function textOf(node: unknown): string {
  if (!node) return ''
  if (isText(node)) return node.data?.source ?? node.value ?? ''
  return children(node).map(textOf).join('')
}

/** Flattened text content, whitespace collapsed and trimmed. */
export function plainText(node: unknown): string {
  return textOf(node).replace(/\s+/g, ' ').trim()
}

/** What XML asks of a name: a letter or `_`, then letters, digits, marks, `.`, `-` and `_`. */
const NCNAME = /^[\p{L}_][\p{L}\p{N}\p{M}._-]*$/u

/**
 * Ids this parser accepts but the rest of the toolchain does not: an id used twice,
 * which makes two HTML elements answer to one link, and one that is no NCName, which
 * libxml2 and Saxon refuse to parse at all.
 */
export function idFindings(tree: Root): Finding[] {
  const seen = new Map<string, Element[]>()
  const walk = (node: unknown): void => {
    const id = isElement(node) ? attr(node, 'xml:id') : undefined
    if (id !== undefined) seen.set(id, [...(seen.get(id) ?? []), node as Element])
    for (const child of children(node)) walk(child)
  }
  walk(tree)
  const ids = [...seen.keys()].sort()
  return [
    ...ids.filter((id) => seen.get(id)!.length > 1).map((id) => finding('id-twice', { id }, seen.get(id))),
    ...ids.filter((id) => !NCNAME.test(id)).map((id) => finding('id-invalid', { id }, seen.get(id))),
  ]
}
