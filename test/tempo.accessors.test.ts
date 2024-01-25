import { Tempo } from '../lib/shared/tempo.class';

const date = new Date();
const tempo = new Tempo();
const label = 'accessors:';

describe(`${label}`, () => {

  // console.log('date:  %s\ntempo: %s', date.toISOString(), tempo.toString());

  /**
   * Test the Tempo accessors
  */

  test(`${label} get the right day-of-week (${date.getDay()})`, () => {
    console.log('date.getDay(): ', date.getDay());
    console.log('tempo.dow: ', tempo.dow);
    expect(tempo.dow).toBe(date.getDay())
  })

  test(`${label} get the right day-of-month (${date.getDate()})`, () => {
    console.log('date.getDate(): ', date.getDate());
    console.log('tempo.dd: ', tempo.dd);
    expect(tempo.dd).toBe(date.getDate())
  })
})