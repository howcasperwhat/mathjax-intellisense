# `code`

**Type**: `string`

**Default**:
  - `comment-formula`: `'font-weight: bold;'`
  - other extensions: `'border-bottom: 1px dashed;`

CSS inline style that applied to the LaTeX codes in the editor. It's CSS injection, so you should guarantee the CSS is valid.

> [!WARNING]
> 1. Note that never change the size and layout using this configuration, as it will affect the rendering of formulas in the editor. Use [`scale`](/configs/scale.md) instead.
> 2. Frontground color set by `color: xxx` is no use, use [`color`](/configs/color.md) instead.

e.g.

``` json
{
  "mathjax-intellisense.code": "color: red;"
}
```
