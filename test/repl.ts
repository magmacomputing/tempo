import './setup.js';

import { objectify, stringify } from '../lib/serialize.library.js';
import { enumify } from '../lib/enumerate.library.js';
import { getType } from '../lib/type.library.js';

import { Tempo } from '../lib/tempo.class.js';
import { Token, Snippet } from '../lib/tempo.config/tempo.default.js';


// pre-load Tempo and Token to the global scope for ease of use in the REPL
Object.assign(globalThis, { Tempo, Token, Snippet, getType, stringify, objectify, enumify });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo \x1b[0m\x1b[38;2;45;212;191mREPL initialized.\x1b[0m\n`);
