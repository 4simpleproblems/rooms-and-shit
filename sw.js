importScripts('/VELIUM/uv/uv.bundle.js');
importScripts('/VELIUM/baremux/index.js');

// Unified Proxy Configuration
const configs = {
    velium: {
        prefix: '/VELIUM/uv/service/',
        bare: '/api/bare',
        bundle: '/VELIUM/uv/uv.bundle.js',
        config: '/VELIUM/uv/uv.config.js',
        sw: '/VELIUM/uv/uv.sw.js',
        handler: '/VELIUM/uv/uv.handler.js',
        client: '/VELIUM/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    vora: {
        prefix: '/VORA/VERN_SYSTEM/uv/service/',
        bare: '/api/bare',
        bundle: '/VORA/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VORA/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VORA/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VORA/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VORA/VERN_SYSTEM/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    vora_plus: {
        prefix: '/VORA_PLUS/VERN_SYSTEM/uv/service/',
        bare: '/api/bare',
        bundle: '/VORA_PLUS/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VORA_PLUS/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VORA_PLUS/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VORA_PLUS/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VORA_PLUS/VERN_SYSTEM/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    valo_plus: {
        prefix: '/VALO_PLUS/VERN_SYSTEM/uv/service/',
        bare: '/api/bare',
        bundle: '/VALO_PLUS/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VALO_PLUS/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VALO_PLUS/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VALO_PLUS/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VALO_PLUS/VERN_SYSTEM/uv/uv.client.js',
        worker: '/VALO_PLUS/VERN_SYSTEM/baremux/worker.js'
    },
    vern: {
        prefix: '/VERN/uv/service/',
        bare: '/api/bare',
        bundle: '/VERN/uv/uv.bundle.js',
        config: '/VERN/uv/uv.config.js',
        sw: '/VERN/uv/uv.sw.js',
        handler: '/VERN/uv/uv.handler.js',
        client: '/VERN/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    vana: {
        prefix: '/logged-in/uv/service/',
        bare: '/api/bare',
        bundle: '/logged-in/uv/uv.bundle.js',
        config: '/logged-in/uv/uv.config.js',
        sw: '/logged-in/uv/uv.sw.js',
        handler: '/logged-in/uv/uv.handler.js',
        client: '/logged-in/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    games: {
        prefix: '/GAMES/uv/service/',
        bare: '/api/bare',
        bundle: '/GAMES/uv/uv.bundle.js',
        config: '/GAMES/uv/uv.config.js',
        sw: '/GAMES/uv/uv.sw.js',
        handler: '/GAMES/uv/uv.handler.js',
        client: '/GAMES/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    valo: {
        prefix: '/VERN/uv/service/',
        bare: '/api/bare',
        bundle: '/VERN/uv/uv.bundle.js',
        config: '/VERN/uv/uv.config.js',
        sw: '/VERN/uv/uv.sw.js',
        handler: '/VERN/uv/uv.handler.js',
        client: '/VERN/uv/uv.client.js',
        worker: '/logged-in/baremux/worker.js'
    },
    velium_plus: {
        prefix: '/VELIUM_PLUS/VERN_SYSTEM/uv/service/',
        bare: '/api/bare',
        bundle: '/VELIUM_PLUS/VERN_SYSTEM/uv/uv.bundle.js',
        config: '/VELIUM_PLUS/VERN_SYSTEM/uv/uv.config.js',
        sw: '/VELIUM_PLUS/VERN_SYSTEM/uv/uv.sw.js',
        handler: '/VELIUM_PLUS/VERN_SYSTEM/uv/uv.handler.js',
        client: '/VELIUM_PLUS/VERN_SYSTEM/uv/uv.client.js',
        worker: '/VELIUM_PLUS/VERN_SYSTEM/baremux/worker.js'
    }
};

// Import the base SW logic (Ultraviolet)
importScripts(configs.velium.sw);

// Shared transport state
let transportReady = false;
let transportResolve;
const transportPromise = new Promise(resolve => {
    transportResolve = resolve;
});

async function getBareClient() {
    if (transportReady && bareClient) return bareClient;
    await transportPromise;
    return bareClient;
}

// Default worker path
let currentWorkerPath = location.origin + '/logged-in/baremux/worker.js';
let connection = new BareMux.BareMuxConnection(currentWorkerPath);
let bareClient = new BareMux.BareClient(connection);

