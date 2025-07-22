import type { Range } from 'vscode'
import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { SharedFormulaInfo } from './types'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { parser } from './machine'
import { color, config, lang, lineHeight, scale } from './store/shared'

function locate(
  franges: Range[],
  dranges: Range[],
) {
  const [fstart, fend] = [franges.at(0)!.start, franges.at(-1)!.end]
  const [dstart, dend] = [
    dranges[fstart.line - dranges[0].start.line].start,
    dranges[fend.line - dranges[0].start.line].end,
  ]
  const start = fstart.line + +(dstart.character !== fstart.character)
  const end = fend.line - +(dend.character !== fend.character)

  return { start, end }
}

export function render(
  tokens: TextmateToken[],
): SharedFormulaInfo[] {
  if (!lang.value)
    return []

  const single = parser.doc.single(tokens, lang.value)
  const multiple = parser.doc.multiple(tokens, lang.value)

  return [...single, ...multiple].map((doc) => {
    const width = Math.max(...doc.lines.map(line => line.text.length))
    const dranges = doc.lines.map(line => line.range)
    return config.extension.formula.map((name) => {
      const formulas = parser.formula[name](doc)
      return formulas.map((formula) => {
        const { ranges, text } = formula
        const { start, end } = locate(ranges, dranges)
        const n = end - start + 1

        const preview = transformer.from(text, {
          color: color.value,
          scale: scale.value,
          maxHeight: n > 2 ? n * lineHeight.value : Infinity,
        })

        if (preview.error)
          return undefined

        return { ranges, preview, start, end, width }
      }).filter(isTruthy)
    })
  }).flat(2)
}
