# Installing mcode-cua on Linux

> DEPRECATED. The Python MCP server that lived in this repo is **removed**. The
> canonical CUA MCP tool is now the TypeScript package **@mcode/mcode-cua**
> (npm). This document described the old `uvx --from mcode-cua[linux]@<wheel>
> mcode-cua` install path plus the `scripts/mcode-cua-linux` distro-`pyatspi`
> launcher — all of which targeted the removed Python server and no longer apply.

Install the canonical tool from npm:

```bash
npm install @mcode/mcode-cua
# or, without installing:
npx @mcode/mcode-cua
```

Source and the Linux/AT-SPI backend live in the mcode repo:
[git.example.invalid/codegeex/mcode](https://git.example.invalid/codegeex/mcode)
→ package [@mcode/mcode-cua](https://www.npmjs.com/package/@mcode/mcode-cua).

What this repo still hosts (the real-model act-verify harness, the canonical
skill, screenshot-pipeline parity fixtures) is described in the top-level
`README.md`. The earlier Python-server Linux install guide is preserved in the
git history of this repo (see the commit prior to `refactor/deprecate-python`).

For background on the TypeScript rewrite and this deprecation, see the Feishu
design doc:
[BE9UdI4zMo4HjRx4659cTHOnn9f](https://internal-docs.example.invalid/redacted).
