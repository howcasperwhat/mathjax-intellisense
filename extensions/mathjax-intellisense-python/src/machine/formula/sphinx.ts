// https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html#directive-math
// https://www.sphinx-doc.org/en/master/usage/restructuredtext/roles.html#role-math

import type { DocContext } from '../doc/types'
import type { FormulaContext } from './types'
import { Range } from 'vscode'

const BLOCK_START_MARK = '.. math::'

export function extract(
  texts: string[],
  type: 'doc' | 'raw',
) {
  if (texts.length === 0)
    return undefined

  if (texts[0].search(/\s?/) !== 0)
    return undefined

  const first = texts.findIndex(text => text.trim().length > 0)
  const directives: string[] = []
  const regex = /^\s*:([\w-]+):(.*)$/
  let i = first
  while (i < texts.length) {
    const text = texts[i]
    const match = text.match(regex)
    if (!match)
      break
    const directive = match[1]
    directives.push(directive)
    i++
  }

  const joined = texts.slice(i).join('\n')
  const text = type === 'raw'
    ? joined
    : joined.replaceAll('\\\\', '\\')
  return directives.includes('nowrap') || directives.includes('no-wrap')
    ? text
    : `\\begin{split}\n${text}\n\\end{split}`
}

export function parse(
  doc: DocContext,
): FormulaContext[] {
  let inside = false

  const regex = /(?<!\\):math:`(.*?)(?<!\\)`/g
  const inlines: FormulaContext[] = []

  const blocks: FormulaContext[] = []
  const ranges: Range[] = []
  const texts: string[] = []

  for (let i = 0; i < doc.lines.length; i++) {
    const line = doc.lines[i]
    if (inside) {
      if (line.text.trim().length === 0) {
        ranges.push(line.range)
        texts.push(doc.type === 'raw' ? '\\\\' : '\\\\\\\\')
      }
      else if (line.text.search(/\s/) === 0) {
        ranges.push(line.range)
        texts.push(line.text)
      }
      else {
        const text = extract(texts, doc.type)
        text && blocks.push({
          ranges: [...ranges],
          type: 'sphinx' as const,
          text,
        })
        ranges.length = 0
        texts.length = 0
        inside = false
        --i // Reprocess the current line
      }
    }
    else {
      if (line.text.startsWith(BLOCK_START_MARK)) {
        const str = line.text.slice(BLOCK_START_MARK.length)
        ranges.push(line.range)
        texts.push(str)
        inside = true
      }
      else {
        let match
        regex.lastIndex = 0
        // eslint-disable-next-line no-cond-assign
        while ((match = regex.exec(line.text))) {
          const start = regex.lastIndex - match[0].length
          const end = regex.lastIndex
          inlines.push({
            ranges: [new Range(
              line.range.start.line,
              line.range.start.character + start,
              line.range.start.line,
              line.range.start.character + end,
            )],
            type: 'sphinx' as const,
            text: match[1],
          })
        }
      }
    }
  }
  if (inside) {
    const text = extract(texts, doc.type)
    text && blocks.push({
      ranges: [...ranges],
      type: 'sphinx' as const,
      text,
    })
  }
  return [...inlines, ...blocks]
}
