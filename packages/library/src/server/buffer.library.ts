import { stringify, objectify } from '#library/serialize.library.js';

export const encode64 = (str: any) => Buffer.from(stringify(str)).toString('base64');
export const decode64 = <T>(str: string) => objectify<T>(Buffer.from(str, 'base64').toString());
