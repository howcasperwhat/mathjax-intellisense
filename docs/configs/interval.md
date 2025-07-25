# `interval`

**Type**: `number`

**Default**:
  - `comment-formula`: `200`
  - other extensions: `300`

Every time the document in the active editor is updated, extensions will be triggered to reparse the document and render the formulas. These are highly expensive operations, so we `debounce` it, and `interval` is the time to wait before triggering again.
