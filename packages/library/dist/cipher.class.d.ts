/** Static-only cryptographic methods */
export declare class Cipher {
    #private;
    /** random UUID */
    static randomKey: () => string;
    /** decode base64 back into object */
    static decodeBase64: <T>(buf?: string) => T;
    /** encode object into base64 */
    static encodeBase64: (buf: unknown) => string;
    static hmac: (source: string | Object, secret: string, alg?: string, len?: number) => Promise<string>;
    static hash: (source: string | Object, len?: number, alg?: string) => Promise<string>;
    static encodeBuffer: (str: string) => Uint16Array<ArrayBuffer>;
    static decodeBuffer: (buf: Uint16Array) => string;
    static encrypt: (data: any) => Promise<string>;
    static decrypt: (secret: Promise<ArrayBuffer>) => Promise<string>;
    static sign: (doc: any) => Promise<string>;
    static verify: (signature: Promise<ArrayBuffer>, doc: any) => Promise<boolean>;
}
