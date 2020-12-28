'use strict';

const { join } = require('path');
const glob = require('glob').sync;
const tiny = require('tiny-json-http');
const fs = require('fs');
const { gzipSync } = require('zlib');

async function go() {
	const {
		PULL_REQUEST,
		GITHUB_SHA,
	} = process.env;

	if (!PULL_REQUEST) { throw new ReferenceError('Missing env var PULL_REQUEST'); }
	if (!GITHUB_SHA) { throw new ReferenceError('Missing env var GITHUB_SHA'); }

	const dir = join(__dirname, '..', 'out');
	const files = glob(join(dir, '**'), { nodir: true });

	if (!files.length) { throw new ReferenceError('No preview files found to publish'); }

	console.log(`Publishing preview build of PR ${PULL_REQUEST} (SHA ${GITHUB_SHA})`);

	const data = {
		pr: PULL_REQUEST,
		sha: GITHUB_SHA,
		files: [],
	};
	for (const file of files) {
		const filename = file.replace(dir, '').slice(1);
		const contents = fs.readFileSync(file);
		const body = gzipSync(contents).toString('base64');
		console.log(`Packaging: ${filename} (${body.length / 1000}kB)`);
		data.files.push({
			filename: filename,
			body: body,
		});
	}

	const url = 'https://ci.tc39.es/preview/tc39/ecma262';

	const payloadSize = JSON.stringify(data).length;
	console.log(`Payload size: ${payloadSize / 1000}kB`);
	if (payloadSize >= 1000 * 1000 * 6) {
		throw Error('Payloads must be under 6MB');
	}

	await tiny.post({ url: url, data: data });
	console.log('Sent to preview!')
}
go().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
