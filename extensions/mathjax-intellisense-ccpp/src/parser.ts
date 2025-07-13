import type { TextmateToken } from 'vscode-textmate-languageservice'
import type { SharedFormulaInfo } from './types'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { Range, TextLine, window } from 'vscode'
import { assign, createActor, createMachine, raise } from 'xstate'
import { color, config, doc, lineHeight, scale } from './store/shared'

// https://www.doxygen.nl/manual/formulas.html

interface MarkInfo {
  name: string
  start: string
  end: string
  sep: string
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
  entry: assign(params => ({
    result: params.context.result,
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
            guard: (params: any) => {
              return BEGIN_MARKS.includes(params.event.char)
            },
            target: 'Inside',
            actions: assign((params: any) => ({
              ranges: [],
              mark: FORMULA_MARKERS[params.event.char as MarkBegin],
              start: params.event.pos - 2, // `/f`
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
                params.event.pos + 1,
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
                  params.event.pos + 1,
                )),
                mark: params.context.mark,
                block: params.self.getSnapshot().matches('InBlockDoc'),
              }),
              ranges: undefined,
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
  initial: 'Start',
  states: {
    Wait: {
      on: {
        TRIPLE_SLASH: 'Met',
        CHARACTER: [
          {
            guard: (params: any) => {
              return params.event.char === ' ' || params.event.char === '\t'
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
          actions: assign((params: any) => {
            if (params.self.getSnapshot().matches({
              InTripleSlashDoc: {
                FormulaStatus: 'Inside',
              },
            })) {
              return {
                start: params.event.pos + +(params.event.char === ' '),
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
  states: {
    LineStatus,
    FormulaStatus,
  },
  on: {
    EOF: 'Done',
    LINE_INCREMENT: {
      guard: (params: any) => {
        return params.state.matches({ LineStatus: 'Wait' })
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
            target: 'Met',
            actions: assign((params: any) => {
              if (params.self.getSnapshot().matches({
                InBlockDoc: {
                  FormulaStatus: 'Inside',
                },
              })) {
                return {
                  start: params.event.pos + +(params.event.char === '*'),
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
          actions: assign((params: any) => {
            if (params.self.getSnapshot().matches({
              InBlockDoc: {
                FormulaStatus: 'Inside',
              },
            })) {
              return {
                start: params.event.pos + +(params.event.char === ' '),
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
}

const Done = {
  type: 'final' as const,
}

export const StateMachine = createMachine({
  id: 'docstring-c/c++',
  initial: 'SeekDoc',
  context: {
    result: [],
    ranges: undefined,
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

export interface DocumentFormulaContext {
  ranges: Range[]
  mark: MarkInfo
  block: boolean
}

const supportedLangs = ['c', 'cpp'] as const
type SupportedLang = typeof supportedLangs[number]
type KeyScope = 'TRIPLE_SLASH' | 'BLOCK_START' | 'BLOCK_END'
const KEY_SCOPES = Object.fromEntries(supportedLangs.map(lang => [lang, {
  TRIPLE_SLASH: `punctuation.definition.comment.documentation.${lang}`,
  BLOCK_START: `punctuation.definition.comment.begin.documentation.${lang}`,
  BLOCK_END: `punctuation.definition.comment.end.documentation.${lang}`,
}])) as Record<SupportedLang, Record<KeyScope, string>>

export async function parse(tokens: TextmateToken[], lang: SupportedLang): Promise<DocumentFormulaContext[]> {
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
        line, // previous line
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

export function render(formulas: DocumentFormulaContext[]): SharedFormulaInfo[] {
  if (!doc.value)
    return []

  const result: SharedFormulaInfo[] = []
  for (const formula of formulas) {
    const texes: string[] = []
    const { ranges, mark, block } = formula

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

    const { start, end } = filledRange(ranges, block)

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
