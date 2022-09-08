# Web loader

This package allows to upload HTML apps to the DDC.

### Uploading an HTML app

```shell
npm i @cere-ddc-sdk/ddc-client @cere-ddc-sdk/web-loader -D
```

A deploy script example:
```javascript
import { uploadWebApp } from '@cere-ddc-sdk/web-loader';
import { DdcClient, TESTNET } from '@cere-ddc-sdk/ddc-client';

const ddcClient = await DdcClient.buildAndConnect(
  {
    clusterAddress: Number(process.env.CLUSTER_ADDRESS),
    smartContract: TESTNET,
  },
  process.env.USER_MNEMONIC,
);

const result = await uploadWebApp(ddcClient, {
  folder: distFolder,
  appId: process.env.DDC_APP_ID,
  bucketId: process.env.BUCKET_ID,
});
```
Used variables:
1. `process.env.USER_MNEMONIC`, [how to set up a user](https://docs.cere.network/ddc/developer-guide/setup)
2. `process.env.BUCKET_ID` is a bucket id, refer to [this guide](https://docs.cere.network/ddc/developer-guide/quickstart#create-bucket) to find out how to create a bucket
3. `process.env.CLUSTER_ADDRESS` can be found [here](https://docs.cere.network/testnet/ddc-network-testnet)
4. `process.env.DDC_APP_ID` this `appId` could be omitted for the first upload, but it will be required if you want to update the already uploaded app. The target app URL will look like `<cdn node URL>/ddc/buc/<bucket id>/file/<app id>`. I.e. `appId` is any unique, within a bucket, string.

The script result:
```typescript
// the script above will return an object
type Result = {
    url: string; // an URL for the uploded app
    appId: string; // if the appId was omitted, one can use this value for the next updates
}
```
