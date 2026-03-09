declare global {
	// Rely on ESNext.Temporal from tsconfig.json for core types.
	// We keep this file to ensure Temporal is recognized as a global.
	// without creating a direct dependency on the polyfill in the dist output.
	var Temporal: any; 									// ESNext.Temporal library
}
