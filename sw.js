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

const xor = {
    encode(str) {
        if (!str) return str;
        return encodeURIComponent(str.toString().split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
    },
    decode(str) {
        if (!str) return str;
        let [input, ...search] = str.split('?');
        return decodeURIComponent(input).split('').map((char, ind) => ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('') + (search.length ? '?' + search.join('?') : '');
    }
};

self.__uv$config = {
    ...config,
    encodeUrl: xor.encode,
    decodeUrl: xor.decode
};

importScripts(config.sw);

const uv = new UVServiceWorker(self.__uv$config);

let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

let connection = new BareMux.BareMuxConnection(config.worker);
let bareClient = new BareMux.BareClient(connection);

async function initTransport() {
    try {
        await connection.setTransport("/VORA/VERN_SYSTEM/libcurl/index.mjs", [
            { websocket: "wss://wisp.mercurywork.shop/" },
            { websocket: "wss://ruby.rubynetwork.xyz/wisp/" }
        ]);
        uv.bareClient = bareClient;
        transportReady = true;
        if (transportResolve) transportResolve();
        console.log("SW: Transport Initialized");
    } catch (e) {
        console.error("SW: Transport Init Failed", e);
    }
}

initTransport();

self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'baremuxinit' || event.data.type === 'baremuxready')) {
        const port = event.data.port || (event.ports && event.ports[0]);
        if (port) {
            connection = new BareMux.BareMuxConnection(port);
            bareClient = new BareMux.BareClient(connection);
            uv.bareClient = bareClient;
            transportReady = true;
            if (transportResolve) transportResolve();
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

async function handleFetch(event) {
    const url = event.request.url;
    if (url.includes(config.prefix)) {
        if (!transportReady) await transportPromise;
        // Log the decoded URL for debugging
        try {
            const encodedPart = url.split(config.prefix)[1];
            const decoded = xor.decode(encodedPart);
            console.log("SW Fetching proxied URL:", decoded);
        } catch (e) {}
        return await uv.fetch(event);
    }
    
    // Auto-proxy TMDB and other essential domains
    if (url.includes('themoviedb.org') || url.includes('tmdb.org')) {
        if (!transportReady) await transportPromise;
        const encoded = config.prefix + xor.encode(url);
        return await uv.fetch({ request: new Request(encoded, event.request) });
    }

    return await fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleFetch(event));
});

// Made with ❤️ from 4SP
