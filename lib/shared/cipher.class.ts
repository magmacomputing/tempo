import { toHex } from '@module/shared/number.library';
import { asString } from '@module/shared/string.library';
import { stringify, objectify } from '@module/shared/serialize.library';
import { base64DecToArr, base64EncArr, strToUTF8Arr, UTF8ArrToStr } from '@module/browser/buffer.library';

/** Static-only cryptographic methods */
export class Cipher {
	static #KEYS = {
		Algorithm: 'SHA-256',
		Encoding: 'utf-8',
		SignKey: 'RSASSA-PKCS1-v1_5',
		TypeKey: 'AES-GCM',
	}

	private constructor() { }																						// prevent instantiation

	static #cryptoKey = globalThis.crypto.subtle.generateKey({ name: Cipher.#KEYS.TypeKey, length: 128 }, false, ['encrypt', 'decrypt']);
	static #vector = globalThis.crypto.getRandomValues(new Uint8Array(16));
	static #asymmetricKey = globalThis.crypto.subtle.generateKey({
		name: Cipher.#KEYS.SignKey,
		modulusLength: 2048,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: { name: Cipher.#KEYS.Algorithm },
	}, false, ['sign', 'verify']);

	static decodeBase64 = <T>(str = ''): T => {
		const uint8 = base64DecToArr(str);
		const buf = UTF8ArrToStr(uint8);
		return objectify(buf);
	}

	static encodeBase64 = (buf: any) => {
		const str = stringify(buf);															// first, stringify the incoming buffer
		const uint8 = strToUTF8Arr(str);												// convert to Uint8Array
		return base64EncArr(uint8);															// convert to string
	}

	static hash = async (source: string | Object, len: number = 64, alg: AlgorithmIdentifier = 'SHA-256') => {
		const buffer = Cipher.encodeBuffer(asString(source));
		const hash = await globalThis.crypto.subtle.digest(alg, buffer);

		return toHex(Array.from(new Uint8Array(hash)), len);
	}

	static encodeBuffer = (str: string) => new Uint16Array(new TextEncoder().encode(str));
	static decodeBuffer = (buf: Uint16Array) => new TextDecoder(Cipher.#KEYS.Encoding).decode(buf);

	static encrypt = async (data: any) =>
		globalThis.crypto.subtle.encrypt({ name: Cipher.#KEYS.TypeKey, iv: Cipher.#vector }, await Cipher.#cryptoKey, Cipher.encodeBuffer(data))
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static decrypt = async (secret: Promise<ArrayBuffer>) =>
		globalThis.crypto.subtle.decrypt({ name: Cipher.#KEYS.TypeKey, iv: Cipher.#vector }, await Cipher.#cryptoKey, await secret)
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static sign = async (doc: any) =>
		globalThis.crypto.subtle.sign(Cipher.#KEYS.SignKey, (await Cipher.#asymmetricKey).privateKey!, Cipher.encodeBuffer(doc))
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static verify = async (signature: Promise<ArrayBuffer>, doc: any) =>
		globalThis.crypto.subtle.verify(Cipher.#KEYS.SignKey, (await Cipher.#asymmetricKey).publicKey!, await signature, Cipher.encodeBuffer(doc));
}
