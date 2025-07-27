---
title: MathJax IntelliSense
description: Learn how to get started with MathJax IntelliSense
---

# MathJax IntelliSense

## Motivation

Programming often intersects with mathematics, requiring developers to write formulas in code comments or documentation. However, plain text or LaTeX formulas can be hard to read. The MathJax IntelliSense extension suite was created to improve formula readability and streamline this process.

## Introduction

Initially, the extension was named [Comment Formula](/extensions/comment-formula) as its original goal was to provide formula rendering exclusively within comments for the Python language. However, as similar needs arose for other programming languages, it became evident that the [VSCode API](https://github.com/Microsoft/vscode/issues/580) could not reliably determine whether a formula was inside a comment. As a result, the extension evolved into a unified, language-agnostic, and highly customizable formula preview tool that captures formulas globally across source code.

Later, it became apparent that formula parsing in many languages, such as C++ and C, required removing specific characters. The original approach would capture and render everything, which could lead to incorrect results. For example, the following formula would extract `E\n/// = mc^2` and feed it into the [MathJax](https://www.mathjax.org/) parser, while the intended formula to render was `E = mc^2`. Since the extraction rules vary across languages and lack universal patterns, separate extensions had to be created for each language. Fortunately, with the help of the [vscode-textmate-languageservice](https://github.com/vsce-toolroom/vscode-textmate-languageservice) token parser, we can now accurately capture docstrings.

```cpp
/// Formula: \f$ E
/// = mc^2 \f$
```

## Extensions

MathJax IntelliSense currently includes the following extensions:

- [**C/C++ Extension**](/extensions/mathjax-intellisense-ccpp)
   Supports rendering formulas in Doxygen and Markdown formats for C/C++ projects.

- [**Python Extension**](/extensions/mathjax-intellisense-python)
   Enables formula rendering in Sphinx and Markdown formats for Python projects.

- [**Comment Formula**](/extensions/comment-formula)
   A unified, language-agnostic, and customizable extension for rendering formulas in comments.

- [**MathJax Highlight**](/extensions/mathjax-highlight)
   A companion extension for Comment Formula that provides syntax highlighting for formula code.
