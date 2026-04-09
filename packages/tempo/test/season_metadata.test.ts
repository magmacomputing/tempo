import { Tempo } from '#tempo/tempo.class.js';

describe('Season Metadata Resolution', () => {
    it('should resolve meteorological seasons and Chinese trait metadata', () => {
        const t = new Tempo('2024-05-15', { sphere: 'north' }); // Spring in North
        const q = t.term.season as any;
        
        expect(q.key).toBe('Spring');
        expect(q.CN).toBeDefined();
        expect(q.CN.trait).toContain('renewal');
    });
});
