import type { ValueOf } from '#library/type.library.js';

const TWO_SECONDS = 2000;																	// default time-out for requests, in milliseconds

export const HTTP = {
	Ok: 200,
	PermRedirect: 301,
	TempRedirect: 302,
	BadRequest: 400,
	Unauthorised: 401,
	Forbidden: 403,
} as const
export type HTTP = ValueOf<typeof HTTP>

export const METHOD = {
	Head: 'HEAD',
	Get: 'GET',
	Put: 'PUT',
	Delete: 'DELETE',
	Post: 'POST',
} as const

type Config = {
	/** number of milliseconds to attempt a request */				timeOut?: number;
	/** response wrapper (eg.  "alert({hello:'there'})" */		prefix?: string;
}

/** get data from a resource-url */
export const httpRequest = <T>(url: string | URL, init = {} as RequestInit, config = {} as Config) => {
	const signallingInit = {
		...init,
		signal: AbortSignal.timeout(config.timeOut ?? TWO_SECONDS)
	};

	return fetch(url, signallingInit)													// caller will handle the 'catch' if error
		.then(async res => {
			if (res.ok) {
				if (config.prefix) {
					const text = await res.text();										// read raw text first
					const json = text.startsWith(config.prefix)				// if it starts with the specified prefix
						? text.substring(config.prefix.length).replace(/\);?$/, '')	// then strip the prefix AND any trailing closure
						: text;

					return JSON.parse(json) as T;											// parse the unwrapped string
				}

				return res.json() as T;															// default JSON parsing
			}

			throw new Error(`${res.status}: ${res.statusText}`);	// fetch not successful
		})
}

/**
 * get Response headers only (no data).  
 * useful for just checking that a URL exists  
 */
export const headRequest = (url: string | URL) => {
	const signal = AbortSignal.timeout(TWO_SECONDS);
	const init = { method: METHOD.Head, signal }							// only interested in verifying that url responds

	return fetch(url, init)																	// caller will handle the 'catch' if error
		.then(({ ok, status, statusText, headers }) => {
			if (ok || status === HTTP.Forbidden)									// forbidden, but at least we know url responds
				return { status, headers }

			throw new Error(`${status}: ${statusText}`);					// fetch not successful
		})
}
