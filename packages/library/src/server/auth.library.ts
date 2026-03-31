import { Buffer } from 'node:buffer';

const MAX_TOKEN_LENGTH = 8192;														// 8 KB
const MAX_PAYLOAD_LENGTH = 4096;														// 4 KB

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
export const decodeJWTPayload = <T = unknown>(token: string): T => {
	if (token.length > MAX_TOKEN_LENGTH) {
		throw new Error('JWT too large: Incoming token exceeds maximum length.');
	}

	const segments = token.split('.');

	if (segments.length !== 3) {
		throw new Error('Invalid JWT format: Expected 3 segments (header.payload.signature)');
	}

	if (segments[1].length > MAX_PAYLOAD_LENGTH) {
		throw new Error('JWT payload too large: Encoded segment exceeds maximum length.');
	}

	try {
		let payload = segments[1]
			.replace(/-/g, '+')
			.replace(/_/g, '/');

		// Handle missing base64 padding
		while (payload.length % 4 !== 0)
			payload += '=';

		if (payload.length > MAX_PAYLOAD_LENGTH + 4) {								// final check on padded payload
			throw new Error('JWT payload too large: Final payload exceeds maximum length.');
		}

		return JSON.parse(Buffer.from(payload, 'base64').toString()) as unknown as T;
	} catch (err) {
		throw new Error(`Invalid JWT payload: ${(err as Error).message}`);
	}
};
