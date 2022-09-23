import { CONTEXT, getContext } from '@module/shared/utility.library';
import { Tempo } from '@module/shared/tempo.class';
import { Pledge } from '@module/shared/pledge.class';
import { asObject } from '@module/shared/object.library';
import { isNullish } from '@module/shared/type.library';

/**
 * Various functions to allow geolocating a user-device via the browser.  
 */

interface MapOpts {
	catch?: boolean;																					// intercept Promise reject() as resolve() (default: true)
	debug?: boolean;																					// console.log some checkpoints
}

/**
 * To avoid calling google.maps (for UI response-time and cost) we stash the current location.  
 * On subsequent attempts, we check whether the device has moved much before calling google.maps
 */
interface MapStore {																				// a localStorage object
	geolocation: GeolocationPosition & { error?: GeolocationPositionError["message"] | 'NOT_SUPPORTED' };
	georesponse: google.maps.GeocoderResponse & { error?: Error["message"] };
}

const defaults: MapOpts = { catch: true, debug: false };		// default Options
const context = getContext();																// browser / nodejs / google-apps
const mapStore = {} as MapStore;														// static object to hold last position
const MAP_KEY = '_map_';																		// localStorage key
const library = new Pledge<any>('WebStore');								// dynamic import of WebStore Class (if CONTEXT.Browser)

if (context.type === CONTEXT.Browser) {
	import('@module/browser/webstore.class')
		.then(({ WebStore }) => library.resolve(WebStore))			// localStorage wrapper
		.catch(_ => { throw new Error('Cannot import webstore.class') })
	library.promise																						// wait for import, then fetch localStorage item
		.then(WebStore => Object.assign(mapStore, WebStore.local.get(MAP_KEY, {})))
}
else library.resolve(null);																	// no access to localStorage

/**
 * attempt geolocation.getCurrentPosition()  
 * -> if user allows, then return geo-coordinates  
 * -> if not allowed, then set error = GeolocationPositionError  
 * -> if not support, then set error = NOT_SUPPORTED
 */
export const geoLocation = (opts = {} as MapOpts) =>
	new Promise<MapStore["geolocation"]>((resolve, reject) => {
		opts = Object.assign({}, defaults, opts);
		const handler = opts.catch ? resolve : reject;

		if ('geolocation' in navigator) {
			navigator["geolocation"].getCurrentPosition(
				(value) => {																				// on success
					const test1 = value.coords.latitude.toFixed(3) !== mapStore.geolocation?.coords?.latitude.toFixed(3);
					const test2 = value.coords.longitude.toFixed(3) !== mapStore.geolocation?.coords?.longitude.toFixed(3);
					const test3 = mapStore.geolocation?.timestamp < new Tempo().add({ hours: -1 }).epoch.ms;

					if (test1 || test2 || test3) {										// position has moved, or timeout
						Object.assign(mapStore, { georesponse: null });	// so remove stashed georesponse result
						if (opts.debug)
							console.log('geoLocation: device update');
					}

					Object.assign(mapStore, { geolocation: asObject(value) });
					resolve(mapStore.geolocation);
				},
				(error) => {																				// on failure
					Object.assign(mapStore, { geolocation: { error: error.message }, georesponse: null });
					handler(mapStore.geolocation);
				})
		} else {																								// not available
			Object.assign(mapStore, { geolocation: { error: 'Not Supported' }, georesponse: null });
			handler(mapStore.geolocation);
		}
	})
		.finally(() => {
			if (opts.debug)
				console[mapStore.geolocation?.error ? 'error' : 'log']('geoLocation: ', mapStore.geolocation);

			library.promise.then(WebStore => WebStore?.local.set(MAP_KEY, mapStore));
		})

/** format coordinates as a GeocoderRequest["location"] object */
export const geoCoords = (coords?: google.maps.GeocoderRequest) =>
	new Promise<google.maps.GeocoderRequest | null>((resolve, reject) => {
		if (!isNullish(coords))
			return resolve(coords);																// user-supplied coordinates

		geoLocation()																						// get current location
			.then(geo => isNullish(geo.error)											// successful geolocation
				? ({ location: { lat: geo.coords.latitude, lng: geo.coords.longitude } })
				: null																							// unsuccessful geolocation
			)
			.then(loc => resolve(loc))
			.catch(err => reject(err))
	})

