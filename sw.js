// 4つ並べゲーム Service Worker
// 方針: 自分のファイルは「ネット優先・オフライン時はキャッシュ」。
//       オンラインで開くたびに最新版を取りに行くので、HTMLを直してpushするだけで自動更新される。
//       Webフォント(Google Fonts)は「キャッシュ優先・裏で更新」で、オフラインでも同じ見た目にする。
// ASSETS にファイルを足したら CACHE の v番号を上げること。
const CACHE = 'yotsunarabe-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Webフォント: キャッシュ優先、裏でこっそり更新
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(e.request).then((hit) => {
          const net = fetch(e.request)
            .then((res) => { if (res.ok || res.type === 'opaque') c.put(e.request, res.clone()); return res; })
            .catch(() => null);
          return hit || net.then((res) => res || Response.error());
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 自分のファイル: ネット優先、失敗したらキャッシュ、それも無ければトップページ
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))
      )
  );
});
