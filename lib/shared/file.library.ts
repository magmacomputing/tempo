export const getJSON = (file: string, callback?: Function) => {
	return new Promise<string>((resolve, reject) => {

		const rawFile = new XMLHttpRequest();

		rawFile.overrideMimeType('application/json');							// set mime-type
		rawFile.open("GET", file, true);													// get file
		rawFile.onerror = reject;
		rawFile.onabort = reject;

		rawFile.onreadystatechange = function () {
			resolve(rawFile.responseText);
			if (rawFile.readyState === 4 && rawFile.status === 200) {
				callback?.(rawFile.responseText);
			}

		}
		rawFile.send(null);
	})
}