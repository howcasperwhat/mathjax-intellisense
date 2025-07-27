# `preview`

**Type**: `string`

**Default**: `''`

CSS inline style that applied to the preview (decoration) of formulas. It's CSS injection, so you should guarantee the CSS is valid.

> [!WARNING]
> 1. Note that never change the size and layout using this configuration, as it will affect the rendering of formulas in the editor. Use [`scale`](/configs/scale.md) instead.
> 2. Frontground color set by `color: xxx` is no use, use [`color`](/configs/color.md) instead.

e.g.

``` json
{
  "mathjax-intellisense.preview": "background-color: #8888;",
  // ❎ DO NOT SET COLOR, SIZE and LAYOUT HERE
  // "mathjax-intellisense.preview": "color: red; scale: 1.5;"
  // ✅ USE `color` and `scale` CONFIGURATION INSTEAD
  "mathjax-intellisense.color": "red",
  "mathjax-intellisense.scale": 1.5
}
```
