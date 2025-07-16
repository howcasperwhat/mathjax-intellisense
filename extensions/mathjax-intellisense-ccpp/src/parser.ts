import type { TextLine } from 'vscode'
import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { SharedFormulaInfo } from './types'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { Range, window } from 'vscode'
import { assign, createActor, createMachine, raise } from 'xstate'
import { color, doc, lineHeight, scale } from './store/shared'

// https://www.doxygen.nl/manual/formulas.html

interface MarkInfo {
  name: string
  start: string
  end: string
  sep: string
}

interface MachineEvent {
  type: 'CHARACTER'
  tokens: TextmateToken[]
  index: number
  pos?: number
}

interface MachineContext {
  formulas: DocumentFormulaContext[]
  docs: DocumentContext[]
  docid?: number
  longest?: number
  ranges?: Range[]
  dstart?: number
  fstart?: number
  mark?: MarkInfo
}

interface MachineParams {
  context: MachineContext
  event: MachineEvent
  // have state ?
  state: any
  self: any
}

export const FORMULA_MARKERS = {
  '$': { name: '$$', start: '$', end: '$', sep: '' },
  '(': { name: '()', start: '(', end: ')', sep: '' },
  '[': { name: '[]', start: '[', end: ']', sep: '\n' },
  '{': { name: '{}', start: '{', end: '}', sep: '\n' },
}

const BEGIN_MARKS = Object.keys(FORMULA_MARKERS) as (keyof typeof FORMULA_MARKERS)[]
type MarkBegin = typeof BEGIN_MARKS[number]

const SeekDoc = {
  entry: assign(({ context }: MachineParams) => ({
    result: context.formulas,
    range: [],
    start: undefined,
    mark: undefined,
  })),
  on: {
    CHARACTER: 'SeekDoc',
    LINE_INCREMENT: 'SeekDoc',
    TRIPLE_SLASH: 'InTripleSlashDoc',
    BLOCK_START: 'InBlockDoc',
    EOF: 'Done',
    BLOCK_END: {
      actions: () => window.showErrorMessage(
        'Unexpected `BLOCK_END` when `SeekDoc` state.',
      ),
    },
  },
} as any

const FormulaStatus = {
  initial: 'Outside',
  states: {
    Outside: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === '\\'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            target: 'Outside',
          },
        ],
      },
    },
    ReadyStartBackSlash: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === '\\'
            },
            target: 'ReadyStartBackSlash',
          },
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === 'f'
            },
            target: 'ReadyStartMark',
          },
          {
            target: 'Outside',
          },
        ],
        LINE_INCREMENT: 'Outside',
      },
    },
    ReadyStartMark: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return (BEGIN_MARKS as string[]).includes(tokens[index].text[pos!])
            },
            target: 'Inside',
            actions: assign(({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return {
                ranges: [],
                mark: FORMULA_MARKERS[tokens[index].text[pos!] as MarkBegin],
                start: event.pos! - 2, // `/f`
              }
            }),
          },
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === '\\'
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
    Inside: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === '\\'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: {
          target: 'Inside',
          actions: assign(({ context, event }: MachineParams) => {
            const token = event.tokens[event.index]
            if (!context.fstart || !context.ranges) {
              window.showErrorMessage(
                'Unexpected `LINE_INCREMENT` when `Inside` state without `fstart` or `ranges`.',
              )
            }
            return {
              ranges: context.ranges!.concat(new Range(
                token.line - 1,
                context.fstart!,
                token.line - 1,
                Number.MAX_SAFE_INTEGER,
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
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === '\\'
            },
            target: 'ReadyEndBackSlash',
          },
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === 'f'
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
            guard: ({ event, context }: MachineParams) => {
              if (!context.mark) {
                window.showErrorMessage(
                  'Unexpected `ReadyEndMark` state without `mark`.',
                )
              }
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === context.mark!.end
            },
            target: 'Outside',
            actions: assign(({ event, context }: MachineParams) => {
              const { tokens, index, pos } = event
              const line = tokens[index].line
              return {
                result: context.formulas.concat({
                  ranges: context.ranges!.concat(new Range(
                    line,
                    context.fstart!,
                    line,
                    pos! + 1,
                  )),
                  mark: context.mark!,
                  docid: context.docid!,
                }),
                ranges: undefined,
                mark: undefined,
                fstart: undefined,
              }
            }),
          },
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              return tokens[index].text[pos!] === '\\'
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
  initial: 'Start',
  states: {
    Wait: {
      on: {
        TRIPLE_SLASH: 'Met',
        CHARACTER: [
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              const char = tokens[index].text[pos!]
              return char === ' ' || char === '\t'
            },
          },
          {
            actions: raise({ type: 'TRIPLE_SLASH_DOC_END' }),
          },
        ],
        LINE_INCREMENT: {
          actions: raise({ type: 'TRIPLE_SLASH_DOC_END' }),
        },
      },
    },
    Met: {
      on: {
        CHARACTER: {
          target: 'Start',
          actions: assign(({ event, self }: MachineParams) => {
            if (self.getSnapshot().matches({
              InTripleSlashDoc: {
                FormulaStatus: 'Inside',
              },
            })) {
              const { tokens, index, pos } = event
              return {
                start: pos! + +(tokens[index].text[pos!] === ' '),
              }
            }
          }),
        },
        LINE_INCREMENT: 'Wait',
      },
    },
    Start: {
      on: {
        CHARACTER: 'Start',
        LINE_INCREMENT: 'Wait',
      },
    },
  },
}

