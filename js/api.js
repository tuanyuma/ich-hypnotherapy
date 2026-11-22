/**
 * api.js — Klien REST API GAS-PRO-API + GAS Scale Turbo + GAS Instant UX PRO:
 * - CORS-safe POST (Content-Type: text/plain;charset=utf-8, redirect: follow)
 * - SWR Cache di localStorage (0ms pindah menu!) dengan Freshness TTL & namespace per user
 * - Deduplikasi in-flight request + _writeEpoch + Auto-Batcher (setTimeout 0)
 * - Idempotensi reqId pada setiap aksi tulis + AbortController timeout + Retry mobile-resilient
 * - Telemetri Perf (total ms / server ms / jaringan ms)
 */
(function (global) {
  'use strict';

  const STORAGE_PREFIX = 'ich:v1:';
  const TOKEN_KEY = STORAGE_PREFIX + 'token';
  const USER_KEY = STORAGE_PREFIX + 'user';
  const TTL_DEFAULT_MS = 60000;

  let _writeEpoch = 0;
  const _inflight = {};
  const _memCache = {};
  let _batchQueue = [];
  let _batchTimer = null;

  const Perf = {
    last: { action: '-', total: 0, server: 0, net: 0 },
    record: function (action, total, server) {
      this.last = {
        action: action,
        total: Math.round(total),
        server: Math.round(server || 0),
        net: Math.max(0, Math.round(total - (server || 0)))
      };
      const el = document.getElementById('perfText');
      if (el) el.textContent = '100% Live · ' + this.last.server + 'ms';
    }
  };

  function getGasUrl() {
    const cfg = global.APP_CONFIG || {};
    return String(cfg.GAS_URL || '').trim();
  }

  function isConfigured() {
    const u = getGasUrl();
    return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u);
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function getSavedUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveSession(token, user) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {}
  }

  function clearSession() {
    try {
      const u = getSavedUser();
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (u && u.username) {
        const pfx = STORAGE_PREFIX + 'u:' + u.username + ':';
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(pfx) === 0) localStorage.removeItem(k);
        });
      }
    } catch (e) {}
    Object.keys(_memCache).forEach(function (k) { delete _memCache[k]; });
  }

  function userScopeKey(key) {
    const u = getSavedUser();
    const uname = (u && u.username) ? u.username : 'anon';
    return STORAGE_PREFIX + 'u:' + uname + ':' + key;
  }

  const Store = {
    get: function (key) {
      const full = userScopeKey(key);
      if (_memCache[full]) return _memCache[full];
      try {
        const raw = localStorage.getItem(full);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        _memCache[full] = parsed;
        return parsed;
      } catch (e) { return null; }
    },
    set: function (key, data) {
      const full = userScopeKey(key);
      const entry = { data: data, ts: Date.now(), hash: quickHash(data) };
      _memCache[full] = entry;
      try { localStorage.setItem(full, JSON.stringify(entry)); } catch (e) {}
      return entry;
    },
    isFresh: function (entry, ttlMs) {
      if (!entry || !entry.ts) return false;
      return (Date.now() - entry.ts) < (ttlMs || TTL_DEFAULT_MS);
    },
    invalidateAll: function () {
      _writeEpoch++;
      Object.keys(_memCache).forEach(function (k) {
        if (_memCache[k]) _memCache[k].ts = 0;
      });
      try {
        const u = getSavedUser();
        const pfx = STORAGE_PREFIX + 'u:' + ((u && u.username) || 'anon') + ':';
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(pfx) === 0) {
            try {
              const o = JSON.parse(localStorage.getItem(k));
              if (o) { o.ts = 0; localStorage.setItem(k, JSON.stringify(o)); }
            } catch (e2) {}
          }
        });
      } catch (e) {}
    }
  };

  function quickHash(obj) {
    const s = JSON.stringify(obj || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  function genReqId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  function isReadAction(action) {
    return /^(ping|boot\.|batch$|dashboard\.|reports\.|audit\.list|.*\.list$|.*\.get|.*\.search|.*\.context|auth\.me|settings\.get|migrasi\.scan)/i.test(action);
  }

  async function rawFetch(payload, timeoutMs) {
    const url = getGasUrl();
    if (!isConfigured()) {
      throw new Error('URL Backend GAS belum dikonfigurasi pada berkas js/config.js.');
    }
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 25000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // WAJIB anti-CORS preflight GAS
        redirect: 'follow',
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      let json;
      try { json = JSON.parse(text); } catch (e) {
        throw new Error('Server membalas tidak valid. Pastikan akses Web App GAS diatur "Siapa saja".');
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  async function callWithRetry(action, data, opts) {
    opts = opts || {};
    const read = isReadAction(action);
    const reqId = read ? '' : (opts.reqId || genReqId());
    const timeoutMs = opts.timeoutMs || (read ? 25000 : 90000);
    const maxRetry = opts.noRetry ? 1 : (read ? 3 : 2);
    const t0 = performance.now();

    let lastErr;
    for (let attempt = 1; attempt <= maxRetry; attempt++) {
      try {
        const res = await rawFetch({
          action: action,
          token: opts.skipToken ? '' : getToken(),
          reqId: reqId,
          data: data || {}
        }, timeoutMs);

        Perf.record(action, performance.now() - t0, res.ms || 0);

        if (res.code === 'UNAUTHORIZED' && action !== 'auth.login') {
          clearSession();
          if (global.App && global.App.onUnauthorized) global.App.onUnauthorized(res.message);
          throw new Error(res.message || 'Sesi berakhir.');
        }

        // Kick background drain queue bila transaksi barusan mengantrekan notifikasi WA/Email
        if (res.nq && res.nq > 0 && action !== 'wa.drainQueue') {
          setTimeout(function () {
            rawFetch({ action: 'wa.drainQueue', token: getToken(), data: {} }, 25000).catch(function () {});
          }, 300);
        }

        if (!res.success) {
          const err = new Error(res.message || 'Permintaan gagal.');
          err.code = res.code;
          throw err;
        }
        return res;
      } catch (err) {
        lastErr = err;
        const retryable = err.name === 'AbortError' || /Failed to fetch|NetworkError|HTTP 5\d\d|HTTP 429/i.test(err.message);
        if (!retryable || attempt >= maxRetry) throw err;
        await new Promise(function (r) { setTimeout(r, 600 * attempt); });
      }
    }
    throw lastErr;
  }

  /* Auto-Batcher untuk read bersamaan dalam 1 tick event-loop */
  function enqueueBatchRead(action, data) {
    return new Promise(function (resolve, reject) {
      _batchQueue.push({ action: action, data: data || {}, resolve: resolve, reject: reject });
      if (!_batchTimer) {
        _batchTimer = setTimeout(flushBatchReads, 0);
      }
    });
  }

  async function flushBatchReads() {
    const batch = _batchQueue.slice();
    _batchQueue = [];
    _batchTimer = null;
    if (!batch.length) return;
    if (batch.length === 1) {
      const item = batch[0];
      callWithRetry(item.action, item.data).then(item.resolve, item.reject);
      return;
    }
    // Pecah maksimal 8 call per request batch
    for (let i = 0; i < batch.length; i += 8) {
      const chunk = batch.slice(i, i + 8);
      try {
        const res = await callWithRetry('batch', {
          calls: chunk.map(function (c) { return { action: c.action, data: c.data }; })
        });
        const results = (res.data && res.data.results) || [];
        chunk.forEach(function (c, idx) {
          const r = results[idx];
          if (r && r.success) c.resolve(r);
          else c.reject(new Error((r && r.message) || 'Gagal memuat ' + c.action));
        });
      } catch (err) {
        chunk.forEach(function (c) { c.reject(err); });
      }
    }
  }

  /**
   * Panggil API utama dengan deduplikasi in-flight + invalidasi otomatis pasca tulis.
   */
  async function call(action, data, opts) {
    opts = opts || {};
    const read = isReadAction(action);
    if (!read) {
      const res = await callWithRetry(action, data, opts);
      Store.invalidateAll();
      return res.data;
    }

    const dedupKey = _writeEpoch + '|' + action + '|' + JSON.stringify(data || {});
    if (_inflight[dedupKey]) {
      const r = await _inflight[dedupKey];
      return r.data;
    }

    const p = opts.useBatch && action !== 'batch' && action !== 'boot.init'
      ? enqueueBatchRead(action, data)
      : callWithRetry(action, data, opts);

    _inflight[dedupKey] = p;
    p.then(function () { delete _inflight[dedupKey]; }, function () { delete _inflight[dedupKey]; });
    const res = await p;
    return res.data;
  }

  /**
   * SWR (Stale-While-Revalidate):
   * - Langsung jalankan onData(cachedData, true) dalam 0ms jika cache tersedia!
   * - Revalidasi diam-diam di latar belakang jika TTL basi atau force=true,
   *   dan hanya panggil onData lagi jika hash data berubah!
   */
  async function swr(cacheKey, action, params, onData, opts) {
    opts = opts || {};
    const cached = Store.get(cacheKey);
    if (cached && cached.data && !opts.skipCache) {
      onData(cached.data, true);
      if (!opts.force && Store.isFresh(cached, opts.ttlMs || TTL_DEFAULT_MS)) {
        return cached.data;
      }
    }
    try {
      const fresh = await call(action, params, { useBatch: opts.useBatch });
      const prevHash = cached ? cached.hash : null;
      const saved = Store.set(cacheKey, fresh);
      if (!cached || saved.hash !== prevHash || opts.alwaysRender) {
        onData(fresh, false);
      }
      return fresh;
    } catch (err) {
      if (!cached && opts.onError) opts.onError(err);
      throw err;
    }
  }

  global.API = {
    isConfigured: isConfigured,
    getGasUrl: getGasUrl,
    getToken: getToken,
    getSavedUser: getSavedUser,
    saveSession: saveSession,
    clearSession: clearSession,
    Store: Store,
    Perf: Perf,
    call: call,
    swr: swr
  };
})(window);