/** Make a 'maps' request on google API */
export const mapQuery = (coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	new Promise<MapStore["georesponse"]>((resolve, reject) => {
		opts = Object.assign({}, defaults, opts);
		const handler = opts.catch ? resolve : reject;

		geoCoords(coords)																				// get a Location object
			.then((loc) => {
				switch (true) {
					case (!('maps' in window['google'])):
						throw new Error('Google Maps API not configured');

					case isNullish(loc):															// unsuccessful geoLocation
						throw new Error('Cannot determine Coordinates');

					case isNullish(coords):														// current location
						const test1 = !isNullish(mapStore.geolocation) && !isNullish(mapStore.georesponse);
						const test2 = isNullish(mapStore.geolocation?.error) && isNullish(mapStore.georesponse?.error);
						if (test1 && test2) {														// if we already have geocoder
							if (opts.debug)
								console.log('mapQuery: cache');
							return resolve(mapStore.georesponse!);				// return previous geocoder
						}																								// drop through to default:

					default:
						new window['google']['maps'].Geocoder().geocode(loc!)
							.then(res => resolve(mapStore.georesponse = asObject(res)))	// successful maps.geocode
				}
			})
			.catch((error) => {																		// unsuccessful geoCoords() | geocode()
				Object.assign(mapStore, { georesponse: { error: error.message } });
				handler(mapStore.georesponse);
			})
	})
		.finally(() => {
			if (opts.debug)
				console[mapStore.georesponse?.error ? 'error' : 'log']('mapQuery: ', mapStore.georesponse);

			library.promise.then(WebStore => WebStore?.local.set(MAP_KEY, mapStore));
		})

/**
 * get Hemisphere ('north' | 'south' | null)  
 * for supplied coordinates (else query current geolocation)
 */
export const mapHemisphere = <T extends 'north' | 'south' | null>(coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	mapQuery(coords)																					// ask Google
		.then((response) => {
			opts = Object.assign({}, defaults, opts);

			if (isNullish(response.error)) {											// useable GeocoderResult detected
				if (opts.debug)
					console.log('sphere: ', response);
				return (response.results[0].geometry.location.lat() >= 0 ? 'north' : 'south') as T;
			}

			const date = new Date();															// fallback relies on the area to observe DST
			const jan = -(new Date(date.getFullYear(), 0, 1).getTimezoneOffset()),
				jul = -(new Date(date.getFullYear(), 6, 1).getTimezoneOffset()),
				diff = jan - jul;

			if (opts.debug)
				console.log('sphere TimezoneOffset: ', diff);
			if (diff <= 0) return 'north' as T;
			if (diff > 0) return 'south' as T;

			if (opts.catch === false)
				throw new Error('Cannot determine Hemisphere');

			return null;
		})
		.catch((error) => {																			// cannot query coordinates
			if (opts.debug)
				console.warn('mapHemisphere: ', error.message);
			if (opts.catch === false)
				throw new Error(error)
			return null;
		})

/**
 * query google-maps for a best-guess address at supplied {lat,lng} co-ordinates  
 * (default current location)
 */
export const mapAddress = (coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	mapQuery(coords)
		.then((response) => {
			if (!isNullish(response.error)) throw new Error(response.error);
			return response.results[0];														// first result is 'best-guess'
		})
		.then(({ formatted_address, address_components }) => address_components
			.reduce((acc, itm) => {
				itm.types
					.filter(type => type !== 'political')							// ignore not useful type
					.forEach(type => acc[type] = (acc[type] ? (acc[type] + ',') : '').concat(itm.short_name));
				return acc;
			}, { formatted_address } as Record<string, string | string[]>))	// start with formatted_address
		.catch((error) => {
			opts = Object.assign({}, defaults, opts);

			if (opts.debug)
				console.warn('mapAddress: ', error.message);
			if (opts.catch === false)
				throw new Error(error);
			return null;
		})