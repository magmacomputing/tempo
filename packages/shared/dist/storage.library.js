import { objectify, stringify } from '#core/shared/serialize.library.js';
import { CONTEXT, getContext } from '#core/shared/utility.library.js';
import { isDefined, isUndefined, isString } from '#core/shared/type.library.js';
const context = getContext();
let storage = context.type === CONTEXT.Browser
    ? context.global?.localStorage //as globalThis.Storage		// default to localStorage in a browser
    : undefined;
/** select local | session storage */
export function selStorage(store = 'local') {
    const name = (store + 'Storage');
    return storage = globalThis[name]; // return whichever was selected.
}
export function getStorage(key, dflt) {
    let store;
    if (isUndefined(key))
        return dflt ?? {};
    switch (context.type) {
        case CONTEXT.Browser:
            store = storage.getItem(key);
            break;
        case CONTEXT.NodeJS:
            store = context.global.process.env[key];
            break;
        case CONTEXT.GoogleAppsScript:
            store = context.global.PropertiesService?.getUserProperties().getProperty(key);
            break;
        default:
            throw new Error(`Cannot determine Javascript context: ${context.type}`);
    }
    return isString(store)
        ? objectify(store) // rebuild object from its stringified representation
        : dflt;
}
/** set / delete storage */
export function setStorage(key, val) {
    const stash = isDefined(val) ? stringify(val) : undefined;
    const set = isDefined(stash);
    switch (context.type) {
        case CONTEXT.Browser:
            set
                ? storage.setItem(key, stash)
                : storage.removeItem(key);
            break;
        case CONTEXT.NodeJS:
            set
                ? (context.global.process.env[key] = stash)
                : (delete context.global.process.env[key]);
            break;
        case CONTEXT.GoogleAppsScript:
            set
                ? context.global.PropertiesService?.getUserProperties().setProperty(key, stash)
                : context.global.PropertiesService?.getUserProperties().deleteProperty(key);
            break;
        default:
            throw new Error(`Cannot determine Javascript context: ${context.type}`);
    }
}
//# sourceMappingURL=storage.library.js.map