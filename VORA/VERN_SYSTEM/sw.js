importScripts('./uv/uv.bundle.js');
importScripts('./uv/uv.config.js');
importScripts('./baremux/index.js');

// Shared transport state
let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

const workerPath = location.origin + "/VORA/VERN_SYSTEM/baremux/worker.js";
let connection = new BareMux.WorkerConnection(workerPath);
let bareClient = new BareMux.BareClient(connection);

function updateTransport(port = null) {
    try {
        connection = new BareMux.WorkerConnection(port || workerPath);
        bareClient = new BareMux.BareClient(connection);
        uv.bareClient = bareClient;
        console.log(`VIRA SW: Transport updated. Port source: ${port ? 'Explicit (Message)' : 'Path-based'}`);
    } catch (e) {
        console.error("VIRA SW: Failed to update transport:", e);
    }

    if (!transportReady) {
        transportReady = true;
        if (transportResolve) transportResolve();
    }
}

// Ensure the prefix matches what Ultraviolet expects for asset loading
self.__uv$config.prefix = "/VORA/VERN_SYSTEM/uv/service/";

importScripts('./uv/uv.sw.js');

const uv = new UVServiceWorker();
uv.bareClient = bareClient;

// Sync via BroadcastChannel
const bc = new BroadcastChannel("bare-mux-sync");
bc.onmessage = (event) => {
    if (event.data && event.data.type === 'baremuxready') {
        updateTransport();
        console.log("VIRA SW: BareMux Ready Signal Received via BroadcastChannel");
    }
};

// Sync port from main thread
self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'baremuxready' || event.data.type === 'baremuxinit')) {
        const port = event.data.port || (event.ports && event.ports[0]);
        updateTransport(port);
        console.log("VIRA SW: BareMux Port Synced via message");
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
    if (url.startsWith(location.origin + self.__uv$config.prefix)) {
        if (!transportReady) {
            console.log("VIRA SW: Waiting for transport for " + url);
            await Promise.race([
                transportPromise,
                new Promise(r => setTimeout(r, 3000))
            ]);
            if (!transportReady) console.warn("VIRA SW: Transport wait timed out for " + url);
        }
        return uv.fetch(event);
    }
    return fetch(event.request);
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleFetch(event));
});
