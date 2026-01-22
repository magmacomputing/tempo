import { Tempo } from '../lib/tempo.class.js';

const label = 'pattern.default:';
const Sun = Tempo.WEEKDAY.Sun;

const tempo = new Tempo();
const date = new Date();

function yearMonthDay(date: Date) {
	const
		year = date.getFullYear(),
		month = ('0' + (date.getMonth() + 1)).slice(-2),
		day = ('0' + date.getDate()).slice(-2)

	return Number(`${year}${month}${day}`);
}

/**
 * Test the Tempo({undefined}) properties
 */
describe(`${label}`, () => {

	test(`${label} test pattern {default}, today`, () => {
		expect(tempo.fmt.yearMonthDay)
			.toBe(yearMonthDay(date));
	})

	test(`${label} test {default} dow`, () => {
		expect(tempo.dow)
			.toBe(date.getDay() || Sun)														// Tempo.Sun = 7, Date.Sun = 0
	})

	test(`${label} test {default} dd`, () => {
		expect(tempo.dd)
			.toBe(date.getDate())
	})

	test(`${label} test {default} day`, () => {
		expect(tempo.www)
			.toBe(date.toDateString().substring(0, 3))
	})
})