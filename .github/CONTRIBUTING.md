# Contributing

Thank you for being interested in this project! We are excited to have you here. This document will guide you through the process of contributing to this project.

## Setup

We use [pnpm](https://pnpm.io/) as our package manager. If you haven't installed it yet, install it, and then run the following command to install dependencies:

```bash
pnpm i
```

## Development

## Tools

After modifying tools in `packages/`, run the following command to build the tools:

```bash
pnpm run build
```

## Extensions

Select an extension to debug in the status bar, and then select a folder to open the extension in VS Code.

## Update

Every time you add or update a config in `package.json`, run

```bash
pnpm run update
```

## Code Style

We use [ESLint](https://eslint.org/) with [@antfu/eslint-config](https://github.com/antfu/eslint-config) for code style.

To lint the code, run

```bash
pnpm run lint -- --fix
```

Be sure to fix all linting errors before submitting a pull request.

## Type Checking

To check the types, run

```bash
pnpm run typecheck
```

## Publishing (for maintainers)

To publish the extensions, run

```bash
pnpm run release
```

, and push the changes. This will trigger a GitHub Action to publish the extensions.
