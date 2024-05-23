import { asArray } from '@module/shared/array.library.js';
import { stringify } from '@module/shared/serialize.library.js';
import { isString, type TValues } from '@module/shared/type.library.js'

/**
 * Wrap a Promise's resolve/reject/finally methods for later fulfilment   
 ```
	 new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void, catch: boolean, debug: boolean})
	 new Pledge<T>(tag?: string) 
 ```
 */
export class Pledge<T> {
	static #options: Pledge.Constructor = {};

	static init(opts: Pledge.Constructor) {
		Object.assign(Pledge.#options, opts);										// allow for pre-defined instance options
		console.log('Pledge: ', Pledge.#options);
	}

	#status: Pledge.Status<T>;
	#promise: Promise<T>;
	#resolve!: (value: T | PromiseLike<T>) => void;
	#reject!: (reason?: string) => void;

	get [Symbol.toStringTag]() { return 'Pledge' }

	constructor(arg?: Pledge.Constructor | string) {
		const {
			tag = Pledge.#options.tag,
			onResolve = Pledge.#options.onResolve,
			onReject = Pledge.#options.onReject,
			onSettle = Pledge.#options.onSettle,
			...flags } = isString(arg)
				? { tag: arg } as Pledge.Constructor								// if String, assume 'tag'
				: { ...arg }									// else 'options'

		this.#status = JSON.parse(JSON.stringify({							// remove undefined values
			tag,
			debug: flags.debug ?? Pledge.#options.debug,
			catch: flags.catch ?? Pledge.#options.catch,
			state: Pledge.STATE.Pending,
		}));

		this.#promise = new Promise<T>((resolve, reject) => {
			this.#resolve = resolve;															// stash resolve()
			this.#reject = reject;																// stash reject()
		})

		if (onResolve) {
			(this.#status.fulfil ??= {}).onResolve = asArray(onResolve);
			this.#status.fulfil.onResolve													// stack any then() callbacks
				.forEach(resolve => this.#promise.then(resolve));
		}
		if (onReject) {
			(this.#status.fulfil ??= {}).onReject = asArray(onReject);
			this.#status.fulfil.onReject													// stack any catch() callbacks
				.forEach(reject => this.#promise.catch(reject));
		}

		if (onSettle) {
			(this.#status.fulfil ??= {}).onSettle = asArray(onSettle);
			this.#status.fulfil.onSettle													// stack any finally() callbacks
				.forEach(settle => this.#promise.finally(settle));
		}
	}

	resolve(value: T) {
		const tag = this.#status.tag ? `(${this.#status.tag}) ` : '';

		switch (this.#status.state) {
			case Pledge.STATE.Pending:
				Object.assign(this.#status, { state: Pledge.STATE.Resolved, value });
				this.#resolve(value);																// resolve, then trigger any Pledge.onResolve, then Pledge.onSettle
				return value;

			case Pledge.STATE.Resolved:														// warn: already resolved
				const resolve = (this.#status as Pledge.StatusValue<T>).value;
				if (value && stringify(value) !== stringify(resolve) && this.#status.debug)
					console.warn(`Pledge ${tag}already resolved: "${resolve}"`);
				return resolve;

			case Pledge.STATE.Rejected:														// error: already rejected
				const err = (this.#status as Pledge.StatusError<Error>).error.message;
				const msg = `Pledge ${tag}already rejected: "${err}"`;
				if (this.#status.catch) {
					if (this.#status.debug)
						console.warn(msg);
					return err as unknown as T;												// User needs to handle the error
				}
				else throw new Error(msg);
		}
	}

	reject(error?: any) {
		const tag = this.#status.tag ? `(${this.#status.tag}) ` : '';

		switch (this.#status.state) {
			case Pledge.STATE.Pending:
				Object.assign(this.#status, { state: Pledge.STATE.Rejected, error: new Error(error) });
				this.#reject(error);																// reject, then trigger any Pledge.onReject, then Pledge.onSettle
				return error;

			case Pledge.STATE.Rejected:														// warn: already rejected
				const reject = (this.#status as Pledge.StatusError<Error>).error.message;
				if (error && stringify(error) !== stringify(reject) && this.#status.debug)
					console.warn(`Pledge ${tag}already rejected: "${reject}"`);
				return reject;

			case Pledge.STATE.Resolved:														// error: already resolved
				const err = (this.#status as Pledge.StatusValue<T>).value;
				const msg = `Pledge ${tag}already resolved: "${err}"`;
				if (this.#status.catch) {
					if (this.#status.debug)
						console.warn(msg);
					return err;																				// User needs to handle the error
				}
				else throw new Error(msg);
		}
	}

	get promise() {
		return this.#promise;
	}

	get status() {
		return this.#status;
	}

	toString() {
		return JSON.stringify(this.#status);										// current status of Pledge
	}
}

export namespace Pledge {
	export type Resolve = (val: any) => any;									// function to call after Pledge resolves
	export type Reject = (err: Error) => any;									// function to call after Pledge rejects
	export type Settle = () => void;													// function to call after Pledge settles

	export type Constructor = {
		tag?: string;
		onResolve?: TValues<Pledge.Resolve>;
		onReject?: TValues<Pledge.Reject>;
		onSettle?: TValues<Pledge.Settle>;
		catch?: boolean;
		debug?: boolean;
	}

	export enum STATE {
		Pending = 'pending',
		Resolved = 'resolved',
		Rejected = 'rejected',
	}

	export interface Status<T> {
		tag?: string;
		debug?: boolean;
		catch?: boolean;
		state: Pledge.STATE;
		fulfil?: {
			onResolve?: Pledge.Resolve[];
			onReject?: Pledge.Reject[];
			onSettle?: Pledge.Settle[];
		}
	}
	export interface StatusValue<T> extends Pledge.Status<T> {
		state: Pledge.STATE.Resolved;
		value: T;
	}
	export interface StatusError<T> extends Pledge.Status<T> {
		state: Pledge.STATE.Rejected;
		error: Error;
	}
}
