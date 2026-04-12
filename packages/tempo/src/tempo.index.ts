import { Tempo } from './tempo.class.js';
import { TermsModule } from '#tempo/term';
import { DurationModule } from '#tempo/duration';
import { FormatModule } from '#tempo/format';
import { TickerModule } from '#tempo/ticker';

// Batteries Included: Register standard modules
Tempo.extend(TermsModule);
Tempo.extend(DurationModule);
Tempo.extend(FormatModule);
Tempo.extend(TickerModule);

export * from './tempo.class.js';
export { default as enums } from './tempo.enum.js';         // Tempo enumerators

// export items specifically from #library if they are required in the Tempo API
export { enumify } from '#library/enumerate.library.js';
export { Pledge } from '#library/pledge.class.js';
export { stringify, objectify, cloneify } from '#library/serialize.library.js';
export { getType } from '#library/type.library.js';

// export common patterns and symbols for custom Layouts
export { Token, Snippet, Match, Default } from './tempo.default.js';
