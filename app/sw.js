importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

let routes = {};
let mainRoutes = {};

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'routes') {
        const data = event.data?.data || {};
        console.log('addEventListener', {data});
        routes = data?.routes || {};
        mainRoutes = data?.mainRoutes || {};
    }
    if (event.ports?.[0]) {
        event.ports[0].postMessage(event.data);
    }
});

workbox.routing.registerRoute(({url}) => {
    if (mainRoutes[url.pathname] != null) {
        return true;
    }
    const paths = Object.keys(routes);
    return paths.some(path => url.pathname.endsWith(path));
}, requestHandler, 'GET');

function requestHandler({event}) {
    const url = new URL(event.request.url);
    const entries = Object.entries(routes);
    const entry = entries.find(([path]) => url.pathname.endsWith(path));
    if (mainRoutes[url.pathname]) {
        event.respondWith(fetch(mainRoutes[url.pathname]));
    } else if (entry?.[1]) {
        event.respondWith(fetch(entry[1]));
    } else {
        event.respondWith(new Response('not found', {status: 404, statusText: 'not found'}));
    }
}
