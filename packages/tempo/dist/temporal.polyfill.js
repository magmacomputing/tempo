/**
 * This file verifies native Temporal API support.
 * Tempo requires an environment with native Temporal support or a user-provided polyfill.
 */
// @ts-ignore
if (!globalThis.Temporal) {
    const message = `
[Tempo] Temporal API not found.
This library requires the ECMAScript Temporal API. Please ensure your environment 
supports it natively (Node.js 20+, modern browsers) or provide your own polyfill.

To add a polyfill to your project:
1. Install: npm install @js-temporal/polyfill
2. Import at your entry point: import '@js-temporal/polyfill';
`;
    console.error(message);
    throw new Error('Temporal API not found.');
}
export {};
//# sourceMappingURL=temporal.polyfill.js.map