function updateTransport(path, port = null) {
    const hasPathChanged = path && path !== currentWorkerPath;
    const hasNewPort = !!port;

    if (hasPathChanged || hasNewPort) {
        if (hasPathChanged) {
            console.log("Root SW: Switching BareMux Worker to " + path);
            currentWorkerPath = path;
        }
        
        try {
            // Use the most robust connection type available
            if (port) {
                connection = new BareMux.BareMuxConnection(port);
            } else {
                connection = new BareMux.BareMuxConnection(currentWorkerPath);
            }
            
            bareClient = new BareMux.BareClient(connection);
            
            // Re-inject the updated client into all active UV instances
            for (const key in instances) {
                instances[key].bareClient = bareClient;
            }
            console.log(`Root SW: Transport updated. Source: ${hasNewPort ? 'Port' : 'Path'}. Ready: true`);
        } catch (e) {
            console.error("Root SW: Failed to update transport:", e);
        }
    }

    if (!transportReady) {
        transportReady = true;
        if (transportResolve) transportResolve();
    }
}

// Use BroadcastChannel for more reliable signaling across contexts
const bc = new BroadcastChannel("bare-mux-sync");
bc.onmessage = (event) => {
    if (event.data && event.data.type === 'baremuxready') {
        updateTransport(event.data.path);
        console.log("Root SW: BareMux Ready Signal Received via " + (event.data.path || "unknown"));
    }
};

// Message listener for SharedWorker port synchronization
self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'baremuxinit' || event.data.type === 'baremuxready')) {
        const port = event.data.port || (event.ports && event.ports[0]);
        updateTransport(event.data.path, port);
        console.log("Root SW: BareMux Port/Ready Synced via " + (event.data.path || "unknown"));
    }
});

const instances = {};
for (const key in configs) {
    const inst = new UVServiceWorker({
        ...configs[key],
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode
    });
    // Use the shared client
    inst.bareClient = bareClient;
    instances[key] = inst;
}

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

