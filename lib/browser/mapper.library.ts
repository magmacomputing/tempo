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
 * -> if not support, then return Null
 */
export const getGeolocation = (opts = { catch: true, debug: false } as MapOpts) => {
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

/**
 * get Hemisphere ('north' | 'south' | null)  
 * for supplied coordinates (else query current gelocation)
 */
export const getHemisphere = <T extends 'north' | 'south' | null>(coords?: google.maps.GeocoderRequest, opts = { catch: true, debug: false } as MapOpts) =>
	new Promise<Record<"lat" | "lng", number> | null>(resolve => {
		if (isNullish(coords)) {																// no coordinates
			getGeolocation(opts)																	// so attempt to fetch current GPS
				.then(loc => resolve(loc.type === 'GeolocationPosition'
					? { lat: loc.value.coords.latitude, lng: loc.value.coords.longitude, }
					: null)
				)
		} else {																								// else try a GeocoderRequest
			new google.maps.Geocoder().geocode(coords)						// ask Google
				.then(response => resolve({ lat: response.results[0].geometry.location.lat(), lng: response.results[0].geometry.location.lng() }))
				.catch(_ => resolve(null))													// cannot geocode coordinates
		}
	})
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

			return null as T;
		})

/**
 * query google-maps for a best-guess address at supplied {lat,lng} co-ordinates  
 * (default current location)
 */
export const mapAddress = (coords?: google.maps.GeocoderRequest, opts = { catch: true, debug: false } as MapOpts) =>
	new Promise<google.maps.GeocoderRequest>((resolve, reject) => {
		if (isNullish(coords)) {																// no coords supplied
			getGeolocation(opts)																	// so check current location
				.then(geo => {
					switch (geo.type) {
						case 'GeolocationPositionError':								// API not useable
							return reject(geo.value.message);
						case 'NotSupportedError':												// API not avail
							return reject(geo.type);
						default:																				// get current coordinates
							return resolve({
								location: {
									lat: geo.value.coords.latitude,
									lng: geo.value.coords.longitude,
								}
							})
					}
				})
		}
		else resolve(coords);
	})
		.then(request => new google.maps.Geocoder().geocode({ ...request }))
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
