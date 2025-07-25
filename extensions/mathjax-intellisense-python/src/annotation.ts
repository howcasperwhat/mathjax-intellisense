import type { DecorationRenderOptions, ExtensionContext, Range } from 'vscode'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { debounce, len } from 'mathjax-intellisense-tools/utils'
import { computed, useActiveEditorDecorations, watch } from 'reactive-vscode'
import { Uri, window, workspace } from 'vscode'
import { setupWatcher } from './preload'
import { render } from './render'
import { config, document, formulas, perf, preloads, selections } from './store/shared'
import { useTokenService } from './utils'

export async function useAnnotation(context: ExtensionContext) {
  const service = await useTokenService('python', context)

  const PreviewOptions: DecorationRenderOptions = {
    textDecoration: `none; vertical-align:top;`,
  }
  const ShowCodeOptions = computed<DecorationRenderOptions>(() => ({
    textDecoration: `none; vertical-align:top; ${config.extension.code}`,
  }))
  const HideCodeOptions: DecorationRenderOptions = {
    textDecoration: 'none; vertical-align:top; display: none;',
  }

  const SHARED_STYLE = 'position:relative; display:inline-block; vertical-align:top; line-height:0;'
  const center = (top: number, left?: number) => {
    return [
      `top: ${50 + top * 100}%`,
      `left: ${left ? `${left}ch` : '0'}`,
      `transform: translate(${left ? '-50%' : '0'}, -50%)`,
    ].join(';')
  }

  const hidden = (ranges: Range[]) =>
    config.extension.mode === 'edit'
      ? false
      : config.extension.mode === 'view'
        ? true
        : ranges.every(range => selections.value.some(
            selections => !selections.intersection(range),
          ))

  useActiveEditorDecorations(PreviewOptions, () =>
    config.extension.mode === 'edit'
      ? []
      : formulas.value.map(({ ranges, preview, width, start, end }) => {
          const depend = ranges.reduce(
            (max, cur) => len(cur) > len(max) ? cur : max,
            ranges[0],
          )
          const align = (end - start + 1 > 1 && hidden(ranges))
            ? center((start + end) / 2 - depend.start.line, width / 2)
            : center(0)
          return {
            range: depend,
            renderOptions: {
              after: {
                contentIconPath: Uri.parse(preview.url),
                border: `${[
                  'none',
                  config.extension.preview,
                  SHARED_STYLE,
                  align,
                ].join(';')}`,
              },
            },
          }
        }), { updateOn: ['effect'] })

  useActiveEditorDecorations(
    ShowCodeOptions,
    () => formulas.value
      .flatMap(({ ranges }) => ranges),
    { updateOn: ['effect'] },
  )

  useActiveEditorDecorations(
    HideCodeOptions,
    () => formulas.value
      .filter(({ ranges }) => hidden(ranges))
      .flatMap(({ ranges }) => ranges),
    { updateOn: ['effect'] },
  )

  const update = async () => {
    const begin = Date.now()
    const tokens = await service.fetch(document.value!)
    formulas.value = render(tokens)
    const end = Date.now()

    perf.tick(end - begin)
  }
  const trigger = debounce(update, config.extension.interval)

  watch(preloads, (content) => {
    transformer.reset(content.join('\n'))
    trigger()
  })
  // Transformer haven't been init after constructed (before `reset` is called).
  // However, `setupWatcher` will setup `useFsWatcher` and `preload` watcher (immediate),
  // so `transformer` will be `reset` before `trigger` immediately by above `WatchCallback`.
  setupWatcher()

  window.onDidChangeActiveTextEditor(() => {
    // If don't clear the decorations when switching files, two problems will occur:
    // 1. Decorations are still visible after switching to a language that does not trigger the extension
    // 2. Decorations will still exist for `interval` milliseconds after switching files
    formulas.value = []
    trigger()
  }, null, context.subscriptions)

  void ([
    window.onDidChangeActiveColorTheme,
    workspace.onDidChangeTextDocument,
    workspace.onDidChangeConfiguration,
  ].forEach(callback =>
    callback(trigger, null, context.subscriptions),
  ))
}
