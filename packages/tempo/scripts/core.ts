import { Tempo, enums } from '#tempo/core';
import { stringify, objectify, enumify, getType } from '#library';
import { Token, Snippet } from '#tempo/tempo.default.js';

// Pre-load Tempo and Token to the global scope for ease of use in the core REPL
Object.assign(globalThis, { Tempo, Token, Snippet, getType, stringify, objectify, enumify, enums });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo (core) \x1b[0m\x1b[38;2;45;212;191mREPL initialized (core only).\x1b[0m\n`);
