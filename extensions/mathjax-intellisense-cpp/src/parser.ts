import { Range } from 'vscode'
import { assign, createActor, createMachine, raise } from 'xstate'
import { useTokenService } from 'mathjax-intellisense-tools'

// https://www.doxygen.nl/manual/formulas.html

export const FORMULA_MARKERS = {
  '$': { name: '$$', start: '$', end: '$' },
  '(': { name: '()', start: '(', end: ')' },
  '[': { name: '[]', start: '[', end: ']' },
  '{': { name: '{}', start: '{', end: '}' },
} as const

const BEGIN_MARKS = Object.keys(FORMULA_MARKERS) as (keyof typeof FORMULA_MARKERS)[]
type MarkBegin = typeof BEGIN_MARKS[number]

function alert() {
  console.error('Unexpected character or sequence in docstring parsing.')
}

const SeekDoc = {
  entry: assign(() => ({
    range: [],
    start: undefined,
    mark: undefined,
  })),
  on: {
    TRIPLE_SLASH: 'InTripleSlashDoc',
    BLOCK_START: 'InBlockDoc',
    CHARACTER: 'SeekDoc',
    LINE_INCREMENT: 'SeekDoc',
    EOF: 'Done',
    BLOCK_END: {
      actions: alert,
    },
  },
}

const FormulaStatus = {
  initial: 'Outside',
  states: {
    Outside: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === '\\'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            target: 'Outside',
          },
        ],
        LINE_INCREMENT: 'Outside',
      },
    },
    ReadyStartBackSlash: {
      on: {
        CHARACTER: [
          {
            guard: (parmas: any) => {
              return parmas.event.char === '\\'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            guard: (params: any) => {
              return params.event.char === 'f'
            },
            target: 'ReadyStartMark',
            actions: assign({ mark: undefined }),
          },
          {
            target: 'Outside',
            actions: assign({ mark: undefined }),
          },
        ],
        LINE_INCREMENT: 'Outside',
      },
    },
    ReadyStartMark: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return BEGIN_MARKS.includes(params.event.char as MarkBegin)
            },
            target: 'Inside',
            actions: assign((params: any) => ({
              mark: FORMULA_MARKERS[params.event.char as MarkBegin],
              start: params.event.pos - 2, // -1 for f and -1 for backslash
            })),
          },
          {
            guard: (params: any) => {
              return params.event.char === '\\'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            target: 'Outside',
            actions: assign({ mark: undefined }),
          },
        ],
        LINE_INCREMENT: 'Outside',
      },
    },
    Inside: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === '\\'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: {
          target: 'Inside',
          actions: assign((params: any) => {
            return {
              ranges: params.context.ranges.concat(new Range(
                params.event.line,
                params.context.start,
                params.event.line,
                params.event.pos,
              )),
              start: undefined,
            }
            }),
        },
      },
    },
    ReadyEndBackSlash: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === '\\'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            guard: (params: any) => {
              return params.event.char === 'f'
            },
            target: 'ReadyEndMark',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: 'Inside',
      },
    },
    ReadyEndMark: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === params.context.mark.end
            },
            target: 'Outside',
            actions: assign((params: any) => ({
              result: params.context.result.concat({
                ranges: params.context.ranges.concat(new Range(
                  params.event.line,
                  params.context.start,
                  params.event.line,
                  params.event.pos,
                )),
                type: params.context.mark.start,
              }),
              ranges: [],
              mark: undefined,
              start: undefined,
            })),
          },
          {
            guard: (params: any) => {
              return params.event.char === '\\'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: 'Inside',
      },
    },
  },
}

const LineStatus = {
  initial: 'FoundTripleSlash',
  states: {
    FoundTripleSlash: {
      on: {
        LINE_INCREMENT: 'AwatingTripleSlash',
        CHARACTER: 'FoundTripleSlash',
        TRIPLE_SLASH: { actions: alert },
        BLOCK_START: { actions: alert },
        BLOCK_END: { actions: alert },
      },
    },
    AwatingTripleSlash: {
      on: {
        TRIPLE_SLASH: {
          target: 'FoundTripleSlash',
          actions: assign((params: any) => {
            if (params.self.getSnapshot().matches({ InTripleSlashDoc: { FormulaStatus: 'Inside' } })) {
              return {
                start: params.event.pos + 3,  // +3 for the '///'
              }
            }
          })
        },
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === ' ' || params.event.char === '\t'
            },
          },
          {
            actions: raise({ type: 'TO_SEEK_DOC' }),
          },
        ],
        LINE_INCREMENT: {
          actions: raise({ type: 'TO_SEEK_DOC' }),
        },
        BLOCK_START: {
          actions: raise({ type: 'TO_IN_BLOCK_DOC' }),
        },
        BLOCK_END: {
          actions: alert,
        },
      },
    },
  },
}

