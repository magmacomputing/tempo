import { isNullish } from '@module/shared/type.library';

interface MapOpts {
	catch?: boolean;																					// intercept Reject as Resolve (default: true)
	debug?: boolean;																					// console.log progress
}

/**
 * To avoid calling google.maps (for response-time and cost) we stash the current location.  
 * On subsequent calls, we check whether the device has moved before calling google.maps
 */
const currPosition = {} as {																// static variable for current location
	geolocation?: GeolocationPosition & { error?: string; };
	geocoder?: google.maps.GeocoderResponse | null;
}

const ONE_HOUR = 60 * 60 * 1_000;														// 3600 seconds

/**
 * attempt geolocation.getCurrentPosition()  
 * -> if user allows, then return geo-coordinates
 * -> if not allowed, then set error = GeolocationPositionError  
 * -> if not support, then set error = NOT_SUPPORTED
 */
export const geoLocation = (opts = { catch: true, debug: false } as MapOpts) =>
	new Promise<GeolocationPosition & { error?: string; }>((resolve, reject) => {
		const handler = opts.catch ? resolve : reject;

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				value => resolve(currPosition.geolocation = value),	// on success
				error => handler(currPosition.geolocation = Object.assign({ error: error.message }))
			)
		}
		else handler(currPosition.geolocation = Object.assign({ error: 'NOT_SUPPORTED' }))
	})
		.finally(() => {
			if (opts.debug)
				console.log('geolocation: ', currPosition.geolocation);
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
export const mapQuery = (coords?: google.maps.GeocoderRequest) =>
	new Promise<google.maps.GeocoderResponse>((resolve, reject) => {
		if ('google' in window && 'maps' in window.google) {
			geoCoords(coords)																			// get a Location object
				.then(loc => {
					switch (true) {
						case isNullish(loc):														// unsuccessful geoLocation()
							return reject(null);

						case isNullish(coords):													// current location
							const test1 = !isNullish(currPosition.geolocation) && !isNullish(currPosition.geocoder);
							const test2 = currPosition.geolocation?.timestamp! < (new Date().valueOf() - ONE_HOUR);
							if (test1 && test2) 													// if we already have geocoder and one-hour has not yet passed
								return resolve(currPosition.geocoder!);			// return previous geocoder

						default:
							new google.maps.Geocoder().geocode(loc!)
								.then(res => resolve(currPosition.geocoder = res))	// successful maps.geocode
								.catch(_ => reject(currPosition.geocoder = null))		// unsuccessful maps.geocode
					}
				})
				.catch(_ => reject(currPosition.geocoder = null))		// unsuccessful geoCoords()
		}
		else reject(null);																			// google.maps not available
	})

/**
 * get Hemisphere ('north' | 'south' | null)  
 * for supplied coordinates (else query current gelocation)
 */
export const mapHemisphere = <T extends 'north' | 'south' | null>(coords?: google.maps.GeocoderRequest, opts = { catch: true, debug: false } as MapOpts) =>
	mapQuery(coords)																				// ask Google
		.then(response => ({ lat: response.results[0].geometry.location.lat(), lng: response.results[0].geometry.location.lng() }))
		.then(res => {
			if (!isNullish(res)) {																// useable geolocation detected
				if (opts.debug)
					console.log('sphere: ', res);
				return (res.lat >= 0 ? 'north' : 'south') as T;
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
		.catch(_ => null)																				// cannot geocode coordinates

/**
 * query google-maps for a best-guess address at supplied {lat,lng} co-ordinates  
 * (default current location)
 */
export const mapAddress = (coords?: google.maps.GeocoderRequest, opts = { catch: true, debug: false } as MapOpts) =>
	mapQuery(coords)
		.then(response => response.results?.[0])								// first result is 'best-guess'
		.then(({ formatted_address, address_components }) => address_components
			.reduce((acc, itm) => {
				itm.types
					.filter(type => type !== 'political')							// ignore not useful type
					.forEach(type => acc[type] = (acc[type] ? (acc[type] + ',') : '').concat(itm.short_name));
				return acc;
			}, { formatted_address } as Record<string, string | string[]>))	// start with formatted_address
		.catch(err => {
			if (opts.debug)
				console.warn('mapAddress: ', err.message);
			if (opts.catch === false)
				throw new Error(err);
			return null;
		})