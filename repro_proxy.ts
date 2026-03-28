import { getLazyDelegator } from './packages/library/src/common/proxy.library.js';

const target = Object.create(null);
let callCount = 0;

const proxy = getLazyDelegator(target, (key, t) => {
	console.log(`Resolving: ${String(key)}`);
	callCount++;

	// manually define property on target
	Object.defineProperty(t, key, {
		get: () => {
			console.log(`Getter called for: ${String(key)}`);
			return `value_${String(key)}`;
		},
		configurable: true,
		enumerable: true
	});
});

console.log('Accessing proxy.foo first time:');
console.log(proxy.foo);
console.log('Accessing proxy.foo second time:');
console.log(proxy.foo);

if (callCount !== 1) {
	console.error(`FAILED: onGet called ${callCount} times, expected 1.`);
} else {
	console.log('SUCCESS: onGet called only once.');
}
