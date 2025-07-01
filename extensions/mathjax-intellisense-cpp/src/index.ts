import type { ExtensionContext } from 'vscode'
import { defineExtension } from 'reactive-vscode'
import { window } from 'vscode'

const { activate, deactivate } = defineExtension(
  (context: ExtensionContext) => {
    window.showInformationMessage(
      `Hello from ${context.extension.packageJSON.displayName}!`,
    )
  },
)
export { activate, deactivate }
