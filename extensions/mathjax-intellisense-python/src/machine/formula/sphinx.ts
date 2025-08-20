// https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html#directive-math
// https://www.sphinx-doc.org/en/master/usage/restructuredtext/roles.html#role-math

// TODO: use `xstate` to manage the state machine

import type { Range } from 'vscode'
import type { DocContext } from '../doc/types'
import type { FormulaContext } from './types'

export function extract(
  texts: string[],
  type: 'doc' | 'raw',
) {
  if (texts.length === 0)
    return undefined

  const directives: string[] = []
  const regex = /^\s*:([\w-]+):(.*)$/
  let i = texts.findIndex(text => text.trim().length > 0)
  let match
  // eslint-disable-next-line no-cond-assign
  while ((i < texts.length) && (match = texts[i].match(regex))) {
    directives.push(match[1])
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
  let state = 'outside' as 'outside' | 'inline' | 'block'
  let startIndex = 0

  const inlines: FormulaContext[] = []
  const blocks: FormulaContext[] = []

  const ranges: Range[] = []
  const texts: string[] = []

  for (let i = 0; i < doc.lines.length; i++) {
    const line = doc.lines[i]
    if (state === 'block') {
      const text = line.text.slice(startIndex)
      const range = line.range.with({
        start: line.range.start.with({
          character: line.range.start.character + startIndex,
        }),
      })
      if (text.trim().length === 0) {
        texts.push(doc.type === 'raw' ? '\\\\' : '\\\\\\\\')
        ranges.push(range)
        startIndex = 0
      }
      else if (text.search(/\s/) === 0) {
        texts.push(text)
        ranges.push(range)
        startIndex = 0
      }
      else {
        const extracted = extract(texts, doc.type)
        ranges[0] = ranges[0].with({
          start: ranges[0].start.with({
            character: ranges[0].start.character - '.. math::'.length,
          }),
        })
        extracted && blocks.push({
          ranges: [...ranges],
          type: 'sphinx' as const,
          text: extracted,
        })
        texts.length = 0
        ranges.length = 0
        state = 'outside'
        --i // Reprocess the current line
        startIndex = 0
      }
    }
    else if (state === 'inline') {
      const text = line.text.slice(startIndex)
      const range = line.range.with({
        start: line.range.start.with({
          character: line.range.start.character + startIndex,
        }),
      })
      const index = text.search(/(?<!\\)`/)
      if (index === -1) {
        texts.push(text)
        ranges.push(range)
        startIndex = 0
      }
      else {
        texts.push(text.slice(0, index))
        ranges.push(range.with({
          end: range.start.with({
            character: range.start.character + index,
          }),
        }))
        const extracted = texts.join(' ')
        ranges[0] = ranges[0].with({
          start: ranges[0].start.with({
            character: ranges[0].start.character - ':math:`'.length,
          }),
        })
        ranges[ranges.length - 1] = ranges[ranges.length - 1].with({
          end: ranges[ranges.length - 1].end.with({
            character: ranges[ranges.length - 1].end.character + 1,
          }),
        })
        extracted && inlines.push({
          ranges: [...ranges],
          type: 'sphinx' as const,
          text: extracted,
        })
        texts.length = 0
        ranges.length = 0
        state = 'outside'
        --i // Reprocess the current line
        startIndex += index + 1
      }
    }
    else {
      const text = line.text.slice(startIndex)
      if (startIndex === 0 && text.startsWith('.. math::')) {
        texts.length = 0
        ranges.length = 0
        state = 'block'
        --i // Reprocess the current line
        startIndex += '.. math::'.length
      }
      else {
        const index = text.indexOf(':math:`')
        if (index === -1) {
          state = 'outside'
          startIndex = 0
        }
        else {
          texts.length = 0
          ranges.length = 0
          state = 'inline'
          --i // Reprocess the current line
          startIndex += index + ':math:`'.length
        }
      }
    }
  }
  if (state === 'block') {
    const extracted = extract(texts, doc.type)
    extracted && blocks.push({
      ranges: [...ranges],
      type: 'sphinx' as const,
      text: extracted,
    })
  }
  return [...inlines, ...blocks]
}
