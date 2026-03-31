import resolve from '@rollup/plugin-node-resolve';

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
		resolve({
			extensions: ['.js']
		})
	],
	external: ['@js-temporal/polyfill']
};
