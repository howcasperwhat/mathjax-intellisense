import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element'
import { Buffer } from 'node:buffer'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html'
import { TeX } from 'mathjax-full/js/input/tex'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages'
import { mathjax } from 'mathjax-full/js/mathjax'
import { SVG } from 'mathjax-full/js/output/svg'
import { exToPx } from './utils'

export class FormulaPreview {
  public readonly width: number
  public readonly height: number
  public readonly code: string
  public readonly error: boolean
  public readonly url: string
  public constructor(width: number, height: number, code: string, color?: string) {
    this.width = width
    this.height = height
    this.code = color ? code.replaceAll('currentColor', color) : code
    this.error = code.includes('data-mjx-error')
    this.url = `data:image/svg+xml;base64,${Buffer.from(this.code).toString('base64')}`
  }
}

class Transformer {
  private adaptor?: ReturnType<typeof liteAdaptor>
  private document?: ReturnType<typeof mathjax.document>
  private context?: string
  private mmlPackages = ['action']

  public constructor() {
    this.adaptor = liteAdaptor()
    RegisterHTMLHandler(this.adaptor)
  }

  public reset(context: string) {
    if (context === this.context)
      return
    this.context = context
    this.document = mathjax.document('', {
      InputJax: new TeX({
        packages: [...AllPackages.filter(
          name => !this.mmlPackages.includes(name),
        ), 'physics'],
      }),
      OutputJax: new SVG({
        fontCache: 'local',
      }),
    })
    this.document.convert(context)
  }

  public from(tex: string, color?: string, scale: number = 1): FormulaPreview {
    const elem = this.document!.convert(tex)
    const svg: LiteElement = elem.children[0]
    const width = exToPx(Number.parseFloat(svg.attributes.width) * scale)
    const height = exToPx(Number.parseFloat(svg.attributes.height) * scale)
    this.adaptor!.setAttribute(svg, 'width', `${width}px`)
    this.adaptor!.setAttribute(svg, 'height', `${height}px`)
    const code = this.adaptor!.innerHTML(elem)
    return new FormulaPreview(width, height, code, color)
  }
}

export const transformer = new Transformer()
