import type { DocContext } from '../doc/types'
import type { FormulaContext } from './types'
import { isTruthy } from 'mathjax-intellisense-tools/utils'
import { Range } from 'vscode'
import { assign, createActor, createMachine } from 'xstate'
import { document } from '../../store/shared'

interface MarkdownFormulaMark {
  name: string
  sep: string
}

type MarkdownFormulaMarkType = 'inline' | 'block'
const FORMULA_MARKERS = {
  block: { name: 'block', sep: '\n' },
  inline: { name: 'inline', sep: '' },
} as Record<MarkdownFormulaMarkType, MarkdownFormulaMark>

export interface MarkdownFormula {
  ranges: Range[]
  mark: MarkdownFormulaMark
}

export interface MarkdownMachineContext {
  formulas: MarkdownFormula[]
  mark?: MarkdownFormulaMark
  ranges?: Range[]
  start?: number
  line?: number
}

export interface MarkdownMachineEvent {
  type: 'LINE_INCREMENT' | 'CHARACTER' | 'END'
  doc: DocContext
  index: number
  character?: number
}

const MarkdownMachine = createMachine({
  id: 'MarkdownMachine',
  initial: 'Outside',
  types: {} as {
    context: MarkdownMachineContext
    events: MarkdownMachineEvent
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
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '$'
            },
            target: 'OutsideInDollar',
            actions: assign(({ event }) => {
              const { doc, index } = event
              const line = doc.lines[index]
              return {
                start: line.range.start.character + event.character!,
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
        ],
      },
    },
    OutsideInBackSlash: {
      on: {
        CHARACTER: {
          target: 'Outside',
        },
        LINE_INCREMENT: {
          target: 'Outside',
        },
      },
    },
    OutsideInDollar: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '$'
            },
            target: 'Inside',
            actions: assign(() => {
              return {
                mark: FORMULA_MARKERS.block,
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
            target: 'InsideInBackSlash',
            actions: assign(() => {
              return {
                mark: FORMULA_MARKERS.inline,
              }
            }),
          },
          {
            target: 'Inside',
            actions: assign(() => {
              return {
                mark: FORMULA_MARKERS.inline,
              }
            }),
          },
        ],
        LINE_INCREMENT: {
          target: 'Outside',
        },
      },
    },
    Inside: {
      on: {
        CHARACTER: [
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '$'
            },
            target: 'InsideInDollar',
          },
          {
            guard: ({ event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return char === '\\'
            },
            target: 'InsideInBackSlash',
          },
          {
            target: 'Inside',
          },
        ],
        LINE_INCREMENT: [
          {
            guard: ({ context }) => {
              return context.mark!.name === 'inline'
            },
            target: 'Outside',
          },
          {
            guard: ({ context }) => {
              return context.mark!.name === 'block'
            },
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
        ],
      },
    },
    InsideInBackSlash: {
      on: {
        CHARACTER: {
          target: 'Inside',
        },
        LINE_INCREMENT: [
          {
            guard: ({ context }) => {
              return context.mark!.name === 'inline'
            },
            target: 'Outside',
          },
          {
            guard: ({ context }) => {
              return context.mark!.name === 'block'
            },
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
        ],
      },
    },
    InsideInDollar: {
      on: {
        CHARACTER: [
          {
            // BLOCK END
            guard: ({ event, context }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return context.mark!.name === 'block' && char === '$'
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
                      line.range.start.character + event.character!,
                    ),
                  ),
                  mark: context.mark!,
                }),
              }
            }),
          },
          {
            // BLOCK CONTINUE
            guard: ({ context }) => {
              return context.mark!.name === 'block'
            },
            target: 'Inside',
          },
          {
            // INLINE END AND FOUND BACKSLASH
            guard: ({ context, event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return context.mark!.name === 'inline' && char === '\\'
            },
            target: 'OutsideInBackSlash',
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
                      line.range.start.character + event.character! - 1,
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
            // INLINE END AND ANOTHER FORMULA START
            guard: ({ context, event }) => {
              const { doc, index, character } = event
              const line = doc.lines[index]
              const char = line.text[character!]
              return context.mark!.name === 'inline' && char === '\\'
            },
            target: 'OutsideInDollar',
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
                      line.range.start.character + event.character! - 1,
                    ),
                  ),
                  mark: context.mark!,
                }),
                ranges: undefined,
                start: line.range.start.character + event.character!,
                line: line.range.start.line,
              }
            }),
          },
          {
            // INLINE END
            guard: ({ context }) => {
              return context.mark!.name === 'inline'
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
                      line.range.start.character + event.character! - 1,
                    ),
                  ),
                  mark: context.mark!,
                }),
              }
            }),
          },
        ],
        LINE_INCREMENT: [
          {
            // INLINE END
            guard: ({ context }) => {
              return context.mark!.name === 'inline'
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
                      line.range.start.character + event.character! - 1,
                    ),
                  ),
                  mark: context.mark!,
                }),
              }
            }),
          },
          {
            // BLOCK CONTINUE
            guard: ({ context }) => {
              return context.mark!.name === 'block'
            },
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
        ],
      },
    },
  },
})

export function extract(formula: MarkdownFormula) {
  if (!document.value)
    return undefined

  const mlen = 1 + +(formula.mark.name === 'block')

  const text = formula.ranges.map(
    range => document.value!.getText(range),
  ).join(formula.mark.sep).slice(mlen, -mlen).trim()

  return text
}

export function parse(
  doc: DocContext,
): FormulaContext[] {
  const MarkdownActor = createActor(MarkdownMachine)

  MarkdownActor.start()

  let _line: number = doc.lines[0].range.start.line
  doc.lines.forEach((line, index) => {
    if (line.range.start.line !== _line) {
      MarkdownActor.send({
        type: 'LINE_INCREMENT',
        doc,
        index,
      })
      _line = line.range.start.line
    }

    for (let i = 0; i < line.text.length; i++) {
      MarkdownActor.send({
        type: 'CHARACTER',
        doc,
        index,
        character: i,
      })
    }
  })

  const snapshot = MarkdownActor.getSnapshot()

  MarkdownActor.stop()

  return snapshot.context.formulas.map((formula) => {
    const text = extract(formula)
    if (!text)
      return undefined

    return {
      ranges: formula.ranges,
      type: 'markdown' as const,
      text,
    }
  }).filter(isTruthy)
}
