import { Range } from "vscode"
import { TextmateToken } from "vscode-textmate-languageservice"
import { assign, createActor, createMachine } from "xstate"
import { LanguageType } from "../../types"

export interface SingleDoc {
  ranges: Range[]
}

export interface SingleDocMachineContext {
  docs: SingleDoc[]
  ranges?: Range[]
  start?: number
  line?: number
}

export interface SingleDocMachineEvent {
  type: 'PUNCTUATION' | 'LINE_INCREMENT' | 'CHARACTER'
  tokens: TextmateToken[]
  index: number
  character?: number
}

// Wait/Met `PUNCTUATION`
export const SingleDocMachine = createMachine({
  id: "SingleDocMachine",
  initial: 'Outside',
  types: {} as {
    context: SingleDocMachineContext,
    events: SingleDocMachineEvent
  },
  context: {
    docs: [],
    ranges: undefined,
    start: undefined,
    line: undefined,
  },
  states: {
    Outside: {
      on: {
        PUNCTUATION: {
          target: 'Met',
          actions: assign(({ event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            return {
              line: token.line,
              start: token.endIndex,
            }
          })
        }
      }
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
              start: token.startIndex + character! + +(char === ' ')
            }
          })
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
                )
              ),
            }
          })
        }
      }
    },
    Wait: {
      on: {
        PUNCTUATION: {
          target: 'Met',
          actions: assign(({ event }) => {
            const { tokens, index } = event
            const token = tokens[index]
            return {
              line: token.line,
              start: token.endIndex,
            }
          })
        },
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { tokens, index, character } = event
              const token = tokens[index]
              const char = token.text[character!]
              return char === ' '
            },
            target: 'Wait',
          },
          {
            target: 'Outside',
            actions: assign(({ context }) => {
              return {
                docs: context.docs.concat({
                  ranges: context.ranges ?? [],
                }),
                ranges: undefined,
                start: undefined,
                line: undefined,
              }
            })
          },
        ],
        LINE_INCREMENT: {
          target: 'Outside',
          actions: assign(({ context }) => {
            return {
              docs: context.docs.concat({
                ranges: context.ranges ?? [],
              }),
              ranges: undefined,
              start: undefined,
              line: undefined,
            }
          })
        },
      }
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
                )
              ),
            }
          })
        },
      }
    }
  }
})

export async function parse(tokens: TextmateToken[], lang: LanguageType) {
  const SingleDocActor = createActor(SingleDocMachine)
  
  SingleDocActor.start()
  
  let line: number = 0
  const scopes = Object.entries({
    PUNCTUATION: `punctuation.definition.comment.documentation.${lang}`,
  }) as ['PUNCTUATION', string][]

  tokens.forEach((token, index) => {
    if (token.line !== line) {
      SingleDocActor.send({
        type: 'LINE_INCREMENT',
        tokens,
        index,
      })
      line = token.line
    }

    for (const [key, value] of scopes) {
      if (token.scopes.includes(value)) {
        SingleDocActor.send({
          type: key,
          tokens,
          index
        })
        return
      }
    }

    // TODO: When `Inside` state is active, skip the whole line
    for (let i = 0; i < token.text.length; i++) {
      SingleDocActor.send({
        type: 'CHARACTER',
        tokens,
        index,
        character: i,
      })
    }
  })

  const snapshot = SingleDocActor.getSnapshot()

  SingleDocActor.stop()

  return snapshot.context.docs
}
