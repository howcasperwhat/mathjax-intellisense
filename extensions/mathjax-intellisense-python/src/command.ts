import { useCommand } from 'reactive-vscode'
import { config } from './store/shared'

export function useCommands() {
  useCommand('mathjax-intellisense-python.edit', () => {
    config.extension.mode = 'edit'
  })
  useCommand('mathjax-intellisense-python.view', () => {
    config.extension.mode = 'view'
  })
  useCommand('mathjax-intellisense-python.both', () => {
    config.extension.mode = 'both'
  })
  useCommand('mathjax-intellisense-python.toggle', () => {
    config.extension.mode = config.extension.mode === 'edit'
      ? 'view'
      : 'edit'
  })
}
