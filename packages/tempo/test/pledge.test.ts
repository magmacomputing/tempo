import { Pledge } from '#library/pledge.class.js';

describe('Pledge', () => {

	test('resolve/reject state', async () => {
		const p1 = new Pledge<string>();
		p1.resolve('ok');
		expect(p1.isResolved).toBe(true);
		expect(await p1.promise).toBe('ok');

		const p2 = new Pledge<string>({ catch: true });
		p2.reject(new Error('fail'));
		expect(p2.isRejected).toBe(true);
		await expect(p2.promise).rejects.toThrow('fail');
	});

	test('static init', () => {
		Pledge.init('GlobalTag');
		const p = new Pledge();
		expect(p.status.tag).toBe('GlobalTag');
		Pledge[Symbol.dispose]();
	});

	test('disposal', async () => {
		const p = new Pledge({ catch: true });
		p[Symbol.dispose]();
		expect(p.isRejected).toBe(true);
		await expect(p.promise).rejects.toThrow('Pledge disposed');
	});

	test('callbacks', async () => {
		const onResolve = vi.fn();
		const onReject = vi.fn();

		const p1 = new Pledge({ onResolve });
		p1.resolve('data');
		await p1.promise;
		expect(onResolve).toHaveBeenCalledWith('data');

		const p2 = new Pledge({ onReject, catch: true });
		await expect(p2.reject(new Error('err'))).rejects.toThrow('err');
		expect(onReject).toHaveBeenCalled();
	});

	test('thenable', async () => {
		const p = new Pledge<string>();
		p.resolve('thenable');
		const result = await p.then(val => val + ' works');
		expect(result).toBe('thenable works');
	});

});