async function handleRequest(event) {
    const url = event.request.url;
    
    // Auto-proxy certain domains even if prefix is missing
    const autoProxyDomains = [
        'api.themoviedb.org',
        'image.tmdb.org',
        'embed-testing-v7.vercel.app',
        'sub.wyzie.ru',
        'saavncdn.com',
        'soundcloud.com',
        'sndcdn.com',
        'streamed.pk',
        'streamed.ad',
        'strmd.link',
        'fastly.net'
    ];

    const isEncoded = url.includes('hvtrs8');
    const hasPrefix = Object.values(configs).some(c => url.includes(c.prefix));
    const isAutoProxy = autoProxyDomains.some(domain => url.includes(domain));
    
    // Improved local asset detection
    const urlObj = new URL(url);
    const isLocalOrigin = urlObj.origin === location.origin;
    const isProxied = url.includes('/service/') || url.includes('hvtrs8');
    const isLocalAsset = isLocalOrigin && 
                         (url.includes('/baremux/') || 
                          url.includes('/uv/') || 
                          url.includes('/libcurl/') ||
                          url.match(/\.(js|mjs|css|json|png|jpg|ico)$/)) &&
                         !isProxied;

    const needsProxy = (hasPrefix || isAutoProxy || isEncoded) && !isLocalAsset;

    if (isLocalOrigin && (url.includes('worker.js') || url.includes('index.mjs') || isProxied)) {
        console.log(`Root SW Debug: URL=${url}, isProxied=${isProxied}, isLocalAsset=${isLocalAsset}, needsProxy=${needsProxy}`);
    }

    // If we need proxying but transport isn't ready, wait for up to 3 seconds
    if (needsProxy && !transportReady) {
        console.log("Root SW: Waiting for transport for " + url);
        await Promise.race([
            transportPromise,
            new Promise(r => setTimeout(r, 3000))
        ]);
        
        // If still not ready after timeout, log it but let the fetch proceed 
        if (!transportReady) console.warn("Root SW: Transport wait timed out for " + url);
    }

    // Find the matching instance based on prefix
    for (const key in configs) {
        if (url.includes(configs[key].prefix)) {
            const instance = instances[key];
            
            try {
                const prefix = configs[key].prefix;
                let decodedUrl = "unknown";
                try {
                    const encoded = url.split(prefix)[1];
                    if (encoded) decodedUrl = Ultraviolet.codec.xor.decode(encoded);
                } catch (e) {}

                // High-performance domain check
                const isHighPerformance = autoProxyDomains.some(d => decodedUrl.includes(d));

                if (decodedUrl !== "unknown" && transportReady && isHighPerformance) {
                    console.log(`Root SW: Using optimized fetch for ${key}, fetching ${decodedUrl}`);
                    try {
                        // Strip headers that cause CDN rejections (null origin, proxied referer, etc.)
                        const STRIP_HEADERS = new Set([
                            "origin", "referer", "host", "x-forwarded-for",
                            "x-real-ip", "cf-connecting-ip", "cf-ray",
                            "x-forwarded-proto", "x-forwarded-host"
                        ]);
                        const headers = {};
                        for (const [k, v] of event.request.headers.entries()) {
                            if (!STRIP_HEADERS.has(k.toLowerCase())) {
                                headers[k] = v;
                            }
                        }
                        // Inject safe baseline headers
                        headers["user-agent"] = navigator.userAgent;
                        headers["accept"] = headers["accept"] || "*/*";
                        headers["accept-language"] = headers["accept-language"] || "en-US,en;q=0.9";

                        // Argon API and SoundCloud CDN require a real origin/referer or they 400
                        if (decodedUrl.includes("argon.global.ssl.fastly.net") ||
                            decodedUrl.includes("soundcloud.com") ||
                            decodedUrl.includes("sndcdn.com")) {
                            headers["origin"] = "https://soundcloud.com";
                            headers["referer"] = "https://soundcloud.com/";
                        }

                        // Use the robust getter
                        const client = await getBareClient();
                        const response = await client.fetch(decodedUrl, {
                            headers,
                            method: event.request.method,
                            body: (event.request.method === 'GET' || event.request.method === 'HEAD') ? null : await event.request.clone().arrayBuffer(),
                            redirect: 'follow'
                        });
                        return response;
                    } catch (e) {
                        console.warn(`Root SW: Optimized fetch failed for ${key}, falling back to UV:`, e);
                    }
                }

                // If specialized instance exists and prefix matches, use it
                // Pass a new object that looks like a FetchEvent to ensure compatibility
                const requestToFetch = url.startsWith(location.origin) ? event.request : new Request(new URL(url, location.origin).href, event.request);
                return await instance.fetch({ request: requestToFetch });
            } catch (err) {
                console.error(`Root SW: Instance fetch error for ${url}:`, err);
            }
        }
    }

    // Fallback routing for encoded URLs or media domains missing prefixes
    if (autoProxyDomains.some(domain => url.includes(domain)) || isEncoded) {
        let targetInstance = instances.vora;
        let targetConfig = configs.vora;

        // Force TMDB to use vora instance as it's the most stable for assets
        let decodedForCheck = "";
        if (isEncoded) {
            try {
                const encodedPart = url.split('hvtrs8')[1];
                if (encodedPart) decodedForCheck = Ultraviolet.codec.xor.decode('hvtrs8' + encodedPart);
            } catch (e) {}
        }

        if (url.includes('themoviedb.org') || url.includes('tmdb.org') || decodedForCheck.includes('tmdb.org')) {
            targetInstance = instances.vora;
            targetConfig = configs.vora;
        } else {
            const referrer = event.request.referrer || "";
            if (referrer.includes('/VORA_PLUS/') || referrer.includes('/logged-in/vora-plus.html')) {
                targetInstance = instances.vora_plus;
                targetConfig = configs.vora_plus;
            } else if (referrer.includes('/VERN/') || referrer.includes('/logged-in/valo')) {
                targetInstance = instances.valo;
                targetConfig = configs.valo;
            }
        }

        try {
            if (isEncoded && !url.includes(targetConfig.prefix)) {
                const encodedPart = url.split('hvtrs8')[1];
                const fullProxyUrl = location.origin + targetConfig.prefix + 'hvtrs8' + encodedPart;
                return await targetInstance.fetch({ request: new Request(fullProxyUrl, event.request) });
            } else if (!url.includes(targetConfig.prefix)) {
                const encoded = Ultraviolet.codec.xor.encode(url);
                const fullProxyUrl = location.origin + targetConfig.prefix + encoded;
                return await targetInstance.fetch({ request: new Request(fullProxyUrl, event.request) });
            } else {
                return await targetInstance.fetch(event);
            }
        } catch (err) {
            console.error(`Root SW: Fallback fetch error for ${url}:`, err);
            return new Response(null, { status: 500, statusText: 'Fallback Fetch Error' });
        }
    }
    
    try {
        return await fetch(event.request);
    } catch (err) {
        return new Response(null, { status: 404, statusText: 'Not Found' });
    }
}

self.addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

// Made with ❤️ from 4SP
