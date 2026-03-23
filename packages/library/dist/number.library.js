import { asArray, asNumber, ifNumeric } from '#library/coercion.library.js';
/** show Hex value of a number */
export const toHex = (num = [], len) => asArray(num) // ensure array
    .flat(1_000_000) // flatten any arrays to arbitrary depth
    .filter(Number.isInteger) // ensure integers	
    .map(val => (val + 0x100).toString(16).slice(-2))
    .join('')
    .toLowerCase()
    .substring(0, len ?? Number.MAX_SAFE_INTEGER);
/** apply an Ordinal suffix */
export const suffix = (idx) => {
    const str = String(idx ?? ''); // so we can use 'endsWith'
    switch (true) {
        case str.endsWith('1') && !str.endsWith('11'):
            return str + 'st';
        case str.endsWith('2') && !str.endsWith('12'):
            return str + 'nd';
        case str.endsWith('3') && !str.endsWith('13'):
            return str + 'rd';
        default:
            return str + 'th';
    }
};
export function split(nbr, chr = '.', zero = true) {
    return nbr?.toString().split(chr).map(val => ifNumeric(val, zero))
        || [];
}
;
/** fix a string to set decimal precision */
export const fix = (nbr = 0, max = 2) => asNumber(nbr).toFixed(max);
/** remove ':' from an HH:MI string, return as number */
export const asTime = (hhmi) => Number(String(hhmi).replace(':', ''));
/** format a value as currency */
export const asCurrency = (str, scale = 2, currency = 'AUD') => str.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: scale });
//# sourceMappingURL=number.library.js.map