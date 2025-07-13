import type { DecorationRenderOptions, ExtensionContext } from 'vscode'
import { transformer } from 'mathjax-intellisense-tools/transformer'
import { debounce } from 'mathjax-intellisense-tools/utils'
import { computed, useActiveEditorDecorations, watch } from 'reactive-vscode'
import { Uri, window, workspace } from 'vscode'
import { parse, render } from './parser'
import { setupWatcher } from './preload'
import { config, doc, formulas, lang, preloads, selections } from './store/shared'
import { useTokenService } from './utils'

export async function useAnnotation(context: ExtensionContext) {
  const services = {
    c: await useTokenService('c', context),
    cpp: await useTokenService('cpp', context),
  }

  const MultiplePreviewOptions: DecorationRenderOptions = {
    textDecoration: `none; vertical-align:top;`,
  }
  const ShowCodeOptions = computed<DecorationRenderOptions>(() => ({
    textDecoration: `none; vertical-align:top;`,
  }))
  const HideCodeOptions: DecorationRenderOptions = {
    textDecoration: 'none; vertical-align:top; display: none;',
  }

  const INJECTION = [
    'position:relative',
    'display:inline-flex',
    'top:50%',
    'transform:translateY(-50%)',
    'vertical-align:top',
    'line-height:0',
  ].join(';')

  useActiveEditorDecorations(MultiplePreviewOptions, () =>
    formulas.value.map(({ ranges, preview, depend, display }) => {
      if (ranges.length > 2) {
        return {
          range: depend,
          renderOptions: {
            after: {
              contentIconPath: Uri.parse(preview.url),
              border: `none;${INJECTION};top:${50 + (display - depend.start.line) * 100}%;`,
            },
          },
        }
      }
      else {
        return {
          range: ranges[0],
          renderOptions: {
            after: {
              contentIconPath: Uri.parse(preview.url),
              border: `none;${INJECTION};`,
            },
          },
        }
      }
    }), { updateOn: ['effect'] })
  useActiveEditorDecorations(ShowCodeOptions, () => {
    return formulas.value
      .flatMap(({ ranges }) => ranges)
      .map(range => ({ range }))
  }, { updateOn: ['effect'] })
  useActiveEditorDecorations(HideCodeOptions, () =>
    formulas.value.filter(({ ranges }) =>
      ranges.every(range => selections.value.some(
        selections => !selections.intersection(range),
      )),
    ).flatMap(({ ranges }) => ranges), { updateOn: ['effect'] })

  const update = async () => {
    if (!lang.value)
      return

    const tokens = await services[lang.value].fetch(doc.value!)
    formulas.value = render(await parse(tokens, lang.value))
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
