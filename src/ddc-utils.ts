import { DdcClient, File as DdcFile, SearchType, Tag } from '@cere-ddc-sdk/ddc-client';
import fs from 'node:fs';
import mime from 'mime';
import { encode } from 'varint';
import { GetPromiseResult } from './get-promise-result';

type DdcUri = GetPromiseResult<ReturnType<DdcClient['store']>>;
type StoreOptions = {
  filename: string;
  bucketId: bigint;
  path?: string;
};
export const storeFile = async (
  ddcClient: DdcClient,
  { filename, path, bucketId }: StoreOptions,
): Promise<{ uri: DdcUri; url: string }> => {
  const fileContent = fs.readFileSync(filename);
  const fileStats = fs.statSync(filename);
  const tags: Tag[] = [new Tag('timestamp', new Uint8Array(encode(Math.round(fileStats.mtimeMs))))];
  const contentType = mime.getType(filename);
  if (contentType) {
    tags.push(new Tag('content-type', contentType, SearchType.NOT_SEARCHABLE));
  }
  if (path) {
    tags.push(new Tag('file-path', path));
  }

  const file = new DdcFile(fileContent, tags);
  const uri = await ddcClient.store(bucketId, file, {
    encrypt: false,
  });
  const url = new URL(ddcClient.caStorage.cdnNodeUrl);
  url.pathname = uri.toString();
  return { url: url.href, uri };
};
