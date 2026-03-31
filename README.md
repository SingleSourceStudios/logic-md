# logic-md

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> The declarative reasoning layer for AI agents.

LOGIC.md sits between identity (CLAUDE.md / SOUL.md) and capability (SKILL.md / TOOLS.md). It defines *how* an agent thinks — not who it is or what it can do.

## Packages

| Package | Description |
|---------|-------------|
| `@logic-md/core` | Parser, validator, expression engine, DAG resolver |
| `@logic-md/cli` | CLI tools: `logic-md validate`, `logic-md lint`, `logic-md compile` |

## Quick Start

```bash
npm install @logic-md/core
```

```typescript
import { parse, validate } from "@logic-md/core";

const spec = parse(markdownContent);
const result = validate(spec);
```

## Development

```bash
git clone https://github.com/SingleSourceStudios/logic-md.git
cd logic-md
npm install
npm test
npm run lint
npm run typecheck
```

## License

[MIT](LICENSE)
