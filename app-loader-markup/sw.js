/* eslint-disable */
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// const version = 6;

const defer = () => {
  let res;
  const p = new Promise((resolve) => {
    res = resolve;
  });
  return {
    promise: p,
    resolve: res,
  };
};

const key = Symbol();

/**
 * @typedef Fetch
 * @type function(*, [*]): Promise<Response>
 * @param attempts
 * @return {Fetch}
 */
const repeatableFetchCreator = (attempts = 1) => (input, options = {}) =>{
  const defers = Array.from(new Array(attempts)).map(() => defer());
  defers[0].resolve(undefined);
  return Promise.any(defers.map((d, i) => {
    return d.promise.then(() => fetch(input, options))
      .catch(error => {
        console.error({attempt: i}, input, error);
        if (i + 1 < attempts) {
          defers[i + 1].resolve(undefined);
        }
        throw error;
      })
      .then(response => {
        if (response.ok) {
          return response;
        }
        console.warn({attempt: i}, input, response);
        if (i + 1 < attempts) {
          defers[i + 1].resolve(undefined);
        }
        throw { [key]: response };
      });
  })).catch(e => {
    if (e instanceof AggregateError) {
      const response = e.errors[0];
      if (response?.[key]) {
        return response[key];
      }
      throw response;
    }
    throw e;
  });
}

const repeatableFetch = repeatableFetchCreator(3);

let routes = {};
let mainRoute = {};

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'routes') {
    const data = event.data?.data || {};
    routes = data?.routes || {};
    mainRoute = data?.mainRoute || {};
  }
  if (event.ports?.[0]) {
    event.ports[0].postMessage(event.data);
  }
});

function requestHandler({ event }) {
  const url = new URL(event.request.url);
  const entries = Object.entries(routes);
  const entry = entries.find(([path]) => url.pathname.endsWith(path));
  if (mainRoute[url.pathname]) {
    event.respondWith(repeatableFetch(mainRoute[url.pathname]));
  } else if (entry?.[1]) {
    event.respondWith(repeatableFetch(entry[1]));
  } else {
    event.respondWith(new Response('not found', { status: 404, statusText: 'not found' }));
  }
}

workbox.routing.registerRoute(({ url }) => {
  if (mainRoute[url.pathname] != null) {
    return true;
  }
  const paths = Object.keys(routes);
  return paths.some(path => url.pathname.endsWith(path));
}, requestHandler, 'GET');
