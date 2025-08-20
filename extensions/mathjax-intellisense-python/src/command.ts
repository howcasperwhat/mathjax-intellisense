import { useCommand } from 'reactive-vscode'
import { config } from './store/shared'

export function useCommands() {
  useCommand('mathjax-intellisense-ccpp.edit', () => {
    config.extension.mode = 'edit'
  })
  useCommand('mathjax-intellisense-ccpp.view', () => {
    config.extension.mode = 'view'
  })
  useCommand('mathjax-intellisense-ccpp.both', () => {
    config.extension.mode = 'both'
  })
  useCommand('mathjax-intellisense-ccpp.toggle', () => {
    config.extension.mode = config.extension.mode === 'edit'
      ? 'view'
      : 'edit'
  })
}
