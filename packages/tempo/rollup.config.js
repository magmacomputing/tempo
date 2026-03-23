import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';

import { fileURLToPath } from 'node:url';
import { dirname, resolve as nodeResolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
	input: 'dist/index.js',
	output: [
		{
			file: 'dist/tempo.bundle.js',
			format: 'umd',
			name: 'Tempo',
			sourcemap: true,
			globals: {
				'@js-temporal/polyfill': 'TemporalLibrary'
			}
		},
		{
			file: 'dist/tempo.bundle.esm.js',
			format: 'es',
			sourcemap: true
		}
	],
	plugins: [
		alias({
			entries: [
				{ find: '#library', replacement: nodeResolve(__dirname, '../library/dist') },
				{ find: '#tempo', replacement: nodeResolve(__dirname, './dist') }
			]
		}),
		resolve({
			extensions: ['.js']
		})
	],
	external: ['@js-temporal/polyfill']
};
