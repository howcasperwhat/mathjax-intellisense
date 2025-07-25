# MathJax IntelliSense for Python

[VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=howcasperwhat.mathjax-intellisense-python)
·
[GitHub Repository](https://github.com/howcasperwhat/mathjax-intellisense/tree/main/extensions/mathjax-intellisense-python)

## Features

- Render mathematical formulas directly in your docstrings `""" """` or `r""" """`.
- Support [`Sphinx`](https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html#directive-math) and [`Markdown`](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions) formats.

![Features](https://github.com/howcasperwhat/mathjax-intellisense/blob/main/extensions/mathjax-intellisense-python/assets/feature.png?raw=true)

## Configurations

Domain: `mathjax-intellisense-python` · [General Settings](/configs/index.md)

### `formula`

**Type**: `string[]`

**Default**: `['sphinx']`

**Enum**: `['sphinx', 'markdown']`

::: code-group

``` python [sphinx]
r'''
1. inline, unbreakable:
:math:`E = mc^2`
2. block, breakable:
.. math::
   E = mc^2
'''
```

``` python [markdown]
r'''
1. inline, unbreakable: $E = mc^2$
2. block, breakable: $$E = mc^2$$
'''
```

:::
