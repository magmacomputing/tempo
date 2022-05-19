import { isNullish } from '@module/shared/type.library';

type GeolocationType =
	{ type: 'GeolocationPosition', value: GeolocationPosition } |
	{ type: 'GeolocationPositionError', value: GeolocationPositionError } |
	{ type: 'NotSupportedError', value: null }

interface MapOpts {
	catch?: boolean;																					// intercept Reject as Resolve (default: true)
	debug?: boolean;																					// console.log progress
}

/**
 * attempt geolocation.getCurrentPosition()  
 * -> if user allows, then return geo-coordinates, else GeolocationPositionError  
 * -> if not allowed, then return GeolocationPositionError  
 * -> if not support, then return \<null>
 */
export const geoLocation = (opts = { catch: true, debug: false } as MapOpts) => {
	let res: GeolocationType;

	return new Promise<GeolocationType>((resolve, reject) => {
		const handler = opts.catch ? resolve : reject;

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				value => resolve(res = { type: 'GeolocationPosition', value }),			// on success
				value => handler(res = { type: 'GeolocationPositionError', value })	// on error
			)
		}
		else handler(res = { type: 'NotSupportedError', value: null })					// not supported
	})
		.finally(() => { if (opts.debug) console[res.value instanceof GeolocationPositionError ? 'warn' : 'info']('geolocation: ', res) })
}

/** get coordinates as a GeocoderRequest 'Location' */
export const geoCoords = (coords?: google.maps.GeocoderRequest) =>
	new Promise<google.maps.GeocoderRequest | null>((resolve, reject) => {
		if (!isNullish(coords))
			return resolve(coords);																// user-supplied coordinates

		geoLocation()																						// get current location
			.then(geo => (geo.type === 'GeolocationPosition')			// successful geolocation
				? ({ location: { lat: geo.value.coords.latitude, lng: geo.value.coords.longitude } })
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
					if (!isNullish(loc)) {
						new google.maps.Geocoder().geocode(loc)
							.then(res => resolve(res))										// successful maps.geocode
							.catch(err => reject(err))										// unsuccessful maps.geocode
					}
					else reject(null)																	// unsuccessful geoLocation()
				})
				.catch(_ => reject(null))														// unsuccessful geoCoords()
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