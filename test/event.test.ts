import { Tempo } from '../lib/tempo.class.js';

const label = 'event:';
const year = 2020;
const date = new Date(`25-Dec-${year} 22:30:45`);
const arvo = new Date(`25-Dec-${year} 15:00`);

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} test inbuilt Event: xmas`, () => {
    expect(new Tempo('xmas').set({ year }).toDate().toLocaleDateString())
      .toEqual(date.toLocaleDateString());
  })

  test(`${label} test Event with Period: xmas afternoon`, () => {
    expect(new Tempo('xmas afternoon').set({ year }).toDate().toLocaleString())
      .toEqual(arvo.toLocaleString());
  })

  test(`${label} test Event and set Period`, () => {
    expect(new Tempo('xmas').set({ year, time: '10:30:45pm' }).toDate().toLocaleString())
      .toEqual(date.toLocaleString());
  })

  test(`${label} test Period and set Event`, () => {
    expect(new Tempo().set({ year, time: '10:30:45pm', event: 'xmas' }).toDate().toLocaleString())
      .toEqual(date.toLocaleString())
  })

})