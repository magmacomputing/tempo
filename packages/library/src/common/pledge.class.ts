import { Logify } from '#library/logify.class.js';
import { asArray } from '#library/coercion.library.js';
import { sprintf } from '#library/string.library.js';
import { ifDefined } from '#library/object.library.js';
import { secure } from '#library/utility.library.js';
import { cleanify } from '#library/serialize.library.js';
import { Immutable } from '#library/class.library.js';
import { isEmpty, isObject } from '#library/type.library.js';

declare module '#library/type.library.js' {
	interface TypeValueMap<T> {
		Pledge: { type: 'Pledge', value: Pledge<T> };
	}
}

/**
 * Wrap a Promise's resolve/reject/finally methods for later fulfilment.  
 * with useful methods for tracking the state of the Promise, chaining fulfilment, etc.  
 ```
	 new Pledge<T>({tag: string, onResolve?: () => void, onReject?: () => void, onSettle?: () => void})
	 new Pledge<T>(tag?: string) 
 ```
 */
@Immutable
export class Pledge<T> {
	#pledge: PromiseWithResolvers<T>;
	#status = {} as Pledge.Status<T>;
	static #dbg = new Logify('Pledge: ');
	static #static = {} as Pledge.Constructor;

	static STATE = secure({
		Pending: Symbol('pending'),
		Resolved: Symbol('resolved'),
		Rejected: Symbol('rejected')
	})

	/** initialize future Pledge instances */
	static init(arg?: Pledge.Constructor | string) {
		if (isObject(arg)) {
			if (isEmpty(arg))
				Pledge.#static = {};																// reset static values

			Object.assign(Pledge.#static,
				ifDefined({ tag: arg.tag, debug: arg.debug, catch: arg.catch, silent: arg.silent }),
				ifDefined({ onResolve: arg.onResolve, onReject: arg.onReject, onSettle: arg.onSettle, }),
			)
		} else {
			Object.assign(Pledge.#static, ifDefined({ tag: arg, }));
		}

		Pledge.#dbg.debug(Pledge.#static, Pledge.#static);

		return Pledge.status;
	}

	/** reset static defaults */
	static [Symbol.dispose]() { Pledge.init({}) }

	static get status() {
		return Pledge.#static as Pledge.Status<typeof Pledge>;
	}

	constructor(arg?: Pledge.Constructor | string) {
		const opts = isObject(arg) ? arg : { tag: arg as string };
		const config = { ...Pledge.#static, ...ifDefined({ tag: opts.tag, debug: opts.debug, catch: opts.catch, silent: opts.silent }) };

		this.#pledge = Promise.withResolvers();
		this.#status = { state: Pledge.STATE.Pending, ...config };

		const onResolve = asArray(Pledge.#static.onResolve).concat(asArray(opts.onResolve));
		const onReject = asArray(Pledge.#static.onReject).concat(asArray(opts.onReject));
		const onSettle = asArray(Pledge.#static.onSettle).concat(asArray(opts.onSettle));

		if (onResolve.length) this.#pledge.promise.then(val => onResolve.forEach(cb => cb(val)));
		if (onReject.length) this.#pledge.promise.catch(err => onReject.forEach(cb => cb(err)));
		if (onSettle.length) this.#pledge.promise.finally(() => onSettle.forEach(cb => cb()));

		if (this.#status.catch)
			this.#pledge.promise.catch(err => Pledge.#dbg.catch(this.#status, err));
	}

	get [Symbol.toStringTag]() {
		return 'Pledge'
	}

	[Symbol.dispose]() {
		if (this.isPending)
			this.reject(new Error(`Pledge disposed`));						// dispose
	}

	get status() {
		return cleanify(this.#status);
	}

	get promise() {
		return this.#pledge.promise;
	}

	get state() {
		return this.#status.state.description;
	}

	get isPending() {
		return this.#status.state === Pledge.STATE.Pending;
	}
	get isResolved() {
		return this.#status.state === Pledge.STATE.Resolved;
	}
	get isRejected() {
		return this.#status.state === Pledge.STATE.Rejected;
	}
	get isSettled() {
		return this.#status.state !== Pledge.STATE.Pending;
	}

	toString() {
		return JSON.stringify(this.status);
	}

	resolve(value: T) {
		if (this.isPending) {
			this.#status.settled = value;
			this.#status.state = Pledge.STATE.Resolved;
			Pledge.#dbg.debug(this.#status, 'Resolved');					// debug
			this.#pledge.resolve(value);													// resolve
		}
		else Pledge.#dbg.warn(this.#status, `Pledge was already ${this.state}`);

		return this.#pledge.promise;
	}

	reject(error: any) {
		if (this.isPending) {
			this.#status.error = error;
			this.#status.state = Pledge.STATE.Rejected;
			Pledge.#dbg.debug(this.#status, 'Rejected', error);		// debug
			this.#pledge.reject(error);														// reject
		}
		else Pledge.#dbg.warn(this.#status, `Pledge was already ${this.state}`);

		return this.#pledge.promise;
	}

	/** make Pledge 'then-able' by forwarding to internal promise */
	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
	): Promise<TResult1 | TResult2> {
		return this.promise.then(onfulfilled, onrejected);
	}
}

export namespace Pledge {
	export type Resolve = (val?: any) => any;									// function to call after Pledge resolves
	export type Reject = (err: Error) => any;									// function to call after Pledge rejects
	export type Settle = () => void;													// function to call after Pledge settles

	export type Constructor = {
		tag?: string;
		onResolve?: Pledge.Resolve | Pledge.Resolve[];
		onReject?: Pledge.Reject | Pledge.Reject[];
		onSettle?: Pledge.Settle | Pledge.Settle[];
		debug?: boolean | undefined;
		catch?: boolean | undefined;
		silent?: boolean | undefined;
	}

	export interface Status<T> {
		tag?: string;
		debug?: boolean | undefined;
		catch?: boolean | undefined;
		silent?: boolean | undefined;
		state: symbol;
		settled?: T,
		error?: Error,
	}
}
