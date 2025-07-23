import type { SharedFormulaInfo } from '../types'
import { BASE_HEIGHT, GLODEB_LINE_HEIGHT_RATIO } from 'mathjax-intellisense-tools/constant'
import { computed, defineConfigObject, shallowRef, useActiveTextEditor, useIsDarkTheme, useTextEditorSelections } from 'reactive-vscode'
import * as Meta from '../generated/meta'
import { Performance } from '../performance'

export const config = {
  extension: defineConfigObject<Meta.NestedScopedConfigs>(
    Meta.scopedConfigs.scope,
    Meta.scopedConfigs.defaults,
  ),
  editor: defineConfigObject<{ fontSize: number }>(
    'editor',
    { fontSize: 14 },
  ),
}

export const isDark = useIsDarkTheme()
export const editor = useActiveTextEditor()
export const document = computed(() => editor.value?.document)
export const selections = useTextEditorSelections(editor)

export const formulas = shallowRef<SharedFormulaInfo[]>([])
export const preloads = shallowRef<string[]>([])

export const perf = new Performance('Main')

export const lineHeight = computed(() => {
  return Math.round(config.editor.fontSize * GLODEB_LINE_HEIGHT_RATIO)
})

export const color = computed(() => {
  const color = config.extension.color
  if (color === 'auto')
    return isDark.value ? '#eee' : '#111'
  return color
})

export const scale = computed(() => {
  return config.extension.scale * Math.round(
    config.editor.fontSize * GLODEB_LINE_HEIGHT_RATIO,
  ) / BASE_HEIGHT
})
