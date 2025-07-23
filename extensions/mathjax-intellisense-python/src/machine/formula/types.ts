import type { Range } from 'vscode'

export interface FormulaContext {
  ranges: Range[]
  text: string
  type: 'sphinx' | 'markdown'
}
