import { toHex } from '#core/shared/number.library.js';
import { asString } from '#core/shared/string.library.js';
import { Immutable, Static } from '#core/shared/class.library.js';
import { stringify, objectify } from '#core/shared/serialize.library.js';
import { base64DecToArr, base64EncArr, strToUTF8Arr, UTF8ArrToStr } from '#core/shared/buffer.library.js';

const crypto = globalThis.crypto;
const subtle = crypto.subtle;
const keys = {
	Algorithm: 'SHA-256',
	Encoding: 'utf-8',
	SignKey: 'RSASSA-PKCS1-v1_5',
	TypeKey: 'AES-GCM',
} as const

/** Static-only cryptographic methods */
@Immutable
@Static																											// prevent instantiation
export class Cipher {
	static #cryptoKey = subtle.generateKey({ name: keys.TypeKey, length: 128 }, false, ['encrypt', 'decrypt']);
	static #vector = crypto.getRandomValues(new Uint8Array(16));
	static #asymmetricKey = subtle.generateKey({
		name: keys.SignKey,
		modulusLength: 2048,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: { name: keys.Algorithm },
	}, false, ['sign', 'verify']);

	/** random UUID */
	static randomKey = () => crypto.randomUUID().split('-')[0];

	/** decode base64 back into object */
	static decodeBase64 = <T>(buf = ''): T => {
		const uint8 = base64DecToArr(buf);											// first, convert to UInt8Array
		const str = UTF8ArrToStr(uint8);												// convert to string

		return objectify(str);																	// rebuild the original object
	}

	/** encode object into base64 */
	static encodeBase64 = (buf: unknown) => {
		const str = stringify(buf);															// first, stringify the incoming buffer
		const uint8 = strToUTF8Arr(str);												// convert to Uint8Array

		return base64EncArr(uint8);															// convert to string
	}

	static hash = async (source: string | Object, len = 64, alg = 'SHA-256') => {
		const buffer = Cipher.encodeBuffer(asString(source));
		const hash = await subtle.digest(alg, buffer);

		return toHex(Array.from(new Uint8Array(hash)), len);
	}

	static encodeBuffer = (str: string) => new Uint16Array(new TextEncoder().encode(str));
	static decodeBuffer = (buf: Uint16Array) => new TextDecoder(keys.Encoding).decode(buf);

	static encrypt = async (data: any) =>
		subtle.encrypt({ name: keys.TypeKey, iv: Cipher.#vector }, await Cipher.#cryptoKey, Cipher.encodeBuffer(data))
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static decrypt = async (secret: Promise<ArrayBuffer>) =>
		subtle.decrypt({ name: keys.TypeKey, iv: Cipher.#vector }, await Cipher.#cryptoKey, await secret)
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static sign = async (doc: any) =>
		subtle.sign(keys.SignKey, (await Cipher.#asymmetricKey).privateKey!, Cipher.encodeBuffer(doc))
			.then(result => new Uint16Array(result))
			.then(Cipher.decodeBuffer);

	static verify = async (signature: Promise<ArrayBuffer>, doc: any) =>
		subtle.verify(keys.SignKey, (await Cipher.#asymmetricKey).publicKey!, await signature, Cipher.encodeBuffer(doc));
}
