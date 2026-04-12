import { isString, isObject } from '#library/type.library.js';
import { pad } from '#library/string.library.js';
import { ifNumeric } from '#library/coercion.library.js';

import { defineInterpreterModule } from '../plugin.util.js';
import { Match } from '../../tempo.default.js';
import { NumericPattern } from '../../tempo.enum.js';
import type { Tempo } from '../../tempo.class.js';

declare module '../../tempo.class.js' {
    interface Tempo {
        /** applies a format to the instance. */ format(fmt: any): any;
    }
}

/**
 * Externalized implementation of `Tempo.format()`
 * (moved out of tempo.class.ts to reduce core bundle size)
 */
function format(this: Tempo, fmt: any) {
    if (!this.isValid)
        return '' as unknown as any;

    const obj = this.config.formats;
    let template = (isString(fmt) && obj.has(fmt))
        ? (obj as Record<string, string>)[fmt]
        : String(fmt);

    // auto-meridiem: if {HH} is present and {mer} is absent, append it after the last time component
    if (template.includes('{HH}') && !template.includes('{mer}') && !template.includes('{MER}')) {
        const index = Math.max(template.lastIndexOf('{HH}'), template.lastIndexOf('{mi}'), template.lastIndexOf('{ss}'));
        if (index !== -1) {
            const end = template.indexOf('}', index) + 1;
            template = template.slice(0, end) + '{mer}' + template.slice(end);
        }
    }

    const result = template.replaceAll(new RegExp(Match.braces), (_match: string, token: string) => {
        switch (token) {
            case 'yw': return pad(this.yw, 4);
            case 'yyww': return pad(this.yw, 4) + pad(this.ww);
            case 'yyyy': return pad(this.yy, 4);
            case 'yy': return pad(this.yy % 100);
            case 'mon': return this.mon;
            case 'mmm': return this.mmm;
            case 'mm': return pad(this.mm);
            case 'dd': return pad(this.dd);
            case 'day': return this.day.toString();
            case 'dow': return this.dow.toString();
            case 'wkd': return this.wkd;
            case 'www': return this.www;
            case 'ww': return pad(this.ww);
            case 'hh': return pad(this.hh);
            case 'HH': return pad(this.hh > 12 ? this.hh % 12 : this.hh || 12);
            case 'mer': return this.hh >= 12 ? 'pm' : 'am';
            case 'MER': return this.hh >= 12 ? 'PM' : 'AM';
            case 'mi': return pad(this.mi);
            case 'ss': return pad(this.ss);
            case 'ms': return pad(this.ms, 3);
            case 'us': return pad(this.us, 3);
            case 'ns': return pad(this.ns, 3);
            case 'ff': return `${pad(this.ms, 3)}${pad(this.us, 3)}${pad(this.ns, 3)}`;
            case 'hhmiss': return `${pad(this.hh)}${pad(this.mi)}${pad(this.ss)}`;
            case 'ts': return this.ts.toString();
            case 'nano': return this.nano.toString();
            case 'tz': return this.tz;
            default: {
                if (token.startsWith('#')) {
                    const res = this.term[token.slice(1)];
                    if (isObject(res)) return res.label ?? res.key ?? `{${token}}`;
                    return res ?? `{${token}}`;
                }
                return `{${token}}`;
            }
        }
    });

    const isExplicitlyNumeric = (NumericPattern as readonly string[]).includes(template as any);
    return (isExplicitlyNumeric ? ifNumeric(result) : result) as any;
}

// @ts-ignore
export const FormatModule: Tempo.Module = defineInterpreterModule('format', format);
