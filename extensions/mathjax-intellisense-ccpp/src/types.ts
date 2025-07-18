import type { FormulaPreview } from 'mathjax-intellisense-tools/transformer'
import type { Range } from 'vscode'

export interface SharedFormulaInfo {
  ranges: Range[]
  preview: FormulaPreview
  depend: Range
  width: number
  start: number
  end: number
}

export type LanguageType = 'c' | 'cpp'
