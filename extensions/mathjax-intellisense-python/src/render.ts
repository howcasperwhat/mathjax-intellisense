import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { SharedFormulaInfo } from './types'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { parser } from './machine'
import { color, config, lineHeight, scale } from './store/shared'

// function locate(
//   franges: Range[],
//   dranges: Range[],
// ) {
//   const [fstart, fend] = [franges.at(0)!.start, franges.at(-1)!.end]
//   const [dstart, dend] = [
//     dranges[fstart.line - dranges[0].start.line].start,
//     dranges[fend.line - dranges[0].start.line].end,
//   ]
//   const start = fstart.line + +(dstart.character !== fstart.character)
//   const end = fend.line - +(dend.character !== fend.character)

//   return { start, end }
// }

export function render(
  tokens: TextmateToken[],
): SharedFormulaInfo[] {
  const docstring = parser.doc.docstring(tokens)

  return [...docstring].map((doc) => {
    const width = Math.max(...doc.lines.map(line => line.text.length))
    return config.extension.formula.map((name) => {
      const formulas = parser.formula[name](doc)
      return formulas.map((formula) => {
        const { ranges, text } = formula
        const start = ranges.at(0)!.start.line
        const end = ranges.at(-1)!.end.line
        const n = end - start + 1

        const preview = transformer.from(text, {
          color: color.value,
          scale: scale.value,
          maxHeight: n > 1 ? n * lineHeight.value : Infinity,
        })

        if (preview.error)
          return undefined

        return { ranges, preview, start, end, width }
      }).filter(isTruthy)
    })
  }).flat(2)
}
