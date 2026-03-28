import { Buffer } from 'node:buffer';

export const decodeJWT = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
