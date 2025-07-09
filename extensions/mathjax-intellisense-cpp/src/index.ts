import type { ExtensionContext } from 'vscode'
import { useTokenService } from 'mathjax-tools/src/token-service'
import { defineExtension, watch } from 'reactive-vscode'
import { text } from './store/shared'
import { parse } from './parser'

const { activate, deactivate } = defineExtension(
  async (context: ExtensionContext) => {
    const service = await useTokenService('cpp', context)

    watch(text, async () => {
      const begin = Date.now()
      const tokens = await service.fetch(text.value!)
      const formulas = parse(tokens, 'cpp')
      const end = Date.now()
      // eslint-disable-next-line no-console
      console.log(`Textmate tokens fetched in ${end - begin}ms : `, formulas)
    }, { immediate: true })
  },
)
export { activate, deactivate }
