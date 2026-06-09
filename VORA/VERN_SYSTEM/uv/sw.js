importScripts('../baremux/index.js');
importScripts('uv.bundle.js');
importScripts('uv.config.js');
importScripts(__uv$config.sw || 'uv.sw.js');

// Consistent SharedWorker worker path
const workerPath = location.origin + "/VORA/VERN_SYSTEM/baremux/worker.js";
const connection = new BareMux.WorkerConnection(workerPath);
const uv = new UVServiceWorker();
uv.bareClient = new BareMux.BareClient(connection);

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'baremuxinit' && event.data.port) {
        connection.port = event.data.port;
        console.log("VORA VERN_SYSTEM SW: BareMux Port Synced via " + workerPath);
    }
});

let config = {
    blocklist: new Set(),
}

async function handleRequest(event) {
    if (uv.route(event)) {
        if (config.blocklist.size !== 0) {
            let decodedUrl = new URL(__uv$config.decodeUrl(new URL(event.request.url).pathname.slice(__uv$config.prefix.length)));
            if (config.blocklist.has(decodedUrl.hostname)) {
                return new Response("", { status: 404 });
            }
        }
        return await uv.fetch(event);
    }
    
    try {
        return await fetch(event.request);
    } catch (err) {
        console.error("Native fetch failed in SW:", err);
        return new Response("Network error", { status: 408 });
    }
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type !== 'baremuxinit') {
        config = event.data;
    }
});

self.addEventListener("activate", () => {
    const bc = new BroadcastChannel("UvServiceWorker");
    bc.postMessage("Active");
});