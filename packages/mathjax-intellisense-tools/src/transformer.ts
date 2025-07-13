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
  public constructor(width: number, height: number, code: string, color: string) {
    this.width = width
    this.height = height
    this.code = code.replaceAll('currentColor', color)
    this.error = code.includes('data-mjx-error')
    this.url = `data:image/svg+xml;base64,${Buffer.from(this.code).toString('base64')}`
  }
}

export interface TransformOptions {
  color?: string
  scale?: number
  maxHeight?: number
}

class Transformer {
  private adaptor?: ReturnType<typeof liteAdaptor>
  private document?: ReturnType<typeof mathjax.document>
  private context?: string
  private mmlPackages = ['action']

  private norm(options: TransformOptions): Required<TransformOptions> {
    return {
      color: options.color ?? 'currentColor',
      scale: options.scale ?? 1,
      maxHeight: options.maxHeight ?? Infinity,
    }
  }

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

  public from(tex: string, _options: TransformOptions = {}): FormulaPreview {
    const options = this.norm(_options)
    const elem = this.document!.convert(tex)
    const svg: LiteElement = <LiteElement>elem.children[0]
    const width = exToPx(Number.parseFloat(svg.attributes.width) * options.scale)
    const height = exToPx(Number.parseFloat(svg.attributes.height) * options.scale)
    const ratio = Math.min(options.maxHeight / height, 1)
    this.adaptor!.setAttribute(svg, 'width', `${width * ratio}px`)
    this.adaptor!.setAttribute(svg, 'height', `${height * ratio}px`)
    const code = this.adaptor!.innerHTML(elem)
    return new FormulaPreview(width, height, code, options.color)
  }
}

export const transformer = new Transformer()
