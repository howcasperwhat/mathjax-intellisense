import { assign, createMachine, sendParent } from 'xstate'

// https://www.doxygen.nl/manual/formulas.html

const BEGIN_MARKS = ['$', '(', '[', '{'] as const
const END_MARKS = ['$', ')', ']', '}'] as const
const MARKS_MAP = {
  '$': '$',
  '(': ')',
  '[': ']',
  '{': '}',
} as const

type MarkBegin = typeof BEGIN_MARKS[number]
type MarkEnd = typeof END_MARKS[number]

interface FormulaContext {
  end?: MarkEnd
}

interface CharacterEvent {
  char: string
}

const CHARACTER_MAP = {
  ' ': 'WHITESPACE',
  '\t': 'WHITESPACE',
  '\\': 'BACKSLASH',
  'f': 'f',
  '$': '$',
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '{': '{',
  '}': '}',
  '*': '*',
} as Record<string, string>

const SeekDoc = {
  on: {
    TRIPLE_SLASH: 'InTripleSlashDoc',
    BLOCK_START: 'InBlockDoc',
    CHARACTER: 'SeekDoc',
    LINE_INCREMENT: 'SeekDoc',
    EOF: 'Done',
    // ERROR: BLOCK_END
  },
} as const

// ON \in { CHARACTER, LINE_INCREMENT, TRIPLE_SLASH, BLOCK_START, BLOCK_END, EOF }

const LineStatus = {
  initial: 'FoundTripleSlash',
  states: {
    FoundTripleSlash: {
      on: {
        LINE_INCREMENT: 'AwatingTripleSlash',
        CHARACTER: 'FoundTripleSlash',
        TRIPLE_SLASH: {
          actions: sendParent({ type: 'UNEXPECTED_EVENT' })
        },
        BLOCK_START: {
          actions: sendParent({ type: 'TO_IN_BLOCK_DOC' }),
        },
        BLOCK_END: {
          actions: sendParent({ type: 'UNEXPECTED_EVENT' }),
        },
      },
    },
    AwatingTripleSlash: {
      on: {
        TRIPLE_SLASH: 'FoundTripleSlash',
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'WHITESPACE'
            },
            target: 'AwatingTripleSlash',
          },
          {
            actions: sendParent({ type: 'TO_SEEK_DOC' }),
          }
        ],
        LINE_INCREMENT: {
          actions: sendParent({ type: 'TO_SEEK_DOC' }),
        },
        BLOCK_START: {
          actions: sendParent({ type: 'TO_IN_BLOCK_DOC' }),
        },
        BLOCK_END: {
          actions: sendParent({ type: 'UNEXPECTED_EVENT' }),
        }
      },
    },
  },
} as const

const FormulaStatus = {
  initial: 'Outside',
  states: {
    Outside: {
      on: {
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'BACKSLASH'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            target: 'Outside',   
          }
        ],
        LINE_INCREMENT: 'Outside',
      },
    },
    ReadyStartBackSlash: {
      on: {
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'BACKSLASH'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'f'
            },
            target: 'ReadyStartMark',
            actions: assign({ end: undefined }),
          },
          {
            target: 'Outside',
            actions: assign({ end: undefined }),
          }
        ],
        LINE_INCREMENT: 'ReadyStartBackSlash',
      },
    },
    ReadyStartMark: {
      on: {
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return BEGIN_MARKS.includes(event.char as MarkBegin)
            },
            target: 'Inside',
            actions: assign({ end: (_, event: CharacterEvent) => {
              return MARKS_MAP[event.char as MarkBegin] as MarkEnd
            } }),
          },
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'BACKSLASH'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            target: 'Outside',
            actions: assign({ end: undefined }),
          }
        ],
        LINE_INCREMENT: 'ReadyStartMark',
      },
    },
    Inside: {
      on: {
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'BACKSLASH'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            target: 'Inside',
          }
        ],
        LINE_INCREMENT: 'Inside',
      },
    },
    ReadyEndBackSlash: {
      on: {
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'BACKSLASH'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'f'
            },
            target: 'ReadyEndMark',
          },
          {
            target: 'Inside',
          }
        ],
        LINE_INCREMENT: 'ReadyEndBackSlash',
      },
    },
    ReadyEndMark: {
      on: {
        CHARACTER: [
          {
            cond: ({ context, event }: { context: FormulaContext, event: CharacterEvent }) => {
              return event.char === context.end
            },
            target: 'Outside',
            actions: assign({ end: undefined }),
          },
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'BACKSLASH'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: 'ReadyEndMark',
      },
    },
  },
} as const

const InTripleSlashDoc = {
  type: 'parallel',
  states: {
    LineStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    LINE_INCREMENT: {
      // TODO: TypeScript
      cond: ({ state }: { state: any }) => {
        return state.matches({ LineStatus: 'AwatingTripleSlash' })
      },
      target: 'SeekDoc',
    },
    // ERROR: Parent(InTripleSlashDoc):BLOCK_END, 
    // Parent(InBlockDoc):BLOCK_START,TRIPLE_SLASH
    // BLOCK_END: 'UNEXPECTED_EVENT',
    // BLOCK_START: 'UNEXPECTED_EVENT',
    // TRIPLE_SLASH: 'UNEXPECTED_EVENT',
    // JUST in root node should handle these events
    TO_SEEK_DOC: 'SeekDoc',
    TO_IN_BLOCK_DOC: 'InBlockDoc',
    UNEXPECTED_EVENT: {
      // TODO
      actions: []
    },
    // CHARACTER: {
    //   cond: ({ state, event }: { state: any, event: CharacterEvent }) => {
    //     return state.matches({ LineStatus: 'AwatingTripleSlash' })
    //       && CHARACTER_MAP[event.char] !== 'WHITESPACE'
    //   },
    //   target: 'SeekDoc',
    // },
    // BLOCK_START: {
    //   cond: ({ state }: { state: any }) => {
    //     return state.matches({ LineStatus: 'AwatingTripleSlash' })
    //   },
    //   target: 'InBlockDoc',
    // }
    // ERROR: BLOCK_END
  },
} as any

const StarStatus = {
  initial: 'Wait',
  states: {
    Wait: {
      on: {
        CHARACTER: [
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === 'WHITESPACE'
            },
            target: 'Wait',
          },
          {
            cond: ({ event }: { event: CharacterEvent }) => {
              return CHARACTER_MAP[event.char] === '*'
            },
            target: 'Met',
          },
          {
            target: 'No',
          }
        ],
        LINE_INCREMENT: 'Wait',
      },
    },
    Met: {
      on: {
        // 'LINE_INCREMENT': 'Wait',
        // '*': 'Met',
        LINE_INCREMENT: 'Wait',
        CHARACTER: 'Met'
      },
    },
    No: {
      on: {
        // 'LINE_INCREMENT': 'Wait',
        // '*': 'No',
        LINE_INCREMENT: 'Wait',
        CHARACTER: 'No'
      },
    },
  },
} as const

const InBlockDoc = {
  type: 'parallel',
  states: {
    StarStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    BLOCK_END: 'SeekDoc',
  },
} as any

const Done = {
  type: 'final',
} as const

export const StateMachine = createMachine({
  id: 'docstring-c/c++',
  initial: 'SeekDoc',
  states: {
    SeekDoc,
    InTripleSlashDoc,
    InBlockDoc,
    Done,
  },
})
