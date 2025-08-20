import type { ExtensionContext, Range } from 'vscode'
import type { TokenizerService } from 'vscode-textmate-languageservice/dist/types/services/tokenizer'
import TextmateLanguageService from 'vscode-textmate-languageservice'

const services = new Map<string, TokenizerService>()

export async function useTokenService(lang: string, context?: ExtensionContext) {
  if (services.has(lang)) {
    return services.get(lang)!
  }

  const service = await (new TextmateLanguageService(lang, context)).initTokenService()
  services.set(lang, service)
  return service
}

export function validateRanges(ranges: Range[]) {
  if (ranges.length === 0)
    return false
  const start = ranges[0].start.line
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]
    if (range.start.line !== range.end.line)
      return false
    if (range.start.line !== start + i)
      return false
    if (range.start.character > range.end.character)
      return false
  }
  return true
}
