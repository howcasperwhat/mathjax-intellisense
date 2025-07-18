import type { Range } from 'vscode'
import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { DoxygenMark } from './machine/formula/doxygen'
import type { SharedFormulaInfo } from './types'
import { assert } from 'node:console'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { parser } from './machine'
import { color, doc, lang, lineHeight, scale } from './store/shared'
import { validateRanges } from './utils'

function _render(
  _formula: Range[],
  _mark: DoxygenMark,
  _doc: Range[],
) {
  let text = _formula.map(range =>
    doc.value!.getText(range),
  ).join(_mark.sep).slice(3, -3).trim()

  if (_mark.name === '{}') {
    const idx = text.indexOf('}{')
    if (idx === -1)
      return undefined
    const env = text.slice(0, idx)
    text = `\\begin{${env}}${text.slice(idx + 2)}\\end{${env}}`
  }

  const [franges, dranges] = [_formula, _doc]
  const [fstart, fend] = [franges.at(0)!.start, franges.at(-1)!.end]
  const [dstart, dend] = [
    dranges[fstart.line - dranges[0].start.line].start,
    dranges[fend.line - dranges[0].start.line].end,
  ]
  const start = fstart.line + +(dstart.character !== fstart.character)
  const end = fend.line - +(dend.character !== fend.character)
  const n = end - start + 1

  return {
    preview: transformer.from(text, {
      color: color.value,
      scale: scale.value,
      maxHeight: n > 2 ? n * lineHeight.value : Infinity,
    }),
    start,
    end,
  }
}

export async function render(
  tokens: TextmateToken[],
): Promise<SharedFormulaInfo[]> {
  if (!lang.value)
    return []

  const single = await parser.doc.single(tokens, lang.value)
  const multiple = await parser.doc.multiple(tokens, lang.value)

  assert(validateRanges(single.flatMap(({ ranges }) => ranges)))
  assert(validateRanges(multiple.flatMap(({ ranges }) => ranges)))

  if (!doc.value)
    return []

  const lines = [...single, ...multiple].map(({ ranges }) =>
    ranges.map((range) => {
      const text = doc.value!.getText(range)
      return { range, text }
    }),
  )

  return (await Promise.all(lines.map(async (line) => {
    const formulas = await parser.formula.doxygen(line)
    const width = Math.max(...line.map(({ text }) => text.length))
    const doc = line.map(({ range }) => range)
    return formulas.map((formula) => {
      const preview = _render(formula.ranges, formula.mark, doc)
      if (!preview || preview.preview.error)
        return undefined
      return {
        ranges: formula.ranges,
        preview: preview.preview,
        depend: formula.ranges.reduce((max, cur) => {
          return (cur.end.character - cur.start.character
            > max.end.character - max.start.character)
            ? cur
            : max
        }, formula.ranges[0]),
        start: preview.start,
        end: preview.end,
        width,
      }
    }).filter(isTruthy)
  }))).flat()
}
