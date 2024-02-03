import { Tempo } from '../lib/tempo.class';

const label = 'pattern.dow:';
const Wed = 3, Sun = 7;

function formatDate(date: Date) {
  const
    month = '0' + (date.getMonth() + 1),
    day = '0' + date.getDate(),
    year = date.getFullYear();

  return Number(`${year}${month.slice(-2)}${day.slice(-2)}`);
}

/**
 * Test the Tempo static properties / methods
 */
describe(`${label}`, () => {

  test(`${label} test pattern {dow}, Wednesday this week`, () => {
    const tempo = new Tempo('Wed');
    const date = new Date();

    date.setDate(date.getDate() - (date.getDay() || Sun) + Wed);

    expect(tempo.config.parse.match)
      .toBe('dow');
    expect(tempo.fmt.yearMonthDay)
      .toBe(formatDate(date));
  })

  test(`${label} test pattern {dow}, Wednesday next week`, () => {
    const tempo = new Tempo('+Wed');
    const date = new Date();

    date.setDate(date.getDate() - (date.getDay() || Sun) + 7 + Wed);

    expect(tempo.config.parse.match)
      .toBe('dow');
    expect(tempo.fmt.yearMonthDay)
      .toBe(formatDate(date));
  })
})