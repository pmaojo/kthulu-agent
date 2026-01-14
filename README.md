# OpenCoder: the open source version of Claude Code (Kthulu Edition)

## Installation

To install the latest version with Kthulu integration:

### From NPM (if published)

```bash
npx opencoder@latest
```

### Build from Source

Since this is a custom fork, you may want to build from source:

```bash
git clone <this-repo-url>
cd opencoder
bun install
bun run build
npm install -g .
```

## Overview

- **Native Kthulu Integration**: Includes [Kthulu Go](https://github.com/pmaojo/kthulu-go) binary and MCP tools out of the box.
- Complete Claude Code replacement with similar UI and UX
- Built on top of the Vercel AI SDK. Fully compatible with the AI SDK model.
- Supports any LLM providers that the AI SDK supports (OpenAI, Anthropic, Google, etc.)
- Cross-platform shell: which means supports Windows, Linux, and MacOS.
- High performance: 60 FPS UI rendering, powered by React concurrent rendering, React Compiler
- Add custom tools to OpenCoder in 1 step (with custom UI)

## Demo

#### Youtube clone
https://github.com/user-attachments/assets/67c52f00-7c54-404d-b1e2-244312f0094a



## Features

#### 1. Built on top of the Vercel AI SDK
OpenCoder is built on top of the Vercel AI SDK. It is fully compatible with the AI SDK model, any official or community model supported by the AI SDK will work with OpenCoder:
```typescript
import { ollama } from 'ollama-ai-provider'; // read more: https://sdk.vercel.ai/providers/community-providers/ollama
import type { Config } from 'opencoder';

export default {
  model: ollama('qwq'),
} satisfies Config
```

#### 2. MCP makes it easy
Integrate powerful MCP capabilities into your workflow in 1 step. OpenCoder provides ready-to-use MCP tools that can be implemented with just a few lines of code:
```typescript
import { playwright } from 'opencoder/mcp';

export default {
  mcp: [playwright()],
} satisfies Config
```

More examples:
- [Create MCP tools](./examples/mcp-create-mcp)
- [Playwright example](./examples/mcp)

#### 3. Cross-platform shell
OpenCoder has a cross-platform shell that supports Windows, Linux, and MacOS. Powered by [Deno shell](https://github.com/denoland/deno_task_shell)

## Available tools
- Read file
- Write file
- Edit file
- Think
- Memory edit
- Memory read
- Planning
- Grep: powered by @vscode/ripgrep
- Check diagnostics (currently only Typescript is supported)


## Available MCP tools
- **Kthulu**: AI-Powered Software Foundry tools (Native)
- Playwright
- Web search

## Roadmap

- [ ] More commands (/checkpoint, /revert, /commit, /mcp, /cost)
- [ ] Documentation
- [ ] Add auto-import MCP tools from `.vscode/mcp.json` or `.cursorrules/mcp.json`
- [ ] Proper release process (changeset + changelog)
- [x] Command history
- [x] Persistent chat history
- [x] Add more tests
- [x] Add more examples
- [x] Tool confirmation dialog
- [x] Prebuilt MCP tools (`import { playwright } from "opencoder/mcp"`)
- [x] Add MCP support
- [x] Support custom tools

Contributions are welcome!
