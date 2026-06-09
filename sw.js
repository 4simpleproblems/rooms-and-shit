importScripts('/VORA/VERN_SYSTEM/uv/uv.bundle.js');
importScripts('/VORA/VERN_SYSTEM/baremux/index.js');

const config = {
    prefix: '/VORA/VERN_SYSTEM/uv/service/',
    bare: '/api/bare',
    bundle: '/VORA/VERN_SYSTEM/uv/uv.bundle.js',
    config: '/VORA/VERN_SYSTEM/uv/uv.config.js',
    sw: '/VORA/VERN_SYSTEM/uv/uv.sw.js',
    handler: '/VORA/VERN_SYSTEM/uv/uv.handler.js',
    client: '/VORA/VERN_SYSTEM/uv/uv.client.js',
    worker: '/VORA/VERN_SYSTEM/baremux/worker.js'
};

importScripts(config.sw);

const uv = new UVServiceWorker({
    ...config,
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode
});

let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

let connection = new BareMux.BareMuxConnection(config.worker);
let bareClient = new BareMux.BareClient(connection);

function updateTransport(path, port = null) {
    try {
        if (port) {
            connection = new BareMux.BareMuxConnection(port);
        } else if (path) {
            connection = new BareMux.BareMuxConnection(path);
        }
        bareClient = new BareMux.BareClient(connection);
        uv.bareClient = bareClient;
        console.log("SW: Transport updated");
    } catch (e) {
        console.error("SW: Failed to update transport:", e);
    }

    if (!transportReady) {
        transportReady = true;
        if (transportResolve) transportResolve();
    }
}

self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'baremuxinit' || event.data.type === 'baremuxready')) {
        const port = event.data.port || (event.ports && event.ports[0]);
        updateTransport(event.data.path, port);
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith((async () => {
        if (event.request.url.includes(config.prefix)) {
            if (!transportReady) {
                await Promise.race([
                    transportPromise,
                    new Promise(r => setTimeout(r, 2000))
                ]);
            }
            return await uv.fetch(event);
        }
        return await fetch(event.request);
    })());
});

// Made with ❤️ from 4SP
