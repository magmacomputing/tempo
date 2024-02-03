import { Tempo } from '../lib/tempo.class';

const label = 'accessors:';
const date = new Date();
const tempo = new Tempo();

/**
 * Test the Tempo accessors
*/
describe(`${label}`, () => {
  console.log('Date:\t%s\nInst:\t%s\nTempo:\t%s', date, tempo.toInstant().toString({ timeZone: 'UTC' }), tempo.toString());

  test(`${label} get the right day-of-week (${date.getDay()})`, () => {
    const dow = date.getDay() || 7;
    expect(tempo.dow).toBe(dow)
  })

  test(`${label} get the right day-of-month (${date.getDate()})`, () => {
    expect(tempo.dd).toBe(date.getDate())
  })
})