import { Buffer } from 'node:buffer';

/**
 * Decodes a JWT payload without verifying its signature.
 * 
 * @WARNING This function does NOT perform signature verification.
 * It strictly decodes the payload for inspection. To ensure the integrity
 * and authenticity of the token, you MUST verify the signature using
 * a trusted library (e.g., jsonwebtoken) and your secret/public key.
 * 
 * @param token - The JWT string to decode
 * @throws {Error} If the token is malformed or the payload cannot be parsed
 * @returns The parsed JSON payload of the JWT
 */
export const decodeJWTPayload = <T = any>(token: string): T => {
	const segments = token.split('.');

	if (segments.length !== 3) {
		throw new Error('Invalid JWT format: Expected 3 segments (header.payload.signature)');
	}

	try {
		let payload = segments[1]
			.replace(/-/g, '+')
			.replace(/_/g, '/');

		// Handle missing base64 padding
		while (payload.length % 4 !== 0)
			payload += '=';

		return JSON.parse(Buffer.from(payload, 'base64').toString()) as T;
	} catch (err) {
		throw new Error(`Invalid JWT payload: ${(err as Error).message}`);
	}
};
