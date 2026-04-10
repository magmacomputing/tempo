import { Tempo } from './tempo.class.js';
import { registerTerms } from './plugins/term/term.index.js';
import './plugins/module/module.duration.js';
import './plugins/module/module.format.js';
import './plugins/extend/extend.ticker.js';

// Batteries Included: Register standard terms on the Tempo class
Tempo.extend(registerTerms);

export * from './tempo.class.js';
export { default as enums } from './tempo.enum.js';         // Tempo enumerators

// export items specifically from #library if they are required in the Tempo API
export { enumify } from '#library/enumerate.library.js';
export { stringify, objectify, cloneify } from '#library/serialize.library.js';
export { getType } from '#library/type.library.js';

// export common patterns and symbols for custom Layouts
export { Token, Snippet, Match, Default } from './tempo.default.js';
