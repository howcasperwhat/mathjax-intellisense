import type { FormulaPreview } from 'mathjax-intellisense-tools/transformer'
import type { Range } from 'vscode'

export interface FormulaLocation {
  start: number
  end: number
}

export interface SharedFormulaInfo {
  ranges: Range[]
  preview: FormulaPreview
  location: FormulaLocation
  width: number
}
