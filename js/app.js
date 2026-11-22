/**
 * app.js — SPA Hash Router 0ms, Bootstrap Orchestrator, RBAC Sidebar & Mobile Nav, Global Quick Search, & Adaptive Visibility Polling.
 */
(function (global) {
  'use strict';

  const MENU_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'clients', label: 'Data Klien (CLICH)', icon: 'users' },
    { key: 'assessments', label: 'Assessment Awal', icon: 'clipboard' },
    { key: 'appointments', label: 'Jadwal Sesi', icon: 'calendar', badgeKey: 'appointments' },
    { key: 'rme', label: 'Rekam Medis (RME)', icon: 'fileMed' },
    { key: 'packages', label: 'Paket & Invoice', icon: 'creditCard' },
    { key: 'commissions', label: 'Komisi Terapis', icon: 'percent' },
    { key: 'documents', label: 'Dokumen & IC', icon: 'shield', badgeKey: 'pendingDocs' },
    { key: 'whatsapp', label: 'Follow-up WA & CRM', icon: 'message', badgeKey: 'followups' },
    { key: 'reports', label: 'Laporan & Mktg', icon: 'barChart' },
    { key: 'settings', label: 'Pengaturan & Audit', icon: 'settings', anyPerm: ['settings', 'therapists', 'audit'] }
  ];

  const App = {
    state: {
      user: null,
      settings: {},
      therapists: [],
      packagesMaster: [],
      clientsMini: [],
      dashboard: null,
      badges: {}
    },
    currentRoute: '',
    routeParams: {},
    _pollTimer: null,
    _lastActivity: Date.now(),

    hasPerm: function (key) {
      const u = this.state.user;
      if (!u) return false;
      if (u.role === 'Owner') return true;
      return (u.permissions || []).indexOf(key) > -1;
    },

    go: function (path, params) {
      this.routeParams = params || {};
      const targetHash = '#/' + String(path || 'dashboard').replace(/^#?\/?/, '');
      if (window.location.hash === targetHash) this.renderRoute();
      else window.location.hash = targetHash;
      this.closeMobileDrawer();
    },

    init: function () {
      this.bindStaticEvents();
      this.setupConnectivityListeners();
      this.setupAdaptivePolling();

      if (!API.isConfigured()) {
        document.getElementById('configWarning').hidden = false;
      }

      const token = API.getToken();
      const savedUser = API.getSavedUser();
      if (token && savedUser) {
        this.state.user = savedUser;
        this.showShell();
        this.hydrateFromCacheThenBoot();
      } else {
        this.showLogin();
      }
    },

    bindStaticEvents: function () {
      const self = this;
      document.getElementById('globalSearchIcon').innerHTML = UI.icon('search', 16);
      document.getElementById('globalRefreshBtn').innerHTML = UI.icon('refresh', 17);
      document.getElementById('logoutBtn').innerHTML = UI.icon('logout', 16);
      document.getElementById('openSidebarBtn').innerHTML = UI.icon('menu', 18);
      document.getElementById('closeSidebarBtn').innerHTML = UI.icon('close', 18);
      document.getElementById('toggleLoginPass').innerHTML = UI.icon('eye', 17);

      document.getElementById('toggleLoginPass').onclick = function () {
        const inp = document.getElementById('loginPass');
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        this.innerHTML = UI.icon(show ? 'eyeOff' : 'eye', 17);
      };

      document.getElementById('loginForm').onsubmit = function (e) {
        e.preventDefault();
        self.handleLogin();
      };

      document.getElementById('logoutBtn').onclick = function () {
        API.call('auth.logout', {}).catch(function () {});
        API.clearSession();
        self.state.user = null;
        self.showLogin();
        UI.toast('Anda telah keluar dari sesi.', 'info');
      };

      document.getElementById('openSidebarBtn').onclick = function () {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarBackdrop').hidden = false;
      };
      document.getElementById('closeSidebarBtn').onclick = function () { self.closeMobileDrawer(); };
      document.getElementById('sidebarBackdrop').onclick = function () { self.closeMobileDrawer(); };

      document.getElementById('topPrimaryCta').onclick = function () {
        if (self.hasPerm('appointments')) Pages.openAppointmentModal();
        else if (self.hasPerm('clients')) Pages.openClientModal();
      };

      document.getElementById('globalRefreshBtn').onclick = function () {
        API.Store.invalidateAll();
        self.refreshBootstrap(true);
        self.renderRoute();
        UI.toast('Menyinkronkan data aktual terbaru...', 'info');
      };

      // Global Quick Search (0ms cari dari clientsMini!)
      const gsInp = document.getElementById('globalSearchInput');
      const gsDrop = document.getElementById('globalSearchResults');
      gsInp.addEventListener('input', function () {
        const q = gsInp.value.trim().toLowerCase();
        if (q.length < 2) { gsDrop.hidden = true; return; }
        const hits = (self.state.clientsMini || []).filter(function (c) {
          return String(c.Client_ID).toLowerCase().indexOf(q) > -1 ||
            String(c.Full_Name).toLowerCase().indexOf(q) > -1 ||
            String(c.Phone_WA || '').toLowerCase().indexOf(q) > -1;
        }).slice(0, 10);
        if (!hits.length) {
          gsDrop.innerHTML = '<div class="ac-item"><span class="muted text-sm">Klien tidak ditemukan. Tekan Enter untuk cari invoice...</span></div>';
        } else {
          gsDrop.innerHTML = hits.map(function (c) {
            return '<div class="ac-item" data-go-cl="' + UI.esc(c.Client_ID) + '">' +
              '<div><div class="ac-item-title">' + UI.esc(c.Full_Name) + '</div><div class="ac-item-sub mono">' + UI.esc(c.Client_ID + ' · ' + (c.Phone_WA || '-')) + '</div></div>' +
              UI.statusBadge(c.Informed_Consent_Status || 'Belum Ada') + '</div>';
          }).join('');
          gsDrop.querySelectorAll('[data-go-cl]').forEach(function (row) {
            row.onclick = function () {
              gsDrop.hidden = true; gsInp.value = '';
              self.go('clients/' + row.getAttribute('data-go-cl'));
            };
          });
        }
        gsDrop.hidden = false;
      });
      gsInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && /^INV-/i.test(gsInp.value.trim())) {
          gsDrop.hidden = true;
          self.go('invoice/' + gsInp.value.trim().toUpperCase());
        }
      });
      document.addEventListener('click', function (e) {
        if (!e.target.closest('.global-search-wrap')) gsDrop.hidden = true;
      });

      window.addEventListener('hashchange', function () { self.renderRoute(); });
      ['click', 'keydown', 'scroll'].forEach(function (ev) {
        window.addEventListener(ev, function () { self._lastActivity = Date.now(); }, { passive: true });
      });
    },

    closeMobileDrawer: function () {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarBackdrop').hidden = true;
    },

    setupConnectivityListeners: function () {
      const bar = document.getElementById('offlineBar');
      const sync = function () { bar.hidden = navigator.onLine !== false; };
      window.addEventListener('online', sync);
      window.addEventListener('offline', sync);
      sync();
    },

    /* Polling adaptif (GAS Scale Turbo): berhenti saat tab disembunyikan, melambat saat diam */
    setupAdaptivePolling: function () {
      const self = this;
      const tick = function () {
        const idleMs = Date.now() - self._lastActivity;
        const interval = idleMs > 60000 ? 90000 : 35000;
        if (self.state.user && document.visibilityState === 'visible' && navigator.onLine !== false && self.currentRoute === 'dashboard') {
          self.refreshBootstrap(false);
        }
        self._pollTimer = setTimeout(tick, interval);
      };
      self._pollTimer = setTimeout(tick, 45000);
    },

    showLogin: function () {
      document.getElementById('appShell').hidden = true;
      document.getElementById('loginScreen').hidden = false;
    },

    showShell: function () {
      document.getElementById('loginScreen').hidden = true;
      document.getElementById('appShell').hidden = false;
      this.renderUserProfile();
      this.renderNavigation();
    },

    onUnauthorized: function (msg) {
      this.state.user = null;
      this.showLogin();
      UI.toast(msg || 'Sesi berakhir. Silakan login kembali.', 'warn');
    },

    handleLogin: async function () {
      const user = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value;
      const errEl = document.getElementById('loginError');
      const btn = document.getElementById('loginSubmitBtn');
      const btnTxt = document.getElementById('loginBtnText');
      errEl.hidden = true;
      btn.disabled = true; btnTxt.textContent = 'Memverifikasi Sesi...';

      try {
        const res = await API.call('auth.login', { username: user, password: pass }, { skipToken: true, noRetry: true });
        API.saveSession(res.token, res.user);
        this.applyBootstrap(res.bootstrap || { user: res.user });
        this.showShell();
        document.getElementById('loginPass').value = '';
        UI.toast('Selamat datang, ' + res.user.name + '!', 'ok');
        this.go('dashboard');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.hidden = false;
      } finally {
        btn.disabled = false; btnTxt.textContent = 'Masuk ke Sistem (Sign In)';
      }
    },

    applyBootstrap: function (boot) {
      if (!boot) return;
      if (boot.user) {
        this.state.user = boot.user;
        API.saveSession(null, boot.user);
      }
      if (boot.settings) this.state.settings = boot.settings;
      if (boot.therapists) this.state.therapists = boot.therapists;
      if (boot.packagesMaster) this.state.packagesMaster = boot.packagesMaster;
      if (boot.clientsMini) this.state.clientsMini = boot.clientsMini;
      if (boot.dashboard) {
        this.state.dashboard = boot.dashboard;
        this.updateBadges(boot.dashboard.badges);
      }
      API.Store.set('boot_init', boot);
      const syncEl = document.getElementById('lastSyncInfo');
      if (syncEl) syncEl.textContent = 'Sinkron terakhir: ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    },

    hydrateFromCacheThenBoot: function () {
      const cached = API.Store.get('boot_init');
      if (cached && cached.data) {
        this.applyBootstrap(cached.data);
        this.renderNavigation();
      }
      this.renderRoute();
      this.refreshBootstrap(false);
    },

    refreshBootstrap: async function (force) {
      try {
        const boot = await API.swr('boot_init', 'boot.init', { period: 'month' }, function (data) {
          App.applyBootstrap(data);
          App.renderUserProfile();
          App.renderNavigation();
        }, { force: !!force, ttlMs: 50000 });
        return boot;
      } catch (e) {
        return null;
      }
    },

    renderUserProfile: function () {
      const u = this.state.user || {};
      const initials = String(u.name || 'ST').split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase() || 'ST';
      document.getElementById('userAvatar').textContent = initials;
      document.getElementById('userFullName').textContent = u.name || '-';
      document.getElementById('userRoleLabel').textContent = u.role || '-';
    },

    updateBadges: function (badges) {
      if (!badges) return;
      this.state.badges = badges;
      this.renderNavigation();
    },

    renderNavigation: function () {
      const self = this;
      const nav = document.getElementById('sidebarNav');
      const mob = document.getElementById('mobileBottomNav');
      const visible = MENU_ITEMS.filter(function (m) {
        if (m.anyPerm) return m.anyPerm.some(function (k) { return self.hasPerm(k); });
        return self.hasPerm(m.key);
      });

      nav.innerHTML = visible.map(function (m) {
        const active = self.currentRoute === m.key || (m.key === 'clients' && self.currentRoute === 'client360') || (m.key === 'packages' && self.currentRoute === 'invoice');
        const cnt = m.badgeKey && self.state.badges ? Number(self.state.badges[m.badgeKey] || 0) : 0;
        return '<button type="button" class="nav-item' + (active ? ' active' : '') + '" data-nav="' + m.key + '">' +
          '<span class="nav-item-left">' + UI.icon(m.icon, 17) + '<span>' + m.label + '</span></span>' +
          (cnt > 0 ? '<span class="nav-badge">' + cnt + '</span>' : '') +
          '</button>';
      }).join('');

      nav.querySelectorAll('[data-nav]').forEach(function (b) {
        b.onclick = function () { self.go(b.getAttribute('data-nav')); };
      });

      // Mobile Bottom Nav (4 tab inti — khusus ramah ponsel terapis W-03)
      const isTherapist = self.state.user && self.state.user.role === 'Terapis';
      const mobKeys = isTherapist ? ['dashboard', 'appointments', 'rme', 'commissions'] : ['dashboard', 'clients', 'appointments', 'packages'];
      const mobItems = mobKeys.map(function (k) { return visible.find(function (v) { return v.key === k; }); }).filter(Boolean);
      mob.innerHTML = mobItems.map(function (m) {
        const active = self.currentRoute === m.key;
        return '<button type="button" class="mob-tab' + (active ? ' active' : '') + '" data-mnav="' + m.key + '">' +
          UI.icon(m.icon, 18) + '<span>' + m.label.split(' ')[0] + '</span></button>';
      }).join('');
      mob.querySelectorAll('[data-mnav]').forEach(function (b) {
        b.onclick = function () { self.go(b.getAttribute('data-mnav')); };
      });
    },

    renderRoute: function () {
      if (!this.state.user) return;
      const raw = (window.location.hash || '#/dashboard').replace(/^#\/?/, '');
      const parts = raw.split('/').filter(Boolean);
      const container = document.getElementById('pageContainer');
      const params = Object.assign({}, this.routeParams);
      this.routeParams = {};

      let route = parts[0] || 'dashboard';
      if (route === 'clients' && parts[1]) {
        route = 'client360';
        params.clientId = decodeURIComponent(parts[1]);
      } else if (route === 'invoice' && parts[1]) {
        route = 'invoice';
        params.invoiceId = decodeURIComponent(parts[1]);
      } else if (route === 'darurat') {
        route = 'dashboard';
      }

      this.currentRoute = route;
      this.renderNavigation();

      if (typeof Pages[route] === 'function') {
        Pages[route](container, params);
      } else {
        this.currentRoute = 'dashboard';
        Pages.dashboard(container, params);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  global.App = App;
  document.addEventListener('DOMContentLoaded', function () { App.init(); });
})(window);
