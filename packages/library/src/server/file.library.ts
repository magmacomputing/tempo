import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ifNumeric } from '#library/coercion.library.js';

export class File {
	static tmpDir = os.tmpdir();
	static encoding: BufferEncoding = 'utf8';

	/**
	 * Safely resolves a filename within the target tmpDir.
	 * 
	 * @param filename - The filename to resolve
	 * @throws {Error} If path traversal is detected
	 * @returns The resolved absolute path
	 */
	static #resolvePath(filename: string): string {
		if (path.isAbsolute(filename)) {
			throw new Error(`Absolute paths are not allowed: ${filename}`);
		}

		const baseDir = path.resolve(File.tmpDir);
		const targetPath = path.resolve(path.join(baseDir, filename));

		// Validation: targetPath must be within baseDir
		if (!targetPath.startsWith(baseDir) || path.relative(baseDir, targetPath).startsWith('..')) {
			throw new Error(`Path traversal detected: ${filename} is outside of the sandbox.`);
		}

		return targetPath;
	}

	static read = (file: string): Promise<string | number> => new Promise<string | number>((resolve, reject) => {
		try {
			const target = File.#resolvePath(file);
			fs.readFile(target, File.encoding, (err, data) => {
				if (err)
					return (err.code === 'ENOENT')
						? reject(new Error(`ENOENT: file not found: ${target}`))		// file not found
						: reject(err);																							// coerce to number if possible

				resolve(ifNumeric(data));
			});
		} catch (err) {
			reject(err);
		}
	})

	static write = (file: string, doc: string | NodeJS.ArrayBufferView) => new Promise<string | NodeJS.ArrayBufferView>((resolve, reject) => {
		try {
			const target = File.#resolvePath(file);
			fs.writeFile(target, doc, File.encoding, (err => err ? reject(err) : resolve(doc)));
		} catch (err) {
			reject(err);
		}
	})

	static exist = (file: string) => new Promise<boolean>((resolve, reject) => {
		try {
			const target = File.#resolvePath(file);
			fs.access(target, (err =>
				err && err.code !== 'ENOENT'
					? reject(err)																			// anything other than 'file not-exists'
					: resolve(!err))
			);
		} catch (err) {
			reject(err);
		}
	})

	static remove = (file: string) => new Promise<void>((resolve, reject) => {
		try {
			const target = File.#resolvePath(file);
			fs.unlink(target, (err =>
				err && err.code !== 'ENOENT'
					? reject(err)																			// anything other than 'file not-exists'
					: resolve())
			);
		} catch (err) {
			reject(err);
		}
	})
}
