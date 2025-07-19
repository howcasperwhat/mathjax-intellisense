import type { Range } from 'vscode'
import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { SharedFormulaInfo } from './types'
import { assert } from 'node:console'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { parser } from './machine'
import { color, document, lang, lineHeight, scale } from './store/shared'
import { validateRanges } from './utils'

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

export async function render(
  tokens: TextmateToken[],
): Promise<SharedFormulaInfo[]> {
  if (!lang.value)
    return []

  const single = await parser.doc.single(tokens, lang.value)
  const multiple = await parser.doc.multiple(tokens, lang.value)

  assert(validateRanges(single.flatMap(({ ranges }) => ranges)))
  assert(validateRanges(multiple.flatMap(({ ranges }) => ranges)))

  if (!document.value)
    return []

  const lines = [...single, ...multiple].map(({ ranges }) =>
    ranges.map((range) => {
      const text = document.value!.getText(range)
      return { range, text }
    }),
  )

  return (await Promise.all(lines.map(async (line) => {
    const formulas = await parser.formula.doxygen(line)
    const width = Math.max(...line.map(({ text }) => text.length))
    const dranges = line.map(({ range }) => range)
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
  }))).flat()
}
