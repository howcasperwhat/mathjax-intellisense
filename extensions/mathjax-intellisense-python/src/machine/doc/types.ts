import type { Range } from 'vscode'

export interface DocLineContext {
  range: Range
  text: string
}

export interface DocContext {
  lines: DocLineContext[]
  type: 'doc' | 'raw'
}
