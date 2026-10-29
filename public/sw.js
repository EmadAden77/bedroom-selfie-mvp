
const CACHE_NAME = 'bedroom-selfie-builder-ai-photo-audit-v3'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/src/styles/global.css'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL).catch(err => {
        console.log('Cache addAll partial fail', err)
        return Promise.all(APP_SHELL.map(url => cache.add(url).catch(()=>{})))
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  // Navigations load the newest app shell when online instead of pinning an old
  // cached screen that lacks the new audit feature. Offline fallback remains.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone)).catch(()=>{})
      }
      return response
    }).catch(()=>caches.match('/index.html')))
    return
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html')
        }
      })
    })
  )
})
