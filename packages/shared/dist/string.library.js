import { asNumber, asString, isNumeric } from '#core/shared/coercion.library.js';
import { stringify } from '#core/shared/serialize.library.js';
import { isString, isObject, assertCondition, assertString, nullToValue } from '#core/shared/type.library.js';
// General <string> functions
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// This section needs to be Function declarations so that they are hoisted
// (because they are referenced in prototype.library)
/**
 * clean a string to remove some standard control-characters (tab, line-feed, carriage-return) and trim redundant spaces.
 * allow for optional RegExp to specify additional match
 */
export function trimAll(str, pat) {
    return str
        .toString() // coerce to String
        .replace(pat, '') // remove regexp, if supplied
        .replace(/\t/g, ' ') // replace <tab> with <space>
        .replace(/(\r\n|\n|\r)/g, ' ') // replace <return> & <newline>
        .replace(/\s{2,}/g, ' ') // trim multiple <space>
        .trim(); // leading/trailing <space>
}
/** every word has its first letter capitalized */
export function toProperCase(...str) {
    return str
        .flat() // in case {str} was already an array
        .map(text => text.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()))
        .join(' ');
}
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const PAT = /[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g;
export const toCamelCase = (sentence) => {
    let [word, ...rest] = sentence.match(PAT) ?? [''];
    if (isNumeric(word)) {
        word = rest[0];
        rest.splice(0, 1);
    }
    return (sentence.startsWith('_') ? '_' : '') + word.toLocaleLowerCase() + toProperCase(...rest).replace(/ /g, '');
};
const HEX = 16;
export const randomString = (len = 36) => {
    let str = '';
    do // generate random strings
        str += Math.floor(Math.random() * 10 ** 16).toString(HEX).substring(2, 15);
    while (str.length < len);
    return str.substring(0, len);
};
export function sprintf(fmt, ...msg) {
    const regexp = /\$\{(\d)\}/g; // pattern to find "${digit}" parameter markers
    let sfmt = asString(fmt); // avoid mutate fmt
    if (!isString(fmt)) { // might be an Object
        msg.unshift(JSON.stringify(fmt)); // push to start of msg[]
        sfmt = ''; // reset the string-format
    }
    let cnt = 0; // if the format does not contain a corresponding '${digit}' then re-construct the parameters
    sfmt = sfmt.replace(/%[sj]/g, _ => `\${${cnt++}}`); // flip all the %s or %j to a ${digit} parameter
    const params = Array.from(sfmt.matchAll(regexp))
        .map(match => Number(match[1])); // which parameters are in the fmt
    msg.forEach((_, idx) => {
        if (!params.includes(idx)) // if more args than params
            sfmt += `${sfmt.length === 0 ? '' : sfmt.endsWith(':') ? ' ' : ', '}\${${idx}}`; //  append a dummy params to fmt
    });
    // 2024-02-21  some Objects do not have a .toString method
    return sfmt.replace(regexp, (_, idx) => msg[idx]?.toString?.() || stringify(msg[idx]));
}
/** apply a plural suffix, if greater than '1' */
export const plural = (val, word, plural = word + 's') => {
    const _plural = (num, word, plural = word + 's') => [1, -1].includes(Number(num)) ? word : plural;
    return isObject(val)
        ? (num, word) => _plural(num, word, val[word])
        : _plural(val, word, plural);
};
/** strip a plural suffix, if endsWith 's' */
export const singular = (val) => val.endsWith('s') ? val.slice(0, -1) : val;
/** make an Object's values into a Template Literals, and evaluate */
export const makeTemplate = (templateString) => (templateData) => new Function(`{${Object.keys(templateData).join(',')}}`, 'return `' + templateString + '`')(templateData);
export const toLower = (str) => isString(str) ? asString(str).toLowerCase().trim() : str;
export const toUpper = (str) => isString(str) ? asString(str).toUpperCase().trim() : str;
export const strlen = (str, min, max) => {
    assertString(str);
    assertCondition(str.length >= min && str.length <= (max ?? min), 'string length is not between specified min and max');
    return str;
};
/**
 * pad a string with leading character
 * @param		nbr	input value to pad
 * @param		len	fill-length (default: 2)
 * @param		fill	character (default \<space> for string and \<zero> for number)
 * @returns	fixed-length string padded on the left with fill-character
 */
export const pad = (nbr = 0, len = 2, fill) => nbr.toString().padStart(len, nullToValue(fill, isNumeric(nbr) ? '0' : ' ').toString());
/** pad a string with non-blocking spaces, to help right-align a display */
export const padString = (str, pad = 6) => (isNumeric(str) ? asNumber(str).toFixed(2).toString() : str.toString() ?? '').padStart(pad, '\u007F');
//# sourceMappingURL=string.library.js.map