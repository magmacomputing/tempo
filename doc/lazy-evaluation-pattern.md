# The Immutable Prototype-Shadowing Lazy Evaluation Pattern

When building complex JavaScript libraries (like date-time utilities), exposing numerous computed properties as getters on an object is common. However, computing them all upfront is expensive, and re-computing them on every access is wasteful. The standard solution is "Lazy Evaluation": evaluate the getter on first access, and then overwrite the getter with the literal value.

But what if the base object is strictly **immutable** (via `Object.freeze`)? 

This article details a highly-optimized `O(1)` pattern for securely lazy-evaluating properties on immutable objects using prototype shadowing and private fields.

## The Problem: Mutating Frozen State

A traditional lazy evaluation approach destroys and recreates the properties on the parent object. If the parent object is `Object.freeze()`'d for security (preventing API consumers from tampering with state), you cannot simply `Object.defineProperty` to overwrite the getter with a literal value.

To get around freezing, you might try taking all property descriptors, wiping the object, mapping the other getters to a new object, adding the evaluated value, and calling `Object.freeze()` on the new object.

```javascript
// The O(N) approach - Extremely slow and memory-heavy

get: function () {
    const props = Object.getOwnPropertyDescriptors(this.#term);
    this.#term = {}; // wipe
    
    // Re-assign all N other getters
    Object.entries(props).forEach(([prop, desc]) => {
        if (prop !== name) Object.defineProperty(this.#term, prop, desc);
    });

    const value = computeExpensiveValue();
    Object.defineProperty(this.#term, name, { value, enumerable: true });
    
    return Object.freeze(value);
}
```

This operations runs in `O(N)` time (where `N` is the number of getters on the object) every single time *any* getter is accessed. In a hot loop, building and throwing away objects with dozens of descriptors wrecks memory (GC churn) and severely hits the CPU.

## The Solution: Prototype Shadowing

We can achieve lazy evaluation in `O(1)` time by swapping out `Object.defineProperty` for `Object.create()`.

```javascript
// The O(1) approach - Extremely fast, zero overhead

#setTerm(name, defineFunction) {
    Object.defineProperty(this.#term, name, {
        configurable: false,
        enumerable: false,
        get: () => {
            const value = defineFunction.call(this); // Evaluate the value
            
            // Prototype-shadow the getter with a frozen wrapper object
            this.#term = Object.freeze(Object.create(this.#term, {
                [name]: {
                    value,
                    configurable: false,
                    writable: false,
                    enumerable: true
                }
            }));
            
            return Object.freeze(value);
        }
    });
}
```

### How it Works

1. **Reassignment, not Mutation:** 
   We freeze the properties of the base object (`this.#term`) upfront. Instead of modifying the frozen object, we build a *new* object that has the literal `value` property, and we set its prototype to the *old* `this.#term`. Then, we point `this.#term` to the new object. Freezing prevents mutation, but it does not prevent variable reassignment.
   
2. **Private Fields Bypass the Freeze:**
   If `this.#term` were a public property (`this.term`), freezing the outer class `this` would prevent us from reassigning `this.term`. However, native JS Private Fields (`#term`) don't exist as properties on the object; they are internal engine slots. Thus, `Object.freeze(this)` cannot lock `#term`, allowing us to freely reassign the pointer to the new prototype chain internally while keeping it completely insulated from outside tampering.

3. **Innate JS Engine Optimizations:**
   When `.quarter` is evaluated next, it creates another object on top:
   `[Newest Link (quarter)]` → `[Middle Link (qtr)]` → `[Base Object (un-evaluated getters)]`
   
   If the user asks for `.yearly` (not yet evaluated), the JS engine traverses the prototype chain transparently. V8 and SpiderMonkey are massively optimized for prototype traversal via Inline Caches. You exchange an `O(N)` property iteration penalty for an `O(K)` prototype lookup (where `K` is the number of evaluated properties), executing in Native C++ at lightning speed.

4. **Zero Over-allocation:**
   Unused getters remain safely tucked away on the root object at the bottom of the prototype chain. They cost absolutely nothing in execution time or memory until they are needed.

### Summary

By strategically combining **Private Fields**, **`Object.create()`**, and **Prototype lookups**, we can build securely immutable APIs that lazy-load computed getters with absolute minimal overhead.
