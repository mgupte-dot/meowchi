// Meowchi offline cache. tools/build.py fills in the version and file list; don't edit those by hand.
const VERSION = "meowchi-__VERSION__";
const SHELL = "__SHELL__";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(["./"].concat(SHELL))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "meowchi-fonts").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // fonts: serve the saved copy, refresh it in the background
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open("meowchi-fonts").then((c) =>
        c.match(req).then((hit) => {
          const fresh = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || fresh;
        })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // settings file: always try the network first so an edited address takes effect straight away
  if (url.pathname.endsWith("/config.js")) {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res.clone(); })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // the app itself: saved copy first, so it opens with no signal
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()));
    })
  );
});
