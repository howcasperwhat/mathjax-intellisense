import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { LanguageType } from '../../types'
import type { DocContext } from './types'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { Range } from 'vscode'
import { assign, createActor, createMachine } from 'xstate'
import { document } from '../../store/shared'

// Don't use `endIndex`, because it seems that `//` will be treated as two characters.

export interface MultipleDoc {
  ranges: Range[]
}

export interface MultipleDocMachineContext {
  docs: MultipleDoc[]
  ranges?: Range[]
  start?: number
  line?: number
}

export interface MultipleDocMachineEvent {
  type: 'PUNCTUATION_BEGIN' | 'PUNCTUATION_END' | 'LINE_INCREMENT' | 'CHARACTER' | 'END'
  tokens: TextmateToken[]
  index: number
  character?: number
}

// Wait/Met `NOT_WHITESPACE`
export const MultipleDocMachine = createMachine({
  id: 'MultipleDocMachine',
  initial: 'Outside',
  types: {} as {
    context: MultipleDocMachineContext
    events: MultipleDocMachineEvent
  },
  context: {
    docs: [],
    ranges: undefined,
    start: undefined,
    line: undefined,
  },
  on: {
    PUNCTUATION_END: {
      target: '.Outside',
      actions: assign(({ context, event }) => {
        const { tokens, index } = event
        const token = tokens[index]
        return {
          docs: (context.docs ?? []).concat({
            ranges: (context.ranges ?? []).concat(
              new Range(
                context.line!,
                context.start!,
                context.line!,
                token.startIndex + token.text.length,
              ),
            ),
          }),
          ranges: undefined,
          start: undefined,
          line: undefined,
        }
      }),
    },
    END: {
      target: '.Outside',
      actions: assign(() => {
        return {
          ranges: undefined,
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
          target: 'Met',
          actions: assign(({ event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            return {
              line: token.line,
              start: token.endIndex,
            }
          }),
        },
      },
    },
    Met: {
      on: {
        CHARACTER: {
          target: 'Inside',
          actions: assign(({ event }) => {
            const { tokens, index, character } = event
            const token = tokens[index]
            const char = token.text[character!]
            return {
              start: token.startIndex + character! + +(char === ' '),
            }
          }),
        },
        LINE_INCREMENT: {
          target: 'Wait',
          actions: assign(({ context, event }) => {
            const { tokens, index } = event
            const prev = tokens[index - 1]
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  prev.startIndex + prev.text.length,
                ),
              ),
              line: tokens[index].line,
              start: 0,
            }
          }),
        },
      },
    },
    Wait: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { tokens, index, character } = event
              const token = tokens[index]
              const char = token.text[character!]
              return char === ' '
            },
            target: 'Wait',
            actions: assign(({ event }) => {
              const { tokens, index, character } = event
              const token = tokens[index]
              return {
                line: token.line,
                start: token.startIndex + character! + 1, // Skip the ` `
              }
            }),
          },
          {
            guard: ({ event }) => {
              const { tokens, index, character } = event
              const token = tokens[index]
              const char = token.text[character!]
              return char === '*'
            },
            target: 'Met',
            actions: assign(({ event }) => {
              const { tokens, index, character } = event
              const token = tokens[index]
              return {
                line: token.line,
                start: token.startIndex + character! + 1, // Skip the `*`
              }
            }),
          },
          {
            target: 'Inside',
            actions: assign(({ event }) => {
              const { tokens, index, character } = event
              const token = tokens[index]
              return {
                line: token.line,
                start: token.startIndex + character!,
              }
            }),
          },
        ],
        LINE_INCREMENT: {
          target: 'Wait',
          actions: assign(({ context, event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            const prev = tokens[index - 1]
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  prev.startIndex + prev.text.length,
                ),
              ),
              line: token.line,
              start: 0,
            }
          }),
        },
      },
    },
    Inside: {
      on: {
        CHARACTER: {
          target: 'Inside',
        },
        LINE_INCREMENT: {
          target: 'Wait',
          actions: assign(({ event, context }) => {
            const { tokens, index } = event
            const prev = tokens[index - 1]
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  prev.startIndex + prev.text.length,
                ),
              ),
            }
          }),
        },
      },
    },
  },
})

export function extract(doc: MultipleDoc) {
  if (!document.value)
    return undefined

  return doc.ranges.map((range) => {
    const text = document.value!.getText(range)
    return { range, text }
  })
}

export function parse(
  tokens: TextmateToken[],
  lang: LanguageType,
): DocContext[] {
  const MultipleDocActor = createActor(MultipleDocMachine)

  MultipleDocActor.start()

  let line: number = 0
  const scopes = Object.entries({
    PUNCTUATION_BEGIN: `punctuation.definition.comment.begin.documentation.${lang}`,
    PUNCTUATION_END: `punctuation.definition.comment.end.documentation.${lang}`,
  }) as ['PUNCTUATION_BEGIN' | 'PUNCTUATION_END', string][]

  tokens.forEach((token, index) => {
    if (token.line !== line) {
      MultipleDocActor.send({
        type: 'LINE_INCREMENT',
        tokens,
        index,
      })
      line = token.line
    }

    for (const [key, value] of scopes) {
      if (token.scopes.includes(value)) {
        MultipleDocActor.send({
          type: key,
          tokens,
          index,
        })
        return
      }
    }

    // TODO: When `Inside` state is active, skip the whole line
    for (let i = 0; i < token.text.length; i++) {
      MultipleDocActor.send({
        type: 'CHARACTER',
        tokens,
        index,
        character: i,
      })
    }
  })

  const snapshot = MultipleDocActor.getSnapshot()

  MultipleDocActor.send({
    type: 'END',
    tokens,
    index: tokens.length,
  })

  MultipleDocActor.stop()

  return snapshot.context.docs.map((doc) => {
    const lines = extract(doc)
    if (!lines)
      return undefined

    return {
      lines,
      type: '*' as const,
    }
  }).filter(isTruthy)
}
