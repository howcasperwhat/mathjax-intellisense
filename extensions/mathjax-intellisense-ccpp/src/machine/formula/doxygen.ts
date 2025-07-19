// https://www.doxygen.nl/manual/formulas.html

import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { Range } from 'vscode'
import { assign, createActor, createMachine } from 'xstate'
import { doc } from '../../store/shared'

export interface DoxygenMark {
  name: string
  start: string
  end: string
  sep: string
}

const BEGIN_MARKS = ['$', '(', '[', '{'] as const
type DoxygenMarkBegin = typeof BEGIN_MARKS[number]
const FORMULA_MARKERS = {
  '$': { name: '$$', start: '$', end: '$', sep: '' },
  '(': { name: '()', start: '(', end: ')', sep: '' },
  '[': { name: '[]', start: '[', end: ']', sep: '\n' },
  '{': { name: '{}', start: '{', end: '}', sep: '\n' },
} as Record<DoxygenMarkBegin, DoxygenMark>

export interface DoxygenFormula {
  ranges: Range[]
  mark: DoxygenMark
}

export interface DocLine {
  range: Range
  text: string
}

export interface DoxygenMachineContext {
  formulas: DoxygenFormula[]
  mark?: DoxygenMark
  ranges?: Range[]
  start?: number
  line?: number
}

export interface DoxygenMachineEvent {
  type: 'LINE_INCREMENT' | 'CHARACTER'
  lines: DocLine[]
  index: number
  character?: number
}

export const DoxygenMachine = createMachine({
  id: 'DoxygenMachine',
  initial: 'Outside',
  types: {} as {
    context: DoxygenMachineContext
    events: DoxygenMachineEvent
  },
  context: {
    formulas: [],
    ranges: undefined,
    start: undefined,
    line: undefined,
  },
  states: {
    Outside: {
      on: {
        CHARACTER: {
          guard: ({ event }) => {
            const { lines, index, character } = event
            const line = lines[index]
            const char = line.text[character!]
            return char === '\\'
          },
          target: 'OutsideInSlash',
        },
      },
    },
    OutsideInSlash: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === 'f'
            },
            target: 'OutsideInSlashF',
          },
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'OutsideInSlash',
          },
          {
            target: 'Outside',
          },
        ],
        LINE_INCREMENT: {
          target: 'Outside',
        },
      },
    },
    OutsideInSlashF: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return BEGIN_MARKS.includes(char as DoxygenMarkBegin)
            },
            target: 'Inside',
            actions: assign(({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return {
                mark: FORMULA_MARKERS[char as DoxygenMarkBegin],
                start: line.range.start.character + character! - 2, // Skip the `\f`
                line: line.range.start.line,
              }
            }),
          },
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'OutsideInSlash',
          },
          {
            target: 'Outside',
          },
        ],
        LINE_INCREMENT: {
          target: 'Outside',
        },
      },
    },
    Inside: {
      on: {
        CHARACTER: {
          guard: ({ event }) => {
            const { lines, index, character } = event
            const line = lines[index]
            const char = line.text[character!]
            return char === '\\'
          },
          target: 'InsideInSlash',
        },
        LINE_INCREMENT: {
          target: 'Inside',
          actions: assign(({ context, event }) => {
            const { lines, index } = event
            const line = lines[index]
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  lines[index - 1].range.end.character,
                ),
              ),
              start: line.range.start.character,
              line: line.range.start.line,
            }
          }),
        },
      },
    },
    InsideInSlash: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === 'f'
            },
            target: 'InsideInSlashF',
          },
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'InsideInSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: {
          target: 'Inside',
        },
      },
    },
    InsideInSlashF: {
      on: {
        CHARACTER: [
          {
            guard: ({ event, context }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === context.mark!.end
            },
            target: 'Outside',
            actions: assign(({ context, event }) => {
              const { lines, index } = event
              const line = lines[index]
              return {
                formulas: context.formulas.concat({
                  ranges: (context.ranges ?? []).concat(
                    new Range(
                      context.line!,
                      context.start!,
                      context.line!,
                      line.range.start.character + event.character! + 1,
                    ),
                  ),
                  mark: context.mark!,
                }),
                ranges: undefined,
                start: undefined,
                line: undefined,
              }
            }),
          },
          {
            guard: ({ event }) => {
              const { lines, index, character } = event
              const line = lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'InsideInSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: {
          target: 'Inside',
        },
      },
    },
  },
})

export function extract(formula: DoxygenFormula) {
  if (!doc.value)
    return undefined

  let text = formula.ranges.map(
    range => doc.value!.getText(range),
  ).join(formula.mark.sep).slice(3, -3).trim()

  if (formula.mark.name === '{}') {
    const idx = text.indexOf('}{')
    if (idx === -1)
      return undefined
    const env = text.slice(0, idx)
    text = `\\begin{${env}}\n${text.slice(idx + 2)}\n\\end{${env}}`
  }

  return text
}

export async function parse(lines: DocLine[]) {
  const DoxygenActor = createActor(DoxygenMachine)

  DoxygenActor.start()

  let _line: number = lines[0].range.start.line
  lines.forEach((line, index) => {
    if (line.range.start.line !== _line) {
      DoxygenActor.send({
        type: 'LINE_INCREMENT',
        lines,
        index,
      })
      _line = line.range.start.line
    }

    for (let i = 0; i < line.text.length; i++) {
      DoxygenActor.send({
        type: 'CHARACTER',
        lines,
        index,
        character: i,
      })
    }
  })

  const snapshot = DoxygenActor.getSnapshot()

  DoxygenActor.stop()

  return snapshot.context.formulas.map((formula) => {
    const text = extract(formula)
    if (!text)
      return undefined

    return {
      ranges: formula.ranges,
      text,
    }
  }).filter(isTruthy)
}
