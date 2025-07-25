# `mode`

**Type**: `string`

**Default**: `'both'`

**Enum**: `['both', 'edit', 'view']`

The mode of the extension. It can be one of the following:
- `edit`: Formulas' preview (decorations) will not be rendered in the editor. LaTeX codes will never be hidden.
- `view`: formulas' preview (decorations) will be rendered in the editor. LaTeX codes will be hidden.
- `both`: formulas' preview (decorations) will be rendered in the editor. LaTeX codes will be hidden when selections are not in LaTeX codes' ranges.
