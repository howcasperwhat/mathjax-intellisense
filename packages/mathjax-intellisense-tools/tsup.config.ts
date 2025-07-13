import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'utils/index': 'src/utils.ts',
    'transformer/index': 'src/transformer.ts',
    'constant/index': 'src/store/constant.ts',
    'mathjax/index': 'src/store/mathjax.ts',
  },
  format: ['cjs', 'esm'],
  external: ['vscode'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
})
