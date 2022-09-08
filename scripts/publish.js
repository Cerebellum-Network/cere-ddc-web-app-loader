import { execSync } from 'node:child_process';
import path from 'node:path';
import { URL } from 'node:url';

const dirname = path.dirname(new URL(import.meta.url).pathname);

execSync('npm publish --access=public', {
  cwd: path.join(dirname, '../build'), stdio: 'inherit'
});
