import { lazy } from 'react';

const retryWindowMs = 30_000;

export const isLazyImportError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  return [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'chunkloaderror',
  ].some((pattern) => message.includes(pattern));
};

export const lazyWithRetry = (importer, moduleId) => lazy(async () => {
  const marker = `souvenir:chunk-retry:${moduleId}`;

  try {
    const loadedModule = await importer();
    globalThis.sessionStorage?.removeItem(marker);
    return loadedModule;
  } catch (error) {
    if (!isLazyImportError(error) || typeof window === 'undefined') throw error;

    let lastRetry;
    try {
      lastRetry = Number(window.sessionStorage.getItem(marker) || 0);
    } catch {
      throw error;
    }

    if (!lastRetry || Date.now() - lastRetry > retryWindowMs) {
      window.sessionStorage.setItem(marker, String(Date.now()));
      window.location.reload();
      return new Promise(() => {});
    }

    throw error;
  }
});
