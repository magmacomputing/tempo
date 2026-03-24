import type { Constructor } from './type.library.js';
/**
 * Some interesting Class Decorators
 */
/** decorator to freeze a Class to prevent modification */
export declare function Immutable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void;
/** register a Class for serialization */
export declare function Serializable<T extends Constructor>(value: T, { kind, name, addInitializer }: ClassDecoratorContext<T>): T | void;
/** make a Class not instantiable */
export declare function Static<T extends Constructor>(value: T, { kind, name }: ClassDecoratorContext<T>): T | void;
