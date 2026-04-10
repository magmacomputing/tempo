import { Tempo, enums } from '#tempo';
import { stringify, objectify, enumify, getType } from '#library';
import { Token, Snippet } from '#tempo/tempo.default.js';
import '#tempo/plugins/extend.ticker.js';

// pre-load Tempo and Token to the global scope for ease of use in the REPL
Object.assign(globalThis, { Tempo, Token, Snippet, getType, stringify, objectify, enumify, enums });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191mREPL initialized.\x1b[0m\n`);
