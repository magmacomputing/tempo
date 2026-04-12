import { defineTerm, getTermRange, defineRange, resolveCycleWindow } from '../plugin.util.js';
import { type Tempo } from '../../tempo.class.js';

/** definition of astrological zodiac ranges */
const groups = defineRange([
	// Western (Tropical) - @link https://en.wikipedia.org/wiki/Astrological_sign
	{ key: 'Aries', day: 21, month: 3, symbol: 'Ram', trait: 'Daring and energetic, a natural leader', group: 'western' },
	{ key: 'Taurus', day: 20, month: 4, symbol: 'Bull', trait: 'Reliable and patient, enjoys luxury', group: 'western' },
	{ key: 'Gemini', day: 21, month: 5, symbol: 'Twins', trait: 'Adaptable and intellectual, great communicator', group: 'western' },
	{ key: 'Cancer', day: 21, month: 6, symbol: 'Crab', trait: 'Protective and intuitive, deeply emotional', group: 'western' },
	{ key: 'Leo', day: 23, month: 7, symbol: 'Lion', trait: 'Confident and ambitious, loves being center stage', group: 'western' },
	{ key: 'Virgo', day: 23, month: 8, symbol: 'Virgin', trait: 'Analytical and practical, meticulous and kind', group: 'western' },
	{ key: 'Libra', day: 23, month: 9, symbol: 'Scales', trait: 'Diplomatic and fair, values harmony', group: 'western' },
	{ key: 'Scorpio', day: 23, month: 10, symbol: 'Scorpion', trait: 'Passionate and resourceful, dynamic and brave', group: 'western' },
	{ key: 'Sagittarius', day: 22, month: 11, symbol: 'Archer', trait: 'Optimistic and free-spirited, loves travel', group: 'western' },
	{ key: 'Capricorn', day: 22, month: 12, symbol: 'Goat', trait: 'Disciplined and persistent, highly practical', group: 'western' },
	{ key: 'Aquarius', day: 20, month: 1, symbol: 'Water Bearer', trait: 'Original and humanitarian, values independence', group: 'western' },
	{ key: 'Pisces', day: 19, month: 2, symbol: 'Fish', trait: 'Compassionate and artistic, deeply intuitive', group: 'western' },

	// Chinese (Animal) - @link http://www.creativeartsguild.org/images/uploads/categories/12_Chinese_Zodiac_Signs.pdf
	{ key: 'Rat', traits: 'Quick-witted, resourceful', group: 'animal' } as any,
	{ key: 'Ox', traits: 'Diligent, dependable', group: 'animal' } as any,
	{ key: 'Tiger', traits: 'Brave, confident', group: 'animal' } as any,
	{ key: 'Rabbit', traits: 'Quiet, elegant', group: 'animal' } as any,
	{ key: 'Dragon', traits: 'Confident, intelligent', group: 'animal' } as any,
	{ key: 'Snake', traits: 'Enigmatic, intelligent', group: 'animal' } as any,
	{ key: 'Horse', traits: 'Animated, active', group: 'animal' } as any,
	{ key: 'Goat', traits: 'Gentle, shy', group: 'animal' } as any,
	{ key: 'Monkey', traits: 'Smart, curious', group: 'animal' } as any,
	{ key: 'Rooster', traits: 'Observant, hardworking', group: 'animal' } as any,
	{ key: 'Dog', traits: 'Loyal, honest', group: 'animal' } as any,
	{ key: 'Pig', traits: 'Compassionate, generous', group: 'animal' } as any,

	// Chinese (Element) - @link https://www.timeanddate.com/calendar/aboutelements.html
	{ key: 'Wood', group: 'element' } as any,
	{ key: 'Fire', group: 'element' } as any,
	{ key: 'Earth', group: 'element' } as any,
	{ key: 'Metal', group: 'element' } as any,
	{ key: 'Water', group: 'element' } as any,
], 'group');

/** resolve the full candidate list for the current context */
function resolve(t: Tempo, anchor?: any) {
	const western = (groups as any)['western'] ?? [];
	if (western.length === 0) return [];

	const list = resolveCycleWindow(t, western, anchor);

	// calculate the Chinese Zodiac based on the year of the candidate sign
	list.forEach((itm: any) => {
		itm['CN'] = getChineseZodiac(itm.year);
	});

	return list;
}

/**
 * ## ZodiacTerm
 * Astrological Zodiac signs
 */
export const ZodiacTerm = defineTerm({
	key: 'zdc',
	scope: 'zodiac',
	description: 'Astrological Zodiac sign',
	groups,

	resolve(this: Tempo, anchor?: any) {
		return resolve(this, anchor);
	},

	/** determine where the current Tempo instance fits within the above range */
	define(this: Tempo, keyOnly?: boolean, anchor?: any) {
		return getTermRange(this, resolve(this, anchor), keyOnly, anchor);
	}
});

/** get the chinese zodiac for a given year */
function getChineseZodiac(year: number) {
	const animals = (groups as any)['animal'] ?? [];
	const elements = (groups as any)['element'] ?? [];

	if (animals.length === 0 || elements.length === 0) {
		throw new Error(`[getChineseZodiac] Missing registration: animal (${animals.length}) or element (${elements.length})`);
	}

	const animalIndex = ((year - 4) % 12 + 12) % 12;												// calculate the animal index
	const elementIndex = Math.floor((((year - 4) % 10) + 10) % 10 / 2);			// calculate the element index based on the last digit of the year
	const yinYang = year % 2 === 0 ? 'Yang' : 'Yin';												// determine Yin or Yang

	return {
		animal: animals[animalIndex].key,
		traits: (animals[animalIndex] as any).traits,
		element: elements[elementIndex].key,
		yinYang: yinYang
	}
}