const InTripleSlashDoc = {
  type: 'parallel' as const,
  states: {
    LineStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    LINE_INCREMENT: {
      guard: (params: any) => {
        return params.state.matches({ LineStatus: 'AwatingTripleSlash' })
      },
      target: 'SeekDoc',
    },
    BLOCK_END: { actions: alert },
    BLOCK_START: { actions: alert },
    TRIPLE_SLASH: { actions: alert },
    TO_SEEK_DOC: 'SeekDoc',
    TO_IN_BLOCK_DOC: 'InBlockDoc',
  },
}

const StarStatus = {
  initial: 'Wait',
  states: {
    Wait: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === ' ' || params.event.char === '\t'
            },
            target: 'Wait',
          },
          {
            guard: (params: any) => {
              return params.event.char === '*'
            },
            target: 'Met',
            actions: assign((params: any) => {
              if (params.self.getSnapshot().matches({ InBlockDoc: { FormulaStatus: 'Inside' } })) {
                return {
                  start: params.event.pos + 1,  // +1 for the '*'
                }
              }
            })
          },
          {
            target: 'No',
            actions: assign((params: any) => {
              if (params.self.getSnapshot().matches({ InBlockDoc: { FormulaStatus: 'Inside' } })) {
                return {
                  start: params.event.pos,
                }
              }
            }),
          },
        ],
        LINE_INCREMENT: 'Wait',
      },
    },
    Met: {
      on: {
        LINE_INCREMENT: 'Wait',
        CHARACTER: 'Met',
      },
    },
    No: {
      on: {
        LINE_INCREMENT: 'Wait',
        CHARACTER: 'No',
      },
    },
  },
}

const InBlockDoc = {
  type: 'parallel' as const,
  states: {
    StarStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    BLOCK_END: 'SeekDoc',
  },
}

const Done = {
  type: 'final' as const,
}

interface MachineContext {
  result: DocumentFormulaContext[]
  ranges: Range[]
  start?: number
  mark?: MarkBegin
}

export const StateMachine = createMachine({
  id: 'docstring-c/c++',
  initial: 'SeekDoc',
  context: {
    result: [],
    ranges: [],
    start: undefined,
    mark: undefined,
  } as any,
  states: {
    SeekDoc,
    InTripleSlashDoc,
    InBlockDoc,
    Done,
  },
})

type TextmateToken = Awaited<ReturnType<Awaited<ReturnType<typeof useTokenService>>['fetch']>>[number]
interface DocumentFormulaContext {
  ranges: Range[]
  type: MarkBegin
}

const supportedLangs = ['c', 'cpp'] as const
type SupportedLang = typeof supportedLangs[number]
type KeyScope = 'TRIPLE_SLASH' | 'BLOCK_START' | 'BLOCK_END'
const KEY_SCOPES = Object.fromEntries(supportedLangs.map((lang) => [lang, {
  TRIPLE_SLASH: `punctuation.definition.comment.documentation.${lang}`,
  BLOCK_START: `punctuation.definition.comment.begin.documentation.${lang}`,
  BLOCK_END: `punctuation.definition.comment.end.documentation.${lang}`,
}])) as Record<SupportedLang, Record<KeyScope, string>>

export function parse(tokens: TextmateToken[], lang: SupportedLang): DocumentFormulaContext[] {
  const StateActor = createActor(StateMachine)
  StateActor.start()
  let line: number = 0
  let pos: number, char: string
  let prev: TextmateToken | undefined
  const scopes = Object.entries(KEY_SCOPES[lang]) as [KeyScope, string][]
  tokens.forEach((token) => {
    if (token.line !== line) {
      StateActor.send({
        type: 'LINE_INCREMENT',
        line: line, // previous line
        pos: (prev?.startIndex ?? 0) + (prev?.text.length ?? 0),
      })
      line = token.line
    }
    prev = token
    for (const [key, value] of scopes) {
      if (token.scopes.includes(value)) {
        pos = token.startIndex
        StateActor.send({ type: key, pos })
        return
      }
    }
    for (let i = 0; i < token.text.length; i++) {
      pos = token.startIndex + i
      char = token.text[i]
      StateActor.send({ type: 'CHARACTER', char, pos, line })
    }
  })
  StateActor.send({ type: 'EOF' })
  StateActor.stop()
  return StateActor.getSnapshot().context.result
}
