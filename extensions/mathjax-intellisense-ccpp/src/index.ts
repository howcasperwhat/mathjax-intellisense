import type { ExtensionContext } from 'vscode'
import { defineExtension } from 'reactive-vscode'
import { useAnnotation } from './annotation'

const { activate, deactivate } = defineExtension(
  async (context: ExtensionContext) => {
    useAnnotation(context)
  },
)
export { activate, deactivate }
