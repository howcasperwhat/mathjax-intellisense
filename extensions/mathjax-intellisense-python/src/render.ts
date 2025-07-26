import type { Range } from 'vscode'
import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { FormulaLocation, SharedFormulaInfo } from './types'
import { assert } from 'node:console'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { parser } from './machine'
import { color, config, lineHeight, scale } from './store/shared'

function locate(
  franges: Range[],
  dranges: Range[],
): FormulaLocation {
  const [fstart, fend] = [franges.at(0)!.start, franges.at(-1)!.end]
  const [dstart, dend] = [
    dranges[fstart.line - dranges[0].start.line].start,
    dranges[fend.line - dranges[0].start.line].end,
  ]
  const sfull = dstart.character === fstart.character
  const efull = dend.character === fend.character
  const n = fend.line - fstart.line + 1
  assert(n === franges.length, 'Formula ranges length mismatch')

  if (n === 1)
    return { start: 0, end: 0 }

  if (n === 2) {
    if (sfull && efull)
      return { start: 0, end: 1 }
    if (sfull)
      return { start: 0, end: 0 }
    if (efull)
      return { start: 1, end: 1 }
    return { start: 0, end: 0 }
  }

  return { start: 0 + +!sfull, end: n - 1 - +!efull }
}

export function render(
  tokens: TextmateToken[],
): SharedFormulaInfo[] {
  const docstring = parser.doc.docstring(tokens)

  return [...docstring].map((doc) => {
    const width = Math.max(...doc.lines.map(line => line.text.length))
    const dranges = doc.lines.map(line => line.range)
    return config.extension.formula.map((name) => {
      const formulas = parser.formula[name](doc)
      return formulas.map((formula) => {
        const { ranges, text } = formula
        const location = locate(ranges, dranges)
        const start = ranges[location.start].start.line
        const end = ranges[location.end].end.line
        const n = end - start + 1

        const preview = transformer.from(text, {
          color: color.value,
          scale: scale.value,
          maxHeight: n > 1 ? n * lineHeight.value : Infinity,
        })

        if (preview.error)
          return undefined

        return { ranges, preview, location, width }
      }).filter(isTruthy)
    })
  }).flat(2)
}
