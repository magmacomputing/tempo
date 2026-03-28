import * as fs from 'node:fs';
import * as os from 'node:os';

import { ifNumeric } from '#library/coercion.library.js';

export class File {
	static tmpDir = os.tmpdir() + '/';
	static encoding: BufferEncoding = 'utf8';

	static read = (file: string) => new Promise((resolve, reject) =>
		fs.readFile(File.tmpDir + file, File.encoding, (err, data) =>
			err && err.code !== 'ENOENT'
				? reject(err)																				// anything other than 'file-not-exists'
				: resolve(ifNumeric(data))													// coerce to number if possible
		)
	)

	static write = (file: string, doc: any) => new Promise((resolve, reject) =>
		fs.writeFile(File.tmpDir + file, doc, File.encoding, (err => err ? reject(err) : resolve(doc)))
	)

	static exist = (file: string) => new Promise<boolean>((resolve, reject) =>
		fs.access(File.tmpDir + file, (err =>
			err && err.code !== 'ENOENT'
				? reject(err)																				// anything other than 'file not-exists'
				: resolve(!err))
		))

	static remove = async (path: string) =>
		fs.unlinkSync(File.tmpDir + path)
}
