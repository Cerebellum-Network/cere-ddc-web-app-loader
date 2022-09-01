/* eslint-disable max-len */
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { customAlphabet } from 'nanoid';
import ejs from 'ejs';
import { createHash } from 'node:crypto';
import { DdcClient, File as DdcFile, SearchType, Tag } from '@cere-ddc-sdk/ddc-client';
import { encode } from 'varint';
import { storeFile } from './ddc-utils';

const getDirName = () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const node__dirname = typeof __dirname === 'undefined' ? undefined : __dirname;
  return node__dirname || path.dirname(new URL(import.meta.url).pathname);
};

const dirname = getDirName();

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 20);
const appTmpl = ejs.compile(fs.readFileSync(path.join(dirname, './tmpl', 'app.ejs'), 'utf-8'));
const swTmpl = ejs.compile(fs.readFileSync(path.join(dirname, './tmpl', 'sw.ejs'), 'utf-8'));

const findFiles = (folder: string): string[] => {
    if (!path.isAbsolute(folder)) {
        throw Error(`An absolute path should be provided, ${folder} provided`);
    }
    const entries = fs.readdirSync(folder);
    const files: string[] = [];
    entries.forEach(entry => {
        const fullPath = path.join(folder, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isFile()) {
            files.push(fullPath)
        } else if (stats.isDirectory()) {
          // eslint-disable-next-line prefer-spread
            files.push.apply(files, findFiles(fullPath));
        }
    });
    return files;
};

const buildFolderVersion = (folder: string, salt = '') => {
    const files = findFiles(folder);
    files.sort();
    return files
        .reduce(
            (hash, file) => createHash('sha1').update(`${hash}${fs.readFileSync(file).toString().trim()}`).digest('hex'),
            salt
        );
};

const buildDdcFileUrl = async (ddcClient: DdcClient, bucketId: bigint, appId: string, filePath: string = '.'): Promise<string> => {
    const url = new URL(ddcClient.caStorage.cdnNodeUrl);
    url.pathname = path.join(`/ddc/buc/${bucketId}/file`, appId, filePath);
    return url.href;
}

type UploadAppOptions = {
    folder: string;
    index?: string;
    appId?: string;
    bucketId: bigint;
};

export const uploadWebApp = async (ddcClient: DdcClient, { folder, index, appId, bucketId }: UploadAppOptions): Promise<{ appId: string; url: string }> => {
    const applicationPath = appId || nanoid();
    const files = findFiles(folder);
    const indexFilePath = path.join(folder, index || 'index.html');
    if (!fs.existsSync(indexFilePath)) {
        throw Error(`Index file ${indexFilePath} not found`);
    }
    const routes: Record<string, string> = {};
    let mainRoute = '';
    let count = 1;
    await Promise.all(files.map(async (file) => {
        const relativePath = path.relative(folder, file);
        const fileRoute = file === indexFilePath ? undefined : path.join(applicationPath, relativePath);
        const response = await storeFile(ddcClient, {
            filename: file,
            bucketId,
            path: fileRoute,
        });
        if (file === indexFilePath) {
            mainRoute = response.url;
        } else {
            routes[relativePath] = await buildDdcFileUrl(ddcClient, bucketId, applicationPath, relativePath);
        }
        console.log(`${count}/${files.length}: ${file}`);
        count += 1;
    }))

    const version = buildFolderVersion(folder);
    const swJs = swTmpl({ version });
    const swAppId = `${applicationPath}-sw.js`;
    const swTags = [
        new Tag('timestamp', new Uint8Array(encode(Date.now()))),
        new Tag('file-path', swAppId),
        new Tag('content-type', 'application/javascript', SearchType.NOT_SEARCHABLE)
    ];
    const swFile = new DdcFile(Buffer.from(swJs, 'utf-8'), swTags);
    await ddcClient.store(bucketId, swFile, {
        encrypt: false,
    });
    const swRoute = await buildDdcFileUrl(ddcClient, bucketId, swAppId);

    const loaderHtml = appTmpl({
        sw: swRoute,
        mainRoute,
        routes,
    });

    const loaderTags = [
        new Tag('timestamp', new Uint8Array(encode(Date.now()))),
        new Tag('file-path', applicationPath),
        new Tag('content-type', 'text/html', SearchType.NOT_SEARCHABLE)
    ];
    const loaderFile = new DdcFile(Buffer.from(loaderHtml, 'utf-8'), loaderTags);
    await ddcClient.store(bucketId, loaderFile, {
        encrypt: false,
    });

    return {
        url: await buildDdcFileUrl(ddcClient, bucketId, applicationPath),
        appId: applicationPath,
    }
}
