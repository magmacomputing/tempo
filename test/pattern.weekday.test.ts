import { Tempo } from '../lib/tempo.class.js';

const label = 'pattern.weekday:';
const Wed = Tempo.WEEKDAY.Wed, Sun = Tempo.WEEKDAY.Sun;

function formatDate(date: Date) {
  const
    month = ('0' + (date.getMonth() + 1)).slice(-2),
    day = ('0' + date.getDate()).slice(-2),
    year = date.getFullYear();

  return Number(`${year}${month}${day}`);
}

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} test pattern {weekday}, Wednesday this week`, () => {
    const tempo = new Tempo('Wed');
    const date = new Date();

    date.setDate(date.getDate() - (date.getDay() || Sun) + Wed);

    expect(tempo.config.parse.match)
      .toBe('weekDay');
    expect(tempo.fmt.yearMonthDay)
      .toBe(formatDate(date));
  })

  test(`${label} test pattern {weekday}, Wednesday next week`, () => {
    const tempo = new Tempo('+Wed');
    const date = new Date();

    date.setDate(date.getDate() - (date.getDay() || Sun) + 7 + Wed);

    expect(tempo.config.parse.match)
      .toBe('weekDay');
    expect(tempo.fmt.yearMonthDay)
      .toBe(formatDate(date));
  })
})