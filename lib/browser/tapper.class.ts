import { enumValues } from '@module/shared/array.library';
import { isEmpty, isFunction } from '@module/shared/type.library';

/**
 * A Wrapper Class around HammerJS.  
 * manages single/double/triple Tap events
 */
export class Tapper {
	#hammer: HammerManager[] = [];

	constructor(elm: string, ...setup: (Tapper.Callback | [Tapper.EVENT, Tapper.Callback])[]) {
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

		self.on(...setup as Tapper.Callback[]);
	}

	/** list of callbacks to fire on 'singleTap' */
	on(...callBacks: Tapper.Callback[]): Tapper;
	/** tuple of events/callbacks to fire */
	on(...events: [Tapper.EVENT, Tapper.Callback][]): Tapper;
	on(...events: (Tapper.Callback | [Tapper.EVENT, Tapper.Callback])[]) {
		events
			.forEach(arg => {
				if (isFunction(arg)) {
					this.#hammer.forEach(hammer => hammer.off(Tapper.EVENT.SingleTap));
					this.#hammer.forEach(hammer => hammer.on(Tapper.EVENT.SingleTap, arg));
				} else {
					const [event, cb] = arg;
					this.#hammer.forEach(hammer => hammer.off(event));		// just in case, turn off old listener
					this.#hammer.forEach(hammer => hammer.on(event, cb));	// start new listener
				}
			})

		return this;
	}

	/** stop event listeners (default is 'all' listeners on this instance) */
	off(...events: Tapper.EVENT[]) {
		if (isEmpty(events))
			events.push(...enumValues(Tapper.EVENT));

		events
			.forEach(event => this.#hammer.forEach(hammer => hammer.off(event)))

		return this;
	}

	enable(enable = true, ...events: Tapper.EVENT[]) {
		if (isEmpty(events))
			events.push(...enumValues(Tapper.EVENT));

		this.#hammer
			.forEach(hammer => events																	// for each Hammer
				.forEach(event => hammer.get(event).set({ enable }))		// for each Event
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
	export enum EVENT {
		SingleTap = 'singleTap',
		DoubleTap = 'doubleTap',
		TripleTap = 'tripleTap',
	}

	export type Callback = (evt: HammerInput) => void;
}
