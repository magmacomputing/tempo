import './setup.js';

import * as barrel from '#tempo/index.js';
import { getType } from '#library/type.library.js';
import { Token, Snippet } from '#tempo/tempo.config/tempo.default.js';

// pre-load Tempo and Token to the global scope for ease of use in the REPL
Object.assign(globalThis, { Tempo: barrel.Tempo, Token, Snippet, getType, stringify: barrel.stringify, objectify: barrel.objectify, enumify: barrel.enumify, enums: barrel.enums });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191mREPL initialized.\x1b[0m\n`);
