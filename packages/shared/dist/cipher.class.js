import { __classPrivateFieldGet, __esDecorate, __runInitializers, __setFunctionName } from "tslib";
import { toHex } from '#core/shared/number.library.js';
import { asString } from '#core/shared/coercion.library.js';
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
};
/** Static-only cryptographic methods */
let Cipher = (() => {
    var _Cipher_cryptoKey, _Cipher_vector, _Cipher_asymmetricKey;
    let _classDecorators = [Immutable, Static];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Cipher = class {
        static { _classThis = this; }
        static { __setFunctionName(this, "Cipher"); }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Cipher = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static {
            _Cipher_cryptoKey = { value: subtle.generateKey({ name: keys.TypeKey, length: 128 }, false, ['encrypt', 'decrypt']) };
        }
        static {
            _Cipher_vector = { value: crypto.getRandomValues(new Uint8Array(16)) };
        }
        static {
            _Cipher_asymmetricKey = { value: subtle.generateKey({
                    name: keys.SignKey,
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: { name: keys.Algorithm },
                }, false, ['sign', 'verify']) };
        }
        /** random UUID */
        static randomKey = () => crypto.randomUUID().split('-')[0];
        /** decode base64 back into object */
        static decodeBase64 = (buf = '') => {
            const uint8 = base64DecToArr(buf); // first, convert to UInt8Array
            const str = UTF8ArrToStr(uint8); // convert to string
            return objectify(str); // rebuild the original object
        };
        /** encode object into base64 */
        static encodeBase64 = (buf) => {
            const str = stringify(buf); // first, stringify the incoming buffer
            const uint8 = strToUTF8Arr(str); // convert to Uint8Array
            return base64EncArr(uint8); // convert to string
        };
        static hmac = async (source, secret, alg = 'SHA-512', len) => {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const messageData = encoder.encode(asString(source));
            const key = await subtle.importKey('raw', keyData, { name: 'HMAC', hash: { name: alg } }, false, ['sign']);
            const signature = await subtle.sign('HMAC', key, messageData);
            return toHex(Array.from(new Uint8Array(signature)), len);
        };
        static hash = async (source, len, alg = 'SHA-256') => {
            const buffer = Cipher.encodeBuffer(asString(source));
            const hash = await subtle.digest(alg, buffer);
            return toHex(Array.from(new Uint8Array(hash)), len);
        };
        static encodeBuffer = (str) => new Uint16Array(new TextEncoder().encode(str));
        static decodeBuffer = (buf) => new TextDecoder(keys.Encoding).decode(buf);
        static encrypt = async (data) => subtle.encrypt({ name: keys.TypeKey, iv: __classPrivateFieldGet(Cipher, _classThis, "f", _Cipher_vector) }, await __classPrivateFieldGet(Cipher, _classThis, "f", _Cipher_cryptoKey), Cipher.encodeBuffer(data))
            .then(result => new Uint16Array(result))
            .then(Cipher.decodeBuffer);
        static decrypt = async (secret) => subtle.decrypt({ name: keys.TypeKey, iv: __classPrivateFieldGet(Cipher, _classThis, "f", _Cipher_vector) }, await __classPrivateFieldGet(Cipher, _classThis, "f", _Cipher_cryptoKey), await secret)
            .then(result => new Uint16Array(result))
            .then(Cipher.decodeBuffer);
        static sign = async (doc) => subtle.sign(keys.SignKey, (await __classPrivateFieldGet(Cipher, _classThis, "f", _Cipher_asymmetricKey)).privateKey, Cipher.encodeBuffer(doc))
            .then(result => new Uint16Array(result))
            .then(Cipher.decodeBuffer);
        static verify = async (signature, doc) => subtle.verify(keys.SignKey, (await __classPrivateFieldGet(Cipher, _classThis, "f", _Cipher_asymmetricKey)).publicKey, await signature, Cipher.encodeBuffer(doc));
        static {
            __runInitializers(_classThis, _classExtraInitializers);
        }
    };
    return Cipher = _classThis;
})();
export { Cipher };
//# sourceMappingURL=cipher.class.js.map