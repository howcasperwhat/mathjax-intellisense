import antfu from '@antfu/eslint-config'

module.exports = antfu({
  pnpm: true,
  typescript: true,
  ignores: [
    'extensions/*/src/generated',
  ],
  rules: {
    // https://github.com/microsoft/vscode-vsce/issues/1036
    'pnpm/json-enforce-catalog': 'off',
  },
})
