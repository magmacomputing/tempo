import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';
import MagicString from 'magic-string';

/**
 * Custom logic to route modules based on origin.
 * We want Tempo code in the root and internal library code in lib/
 */
const getOutputFileName = (moduleId, name) => {
	if (!moduleId) return (name || '[name]') + '.js';

	const rel = path.relative(process.cwd(), moduleId);

	// Check if this module is from outside the tempo package (likely @magmacomputing/library)
	return (rel.startsWith('..') || rel.includes('node_modules'))
		? 'lib/' + path.basename(moduleId, '.js') + '.js'
		: (name || '[name]') + '.js';
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
			entryFileNames: (chunkInfo) => getOutputFileName(chunkInfo.facadeModuleId, chunkInfo.name)
		}
	],
	plugins: [
		resolve({
			extensions: ['.js']
		}),
		{
			name: 'indentation-fix',
			renderChunk(code) {
				const ms = new MagicString(code);
				const regex = /^( {4})+/gm;
				let match;

				while ((match = regex.exec(code)) !== null) {
					ms.overwrite(match.index, match.index + match[0].length, '\t'.repeat(match[0].length / 4));
				}

				return {
					code: ms.toString(),
					map: ms.generateMap({ hires: true })
				};
			}
		}
	],
	external: ['@js-temporal/polyfill']
}
