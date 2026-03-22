import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
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
				{ find: '#core/shared', replacement: nodeResolve(__dirname, '../shared/dist') },
				{ find: '#core', replacement: nodeResolve(__dirname, './dist') }
			]
		}),
		resolve({
			extensions: ['.js']
		}),
		commonjs()
	],
	external: ['@js-temporal/polyfill']
};
