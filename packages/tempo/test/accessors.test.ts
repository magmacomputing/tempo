import { Tempo } from '#tempo';

const label = 'accessors:';
const date = new Date();
const tempo = new Tempo();

/**
 * Test the Tempo accessors
*/
describe(`${label}`, () => {

  test(`${label} get the right day-of-week (${date.getDay()})`, () => {
    const dow = date.getDay() || 7;
    expect(tempo.dow).toBe(dow)
  })

  test(`${label} get the right day-of-month (${date.getDate()})`, () => {
    expect(tempo.dd).toBe(date.getDate())
  })
})