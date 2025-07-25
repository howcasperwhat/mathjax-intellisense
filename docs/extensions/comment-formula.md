# Comment Formula

[VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=howcasperwhat.comment-formula)
·
[GitHub Repository](https://github.com/howcasperwhat/comment-formula)

## Features

- Render mathematical formulas directly in document of active editor.
- Support `Markdown` formats by default.

![Features](/features/comment-formula.png)

## Configurations

Domain: `comment-formula` · [General Settings](/configs/index.md)

### `inline`

**Type**: `string`

**Default**: `['all']`

**Enum**: `['all', 'partial', 'none']`

Due to the lack of an API in VSCode to adjust line height, rendered formulas may exceed the bounds of the lines they are in. This could result in formulas overlapping with the code. The `inline` configuration option addresses this issue:

- `all`: Always display the formula rendering result as a decoration within the editor, regardless of its height.
- `partial`: If the formula is too tall and exceeds the line bounds, the formula preview will not be displayed inline.
- `none`: Never display the formula rendering result as a decoration within the editor. Instead, you can hover over the formula code to view the rendered formula in a message box.

### `languages`

**Type**: `string[]`

**Default**: `['c', 'cpp', 'matlab', 'python']`

**Enum**:
  - [Language IDs](https://code.visualstudio.com/docs/languages/identifiers)
  - Languages identified by extensions, Extension Panel -> `FEATURES` -> `Programming Language` -> `ID`.
  - Languages defined by [`comment-formula.defines`](#defines).

### `annotation`

**Type**: `boolean`

**Default**: `true`

If disabled, the extension will not render formulas in comments. Just code completion features will be available.

### `completion`

**Type**: `boolean`

**Default**: `true`

If disabled, the extension will not provide code completion for formulas.

### `multiple`

**Type**: `string`

**Default**: `'after'`

**Enum**: `['before', 'after', 'none']`

Place multi-line formulas' preview (decoration) before or after the formula code.

### `single`

**Type**: `string`

**Default**: `'after'`

**Enum**: `['before', 'after', 'none']`

Place single-line formulas' preview (decoration) before or after the formula code.

### `hidden`

**Type**: `string`

**Default**: `'scope'`

**Enum**: `['scope', 'line', 'none']`

When to hide LaTeX codes in the editor:
- `scope`: when selections are not in LaTeX codes' ranges.
- `line`: when lines of selections are not in LaTeX codes' lines.

### `autotab`

**Type**: `boolean`

**Default**: `true`

If enabled, the extension will automatically detect the tab-width before the first line of formula codes, and margin the same width for the formula preview.

### `defines`

**Type**:
``` ts
type LanguageID = string
type Pattern = string

type ConfigDefines = Record<LanguageID, Pattern[]>
```

**Default**: `{}`

Define custom languages with `glob` patterns, e.g.:

``` json
{
  "comment-formula.defines": {
    "matlab": ["*.m", "*.mlx"]
  }
}
```

### `capture`

**Type**:

``` ts
type LanguageID = string
interface BaseRegExpOptions {
  strict?: boolean
  breakable?: boolean
}
interface MinuteRegExpOptions extends BaseRegExpOptions {
  prefix: string
  suffix: string
}
interface UnshapedRegExpOptions extends BaseRegExpOptions {
  marker: string
}

type ConfigCapture = Record<LanguageID, RegExpOptions[]>
```

**Default**: `{}`

> [!WARNING]
> When `capture` is `{}`, it will be replace by the below default value:
> ``` ts
> const DEFAULT_CAPTURE = [
>   { marker: '$$', breakable: true },
>   { marker: '$', breakable: false },
> ]
> ```

- `marker`: when `prefix` and `suffix` are the same, you can just set `marker` to the same value as `prefix` and `suffix`.
- `strict`: if `true`, when escape characters are before `prefix` or `suffix`, the formula will not be captured.
- `breakable`: if `true`, the extension will capture formulas across multiple lines, otherwise it will only capture formulas in a single line. For `breakable: false`, when their are no `suffix` in the same line, the formula will be ignored.

For example, you can define a custom capture rule for `Python`:

``` json
{
  "comment-formula.capture": {
    "cpp": [
      {
        "marker": "\\f$",
        "strict": true,
        "breakable": false
      },
      {
        "prefix": "\\f[",
        "suffix": "\\f]",
        "strict": true,
        "breakable": true
      }
    ]
  }
}
```

### `message`

- `message.playground`: Display link of mathjax-playground in hover message. (defult: `false`)
- `message.preview`: Display image of formula preview in hover message box. (defult: `true`)

### `inspect`

**Type**: `boolean`

**Default**: `false`

Enable inspecting performance of formula capturing and rendering. It will display the average time in the status bar.
