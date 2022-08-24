importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

let routes = {};

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'routes') {
        routes = event.data?.data || {};
    }
    if (event.ports?.[0]) {
        event.ports[0].postMessage(event.data);
    }
});

workbox.routing.registerRoute(({url}) => routes[url.pathname] != null, requestHandler, 'GET');

function requestHandler({event}) {
    const url = new URL(event.request.url);
    console.log(routes, url.pathname, routes[url.pathname]);
    event.respondWith(fetch(routes[url.pathname]));
}
