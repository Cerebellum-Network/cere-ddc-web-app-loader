import fs from 'node:fs';
import path from 'node:path';
import ejs from 'ejs';
import {URL} from 'node:url';
import {File as DdcFile, SearchType, Tag} from '@cere-ddc-sdk/ddc-client';
import {createClient, storeFile} from './src/ddc-utils.js';
import {config} from './src/config.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const tmpl = ejs.compile(fs.readFileSync(path.join(dirname, 'tmpl', 'app.ejs'), 'utf-8'));

const ddcClient = await createClient();
const sw = await storeFile(ddcClient, '/Users/aelyseev/Documents/Work/cere/cere-network/games-demo/app/sw.js');
const app = await storeFile(ddcClient, '/Users/aelyseev/Documents/Work/cere/cere-network/games-demo/app/game.html');

const loaderHtml = tmpl({
    sw: new URL(sw.url).pathname,
    app: app.url,
    routes: {},
});

const tags = [
    new Tag('name', 'loader.html', SearchType.NOT_SEARCHABLE),
    new Tag('content-type', 'text/html', SearchType.NOT_SEARCHABLE)
];
const file = new DdcFile(Buffer.from(loaderHtml, 'utf-8'), tags);
const uri = await ddcClient.store(config.bucketId, file, {
    encrypt: false,
});
const url = new URL(ddcClient.caStorage.cdnNodeUrl);
url.pathname = uri.toString();

console.log(url.href);

process.exit(0);
