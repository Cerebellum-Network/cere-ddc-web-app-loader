import fs from 'node:fs';
import path from 'node:path';
import {URL} from 'node:url';
import {createClient, storeFile} from './ddc-utils.js';
import {config} from './config.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * @param {string} filename
 * @param {string} root
 */
const uploadFile = async (filename, root = '/') => {
    const filepath = path.isAbsolute(filename) ? filename : path.join(dirname, filename);
    const key = path.relative(root, filepath);
    const ddcClient = await createClient();
    const uri = await storeFile(ddcClient, config.bucketId, filepath);
    return {[key]: uri};
};

/**
 * @param {string} folderName
 * @param {string} [root]
 * @return {Promise<Array<Object>>}
 */
const uploadDir = async (folderName, root) => {
    const folder = path.isAbsolute(folderName) ? folderName : path.join(dirname, folderName);
    const rootFolder = root || folder;
    const files = fs.readdirSync(folder);
    return Promise.all(files.map(file => {
        const filePath = path.join(folder, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            return uploadFile(filePath, rootFolder);
        } else if (stats.isDirectory()) {
            return uploadDir(filePath, rootFolder);
        }
        return [];
    })).then(results => results.flat());
};

