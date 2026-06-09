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

let connection = new BareMux.BareMuxConnection(config.worker);
let bareClient = new BareMux.BareClient(connection);

// Initialize Wisp transport as fallback
(async () => {
    try {
        await connection.setTransport("/VORA/VERN_SYSTEM/libcurl/index.mjs", [
            { websocket: "wss://wisp.mercurywork.shop/" },
            { websocket: "wss://ruby.rubynetwork.xyz/wisp/" }
        ]);
        uv.bareClient = bareClient;
        console.log("SW: Wisp Transport Initialized");
    } catch (e) {
        console.error("SW: Wisp Init Failed", e);
    }
})();

self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'baremuxinit' || event.data.type === 'baremuxready')) {
        const port = event.data.port || (event.ports && event.ports[0]);
        if (port) {
            connection = new BareMux.BareMuxConnection(port);
            bareClient = new BareMux.BareClient(connection);
            uv.bareClient = bareClient;
            console.log("SW: Transport updated via Port");
        }
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
            return await uv.fetch(event);
        }
        return await fetch(event.request);
    })());
});

// Made with ❤️ from 4SP
