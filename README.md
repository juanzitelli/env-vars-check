
# env-vars-check 🤓

A tool for checking environment (.env) files against their examples (.env.example) ✨

## Table of Contents

- [env-vars-check 🤓](#env-vars-check-)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Basic Usage](#basic-usage)
    - [Options](#options)
    - [Example](#example)
  - [Scripts](#scripts)
  - [Contributing](#contributing)

## Installation

To install `env-vars-check`, you can use `npx`:

```bash
npx env-vars-check <directory> [--fix] [--skipNodeModules]
```

Alternatively, you can clone the repository and install the dependencies:

```bash
git clone https://github.com/juanzitellifns/env-vars-check.git
cd env-vars-check
pnpm install
```

## Usage

The command checks your code for environment variables and ensures they are present in your `.env` files.

### Basic Usage

```bash
npx env-vars-check <directory>
```

-    `<directory>`: The directory to scan for TypeScript files and `.env.example` files.

### Options

-    `--fix`: Automatically add missing environment variables to the `.env` file from the `.env.example` file.
-    `--skipNodeModules`: Skip scanning the `node_modules` directory.

### Example

```bash
npx env-vars-check src --fix --skipNodeModules
```

This command will scan the `src` directory, automatically fix missing variables, and skip the `node_modules` directory.

## Scripts

The following scripts are available in the `package.json`:

-    `build`: Compiles the TypeScript files to CommonJS and ESM formats and generates type declarations.
-    `release`: Builds the project and publishes it using `changeset`.
-    `lint`: Type-checks the project using TypeScript.

To run these scripts, use:

```bash
pnpm run <script-name>
```

For example:

```bash
pnpm run build
```

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

---

Author: Juan Zitelli <juan.zitelli@finalis.com>
