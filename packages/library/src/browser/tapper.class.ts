import { enumify } from '#library/enumerate.library.js';
import { isEmpty, isFunction, type ValueOf } from '#library/type.library.js';

/**
 * A Wrapper Class around HammerJS.  
 * manages single/double/triple Tap events
 */
export class Tapper {
	static EVENT = enumify({
		SingleTap: 'singleTap',
		DoubleTap: 'doubleTap',
		TripleTap: 'tripleTap',
	});

	[Symbol.toStringTag] = 'Tapper';

	[Symbol.iterator] = () => {
		const iterator = this.list()[Symbol.iterator]();
		return { next: () => iterator.next(), }
	}

	[Symbol.dispose]() {
		this.destroy();																				// destroy Hammer instances
	}

	#hammer: HammerManager[] = [];

	constructor(elm: string, ...setup: (Tapper.Callback | Tapper.Tuple)[]) {
		const self = this;

		$(elm).each(function () {
			const tripleTap = new Hammer.Tap({ event: Tapper.EVENT.TripleTap, taps: 3 });
			const doubleTap = new Hammer.Tap({ event: Tapper.EVENT.DoubleTap, taps: 2 });
			const singleTap = new Hammer.Tap({ event: Tapper.EVENT.SingleTap, taps: 1 });

			tripleTap.recognizeWith([doubleTap, singleTap]);
			doubleTap.recognizeWith([singleTap]).requireFailure([tripleTap]);
			singleTap.requireFailure([tripleTap, doubleTap]);

			const hammer = new Hammer.Manager(this);
			hammer.add(tripleTap);
			hammer.add(doubleTap);
			hammer.add(singleTap);

			self.#hammer.push(hammer);
		})

		self.on(...setup);
	}

	/** list of callbacks to fire on 'singleTap', or tuple of events/callbacks to fire */
	on(...events: (Tapper.Callback | Tapper.Tuple)[]) {
		events
			.forEach(arg => {
				if (isFunction(arg)) {															// assume Callback to register for
					this.#hammer.forEach(hammer => hammer.off(Tapper.EVENT.SingleTap));
					this.#hammer.forEach(hammer => hammer.on(Tapper.EVENT.SingleTap, arg));
				} else {
					const [event, cb] = arg;
					this.#hammer.forEach(hammer => hammer.off(event));	// just in case, turn off old listener
					this.#hammer.forEach(hammer => hammer.on(event, cb));	// start new listener
				}
			})

		return this;
	}

	/** stop event listeners (default is 'all' listeners on this instance) */
	off(...events: Tapper.EVENT[]) {
		if (isEmpty(events))
			events.push(...Tapper.EVENT.values());

		events
			.forEach(event => this.#hammer.forEach(hammer => hammer.off(event)))

		return this;
	}

	enable(enable = true, ...events: Tapper.EVENT[]) {
		if (isEmpty(events))
			events.push(...Tapper.EVENT.values());

		this.#hammer
			.forEach(hammer => events														// for each Hammer
				.forEach(event => hammer.get(event).set({ enable }))	// for each Event
			)

		return this;
	}

	/** list details about this instance */
	list() {
		return this.#hammer.map((hammer: any) => ({
			element: hammer.element,
			handlers: hammer.handlers
		}))
	}

	/** stop all event listeners on this instance */
	clear() {
		return this.off();
	}

	/** detach Tapper Manager */
	destroy() {
		this.#hammer.forEach(hammer => hammer.destroy());
	}
}

export namespace Tapper {
	export type EVENT = ValueOf<typeof Tapper.EVENT>					// typeof Event enum

	export type Tuple = [Tapper.EVENT, Tapper.Callback]
	export type Callback = (evt: HammerInput) => void
}
