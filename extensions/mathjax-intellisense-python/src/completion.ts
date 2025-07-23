import type { CompletionItemProvider, ExtensionContext, TextDocument } from 'vscode'
import { CHARACTERS, COMMANDS, DELIMITERS, ENVIRONMENTS } from 'mathjax-intellisense-tools/mathjax'
import { CompletionItem, CompletionItemKind, languages, Position, Range, SnippetString } from 'vscode'
import { formulas } from './store/shared'

export function useCompletion(context: ExtensionContext) {
  const flag = '\\'
  const unit: CompletionItemProvider = {
    provideCompletionItems(document: TextDocument, position: Position) {
      const line = document.getText(new Range(
        new Position(position.line, 0),
        new Position(position.line, position.character),
      ))

      if (!line.endsWith(`${flag}`))
        return
      if (line.endsWith(`${flag}${flag}`))
        return
      if (!formulas.value.find(({ ranges }) => ranges.some(range => range.contains(position))))
        return

      return [
        ...Array.from(new Set(CHARACTERS)).map(
          func => Object.assign(new CompletionItem(
            flag + func,
            CompletionItemKind.Function,
          ), {
            insertText: new SnippetString(`${func}`),
          }),
        ),
        ...Array.from(new Set(COMMANDS)).map(
          func => Object.assign(new CompletionItem(
            flag + func.name + (func.format ?? ''),
            CompletionItemKind.Function,
          ), {
            insertText: new SnippetString(`${func.name}${func.snippet ?? ''}`),
          }),
        ),
        ...Array.from(new Set(DELIMITERS)).map(
          func => Object.assign(new CompletionItem(
            flag + func,
            CompletionItemKind.Function,
          ), {
            insertText: new SnippetString(`${func}`),
          }),
        ),
        Object.assign(new CompletionItem(
          `${flag}begin`,
          CompletionItemKind.Module,
        ), {
          insertText: new SnippetString(
            `begin{\${1|${ENVIRONMENTS.join(',')}|}}\n\t$2\n\\end{$1}`,
          ),
        }),
      ]
    },
    resolveCompletionItem(item: CompletionItem) {
      return item
    },
  }

  context.subscriptions.push(
    languages.registerCompletionItemProvider(
      'python',
      unit,
      flag,
    ),
  )
}
