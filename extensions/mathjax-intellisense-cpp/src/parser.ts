import type { useTokenService } from 'mathjax-tools/src/token-service'
import type { Range } from 'vscode'
import { assign, createActor, createMachine, raise } from 'xstate'

// https://www.doxygen.nl/manual/formulas.html

const BEGIN_MARKS = ['$', '(', '[', '{'] as const
// eslint-disable-next-line unused-imports/no-unused-vars
const END_MARKS = ['$', ')', ']', '}'] as const
const MARKS_MAP = {
  '$': '$',
  '(': ')',
  '[': ']',
  '{': '}',
} as const

type MarkBegin = typeof BEGIN_MARKS[number]
type MarkEnd = typeof END_MARKS[number]

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

function alert() {
  console.error('Unexpected character or sequence in docstring parsing.')
}

// ON \in { CHARACTER, LINE_INCREMENT, TRIPLE_SLASH, BLOCK_START, BLOCK_END, EOF }

const SeekDoc = {
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
              return CHARACTER_MAP[params.event.char] === 'BACKSLASH'
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
              return CHARACTER_MAP[parmas.event.char] === 'BACKSLASH'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === 'f'
            },
            target: 'ReadyStartMark',
            actions: assign({ end: undefined }),
          },
          {
            target: 'Outside',
            actions: assign({ end: undefined }),
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
            actions: assign({
              end: (params: any) => {
                return MARKS_MAP[params.event.char as MarkBegin] as MarkEnd
              },
            }),
          },
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === 'BACKSLASH'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            target: 'Outside',
            actions: assign({ end: undefined }),
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
              return CHARACTER_MAP[params.event.char] === 'BACKSLASH'
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
    ReadyEndBackSlash: {
      on: {
        CHARACTER: [
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === 'BACKSLASH'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === 'f'
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
              return params.event.char === params.context.end
            },
            target: 'Outside',
            actions: assign({ end: undefined }),
          },
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === 'BACKSLASH'
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
        TRIPLE_SLASH: 'FoundTripleSlash',
        CHARACTER: [
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === 'WHITESPACE'
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
              return CHARACTER_MAP[params.event.char] === 'WHITESPACE'
            },
            target: 'Wait',
          },
          {
            guard: (params: any) => {
              return CHARACTER_MAP[params.event.char] === '*'
            },
            target: 'Met',
          },
          {
            target: 'No',
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

export const StateMachine = createMachine({
  id: 'docstring-c/c++',
  initial: 'SeekDoc',
  context: { end: undefined } as any,
  states: {
    SeekDoc,
    InTripleSlashDoc,
    InBlockDoc,
    Done,
  },
})

type TextmateTokens = Awaited<ReturnType<Awaited<ReturnType<typeof useTokenService>>['fetch']>>
interface DocumentFormulaContext {
  ranges: Range[]
  tex: string
  type: '$$' | '()' | '[]' | '{}'
}

const supportedLangs = ['c', 'cpp'] as const
type SupportedLang = typeof supportedLangs[number]
type KeyScope = 'TRIPLE_SLASH' | 'BLOCK_START' | 'BLOCK_END'
const KEY_SCOPES = Object.fromEntries(supportedLangs.map((lang) => [lang, {
  TRIPLE_SLASH: `punctuation.definition.comment.documentation.${lang}`,
  BLOCK_START: `punctuation.definition.comment.begin.documentation.${lang}`,
  BLOCK_END: `punctuation.definition.comment.end.documentation.${lang}`,
}])) as Record<SupportedLang, Record<KeyScope, string>>

export function parse(tokens: TextmateTokens, lang: SupportedLang): DocumentFormulaContext[] {
  const StateActor = createActor(StateMachine)
  StateActor.start()
  let scope: KeyScope | undefined
  let line: number | undefined
  const scopes = Object.entries(KEY_SCOPES[lang]) as [KeyScope, string][]
  tokens.forEach((token) => {
    for (const [key, value] of scopes) {
      if (token.scopes.includes(value) && scope !== key) {
        scope = key
        StateActor.send({ type: key })
        return
      }
    }
    if (token.line !== line) {
      line = token.line
      StateActor.send({ type: 'LINE_INCREMENT' })
    }
    for (const char of token.text) {
      StateActor.send({ type: 'CHARACTER', char })
    }
  })
  StateActor.send({ type: 'EOF' })
  StateActor.stop()
  return []
}