const InTripleSlashDoc = {
  type: 'parallel' as const,
  entry: assign(({ context }: MachineParams) => {
    return {
      docid: (context.docid ?? 0) + 1,
      ranges: [],
      start: undefined,
      mark: undefined,
    }
  }),
  states: {
    LineStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    LINE_INCREMENT: {
      guard: ({ state }: MachineParams) => {
        return state.matches({ LineStatus: 'Wait' })
      },
      target: 'SeekDoc',
    },
    BLOCK_START: 'InBlockDoc',
    BLOCK_END: {
      actions: () => window.showErrorMessage(
        'Unexpected `BLOCK_END` when `InTripleSlashDoc` state.',
      ),
    },
    TRIPLE_SLASH_DOC_END: 'SeekDoc',
  },
} as any

const StarStatus = {
  initial: 'Wait',
  states: {
    Wait: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }: MachineParams) => {
              const { tokens, index, pos } = event
              const char = tokens[index].text[pos!]
              return char === ' ' || char === '\t'
            },
            target: 'Wait',
          },
          {
            target: 'Met',
            actions: assign(({ event, self }: MachineParams) => {
              if (self.getSnapshot().matches({
                InBlockDoc: {
                  FormulaStatus: 'Inside',
                },
              })) {
                const { tokens, index, pos } = event
                return {
                  start: pos! + +(tokens[index].text[pos!] === '*'),
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
        CHARACTER: {
          target: 'Start',
          actions: assign(({ event, self }: MachineParams) => {
            if (self.getSnapshot().matches({
              InBlockDoc: {
                FormulaStatus: 'Inside',
              },
            })) {
              const { tokens, index, pos } = event
              return {
                start: pos! + +(tokens[index].text[pos!] === ' '),
              }
            }
          }),
        },
        LINE_INCREMENT: 'Wait',
      },
    },
    Start: {
      on: {
        CHARACTER: 'Start',
        LINE_INCREMENT: 'Wait',
      },
    },
  },
}

const InBlockDoc = {
  type: 'parallel' as const,
  entry: assign(({ context }: MachineParams) => {
    return {
      docid: (context.docid ?? 0) + 1,
      ranges: [],
      start: undefined,
      mark: undefined,
    }
  }),
  states: {
    StarStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    BLOCK_START: {
      actions: () => window.showErrorMessage(
        'Unexpected `BLOCK_START` when `InBlockDoc` state.',
      ),
    },
    BLOCK_END: 'SeekDoc',
    TRIPLE_SLASH: {
      actions: () => window.showErrorMessage(
        'Unexpected `TRIPLE_SLASH` when `InBlockDoc` state.',
      ),
    },
  },
} as any

const Done = {
  type: 'final' as const,
}

export const StateMachine = createMachine({
  id: 'docstring-c/c++',
  initial: 'SeekDoc',
  context: {
    formulas: [],
    docs: [],
    docid: undefined,
    longest: undefined,
    ranges: undefined,
    start: undefined,
    mark: undefined,
  } as MachineContext,
  states: {
    SeekDoc,
    InTripleSlashDoc,
    InBlockDoc,
    Done,
  },
})

export interface DocumentContext {
  type: 'triple-slash' | 'block'
  longest: number
}

export interface DocumentFormulaContext {
  ranges: Range[]
  mark: MarkInfo
  docid: number
}

const supportedLangs = ['c', 'cpp'] as const
type SupportedLang = typeof supportedLangs[number]
type KeyScope = 'TRIPLE_SLASH' | 'BLOCK_START' | 'BLOCK_END'
const KEY_SCOPES = Object.fromEntries(supportedLangs.map(lang => [lang, {
  TRIPLE_SLASH: `punctuation.definition.comment.documentation.${lang}`,
  BLOCK_START: `punctuation.definition.comment.begin.documentation.${lang}`,
  BLOCK_END: `punctuation.definition.comment.end.documentation.${lang}`,
}])) as Record<SupportedLang, Record<KeyScope, string>>

export async function parse(tokens: TextmateToken[], lang: SupportedLang) {
  const StateActor = createActor(StateMachine)
  StateActor.start()
  let line: number = 0
  // let pos: number, char: string
  // let prev: TextmateToken | undefined
  const scopes = Object.entries(KEY_SCOPES[lang]) as [KeyScope, string][]
  tokens.forEach((token, index) => {
    if (token.line !== line) {
      StateActor.send({
        type: 'LINE_INCREMENT',
        tokens,
        index,
        // line, // previous line
        // pos: (prev?.startIndex ?? 0) + (prev?.text.length ?? 0),
      })
      line = token.line
    }
    // prev = token
    for (const [key, value] of scopes) {
      if (token.scopes.includes(value)) {
        // pos = token.startIndex
        StateActor.send({ type: key, tokens, index })
        return
      }
    }
    for (let i = 0; i < token.text.length; i++) {
      // pos = token.startIndex + i
      // char = token.text[i]
      StateActor.send({ type: 'CHARACTER', tokens, index, pos: i })
    }
  })
  StateActor.send({ type: 'EOF' })
  StateActor.stop()
  const snapshot = StateActor.getSnapshot()
  return {
    formulas: snapshot.context.formulas,
    docs: snapshot.context.docs,
  }
}

export function filledRange(ranges: Range[], block: boolean) {
  if (!doc.value || ranges.length <= 2)
    return { start: ranges[0].start.line, end: ranges[0].end.line }

  const first = ranges.at(0)!
  const last = ranges.at(-1)!

  let [firstFilled, lastFilled] = [false, false]
  let line: TextLine, pos: number
  if (block) {
    line = doc.value.lineAt(first.start.line)
    pos = line.firstNonWhitespaceCharacterIndex
    if (line.text[pos] === '*')
      pos += 1 + +(line.text[pos + 1] === ' ')
    firstFilled = first.start.character === pos
  }
  else {
    line = doc.value.lineAt(first.start.line)
    pos = line.firstNonWhitespaceCharacterIndex
    pos = pos + 3 + +(line.text[pos + 3] === ' ')
    firstFilled = first.start.character === pos
  }

  line = doc.value.lineAt(last.end.line)
  lastFilled = line.range.end.character === last.end.character

  return {
    start: first.start.line + +!(firstFilled),
    end: last.end.line - +!(lastFilled),
  }
}

export function render(docs: DocumentContext[], formulas: DocumentFormulaContext[]): SharedFormulaInfo[] {
  if (!doc.value)
    return []

  const result: SharedFormulaInfo[] = []
  for (const formula of formulas) {
    const texes: string[] = []
    const { ranges, mark, docid } = formula

    if (ranges.length === 0)
      continue

    let [depend, max] = [ranges[0], 0]
    for (const range of ranges) {
      const text = doc.value.getText(range)
      if (range.end.character > max) {
        max = range.end.character
        depend = range
      }
      texes.push(text)
    }

    let tex = texes.join(mark.sep).trim().slice(3, -3)
    if (mark.name === '{}') {
      const idx = tex.indexOf('}{')
      if (idx === -1)
        continue
      const env = tex.slice(0, idx)
      tex = `\\begin{${env}}${tex.slice(idx + 2)}\\end{${env}}`
    }

    const { start, end } = filledRange(ranges, docs[docid].type === 'block')

    const preview = transformer.from(tex, {
      color: color.value,
      scale: scale.value,
      maxHeight: (end - start + 1) * lineHeight.value,
    })
    const display = (start + end) / 2

    result.push({ ranges, preview, depend, display, width: max })
  }

  return result
}
