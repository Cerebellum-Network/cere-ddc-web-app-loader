import fs from 'node:fs';
import path from 'node:path';
import ejs from 'ejs';
import {URL} from 'node:url';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const tmpl = ejs.compile(fs.readFileSync(path.join(dirname, 'tmpl', 'loader.ejs'), 'utf-8'));

const html = tmpl({routes: {data: 'test'}});




