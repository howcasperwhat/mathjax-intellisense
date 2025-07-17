import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { LanguageType } from '../../types'
import { Range } from 'vscode'
import { assign, createActor, createMachine } from 'xstate'

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
  type: 'PUNCTUATION_BEGIN' | 'PUNCTUATION_END' | 'LINE_INCREMENT' | 'CHARACTER'
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
      actions: assign(({ context }) => {
        return {
          docs: (context.docs ?? []).concat({
            ranges: context.ranges ?? [],
          }),
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
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  tokens[index - 1].endIndex,
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
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  tokens[index - 1].endIndex,
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
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  tokens[index - 1].endIndex,
                ),
              ),
            }
          }),
        },
      },
    },
  },
})

export async function parse(tokens: TextmateToken[], lang: LanguageType) {
  const MultipleDocActor = createActor(MultipleDocMachine)

  MultipleDocActor.start()

  let line: number = 0
  const scopes = Object.entries({
    // PUNCTUATION: `punctuation.definition.comment.documentation.${lang}`,
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

    // TODO: When `Inside` state is active, skip the whole line
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

  MultipleDocActor.stop()

  return snapshot.context.docs
}
