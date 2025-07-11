import type { ExtensionContext } from 'vscode'
import type { TokenizerService } from 'vscode-textmate-languageservice/dist/types/services/tokenizer'
import TextmateLanguageService from 'vscode-textmate-languageservice'

const services = new Map<string, TokenizerService>()

export async function useTokenService(lang: string, context: ExtensionContext) {
  if (services.has(lang)) {
    return services.get(lang)!
  }

  const service = await (new TextmateLanguageService(lang, context)).initTokenService()
  services.set(lang, service)
  return service
}
