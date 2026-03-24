import { ownEntries } from './reflection.library.js';
import { Registry } from './serialize.library.js';
/**
 * Some interesting Class Decorators
 */
/** decorator to freeze a Class to prevent modification */
export function Immutable(value, { kind, name, addInitializer }) {
    name = String(name);
    switch (kind) {
        case 'class':
            const wrapper = {
                [name]: class extends value {
                    constructor(...args) {
                        super(...args);
                        Object.freeze(this); // freeze the instance
                    }
                }
            }[name];
            addInitializer(() => {
                const protect = (obj) => {
                    ownEntries(Object.getOwnPropertyDescriptors(obj))
                        .filter(([name]) => name !== 'constructor') // dont touch the constructor
                        .forEach(([name, { configurable, writable }]) => {
                        if (configurable) {
                            const update = { configurable: false };
                            if (writable)
                                update.writable = false; // only data descriptors have 'writable'
                            Object.defineProperty(obj, name, update);
                        }
                    });
                };
                protect(value); // protect original static members
                protect(value.prototype); // protect original prototype members
                protect(wrapper); // protect wrapper static members
                protect(wrapper.prototype); // protect wrapper prototype members
            });
            return wrapper;
        default:
            throw new Error(`@Immutable decorating unknown 'kind': ${kind} (${name})`);
    }
}
/** register a Class for serialization */
export function Serializable(value, { kind, name, addInitializer }) {
    name = String(name); // cast as String
    switch (kind) {
        case 'class':
            addInitializer(() => Registry.set(`$${name}`, value)); // register the class for serialization, via its toString() method
            return value;
        default:
            throw new Error(`@Serializable decorating unknown 'kind': ${kind} (${name})`);
    }
}
/** make a Class not instantiable */
export function Static(value, { kind, name }) {
    name = String(name);
    switch (kind) {
        case 'class':
            const wrapper = {
                [name]: class extends value {
                    constructor(...args) {
                        super(...args);
                        throw new TypeError(`${name} is not a constructor`);
                    }
                }
            }[name];
            return wrapper;
        default:
            throw new Error(`@Static decorating unknown 'kind': ${kind} (${name})`);
    }
}
//# sourceMappingURL=class.library.js.map