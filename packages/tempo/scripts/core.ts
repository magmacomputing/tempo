import { Tempo, enums } from '#tempo/core';
import { stringify, objectify, enumify, getType } from '#library';
import { Token, Snippet } from '#tempo/tempo.default.js';

// Pre-load Tempo and Token to the global scope for ease of use in the core REPL
Object.assign(globalThis, { Tempo, Token, Snippet, getType, stringify, objectify, enumify, enums });

console.log(`\n\x1b[38;2;252;194;1m\x1b[1m ⏳ Tempo (core) \x1b[0m\x1b[38;2;45;212;191mREPL initialized (core only).\x1b[0m\n`);

/**
 * 💡 SMART IDLE: Auto-exit after 1 hour of keyboard inactivity
 * Monitors 'stdin' so background Tickers won't keep the session alive if you walk away.
 */
let idleTimer: NodeJS.Timeout;
const resetIdle = () => {
	clearTimeout(idleTimer);
	idleTimer = setTimeout(() => {
		console.warn('\n\x1b[33m[Tempo] REPL idle for 1 hour. Safety shutdown triggered.\x1b[0m');
		process.exit(0);
	}, 3600 * 1000);
};

process.stdin.on('data', resetIdle);
resetIdle();
