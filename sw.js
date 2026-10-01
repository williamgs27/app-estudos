// Service Worker - App de Estudos
// Ao alterar qualquer arquivo do app, aumente a versão para forçar a atualização do cache.
const VERSION = 'v1';
const CACHE_NAME = `estudos-${VERSION}`;

// Ajuste esta lista conforme os arquivos reais do seu projeto
const APP_SHELL = [
  './',
  './index.html',
  './caderno.html',
  './materiais.html',
  './plano.html',
  './progresso.html',
  './base.css',
  '/componentes.css',
  './auth.js',
  './caderno.js',
  './gerador.js',
  './script.js',
  './materiais.js',
  './plano.js',
  './progresso.js',
  './supabase.js',
  './tema.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

// Instalação: guarda o app shell em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Ativação: remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só trata GET
  if (request.method !== 'GET') return;

  // Nunca cacheia o Supabase (dados e autenticação sempre vão para a rede)
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // Navegação (páginas): rede primeiro, cache como reserva offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos (CSS, JS, imagens, fontes, CDN): cache primeiro, atualiza em segundo plano
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});