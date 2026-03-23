import { stringify, objectify, cloneify } from '#library/serialize.library.js';

describe('Serializer Library', () => {

	describe('stringify', () => {
		it('should serialize basic primitives natively', () => {
			expect(stringify(123)).toBe('123');
			expect(stringify('hello')).toBe('hello');
			expect(stringify(true)).toBe('true');
			expect(stringify(null)).toBe('null');
		});

		it('should serialize BigInts to safe identifier signatures', () => {
			const json = stringify(123n);
			expect(json).toBe('{"$BigInt":123}');
		});

		it('should serialize Dates into safe identifier signatures', () => {
			const date = new Date('2024-01-01T00:00:00.000Z');
			const json = stringify(date);
			expect(json).toBe('{"$Date":"2024-01-01T00:00:00.000Z"}');
		});

		it('should serialize Sets into safe identifier signatures', () => {
			const set = new Set([1, 'a', true]);
			const json = stringify(set);
			expect(json).toBe('{"$Set":[1,"a",true]}');
		});

		it('should serialize Maps into safe identifier signatures', () => {
			const map = new Map<any, any>([
				['key1', 1],
				[123n, 'value2'], // Map with BigInt key
			]);
			const json = stringify(map);
			expect(json).toBe('{"$Map":[["key1", 1],[{"$BigInt":123}, "value2"]]}');
		});

		it('should serialize undefined to a safe identifier signature', () => {
			expect(stringify(undefined)).toBe('{"$Undefined":"void"}');
		});
	});

	describe('objectify', () => {
		it('should deserialize basic strings natively', () => {
			expect(objectify('123')).toBe(123);
			expect(objectify('hello')).toBe('hello');
			expect(objectify('true')).toBe(true);
			expect(objectify('null')).toBe(null);
		});

		it('should deserialize BigInt identifier signatures', () => {
			const val = objectify<bigint>('{"$BigInt":123}');
			expect(val).toBe(123n);
			expect(typeof val).toBe('bigint');
		});

		it('should deserialize Date identifier signatures', () => {
			const val = objectify<Date>('{"$Date":"2024-01-01T00:00:00.000Z"}');
			expect(val).toBeInstanceOf(Date);
			expect(val.toISOString()).toBe('2024-01-01T00:00:00.000Z');
		});

		it('should deserialize Set identifier signatures', () => {
			const val = objectify<Set<any>>('{"$Set":[1,"a",true]}');
			expect(val).toBeInstanceOf(Set);
			expect(val.has(1)).toBeTruthy();
			expect(val.has('a')).toBeTruthy();
			expect(val.has(true)).toBeTruthy();
		});

		it('should deserialize Map identifier signatures', () => {
			const val = objectify<Map<any, any>>('{"$Map":[["key1", 1],[{"$BigInt":123}, "value2"]]}');
			expect(val).toBeInstanceOf(Map);
			expect(val.get('key1')).toBe(1);
			expect(val.get(123n)).toBe('value2');
		});

		it('should deserialize undefined to undefined via sentinel', () => {
			const sentinel = () => undefined;
			const val = objectify('{"$Undefined":"void"}', sentinel);
			expect(val).toBeUndefined();
		});
	});

	describe('cloneify', () => {
		it('should deep clone a rich object', () => {
			const original = {
				map: new Map([['a', 1]]),
				set: new Set([1n, 2n]),
				date: new Date('2024-01-01'),
				big: 999n,
				sym: Symbol.for('test'),
				undef: undefined
			};

			const cloned = cloneify(original, () => undefined);

			expect(cloned).not.toBe(original);
			expect(cloned.map).toBeInstanceOf(Map);
			expect(cloned.map).not.toBe(original.map);
			expect(cloned.map.get('a')).toBe(1);

			expect(cloned.set).toBeInstanceOf(Set);
			expect(cloned.set).not.toBe(original.set);
			expect(cloned.set.has(1n)).toBe(true);

			expect(cloned.date).toBeInstanceOf(Date);
			expect(cloned.date).not.toBe(original.date);
			expect(cloned.date.getTime()).toBe(original.date.getTime());

			expect(cloned.big).toBe(999n);
			expect(Symbol.keyFor(cloned.sym)).toBe('test');
			expect(cloned.undef).toBeUndefined();
		});
	});

});
