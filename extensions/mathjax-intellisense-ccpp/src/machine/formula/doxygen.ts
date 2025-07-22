// https://www.doxygen.nl/manual/formulas.html

import type { DocContext } from '../doc/types'
import type { FormulaContext } from './types'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { Range } from 'vscode'
import { assign, createActor, createMachine } from 'xstate'
import { document } from '../../store/shared'

export interface DoxygenFormulaMark {
  name: string
  start: string
  end: string
  sep: string
}

const BEGIN_MARKS = ['$', '(', '[', '{'] as const
type DoxygenFormulaMarkBegin = typeof BEGIN_MARKS[number]
const FORMULA_MARKERS = {
  '$': { name: '$$', start: '$', end: '$', sep: '' },
  '(': { name: '()', start: '(', end: ')', sep: '' },
  '[': { name: '[]', start: '[', end: ']', sep: '\n' },
  '{': { name: '{}', start: '{', end: '}', sep: '\n' },
} as Record<DoxygenFormulaMarkBegin, DoxygenFormulaMark>

export interface DoxygenFormula {
  ranges: Range[]
  mark: DoxygenFormulaMark
}

export interface DoxygenMachineContext {
  formulas: DoxygenFormula[]
  mark?: DoxygenFormulaMark
  ranges?: Range[]
  start?: number
  line?: number
}

export interface DoxygenMachineEvent {
  type: 'LINE_INCREMENT' | 'CHARACTER' | 'END'
  doc: DocContext
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
    mark: undefined,
    ranges: undefined,
    start: undefined,
    line: undefined,
  },
  on: {
    END: {
      target: '.Outside',
    },
  },
  states: {
    Outside: {
      entry: assign(() => {
        return {
          ranges: undefined,
          mark: undefined,
          start: undefined,
          line: undefined,
        }
      }),
      on: {
        CHARACTER: {
          guard: ({ event }) => {
            const { doc, index, character } = event
            const line = doc.lines[index]
            const char = line.text[character!]
            return char === '\\'
          },
          target: 'OutsideInBackSlash',
        },
      },
    },
    OutsideInBackSlash: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === 'f'
            },
            target: 'OutsideInBackSlashF',
          },
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'Outside',
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
    OutsideInBackSlashF: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return BEGIN_MARKS.includes(char as DoxygenFormulaMarkBegin)
            },
            target: 'Inside',
            actions: assign(({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return {
                mark: FORMULA_MARKERS[char as DoxygenFormulaMarkBegin],
                start: line.range.start.character + character! - 2, // Skip the `\f`
                line: line.range.start.line,
              }
            }),
          },
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'OutsideInBackSlash',
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
            const { doc, index, character } = event
            const line = doc.lines[index]
            const char = line.text[character!]
            return char === '\\'
          },
          target: 'InsideInSlash',
        },
        LINE_INCREMENT: {
          target: 'Inside',
          actions: assign(({ context, event }) => {
            const { doc, index } = event
            const line = doc.lines[index]
            const prev = doc.lines[index - 1]
            return {
              ranges: (context.ranges ?? []).concat(
                new Range(
                  context.line!,
                  context.start!,
                  context.line!,
                  prev.range.end.character,
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
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === 'f'
            },
            target: 'InsideInSlashF',
          },
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'Inside',
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
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === context.mark!.end
            },
            target: 'Outside',
            actions: assign(({ context, event }) => {
              const { doc, index } = event
              const line = doc.lines[index]
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
              const { doc, index, character } = event
              const line = doc.lines[index]
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
  if (!document.value)
    return undefined

  let text = formula.ranges.map(
    range => document.value!.getText(range),
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

export function parse(
  doc: DocContext,
): FormulaContext[] {
  const DoxygenActor = createActor(DoxygenMachine)

  DoxygenActor.start()

  let _line: number = doc.lines[0].range.start.line
  doc.lines.forEach((line, index) => {
    if (line.range.start.line !== _line) {
      DoxygenActor.send({
        type: 'LINE_INCREMENT',
        doc,
        index,
      })
      _line = line.range.start.line
    }

    for (let i = 0; i < line.text.length; i++) {
      DoxygenActor.send({
        type: 'CHARACTER',
        doc,
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
      type: 'doxygen' as const,
      text,
    }
  }).filter(isTruthy)
}
