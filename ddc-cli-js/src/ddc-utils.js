import {DdcClient, File as DdcFile, SearchType, Tag} from "@cere-ddc-sdk/ddc-client";
import fs from 'node:fs';
import mime from 'mime';
import {config} from './config.js';

/**
 * @type {DdcClient}
 */
let clientInstance;

/**
 * @return {Promise<DdcClient>}
 */
export const createClient = async () => {
    if (clientInstance) {
        return clientInstance;
    }
    clientInstance = await DdcClient.buildAndConnect({
        clusterAddress: config.clusterAddress,
        smartContract: config.smartContract
    }, config.secretPhrase);
    return clientInstance;
}

/**
 * @param {DdcClient} ddcClient
 * @return {Promise<BigInt>}
 */
const createBucket = async (ddcClient) => {
    const balance = 95n;
    const size = 1n;
    const parameters = {
        replication: 1,
    };

    const bucketCreatedEvent = await ddcClient.createBucket(balance, size, config.storageClusterId, parameters);
    return bucketCreatedEvent.bucketId;
}

/**
 * @param {DdcClient} ddcClient
 * @param {BigInt} bucketId
 * @param {string} filename
 * @return {Promise<{uri: *, url: string}>}
 */
export const storeFile = async (ddcClient, bucketId, filename) => {
    const fileToUpload = fs.readFileSync(filename);
    const tags = [
        new Tag('name', filename),
        new Tag('type', mime.getType(filename), SearchType.NOT_SEARCHABLE)
    ];
    const file = new DdcFile(fileToUpload, tags);
    const uri = await ddcClient.store(bucketId, file, {
        encrypt: false,
    });
    const url = new URL(ddcClient.caStorage.cdnNodeUrl);
    url.pathname = uri.toString();
    return {url: url.href, uri};
}
