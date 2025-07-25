# MathJax Highlight

[VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=howcasperwhat.mathjax-highlight)
·
[GitHub Repository](https://github.com/howcasperwhat/mathjax-highlight)

This is a plugin for [`comment-formula`](comment-formula.md).

> [!WARNING]
> 1. Reload the Window to make the highlight work when update `comment-formula.languages` or `comment-formula.capture`.
> 2. Since VSCode only supports static Textmate grammar files, this extension modifies the `package.json` and the JSON files defining the grammar. So VSCode may detect destructive changes, and alert you to reload the window.

If the verbose message affects DX, you can configure [`code`](/configs/code.md), [`color`](/configs/color.md), and [`scale`](/configs/scale.md) in [`comment-formula`](comment-formula.md) instead of this extension.

## Features

- Detect configuration options from [`comment-formula`](comment-formula.md) automatically, and provide syntax highlighting for the custom configurations.

![Features](https://github.com/howcasperwhat/mathjax-highlight/blob/main/assets/feature.png?raw=true)

## Configurations

### `map`

Some language ids are not the same as the scope names, so you should set `mathjax-highlight.map` to map the language ids to the scope names.
