import { describe, test, expect } from 'vitest';
import { Tempo } from '../src/tempo.class.js';
import { Temporal } from 'temporal-polyfill';

describe('Debug Alias Resolution', () => {
  test('bedtime resolution', () => {
    const today = new Tempo('2024-05-20');
    const period = { bedtime: function(this: any) { return this.set({ hour: 23 }) } };
    const t = new Tempo('bedtime', { period, anchor: today.toDateTime() });
    
    console.log('ZDT:', t.toDateTime().toString());
    expect(t.format('{hh}:{mi}')).toBe('23:00');
  });

  test('blah resolution', () => {
    const event = { blah: '20-May 10pm' };
    const today = new Tempo('2024-05-20');
    const t = new Tempo('blah', { event, anchor: today.toDateTime() });
    
    console.log('ZDT blah:', t.toDateTime().toString());
    expect(t.format('{yyyy}-{mm}-{dd}')).toBe('2024-05-20');
    expect(t.format('{hh}:{mi}')).toBe('22:00');
  });
});
