# MathJax IntelliSense for C/C++

[VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=howcasperwhat.mathjax-intellisense-ccpp)
·
[GitHub Repository](https://github.com/howcasperwhat/mathjax-intellisense/tree/main/extensions/mathjax-intellisense-ccpp)

## Features

- Render mathematical formulas directly in your docstrings `///` or `/** */` comments.
- Support [`Doxygen`](https://www.doxygen.nl/manual/formulas.html) and `Markdown` formats.

![Features](https://github.com/howcasperwhat/mathjax-intellisense/blob/main/extensions/mathjax-intellisense-ccpp/assets/feature.png?raw=true)

## Configurations

Domain: `mathjax-intellisense-ccpp` · [General Settings](/configs/index.md)

### `formula`

**Type**: `string[]`

**Default**: `['doxygen']`

**Enum**: `['doxygen', 'markdown']`

::: code-group

``` cpp [doxygen]
/**
 * 1. \f$ E = mc^2 \f$ (inline, breakable)
 * 2. \f( E = mc^2 \f) (inelie, breakable)
 * 3. \f[ E = mc^2 \f] (block, breakable)
 * 4. \f{$env}{ E = mc^2 \f} (block, breakable), where `$env` is the environment name, e.g., `equation`, `align`, etc.
*/
```

``` cpp [markdown]
/**
 * 1. $ E = mc^2 $ (inline, unbreakable)
 * 2. $$ E = mc^2 $$ (block, breakable)
 */
```

:::
