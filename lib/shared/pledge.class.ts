import { asArray } from '@module/shared/array.library';
import { clone, stringify } from '@module/shared/serialize.library';
import { isString, type TValues } from '@module/shared/type.library'

/**
 * Wrap a Promise<T>, its status and Resolve/Reject/Settle methods for later fulfilment   
 ```
	 new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void, catch: boolean, debug: boolean})
	 new Pledge<T>(tag?: string) 
 ```
 */
export class Pledge<T> {
	#status: Pledge.Status<T>;
	#promise: Promise<T>;
	#resolve!: (value: T | PromiseLike<T>) => void;
	#reject!: (reason?: string) => void;

	constructor(arg?: Pledge.Constructor | string) {
		const { tag, onResolve = void 0, onReject = void 0, onSettle = void 0, ...flags } = isString(arg)
			? { tag: arg }
			: { ...arg }

		this.#status = clone({																	// clone will remove undefined
			tag,
			catch: flags.catch,
			debug: flags.debug,
			state: Pledge.STATE.Pending,
		});

		this.#promise = new Promise<T>((resolve, reject) => {
			this.#resolve = resolve;															// stash resolve()
			this.#reject = reject;																// stash reject()
		})

		if (onResolve) {
			(this.#status.fulfil ??= {}).onResolve = asArray(onResolve);
			this.#status.fulfil.onResolve													// stack any then() callbacks
				?.forEach(resolve => this.#promise.then(resolve));
		}
		if (onReject) {
			(this.#status.fulfil ??= {}).onReject = asArray(onReject);
			this.#status.fulfil.onReject													// stack any catch() callbacks
				?.forEach(reject => this.#promise.catch(reject));
		}

		if (onSettle) {
			(this.#status.fulfil ??= {}).onSettle = asArray(onSettle);
			this.#status.fulfil.onSettle													// stack any finally() callbacks
				?.forEach(settle => this.#promise.finally(settle));
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
				else throw new Error(`Pledge ${tag}already resolved: "${(this.#status as Pledge.StatusValue<T>).value}"`);
		}
	}

	get promise() {
		return this.#promise;
	}

	get status() {
		return this.#status;
	}
}

export namespace Pledge {
	export type Resolve = (val: any) => any;									// functions to call after Pledge resolves
	export type Reject = (err: Error) => any;									// functions to call after Pledge rejects
	export type Settle = () => void;													// functions to call after Pledge settles

	export type Constructor = { tag?: string, onResolve?: TValues<Pledge.Resolve>, onReject?: TValues<Pledge.Reject>, onSettle?: TValues<Pledge.Settle>, catch?: boolean, debug?: boolean }

	export enum STATE {
		Pending = 'pending',
		Resolved = 'resolved',
		Rejected = 'rejected',
	}

	export interface Status<T> {
		tag?: string;
		catch?: boolean;
		debug?: boolean;
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
