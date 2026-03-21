import { cloneify } from '#core/shared/serialize.library.js';
import { getTermRange, type Range } from '#core/shared/tempo.config/plugins/term.utils.js';
import type { Tempo } from '#core/shared/tempo.class.js';

/** definition of astrological zodiac ranges */
const ranges = [																						// @link https://en.wikipedia.org/wiki/Astrological_sign
	[																													// [0] = zodiac
		{ key: 'Aquarius', day: 20, month: 1, symbol: 'Ram', longitude: 300, planet: 'Uranus' },
		{ key: 'Pisces', day: 19, month: 2, symbol: 'Fish', longitude: 330, planet: 'Neptune' },
		{ key: 'Aries', day: 21, month: 3, symbol: 'Ram', longitude: 0, planet: 'Mars' },
		{ key: 'Taurus', day: 20, month: 4, symbol: 'Bull', longitude: 30, planet: 'Venus' },
		{ key: 'Gemini', day: 21, month: 5, symbol: 'Twins', longitude: 60, planet: 'Mercury' },
		{ key: 'Cancer', day: 22, month: 6, symbol: 'Crab', longitude: 90, planet: 'Moon' },
		{ key: 'Leo', day: 23, month: 7, symbol: 'Lion', longitude: 120, planet: 'Sun' },
		{ key: 'Virgo', day: 23, month: 8, symbol: 'Maiden', longitude: 150, planet: 'Mercury' },
		{ key: 'Libra', day: 23, month: 9, symbol: 'Scales', longitude: 180, planet: 'Venus' },
		{ key: 'Scorpio', day: 23, month: 10, symbol: 'Scorpion', longitude: 210, planet: 'Pluto & Mars' },
		{ key: 'Sagittarius', day: 22, month: 11, symbol: 'Centaur', longitude: 240, planet: 'Jupiter' },
		{ key: 'Capricorn', day: 22, month: 12, symbol: 'Goat', longitude: 270, planet: 'Saturn' },
	], [																											// [1] @link http://www.creativeartsguild.org/images/uploads/categories/12_Chinese_Zodiac_Signs.pdf
		{ key: 'Rat', traits: 'Adaptable, clever' },
		{ key: 'Ox', traits: 'Diligent, strong' },
		{ key: 'Tiger', traits: 'Passionate, courageous' },
		{ key: 'Rabbit', traits: 'Artistic, gentle' },
		{ key: 'Dragon', traits: 'Powerful, charismatic' },
		{ key: 'Snake', traits: 'Wise, intuitive' },
		{ key: 'Horse', traits: 'Energetic, independent' },
		{ key: 'Goat', traits: 'Empathetic, calm' },
		{ key: 'Monkey', traits: 'Smart, curious' },
		{ key: 'Rooster', traits: 'Observant, hardworking' },
		{ key: 'Dog', traits: 'Loyal, honest' },
		{ key: 'Pig', traits: 'Compassionate, generous' },
	], [																											// [2] @link https://www.timeanddate.com/calendar/aboutelements.html
		{ key: 'Wood' },
		{ key: 'Fire' },
		{ key: 'Earth' },
		{ key: 'Metal' },
		{ key: 'Water' },
	]
] as Range[][]

export const key = 'zdc';
export const scope = 'zodiac';
export const description = 'Astrological Zodiac sign';

/** determine where the current Tempo instance fits within the above ranges */
export function define(this: Tempo, keyOnly?: boolean) {
	const list = cloneify(ranges[0]);													// make a copy of the ranges array

	if (!keyOnly) {
		const cn = getChineseZodiac(this.yy);										// get the chinese zodiac for the current year
		list.forEach(item => item['CN'] = cn)										// add the chinese zodiac to each item
	}

	return getTermRange(this, list, keyOnly);
}

/** get the chinese zodiac for a given year */
function getChineseZodiac(year: number) {
	const animalIndex = (year - 4) % 12;											// calculate the animal index
	const elementIndex = Math.floor(((year - 4) % 10) / 2);		// calculate the element index based on the last digit of the year
	const yinYang = year % 2 === 0 ? 'Yang' : 'Yin';					// determine Yin or Yang

	return {
		animal: ranges[1][animalIndex].key,
		traits: ranges[1][animalIndex].traits,
		element: ranges[2][elementIndex].key,
		yinYang: yinYang
	}
}
