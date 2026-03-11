import { Tempo } from './dist/tempo.class.js'; // Use dist to avoid TS overhead

const symbolKey = Symbol.for('$Tempo');

console.log('--- Manual Verification Start ---');

globalThis[symbolKey] = {
	options: {
		locale: 'en-AU',
		limit: 123
	}
};

console.log('Calling Tempo.init()...');
Tempo.init();
console.log('Tempo.init() completed.');

console.log('Verifying Config...');
console.log('Locale:', Tempo.config.locale);
console.log('Limit:', Tempo.config.limit);

if (Tempo.config.locale === 'en-AU' && Tempo.config.limit === 123) {
	console.log('SUCCESS: Options discovered.');
} else {
	console.log('FAILURE: Options NOT discovered.');
}

console.log('--- Manual Verification End ---');
process.exit(0);
