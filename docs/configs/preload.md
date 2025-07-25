# `preload`

**Type**: `string[]`

**Default**: `[]`

You may need to define custom commands. The `preload` configuration allows you to preload these predefined commands at startup. You need to provide a series of `glob` patterns, and the extension will automatically load the corresponding commands inside matched files.

e.g.

``` json
{
  "mathjax-intellisense.preload": [
    "*.preload.cls"
  ]
}
```

``` tex
% File: example.preload.cls
\newcommand{\circle}{\bullet}
\definecolor{info}{RGB}{0, 153, 255}
\definecolor{warning}{RGB}{252, 186, 3}
\DeclarePairedDelimiter{\lcro}{\lbrack}{\rparen}
\renewcommand{\Box}{\boxed}
```
