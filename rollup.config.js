import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
	input: 'src/tempo.class.ts',
	output: [
		{
			file: 'dist/tempo.bundle.js',
			format: 'umd',
			name: 'Tempo',
			sourcemap: true,
			globals: {
				'@js-temporal/polyfill': 'TemporalLibrary' // Optional: if we want to externalize it
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
				{ find: /^#core\/shared\/(.*)\.js$/, replacement: path.resolve(__dirname, 'lib/$1.ts') },
				{ find: /^#core\/(.*)\.js$/, replacement: path.resolve(__dirname, 'src/$1.ts') }
			]
		}),
		resolve({
			extensions: ['.ts', '.js']
		}),
		commonjs(),
		typescript({
			tsconfig: './tsconfig.json',
			declaration: false, // Don't generate declaration files for the bundle
			outDir: void 0,  // Let rollup handle output
			lib: ['ESNext', 'DOM'], // Override to avoid 'ESNext.Temporal' validation error in plugin
			types: ['@js-temporal/polyfill'] // Inject Temporal types since we dropped the ESNext.Temporal lib
		})
		// terser() // Minify the bundle
	],
	external: ['@js-temporal/polyfill'] // Keeping temporal external as recommended in docs
};
