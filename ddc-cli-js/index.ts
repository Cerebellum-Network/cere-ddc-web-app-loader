import 'dotenv/config'
import {mnemonicGenerate} from "@polkadot/util-crypto";
import {DdcClient, File, Piece, Tag, SearchType, DdcUri, IFILE, IPIECE} from "@cere-ddc-sdk/ddc-client";
import * as fs from "fs/promises";
const log = console.log;


const setupClient = async () => {
    // Cluster address is either string (url of the CDN node to use) or number (id of the CDN cluster to use)
    // CDN node addresses and cluster ids can be found here: https://docs.cere.network/testnet/ddc-network-testnet
    const options = {clusterAddress: 2};

    // The secret phrase is going to be used to sign requests and encrypt/decrypt (optional) data
    // Replace mnemonicGenerate by your secret phrase generated during account setup (see https://docs.cere.network/ddc/developer-guide/setup)
    const secretPhrase = process.env.SECRET_PHRASE || "";

    // Initialise DDC client and connect to blockchain
    const ddcClient = await DdcClient.buildAndConnect(options, secretPhrase);
    console.log("DDC Client successfully connected.");

    return ddcClient;
}

const createBucket = async (ddcClient: DdcClient) => {
    // Amount of tokens to deposit to the bucket balance
    const balance = 10n;
    // Bucket size in GB
    const size = 5n;
    // Bucket parameters
    const parameters = {
        // Number of copies of each piece. Minimum 1. Maximum 9. Temporary limited to 3. Default 1.
        replication: 3,
    };
    // Id of the storage cluster on which the bucket should be created
    // Storage custer ids can be found here: https://docs.cere.network/testnet/ddc-network-testnet
    const storageClusterId = 1n;

    // Create bucket and return even produced by Smart Contract that contains generated bucketId that should be used later to store and read data
    const bucketCreatedEvent = await ddcClient.createBucket(balance, size, storageClusterId, parameters);
    console.log("Successfully created bucket. Id: " + bucketCreatedEvent.bucketId);
}

const storePiece = async (ddcClient: DdcClient, srcPath: string, contentType?: string) => {

    // ID of the bucket in which the piece should be stored
    const bucketId = BigInt(process.env.BUCKET_ID || "");
    //log("BUCKET_ID", bucketId);

    // Data can be encrypted or not (depends on store options 'encrypt' flag)
    //const data = new TextEncoder().encode("<html><body><h1>Hello world!</h1></body></html>");
    const data = await fs.readFile(srcPath);
    // Tags can be used to store metadata or to search pieces
    const tags = [
        new Tag("content-type", contentType ?? 'text/plain', SearchType.NOT_SEARCHABLE),
        new Tag("file-path", srcPath),
    ];

    // Tags are optional
    // Data supported types: Uint8Array
    const piece = new Piece(data, tags);

    const storeOptions = {
        // True - store encrypted data. False - store unencrypted data.
        encrypt: false,
        // If empty or not passed - data will be encrypted by master DEK.
        //dekPath: "/test",
    };

    const ddcUri = await ddcClient.store(bucketId, piece, storeOptions);
    //console.log("Successfully uploaded piece. DDC URI: " + ddcUri.toString());
    return ddcUri.toString();
}

const main = async () => {
    let ddcClient = await setupClient();
    let cdnBase = "https://node-0.v2.us.cdn.testnet.cere.network";

    let srcDir = "../games/2048/";

    let paths1 = [
        "favicon.ico",
        "meta/apple-touch-icon.png",
        "meta/apple-touch-startup-image-640x1096.png",
        "meta/apple-touch-startup-image-640x920.png",

        "style/fonts/ClearSans-Bold-webfont.eot",
        "style/fonts/ClearSans-Bold-webfont.svg",
        "style/fonts/ClearSans-Bold-webfont.woff",
        "style/fonts/ClearSans-Light-webfont.eot",
        "style/fonts/ClearSans-Light-webfont.svg",
        "style/fonts/ClearSans-Light-webfont.woff",
        "style/fonts/ClearSans-Regular-webfont.eot",
        "style/fonts/ClearSans-Regular-webfont.svg",
        "style/fonts/ClearSans-Regular-webfont.woff",

        "js/classlist_polyfill.js",
        "js/game_manager.js",
        "js/bind_polyfill.js",
        "js/tile.js",
        "js/local_storage_manager.js",
        "js/keyboard_input_manager.js",
        "js/animframe_polyfill.js",
        "js/application.js",
        "js/html_actuator.js",
        "js/grid.js",
    ];

    let paths2 = [
        "style/fonts/clear-sans.css",
    ];

    let paths3 = [
        "style/main.css",
    ];

    let paths4 = [
        "index.html",
    ];

    for(let path of paths4) {
        let uri = await storePiece(ddcClient, srcDir + path);
        let url = cdnBase + uri;
        log(path, url);
    }
    //let uri = "/ddc/buc/68/ipiece/bafk2bzacecp6o7inzj6krrhkugsi4j2lrcyjfnyoz4ozdih6bm3xjk2eodera";
}

main().then(() => { process.exit(0); }, (err) => { console.error(err); process.exit(1); });
