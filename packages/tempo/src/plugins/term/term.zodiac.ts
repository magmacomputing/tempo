import { defineTerm, getTermRange, defineRange } from '../tempo.plugin.js';
import type { Tempo } from '#tempo/tempo.class.js';

/** definition of astrological zodiac ranges */
const { ranges, groups } = defineRange([
	// Western (Zodiac) - @link https://en.wikipedia.org/wiki/Astrological_sign
	{ key: 'Aquarius', day: 20, month: 1, symbol: 'Water Bearer', longitude: 300, planet: 'Uranus', group: 'western' },
	{ key: 'Pisces', day: 19, month: 2, symbol: 'Fish', longitude: 330, planet: 'Neptune', group: 'western' },
	{ key: 'Aries', day: 21, month: 3, symbol: 'Ram', longitude: 0, planet: 'Mars', group: 'western' },
	{ key: 'Taurus', day: 20, month: 4, symbol: 'Bull', longitude: 30, planet: 'Venus', group: 'western' },
	{ key: 'Gemini', day: 21, month: 5, symbol: 'Twins', longitude: 60, planet: 'Mercury', group: 'western' },
	{ key: 'Cancer', day: 22, month: 6, symbol: 'Crab', longitude: 90, planet: 'Moon', group: 'western' },
	{ key: 'Leo', day: 23, month: 7, symbol: 'Lion', longitude: 120, planet: 'Sun', group: 'western' },
	{ key: 'Virgo', day: 23, month: 8, symbol: 'Maiden', longitude: 150, planet: 'Mercury', group: 'western' },
	{ key: 'Libra', day: 23, month: 9, symbol: 'Scales', longitude: 180, planet: 'Venus', group: 'western' },
	{ key: 'Scorpio', day: 23, month: 10, symbol: 'Scorpion', longitude: 210, planet: 'Pluto & Mars', group: 'western' },
	{ key: 'Sagittarius', day: 22, month: 11, symbol: 'Centaur', longitude: 240, planet: 'Jupiter', group: 'western' },
	{ key: 'Capricorn', day: 22, month: 12, symbol: 'Goat', longitude: 270, planet: 'Saturn', group: 'western' },

	// Chinese (Animal) - @link http://www.creativeartsguild.org/images/uploads/categories/12_Chinese_Zodiac_Signs.pdf
	{ key: 'Rat', traits: 'Adaptable, clever', group: 'animal' },
	{ key: 'Ox', traits: 'Diligent, strong', group: 'animal' },
	{ key: 'Tiger', traits: 'Passionate, courageous', group: 'animal' },
	{ key: 'Rabbit', traits: 'Artistic, gentle', group: 'animal' },
	{ key: 'Dragon', traits: 'Powerful, charismatic', group: 'animal' },
	{ key: 'Snake', traits: 'Wise, intuitive', group: 'animal' },
	{ key: 'Horse', traits: 'Energetic, independent', group: 'animal' },
	{ key: 'Goat', traits: 'Empathetic, calm', group: 'animal' },
	{ key: 'Monkey', traits: 'Smart, curious', group: 'animal' },
	{ key: 'Rooster', traits: 'Observant, hardworking', group: 'animal' },
	{ key: 'Dog', traits: 'Loyal, honest', group: 'animal' },
	{ key: 'Pig', traits: 'Compassionate, generous', group: 'animal' },

	// Chinese (Element) - @link https://www.timeanddate.com/calendar/aboutelements.html
	{ key: 'Wood', group: 'element' },
	{ key: 'Fire', group: 'element' },
	{ key: 'Earth', group: 'element' },
	{ key: 'Metal', group: 'element' },
	{ key: 'Water', group: 'element' },
], 'group');

export const ZodiacTerm = defineTerm({
	key: 'zdc',
	scope: 'zodiac',
	description: 'Astrological Zodiac sign',
	ranges,

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean) {
		const western = groups['western'] ?? [];
		const list = western.map(r => ({ ...r }));

		if (!keyOnly)
			list																									// add the chinese zodiac to each range item
				.forEach((itm: any) => itm['CN'] = getChineseZodiac(this.yy));

		return getTermRange(this, list, keyOnly);
	}
});

/** get the chinese zodiac for a given year */
function getChineseZodiac(year: number) {
	const animals = groups['animal'] ?? [];
	const elements = groups['element'] ?? [];

	const animalIndex = (year - 4) % 12;											// calculate the animal index
	const elementIndex = Math.floor(((year - 4) % 10) / 2);		// calculate the element index based on the last digit of the year
	const yinYang = year % 2 === 0 ? 'Yang' : 'Yin';					// determine Yin or Yang

	return {
		animal: animals[animalIndex].key,
		traits: animals[animalIndex].traits,
		element: elements[elementIndex].key,
		yinYang: yinYang
	}
}