import { toHex } from '@module/shared/number.library';
import { asString } from '@module/shared/string.library';
import { stringify, objectify } from '@module/shared/serialize.library';

/** Static-only cryptographic methods */
export class Cipher {
	static #KEYS = {
		Algorithm: 'SHA-256',
		Encoding: 'utf-8',
		SignKey: 'RSASSA-PKCS1-v1_5',
		TypeKey: 'AES-GCM',
	}

	private constructor() { }																						// prevent instantiation

	static #cryptoKey = window.crypto?.subtle?.generateKey({ name: Cipher.#KEYS.TypeKey, length: 128 }, false, ['encrypt', 'decrypt']);
	static #vector = window.crypto?.getRandomValues(new Uint8Array(16));
	static #asymmetricKey = window.crypto?.subtle?.generateKey({
		name: Cipher.#KEYS.SignKey,
		modulusLength: 2048,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: { name: Cipher.#KEYS.Algorithm },
	}, false, ['sign', 'verify']);

	static decodeBase64 = <T>(str = ''): T => {
		const obj = window.atob(str.replace('-', '+').replace('_', '/'));
		return objectify(obj) as T;
	}

	static encodeBase64 = (buf: any) =>
		window.btoa(stringify(buf));
	// window.btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));

	static hash = async (source: string | Object, len: number = 64, alg: AlgorithmIdentifier = 'SHA-256') => {
		const buffer = Cipher.encodeBuffer(asString(source));
		const hash = await window.crypto?.subtle?.digest(alg, buffer);

		return toHex(Array.from(new Uint8Array(hash)), len);
	}

	static encodeBuffer = (str: string) => new Uint16Array(new TextEncoder().encode(str));
	static decodeBuffer = (buf: Uint16Array) => new TextDecoder(Cipher.#KEYS.Encoding).decode(buf);

	static encrypt = async (data: any) =>
		window.crypto?.subtle?.encrypt({ name: Cipher.#KEYS.TypeKey, iv: Cipher.#vector }, await Cipher.#cryptoKey, Cipher.encodeBuffer(data))
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static decrypt = async (secret: Promise<ArrayBuffer>) =>
		window.crypto?.subtle?.decrypt({ name: Cipher.#KEYS.TypeKey, iv: Cipher.#vector }, await Cipher.#cryptoKey, await secret)
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static sign = async (doc: any) =>
		window.crypto?.subtle?.sign(Cipher.#KEYS.SignKey, (await Cipher.#asymmetricKey).privateKey!, Cipher.encodeBuffer(doc))
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static verify = async (signature: Promise<ArrayBuffer>, doc: any) =>
		window.crypto?.subtle?.verify(Cipher.#KEYS.SignKey, (await Cipher.#asymmetricKey).publicKey!, await signature, Cipher.encodeBuffer(doc));
}
