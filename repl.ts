import '#core/shared/temporal.polyfill.js';

import { objectify, stringify } from '#core/shared/serialize.library.js';
import { getType } from '#core/shared/type.library.js';

import { Tempo } from '#core/shared/tempo.class.js';
import { Token, Snippet } from '#core/shared/tempo.config/tempo.default.js';


// pre-load Tempo and Token to the global scope for ease of use in the REPL
Object.assign(globalThis, { Tempo, Token, Snippet, getType, stringify, objectify });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191mREPL initialized.\x1b[0m\n`);
