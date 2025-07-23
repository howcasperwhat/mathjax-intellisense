import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { DocContext } from './types'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { Range } from 'vscode'
import { assign, createActor, createMachine } from 'xstate'
import { document } from '../../store/shared'

// Don't use `endIndex`, because it seems that `//` will be treated as two characters.

export type DocStringType = 'doc' | 'raw'

export interface DocString {
  ranges: Range[]
  type: DocStringType
}

export interface DocStringMachineContext {
  docs: DocString[]
  ranges?: Range[]
  type?: DocStringType
  tabwidth?: number
  start?: number
  line?: number
}

export interface DocStringMachineEvent {
  type: 'PUNCTUATION_BEGIN' | 'PUNCTUATION_END' | 'LINE_INCREMENT' | 'END'
  tokens: TextmateToken[]
  index: number
  character?: number
}

export const DocStringMachine = createMachine({
  id: 'DocStringMachine',
  initial: 'Outside',
  types: {} as {
    context: DocStringMachineContext
    events: DocStringMachineEvent
  },
  context: {
    docs: [],
    ranges: undefined,
    tabwidth: undefined,
    start: undefined,
    line: undefined,
  },
  on: {
    END: {
      target: '.Outside',
      actions: assign(() => {
        return {
          ranges: undefined,
          tabwidth: undefined,
          start: undefined,
          line: undefined,
        }
      }),
    },
  },
  states: {
    Outside: {
      on: {
        PUNCTUATION_BEGIN: {
          guard: ({ event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            return token.scopes.includes(
              'string.quoted.docstring.raw.multi.python',
            ) || token.scopes.includes(
              'string.quoted.docstring.multi.python',
            ) || token.scopes.includes(
              'string.quoted.docstring.raw.single.python',
            ) || token.scopes.includes(
              'string.quoted.docstring.single.python',
            )
          },
          target: 'Inside',
          actions: assign(({ event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            const type = (token.scopes.includes(
              'string.quoted.docstring.multi.python',
            ) || token.scopes.includes(
              'string.quoted.docstring.single.python',
            ))
              ? 'doc' as const
              : 'raw' as const
            const tabindex = index - 1 - +(type === 'raw')
            // editor.value.options.tabSize * n_tabs + n_spaces
            const tab = tokens[tabindex]?.text ?? ''
            return {
              line: token.line,
              start: token.endIndex,
              tabwidth: tab.length,
              type,
            }
          }),
        },
        LINE_INCREMENT: {
          target: 'Outside',
        },
      },
    },
    Inside: {
      on: {
        LINE_INCREMENT: {
          target: 'Inside',
          actions: assign(({ context, event }) => {
            const { tokens, index } = event
            const prev = tokens[index - 1]
            const end = prev.startIndex + prev.text.length
            const start = Math.min(context.start!, end)
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  start,
                  context.line!,
                  end,
                ),
              ),
              start: context.tabwidth!,
              line: tokens[index].line,
            }
          }),
        },
        PUNCTUATION_END: {
          target: 'Outside',
          actions: assign(({ context, event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            const end = token.startIndex
            const start = Math.min(context.start!, end)
            return {
              docs: context.docs.concat({
                ranges: (context.ranges ?? []).concat(
                  new Range(
                    context.line!,
                    start,
                    context.line!,
                    end,
                  ),
                ),
                type: context.type!,
              }),
              ranges: undefined,
              tabwidth: undefined,
              start: undefined,
              line: undefined,
            }
          }),
        },
      },
    },
  },
})

export function extract(doc: DocString) {
  if (!document.value)
    return undefined

  return doc.ranges.map((range) => {
    const text = document.value!.getText(range)
    return { range, text }
  })
}

export function parse(
  tokens: TextmateToken[],
): DocContext[] {
  const DocStringActor = createActor(DocStringMachine)

  DocStringActor.start()

  let line: number = 0
  const scopes = Object.entries({
    PUNCTUATION_BEGIN: 'punctuation.definition.string.begin.python',
    PUNCTUATION_END: 'punctuation.definition.string.end.python',
  }) as ['PUNCTUATION_BEGIN' | 'PUNCTUATION_END', string][]

  tokens.forEach((token, index) => {
    if (token.line !== line) {
      DocStringActor.send({
        type: 'LINE_INCREMENT',
        tokens,
        index,
      })
      line = token.line
    }

    for (const [key, value] of scopes) {
      if (token.scopes.includes(value)) {
        DocStringActor.send({
          type: key,
          tokens,
          index,
        })
        break
      }
    }
  })

  DocStringActor.send({
    type: 'END',
    tokens,
    index: tokens.length,
  })

  DocStringActor.stop()

  const snapshot = DocStringActor.getSnapshot()

  return snapshot.context.docs.map((doc) => {
    const lines = extract(doc)
    if (!lines)
      return undefined

    return {
      lines,
      type: doc.type,
    }
  }).filter(isTruthy)
}
