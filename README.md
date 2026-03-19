<p align="center">
  <h1 align="center">
    <code>tree-sitter-wdl</code>
  </h1>

  <p align="center">
    A <a href="https://tree-sitter.github.io/">tree-sitter</a> grammar for <a href="https://openwdl.org/">WDL</a>.
  </p>
</p>

## Overview

This grammar supports WDL versions 1.0 through 1.3, including `enum`
definitions, `env` declarations, and `else if`/`else` conditional clauses. It
provides syntax highlighting, code folding, and language injection for bash
within `command` blocks.

Generated files (`src/parser.c`, `src/grammar.json`, `src/node-types.json`) are
checked in so that consumers do not need a Node.js toolchain.

## Usage

### Build

```bash
npm install
npx tree-sitter generate
```

### Test

```bash
npx tree-sitter test
```

### Parse a file

```bash
npx tree-sitter parse example.wdl
```

## 📝 License and Legal

This project is licensed as either [Apache 2.0][license-apache] or
[MIT][license-mit] at your discretion. Additionally, please see [the
disclaimer](https://github.com/stjude-rust-labs#disclaimer) that applies to all
crates and command line tools made available by St. Jude Rust Labs.

Copyright © 2026-Present [St. Jude Children's Research Hospital](https://github.com/stjude).

[license-apache]: https://github.com/stjude-rust-labs/tree-sitter-wdl/blob/main/LICENSE-APACHE
[license-mit]: https://github.com/stjude-rust-labs/tree-sitter-wdl/blob/main/LICENSE-MIT
