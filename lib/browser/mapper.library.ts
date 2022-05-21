import { WebStore } from '@module/browser/webstore.class';
import { asObject } from '@module/shared/object.library';
import { isNullish } from '@module/shared/type.library';

interface MapOpts {
	catch?: boolean;																					// intercept Reject as Resolve (default: true)
	debug?: boolean;																					// console.log progress
}
interface MapPosi {
	geolocation: GeolocationPosition & { error?: GeolocationPositionError["message"] | 'NOT_SUPPORTED' };
	georesponse: google.maps.GeocoderResponse & { error?: Error["message"] };
}

/**
 * To avoid calling google.maps (for response-time and cost) we stash the current location.  
 * On subsequent calls, we check whether the device has moved before calling google.maps
 */
const ONE_HOUR = 60 * 60 * 1_000;														// 3600 seconds
const MAP_KEY = '_map_';																		// localStorage key
const defaults: MapOpts = { catch: true, debug: false };		// default Options
const mapPosition = WebStore.local.get(MAP_KEY, {} as MapPosi);// static object to hold last position

/**
 * attempt geolocation.getCurrentPosition()  
 * -> if user allows, then return geo-coordinates
 * -> if not allowed, then set error = GeolocationPositionError  
 * -> if not support, then set error = NOT_SUPPORTED
 */
export const geoLocation = (opts = {} as MapOpts) =>
	new Promise<MapPosi["geolocation"]>((resolve, reject) => {
		opts = Object.assign({}, defaults, opts);
		const handler = opts.catch ? resolve : reject;

		if ('geolocation' in navigator) {
			navigator["geolocation"].getCurrentPosition(
				value => {																					// on success
					const test1 = value.coords.latitude.toFixed(3) !== mapPosition.geolocation?.coords.latitude.toFixed(3);
					const test2 = value.coords.longitude.toFixed(3) !== mapPosition.geolocation?.coords.longitude.toFixed(3);
					const test3 = mapPosition.geolocation?.timestamp < (new Date().valueOf() - ONE_HOUR);

					if (test1 || test2 || test3) {										// position has moved, or timeout
						Reflect.deleteProperty(mapPosition, 'georesponse');// so remove stashed geocoder result
						if (opts.debug)
							console.log('geoLocation: device moved');
					}

					Object.assign(mapPosition, { geolocation: asObject(value) });
					resolve(mapPosition.geolocation);

				},
				error => {																					// on failure
					Object.assign(mapPosition, { geolocation: { error: error.message }, georesponse: null });
					handler(mapPosition.geolocation);
				})
		} else {																								// not available
			Object.assign(mapPosition, { geolocation: { error: 'Not Supported' }, georesponse: null });
			handler(mapPosition.geolocation);
		}
	})
		.finally(() => {
			if (opts.debug)
				console[mapPosition.geolocation?.error ? 'error' : 'log']('geoLocation: ', mapPosition.geolocation);

			WebStore.local.set(MAP_KEY, mapPosition);
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
	new Promise<MapPosi["georesponse"]>((resolve, reject) => {
		opts = Object.assign({}, defaults, opts);
		const handler = opts.catch ? resolve : reject;

		geoCoords(coords)																				// get a Location object
			.then(loc => {
				switch (true) {
					case (!('maps' in window['google'])):
						throw new Error('Google Maps API not configured');

					case isNullish(loc):															// unsuccessful geoLocation()
						throw new Error('Cannot determine Coordinates');

					case isNullish(coords):														// current location
						const test1 = !isNullish(mapPosition.geolocation) && !isNullish(mapPosition.georesponse);
						const test2 = isNullish(mapPosition.geolocation?.error) && isNullish(mapPosition.georesponse?.error);
						if (test1 && test2) {														// if we already have geocoder
							if (opts.debug)
								console.log('mapQuery: cache');
							return resolve(mapPosition.georesponse!);			// return previous geocoder
						}

					default:
						new window['google']['maps'].Geocoder().geocode(loc!)
							.then(res => resolve(mapPosition.georesponse = res))	// successful maps.geocode
				}
			})
			.catch(error => {																			// unsuccessful geoCoords() | geocode()
				Object.assign(mapPosition, { georesponse: { error: error.message } });
				handler(mapPosition.georesponse);
			})
	})
		.finally(() => {
			if (opts.debug)
				console[mapPosition.georesponse?.error ? 'error' : 'log']('mapQuery: ', mapPosition.georesponse);

			WebStore.local.set(MAP_KEY, mapPosition);
		})

/**
 * get Hemisphere ('north' | 'south' | null)  
 * for supplied coordinates (else query current gelocation)
 */
export const mapHemisphere = <T extends 'north' | 'south' | null>(coords?: google.maps.GeocoderRequest, opts = {} as MapOpts) =>
	mapQuery(coords)																					// ask Google
		.then(response => {
			opts = Object.assign({}, defaults, opts);

			if (!isNullish(response.error)) {											// useable GeocoderResult detected
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
		.catch(error => {																				// cannot query coordinates
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
export const mapAddress = (coords?: google.maps.GeocoderRequest, opts = { catch: true, debug: false } as MapOpts) =>
	mapQuery(coords)
		.then(response => {
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
		.catch(error => {
			if (opts.debug)
				console.warn('mapAddress: ', error.message);
			if (opts.catch === false)
				throw new Error(error);
			return null;
		})