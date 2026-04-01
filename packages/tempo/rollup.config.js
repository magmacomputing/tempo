import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';

/**
 * Custom logic to route modules based on origin.
 * We want Tempo code in the root and internal library code in lib/
 */
const getOutputFileName = (moduleId) => {
	if (!moduleId) return '[name].js';

	const rel = path.relative(process.cwd(), moduleId);

	// Check if this module is from outside the tempo package (likely @magmacomputing/library)
	return (rel.startsWith('..') || rel.includes('node_modules'))
		? 'lib/' + path.basename(moduleId, '.js') + '.js'
		: '[name].js';
}

export default {
	input: 'dist/tempo.index.js',
	output: [
		{			// The UMD bundle (standard single file for browser/legacy)
			file: 'dist/tempo.bundle.js',
			format: 'umd',
			name: 'Tempo',
			sourcemap: true,
			indent: '\t',
			globals: {
				'@js-temporal/polyfill': 'TemporalLibrary'
			}
		},
		{			// The Granular Tree-Shaken ESM distribution
			dir: 'dist',
			format: 'es',
			preserveModules: true,
			preserveModulesRoot: 'dist',
			sourcemap: true,
			indent: '\t',
			entryFileNames: (chunkInfo) => getOutputFileName(chunkInfo.facadeModuleId),
			chunkFileNames: (chunkInfo) => getOutputFileName(chunkInfo.facadeModuleId)
		}
	],
	plugins: [
		resolve({
			extensions: ['.js']
		}),
		{
			name: 'indentation-fix',
			renderChunk(code) {
				return {
					code: code.replace(/^( {4})+/gm, (match) => '\t'.repeat(match.length / 4)),
					map: null
				};
			}
		}
	],
	external: ['@js-temporal/polyfill']
}
