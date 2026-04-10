import { Tempo } from '#tempo';

describe('Soft-Freeze & Term Resolution Verification', () => {
    it('should block mutation on t.term (Hard-Freeze)', () => {
        const t = new Tempo('2024-05-15');
        const term = t.term as any;

        // mutation attempt should throw TypeError in Hard-Freeze
        expect(() => { term.foo = 'bar'; }).toThrow(TypeError);
    });

    it('should return the correct key for t.term.qtr', () => {
        const t = new Tempo('2024-05-15', { timeZone: 'America/New_York' });
        // Q2 2024
        expect(t.term.qtr).toBe('Q2');
    });

    it('should return a frozen resolved range for t.term.quarter', () => {
        const t = new Tempo('2024-05-15', { timeZone: 'America/New_York' });
        const q = t.term.quarter as any;

        expect(q).toBeDefined();
        expect(q.key).toBe('Q2');
        
        // 1. Result should be frozen (Standard JS Freeze)
        expect(Object.isFrozen(q)).toBe(true);

        // 2. Result mutation should throw TypeError
        expect(() => { q.key = 'Q99'; }).toThrow(TypeError);

        // 3. Delegator re-assignment should throw TypeError
        expect(() => { (t.term as any).quarter = 'FAIL'; }).toThrow(TypeError);
    });
});
