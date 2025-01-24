import { asArray } from '@core/shared/array.library.js';
import { Logger } from '@core/shared/logger.library.js';
import { sprintf } from '@core/shared/string.library.js';
import { ifDefined } from '@core/shared/object.library.js';
import { isEmpty, isObject } from '@core/shared/type.library.js';

/**
 * Wrap a Promise's resolve/reject/finally methods for later fulfilment.  
 * with useful methods for tracking the state of the Promise, chaining fulfilment, etc.  
 ```
	 new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void})
	 new Pledge<T>(tag?: string) 
 ```
 */
export class Pledge<T> {
	#pledge: PromiseWithResolvers<T>;
	#status = {} as Pledge.Status<T>;
	static #static = {} as Pledge.Constructor;

	/** initialize future Pledge instances */
	static init(arg?: Pledge.Constructor | string) {
		if (isObject(arg)) {
			if (isEmpty(arg))
				Pledge.#static = {};																// reset static values

			Object.assign(Pledge.#static,
				ifDefined({ tag: arg.tag, debug: arg.debug, catch: arg.catch, }),
				ifDefined({ onResolve: arg.onResolve, onReject: arg.onReject, onSettle: arg.onSettle, }),
			)
		} else {
			Object.assign(Pledge.#static, ifDefined({ tag: arg, }));
		}

		if (Pledge.#static.debug)
			console.log('Pledge: ', Pledge.#static);							// debug

		return Pledge.status;
	}

	static get status() {
		return Pledge.#static as Pledge.Status<unknown>;
	}

	#info = this.#debug.bind(this, 'info');
	#warn = this.#debug.bind(this, 'warn');
	#error = this.#debug.bind(this, 'error');
	#debug(method: Logger = 'info', ...msg: any[]) {
		if (this.status.debug)
			console[method](sprintf('pledge:', ...msg));
	}
	/** use catch:boolean to determine whether to throw or return  */
	#catch(...msg: any[]) {
		if (this.status.catch) {
			this.#warn(...msg);																		// catch, but warn {error}
			return;
		}

		this.#error(...msg);																		// assume {error}
		throw new Error(sprintf('pledge:', ...msg));
	}

	constructor(arg?: Pledge.Constructor | string) {
		this.#pledge = Promise.withResolvers();
		this.#status = { state: Pledge.STATE.Pending, ...Pledge.#static };

		if (isObject(arg)) {
			Object.assign(this.#status,
				ifDefined({ tag: Pledge.#static.tag, debug: Pledge.#static.debug, catch: Pledge.#static.catch }),
				ifDefined({ tag: arg.tag, debug: arg.debug, catch: arg.catch, }),
			)

			asArray(Pledge.#static.onResolve)											// stack any static onResolve actions
				.concat(asArray(arg.onResolve))											// stack any instance onResolve actions
				.forEach(resolve => this.#pledge.promise.then(resolve));
			asArray(Pledge.#static.onReject)											// stack any static onReject actions
				.concat(asArray(arg.onReject))											// stack any instance onReject actions
				.forEach(reject => this.#pledge.promise.catch(reject));
			asArray(Pledge.#static.onSettle)											// stack any static onSettle actions
				.concat(asArray(arg.onSettle))											// stack any instance onSettle actions
				.forEach(settle => this.#pledge.promise.finally(settle));

			if (this.#status.catch)																// stack a 'catch-all'
				this.#pledge.promise.catch(_ => this.#catch(this.#status, this.#status.error));
		} else {
			Object.assign(this.#status, ifDefined({ tag: arg ?? Pledge.#static.tag, }));
		}
	}

	get() {
		return this.#pledge.promise;
	}

	get [Symbol.toStringTag]() {
		return 'Pledge'
	}

	get status() {
		return JSON.parse(JSON.stringify(this.#status)) as Pledge.Status<T>;
	}

	get promise() {
		return this.#pledge.promise;
	}

	toString() {
		return JSON.stringify(this.status);
	}

	resolve(value: T) {
		if (this.#status.state === Pledge.STATE.Pending) {
			this.#status.settle = value;
			this.#status.state = Pledge.STATE.Resolved;
			this.#pledge.resolve(value);													// resolve, then trigger any Pledge.onResolve, then Pledge.onSettle
		}
		else this.#warn(this.#status, `Pledge was already ${this.status.state}`);

		return this.#pledge.promise;
	}

	reject(error: any) {
		if (this.#status.state === Pledge.STATE.Pending) {
			this.#status.error = error;
			this.#status.state = Pledge.STATE.Rejected;
			this.#pledge.reject(error);														// reject, then trigger any Pledge.onReject, then Pledge.onSettle
		}
		else this.#warn(this.#status, `Pledge was already ${this.status.state}`);

		return this.#pledge.promise;
	}

	then(fn: Function) {																			// TODO:  can we make Pledge 'then-able' ?

	}
}

export namespace Pledge {
	export type Resolve = (val: any) => any;									// function to call after Pledge resolves
	export type Reject = (err: Error) => any;									// function to call after Pledge rejects
	export type Settle = () => void;													// function to call after Pledge settles

	export type Constructor = {
		tag?: string;
		onResolve?: Pledge.Resolve | Pledge.Resolve[];
		onReject?: Pledge.Reject | Pledge.Reject[];
		onSettle?: Pledge.Settle | Pledge.Settle[];
		debug?: boolean;
		catch?: boolean;
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
		settle?: T,
		error?: Error,
	}
}
