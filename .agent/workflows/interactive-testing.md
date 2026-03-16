---
description: Start an interactive Node.js REPL session with Tempo and Temporal pre-loaded
---

To use a NodeJS interactive session to test your Tempo library, you can use the following command-line syntax:

// turbo
```bash
npx tsx -i --import ./test/repl.ts
```


### Purpose
This command starts a Node.js REPL (Read-Eval-Print Loop) while pre-loading the `Tempo` class and the `Temporal` polyfill into the global scope. This allows you to try different invocations of `Tempo` directly without writing a script.

### Usage Examples
Once the REPL has started, you can run commands like:

```javascript
// Test basic parsing
const t1 = new Tempo('2024-05-20');
t1.format('{yyyy}-{mm}-{dd}');

// Test alias parsing (e.g., events)
const t2 = new Tempo('christmas');
t2.dd; // 25

// Test relative durations
t1.add({ days: 5 }).format('plain');
```

### Why this works
- `npx tsx`: Uses the `tsx` runner to handle TypeScript files on the fly.
- `-i`: Explicitly requests an interactive session.
- `--import ./test/repl.ts`: Loads the helper script before starting the REPL, which attaches `Tempo` to `globalThis`.