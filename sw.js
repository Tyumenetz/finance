/* «Мои финансы» — работа без интернета (задание 17).
   Работает только когда приложение открыто по ссылке (http/https), по file:// не включается.
   Данные пользователя лежат в localStorage — сюда они не попадают: service worker
   к localStorage доступа не имеет и трогает только свой кэш файлов программы. */
"use strict";

// Номер версии. Меняйте при каждой новой выкладке: кэш пересоберётся целиком.
const VERSION = "1.3.0";
const PREFIX = "finance-app-files-";
const CACHE = PREFIX + VERSION;

// Все файлы программы — только здесь. Новый файл (например js/core.js) добавляйте в этот список.
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

// Новая версия включилась — удаляем только старые кэши этого приложения.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Сначала отдаём сохранённую копию (быстро и без интернета), а в фоне берём свежую с сайта:
// так новая версия файла видна со следующего открытия, даже если номер версии забыли поменять.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === "navigate";
  const key = isPage ? "./index.html" : request;

  event.respondWith(caches.open(CACHE).then((cache) =>
    cache.match(key, { ignoreSearch: isPage }).then((cached) => {
      const fresh = fetch(request, { cache: "no-cache" })
        .then((response) => {
          if (response.ok && response.type === "basic") {
            return cache.put(key, response.clone()).then(() => response);
          }
          return response;
        });
      if (cached) {
        event.waitUntil(fresh.catch(() => {}));
        return cached;
      }
      return fresh;
    })
  ));
});
