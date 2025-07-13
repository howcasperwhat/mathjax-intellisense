import { resolve as _resolve, isAbsolute, join } from 'pathe'
import { workspace } from 'vscode'
import { MATHJAX_TEX_EX } from './store/constant'

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

export function resolve(path: string) {
  if (isAbsolute(path))
    return _resolve(path)
  const folders = workspace.workspaceFolders
  return folders?.length
    ? folders.map(f => join(f.uri.fsPath, path))
    : []
}

export function resolves(path: string | string[]) {
  path = Array.isArray(path) ? path : [path]
  return Array.from(new Set(path)).map(p => resolve(p)).flat()
}

export function exToPx(ex: number) {
  return ex * MATHJAX_TEX_EX
}

export function duplicate<T>(arr: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of arr) {
    const key = JSON.stringify(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}

export const isTruthy = <T>(a: T | undefined): a is T => Boolean(a)
