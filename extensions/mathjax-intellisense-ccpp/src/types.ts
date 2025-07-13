import type { FormulaPreview } from 'mathjax-intellisense-tools/transformer'
import type { Range } from 'vscode'

export interface SharedFormulaInfo {
  ranges: Range[]
  preview: FormulaPreview
  depend: Range
  display: number
  width: number
}
