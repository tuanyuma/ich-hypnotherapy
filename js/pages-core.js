/**
 * pages-core.js — W-02 Main Dashboard (Desktop), W-03 Therapist Mobile View, W-04 Master Clients (CLICH00001), & W-05 Client 360° Profile.
 */
(function (global) {
  'use strict';

  const Pages = global.Pages || (global.Pages = {});
  const _dashCharts = {};

  function destroyChart(id) {
    if (_dashCharts[id]) {
      try { _dashCharts[id].destroy(); } catch (e) {}
      delete _dashCharts[id];
    }
  }

  /* ============================================================
   * W-02 & W-03: MAIN COMMAND DASHBOARD (DESKTOP & MOBILE TERAPIS)
   * ============================================================ */
  const dashState = { period: 'month', startDate: '', endDate: '', apptFilter: 'All', apptSearch: '' };

  Pages.dashboard = function (container) {
    const user = App.state.user || {};
    const isTherapist = user.role === 'Terapis';
    const showFinance = user.role === 'Owner' || user.role === 'Admin';
    const hour = new Date().getHours();
    const greet = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

    container.innerHTML =
      '<div class="neu-card card-pad">' +
        '<div class="row-between" style="margin-bottom:16px">' +
          '<div>' +
            '<h1>' + greet + ', ' + UI.esc(user.name || 'Staf') + '</h1>' +
            '<p class="card-subtitle">' + (isTherapist ? 'Ringkasan jadwal sesi, klien kewenangan, & estimasi komisi Anda.' : 'Monitoring operasional klinik hipnoterapi, arus kas, & efektivitas marketing secara real-time.') + '</p>' +
          '</div>' +
          '<div class="row">' +
            '<div class="pill-tabs" id="dashPeriodTabs">' +
              ['today:Hari Ini', 'week:Minggu Ini', 'month:Bulan Ini', 'year:Tahun Ini', 'custom:Custom'].map(function (p) {
                const sp = p.split(':');
                return '<button type="button" class="pill-tab' + (dashState.period === sp[0] ? ' active' : '') + '" data-period="' + sp[0] + '">' + sp[1] + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="dashCustomDateRow" class="row" style="margin-bottom:14px" ' + (dashState.period === 'custom' ? '' : 'hidden') + '>' +
          '<input type="date" id="dashStart" class="input" style="width:165px" value="' + UI.esc(dashState.startDate || UI.todayStr()) + '" />' +
          '<span class="muted text-sm">s.d.</span>' +
          '<input type="date" id="dashEnd" class="input" style="width:165px" value="' + UI.esc(dashState.endDate || UI.todayStr()) + '" />' +
          '<button type="button" id="dashApplyCustom" class="btn btn-sm btn-primary">Terapkan</button>' +
        '</div>' +
        '<div id="dashKpis" class="kpi-grid-4">' +
          '<div class="skeleton" style="height:106px"></div><div class="skeleton" style="height:106px"></div>' +
          '<div class="skeleton" style="height:106px"></div><div class="skeleton" style="height:106px"></div>' +
        '</div>' +
      '</div>' +
      '<div class="dashboard-grid">' +
        '<div class="stack-md">' +
          '<div class="neu-card card-pad">' +
            '<div class="card-header">' +
              '<div><h2>Jadwal Sesi Terdekat (Maks. 15)</h2><p class="card-subtitle">Antrean sesi terjadwal &amp; konfirmasi kehadiran</p></div>' +
              '<input type="search" id="dashApptSearch" class="input" style="width:210px;height:36px" placeholder="Saring jadwal..." value="' + UI.esc(dashState.apptSearch) + '" />' +
            '</div>' +
            '<div class="pill-tabs" id="dashApptFilterTabs" style="margin-bottom:12px">' +
              ['All:Semua', 'Scheduled:Scheduled', 'Confirmed:Confirmed', 'Completed:Completed', 'Cancelled:Cancelled/No Show'].map(function (s) {
                const sp = s.split(':');
                return '<button type="button" class="pill-tab' + (dashState.apptFilter === sp[0] ? ' active' : '') + '" data-af="' + sp[0] + '">' + sp[1] + '</button>';
              }).join('') +
            '</div>' +
            '<div id="dashApptList">' + UI.skeletonTable(5) + '</div>' +
          '</div>' +
          (showFinance
            ? '<div class="neu-card card-pad">' +
                '<div class="card-header">' +
                  '<div><h2>Monitoring Keuangan &amp; Status</h2><p class="card-subtitle">Pendapatan, lunas, belum lunas, komisi terapis, &amp; pendapatan bersih ICH</p></div>' +
                  '<button type="button" class="btn btn-sm btn-soft" onclick="App.go(\'reports\')">Buka Laporan Lengkap →</button>' +
                '</div>' +
                '<div id="dashFinanceStrip" class="kpi-grid-5" style="margin-bottom:16px"></div>' +
                '<div class="kpi-grid-2">' +
                  '<div class="neu-tile"><h3 style="margin-bottom:8px">Status Progres Klien</h3><div class="chart-box-sm"><canvas id="dashDonutClients"></canvas></div></div>' +
                  '<div class="neu-tile"><h3 style="margin-bottom:8px">Komposisi Pembayaran</h3><div class="chart-box-sm"><canvas id="dashDonutPay"></canvas></div></div>' +
                '</div>' +
              '</div>'
            : '') +
        '</div>' +
        '<div class="stack-md">' +
          '<div class="neu-card card-pad">' +
            '<div class="card-header"><div><h2>Aksi Cepat (Quick Actions)</h2><p class="card-subtitle">Pintasan prosedur harian klinik</p></div></div>' +
            '<div class="stack-sm" id="dashQuickActions"></div>' +
          '</div>' +
          '<div class="neu-card card-pad">' +
            '<div class="card-header"><div><h2>Tren Sesi &amp; Klien</h2><p class="card-subtitle">Data aktual sesuai filter periode</p></div></div>' +
            '<div class="chart-box-sm"><canvas id="dashTrendChart"></canvas></div>' +
          '</div>' +
          '<div class="neu-card card-pad">' +
            '<div class="card-header">' +
              '<div><h2>Efektivitas Sumber Klien</h2><p class="card-subtitle">Distribusi saluran pemasaran</p></div>' +
              (showFinance ? '<button type="button" class="btn btn-xs btn-ghost" onclick="App.go(\'reports\')">Detail →</button>' : '') +
            '</div>' +
            '<div id="dashSourceBars" class="stack-sm"></div>' +
          '</div>' +
          '<div class="neu-card card-pad">' +
            '<div class="card-header">' +
              '<div><h2>Antrean Follow-up Hari Ini</h2><p class="card-subtitle">H+1, H+3, &amp; H+7 pascasesi</p></div>' +
              '<button type="button" class="btn btn-xs btn-soft" onclick="App.go(\'whatsapp\')">Kelola WA</button>' +
            '</div>' +
            '<div id="dashFollowups" class="stack-sm"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    renderQuickActions(user);

    document.getElementById('dashPeriodTabs').querySelectorAll('[data-period]').forEach(function (btn) {
      btn.onclick = function () {
        dashState.period = btn.getAttribute('data-period');
        document.getElementById('dashPeriodTabs').querySelectorAll('.pill-tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        document.getElementById('dashCustomDateRow').hidden = dashState.period !== 'custom';
        if (dashState.period !== 'custom') loadDashboardData(true);
      };
    });
    document.getElementById('dashApplyCustom').onclick = function () {
      dashState.startDate = document.getElementById('dashStart').value;
      dashState.endDate = document.getElementById('dashEnd').value;
      loadDashboardData(true);
    };
    document.getElementById('dashApptFilterTabs').querySelectorAll('[data-af]').forEach(function (btn) {
      btn.onclick = function () {
        dashState.apptFilter = btn.getAttribute('data-af');
        document.getElementById('dashApptFilterTabs').querySelectorAll('.pill-tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        if (App.state.dashboard) renderDashAppointments(App.state.dashboard.upcomingAppointments || []);
      };
    });
    document.getElementById('dashApptSearch').oninput = function (e) {
      dashState.apptSearch = e.target.value.trim().toLowerCase();
      if (App.state.dashboard) renderDashAppointments(App.state.dashboard.upcomingAppointments || []);
    };

    // Instan 0ms: jika bootstrap sudah memuat dashboard bulan ini, langsung render!
    if (App.state.dashboard && dashState.period === 'month') {
      renderDashboard(App.state.dashboard);
    }
    loadDashboardData(false);
  };

  function renderQuickActions(user) {
    const qa = document.getElementById('dashQuickActions');
    if (!qa) return;
    const actions = [];
    if (App.hasPerm('clients') && user.role !== 'Terapis') {
      actions.push({ icon: 'users', bg: '#DCEBFF', ink: '#1D4ED8', title: 'Daftar Klien Baru', sub: 'Generate ID CLICH otomatis', fn: function () { Pages.openClientModal(); } });
    }
    if (App.hasPerm('appointments')) {
      actions.push({ icon: 'calendar', bg: '#EDE9FE', ink: '#6D28D9', title: 'Buat Janji Temu', sub: 'Jadwalkan sesi + cek bentrok', fn: function () { Pages.openAppointmentModal(); } });
    }
    if (App.hasPerm('packages')) {
      actions.push({ icon: 'creditCard', bg: '#DCFCE7', ink: '#15803D', title: 'Paket & Catat Pembayaran', sub: 'Invoice INV-YYYYMM otomatis', fn: function () { App.go('packages'); } });
    }
    if (App.hasPerm('rme')) {
      actions.push({ icon: 'fileMed', bg: '#FEF3C7', ink: '#B45309', title: 'Input Sesi RME', sub: 'Catatan klinis + sinkron atomik', fn: function () { App.go('rme'); } });
    }
    if (App.hasPerm('reports')) {
      actions.push({ icon: 'barChart', bg: '#E0F2FE', ink: '#0369A1', title: 'Laporan & Funnel Marketing', sub: 'Grafik interaktif & ekspor', fn: function () { App.go('reports'); } });
    }
    qa.innerHTML = '';
    actions.slice(0, 4).forEach(function (a) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-action-item';
      btn.innerHTML = '<div class="row" style="gap:11px">' +
        '<div class="kpi-icon-box" style="background:' + a.bg + ';color:' + a.ink + '">' + UI.icon(a.icon, 18) + '</div>' +
        '<div><div class="fw-600" style="font-size:13.5px">' + UI.esc(a.title) + '</div><div class="text-xs muted">' + UI.esc(a.sub) + '</div></div>' +
        '</div><span class="muted">' + UI.icon('chevronRight', 16) + '</span>';
      btn.onclick = a.fn;
      qa.appendChild(btn);
    });
  }

  function loadDashboardData(force) {
    const params = { period: dashState.period, startDate: dashState.startDate, endDate: dashState.endDate };
    const ck = 'dash_' + dashState.period + '_' + dashState.startDate + '_' + dashState.endDate;
    API.swr(ck, 'dashboard.get', params, function (data) {
      App.state.dashboard = data;
      App.updateBadges(data.badges);
      if (App.currentRoute === 'dashboard') renderDashboard(data);
    }, { force: force, ttlMs: 45000 }).catch(function (err) {
      UI.toast('Gagal memuat dashboard: ' + err.message, 'err');
    });
  }

  function trendHtml(pct) {
    const n = Number(pct || 0);
    const cls = n >= 0 ? 'trend-up' : 'trend-down';
    return '<div class="kpi-trend ' + cls + '">' + (n >= 0 ? '↑ +' : '↓ ') + n + '% vs periode lalu</div>';
  }

  function renderDashboard(d) {
    const user = App.state.user || {};
    const isTherapist = user.role === 'Terapis';
    const k = d.kpis || {};
    const f = d.financial || {};

    const kpiEl = document.getElementById('dashKpis');
    if (kpiEl) {
      const cards = isTherapist
        ? [
            { label: 'Jadwal Hari Ini', val: k.todaySessions || 0, sub: '<div class="kpi-trend muted">Sesi aktif Anda</div>', bg: '#DCEBFF', ink: '#1D4ED8', ic: 'calendar' },
            { label: 'Klien Kewenangan', val: k.totalClients || 0, sub: trendHtml(k.newClientsTrend), bg: '#EDE9FE', ink: '#6D28D9', ic: 'users' },
            { label: 'Sesi Selesai', val: k.completedSessions || 0, sub: trendHtml(k.completedSessionsTrend), bg: '#DCFCE7', ink: '#15803D', ic: 'check' },
            { label: 'Komisi Saya', val: UI.fmtRp(k.therapistCommissions), sub: trendHtml(k.therapistCommTrend), bg: '#FEF3C7', ink: '#B45309', ic: 'percent' }
          ]
        : [
            { label: 'Klien Baru (Periode)', val: k.newClients || 0, sub: trendHtml(k.newClientsTrend) + ' <span class="text-xs muted">· Total ' + (k.totalClients || 0) + '</span>', bg: '#DCEBFF', ink: '#1D4ED8', ic: 'users' },
            { label: 'Sesi Selesai', val: k.completedSessions || 0, sub: trendHtml(k.completedSessionsTrend), bg: '#DCFCE7', ink: '#15803D', ic: 'check' },
            { label: 'Pendapatan Lunas', val: UI.fmtRp(k.paidRevenue), sub: trendHtml(k.paidRevenueTrend), bg: '#EDE9FE', ink: '#6D28D9', ic: 'creditCard' },
            { label: 'Pendapatan Bersih ICH', val: UI.fmtRp(k.netIchRevenue), sub: '<div class="kpi-trend trend-up">Setelah komisi ' + UI.fmtRp(k.therapistCommissions) + '</div>', bg: '#DCFCE7', ink: '#15803D', ic: 'barChart' }
          ];
      kpiEl.innerHTML = cards.map(function (c) {
        return '<div class="neu-tile">' +
          '<div class="row-between" style="align-items:flex-start">' +
            '<div><div class="kpi-label">' + c.label + '</div><div class="kpi-value">' + c.val + '</div></div>' +
            '<div class="kpi-icon-box" style="background:' + c.bg + ';color:' + c.ink + '">' + UI.icon(c.ic, 18) + '</div>' +
          '</div>' + c.sub + '</div>';
      }).join('');
    }

    renderDashAppointments(d.upcomingAppointments || []);

    const finEl = document.getElementById('dashFinanceStrip');
    if (finEl) {
      finEl.innerHTML = [
        { l: 'Total Omzet', v: UI.fmtRp(f.totalRevenue), c: '' },
        { l: 'Lunas (Paid)', v: UI.fmtRp(f.paidRevenue), c: 'color:var(--mint-ink)' },
        { l: 'Belum Lunas', v: UI.fmtRp(f.unpaidRevenue), c: 'color:var(--amber-ink)' },
        { l: 'Komisi Terapis', v: UI.fmtRp(f.therapistCommissions), c: 'color:var(--primary-ink)' },
        { l: 'Bersih ICH', v: UI.fmtRp(f.netIchRevenue), c: 'color:var(--mint-ink)' }
      ].map(function (x) {
        return '<div class="neu-tile" style="padding:12px"><div class="kpi-label">' + x.l + '</div><div class="tabular fw-700" style="font-size:16px;margin-top:4px;' + x.c + '">' + x.v + '</div></div>';
      }).join('');
    }

    // Marketing source bars
    const srcEl = document.getElementById('dashSourceBars');
    if (srcEl) {
      const srcs = d.marketingSources || [];
      srcEl.innerHTML = srcs.length ? srcs.slice(0, 5).map(function (s) {
        return '<div>' +
          '<div class="row-between text-sm"><span class="fw-600">' + UI.esc(s.source) + '</span><span class="tabular muted">' + s.pct + '% (' + s.count + ')</span></div>' +
          '<div class="progress-track"><div class="progress-fill" style="width:' + s.pct + '%"></div></div>' +
          '</div>';
      }).join('') : '<p class="muted text-sm">Belum ada data sumber klien.</p>';
    }

    // Follow-up queue widget
    const flwEl = document.getElementById('dashFollowups');
    if (flwEl) {
      const flw = d.followupsToday || [];
      flwEl.innerHTML = flw.length ? flw.map(function (x) {
        return '<div class="row-between" style="padding:9px 11px;border-radius:12px;background:var(--surface-white);border:1px solid var(--border-soft)">' +
          '<div><div class="fw-600 text-sm">' + UI.esc(x.Client_Name) + '</div><div class="text-xs muted">' + UI.esc(x.Client_ID) + ' · ' + UI.esc(x.Trigger_Label) + '</div></div>' +
          '<button type="button" class="btn btn-xs btn-mint" onclick="App.go(\'whatsapp\')">Kirim WA</button>' +
          '</div>';
      }).join('') : '<p class="muted text-sm">Tidak ada antrean follow-up pascasesi hari ini.</p>';
    }

    // Render Chart.js secara lazy (tidak memblokir paint awal!)
    UI.loadChartJs().then(function () {
      if (App.currentRoute !== 'dashboard') return;
      renderDashCharts(d);
    }).catch(function () {});
  }

  function renderDashAppointments(list) {
    const el = document.getElementById('dashApptList');
    if (!el) return;
    let items = list.slice();
    if (dashState.apptFilter !== 'All') {
      items = items.filter(function (a) {
        return dashState.apptFilter === 'Cancelled'
          ? (a.Status === 'Cancelled' || a.Status === 'No Show')
          : a.Status === dashState.apptFilter;
      });
    }
    if (dashState.apptSearch) {
      items = items.filter(function (a) {
        return String(a.Client_Name).toLowerCase().indexOf(dashState.apptSearch) > -1 ||
          String(a.Client_ID).toLowerCase().indexOf(dashState.apptSearch) > -1 ||
          String(a.Therapist_Name).toLowerCase().indexOf(dashState.apptSearch) > -1;
      });
    }
    if (!items.length) {
      el.innerHTML = UI.emptyState('Tidak Ada Jadwal Terdekat', 'Belum ada jadwal sesi yang cocok dengan filter ini.',
        '<button type="button" class="btn btn-sm btn-primary" onclick="Pages.openAppointmentModal()">+ Buat Jadwal Baru</button>');
      return;
    }

    const canRme = App.hasPerm('rme');
    el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Tanggal &amp; Jam</th><th>Klien</th><th>Terapis</th><th>Layanan / IC</th><th>Status</th><th>Aksi</th>' +
      '</tr></thead><tbody>' +
      items.map(function (a) {
        const icWarn = a.Client_IC_Status !== 'Valid'
          ? '<span class="badge badge-rose" style="margin-left:4px">IC Belum Valid</span>'
          : '<span class="badge badge-mint" style="margin-left:4px">IC Valid</span>';
        const pkgTag = a.Package_Name ? ('<div class="text-xs muted">' + UI.esc(a.Package_Name) + ' (Sisa ' + a.Package_Remaining + '/' + a.Package_Total + ')</div>') : '';
        return '<tr>' +
          '<td class="tabular"><div class="fw-600">' + UI.fmtDateID(a.Appointment_Date) + '</div><div class="text-xs muted">' + UI.esc(a.Start_Time + ' - ' + a.End_Time) + '</div></td>' +
          '<td><a href="#/clients/' + UI.esc(a.Client_ID) + '" class="fw-600">' + UI.esc(a.Client_Name) + '</a><div class="text-xs mono muted">' + UI.esc(a.Client_ID) + '</div></td>' +
          '<td>' + UI.esc(a.Therapist_Name) + '</td>' +
          '<td><div>' + UI.esc(a.Service_Type) + icWarn + '</div>' + pkgTag + '</td>' +
          '<td>' + UI.statusBadge(a.Status) + '</td>' +
          '<td><div class="row" style="gap:6px">' +
            (canRme ? '<button type="button" class="btn btn-xs btn-primary" onclick="App.go(\'rme\', {appointmentId:\'' + UI.esc(a.Appointment_ID) + '\', clientId:\'' + UI.esc(a.Client_ID) + '\'})">RME</button>' : '') +
            '<button type="button" class="btn btn-xs btn-secondary" onclick="App.go(\'clients/' + UI.esc(a.Client_ID) + '\')">360°</button>' +
          '</div></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function renderDashCharts(d) {
    const trendCanvas = document.getElementById('dashTrendChart');
    if (trendCanvas) {
      destroyChart('trend');
      const series = d.trendSeries || [];
      _dashCharts.trend = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: series.map(function (s) { return s.label; }),
          datasets: [
            { label: 'Sesi Selesai', data: series.map(function (s) { return s.sessions; }), borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.14)', fill: true, tension: 0.35, pointRadius: 3 },
            { label: 'Klien Baru', data: series.map(function (s) { return s.clients; }), borderColor: '#2B7FFF', backgroundColor: 'rgba(43,127,255,0.08)', fill: false, tension: 0.35, pointRadius: 3 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    const dc = document.getElementById('dashDonutClients');
    if (dc) {
      destroyChart('donutC');
      const cs = (d.donuts && d.donuts.clientStatus) || {};
      _dashCharts.donutC = new Chart(dc, {
        type: 'doughnut',
        data: {
          labels: ['Baru Daftar', 'Dalam Proses', 'Selesai', 'Nonaktif'],
          datasets: [{ data: [cs['Baru Daftar'] || 0, cs['Dalam Proses'] || 0, cs['Selesai'] || 0, cs['Nonaktif'] || 0], backgroundColor: ['#2B7FFF', '#F59E0B', '#10B981', '#94A3B8'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } } }
      });
    }

    const dp = document.getElementById('dashDonutPay');
    if (dp) {
      destroyChart('donutP');
      const ps = (d.donuts && d.donuts.paymentStatus) || {};
      _dashCharts.donutP = new Chart(dp, {
        type: 'doughnut',
        data: {
          labels: ['Paid', 'Partial', 'Unpaid', 'Refund'],
          datasets: [{ data: [ps.Paid || 0, ps.Partial || 0, ps.Unpaid || 0, ps.Refund || 0], backgroundColor: ['#10B981', '#F59E0B', '#F43F5E', '#64748B'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } } }
      });
    }
  }

  /* ============================================================
   * W-04: MASTER CLIENTS DIRECTORY (1 KLIEN = 1 CLICH00001)
   * ============================================================ */
  const clientFilter = { query: '', source: '', status: '', icStatus: '', page: 1, pageSize: 20 };

  Pages.clients = function (container) {
    const canEdit = App.state.user && App.state.user.role !== 'Terapis';
    const sources = (App.state.settings && App.state.settings.MARKETING_SOURCES_LIST) || ['Google Search', 'Google Maps', 'TikTok', 'Instagram', 'Referensi', 'Lainnya'];

    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Data Klien Induk (CLICH)</h1><p class="card-subtitle">Aturan 1 Klien = 1 Data Induk berkesinambungan tanpa duplikasi</p></div>' +
        '<div class="row">' +
          '<button type="button" class="btn btn-secondary btn-sm" id="btnExportClientsCsv">' + UI.icon('download', 15) + ' Export CSV</button>' +
          (canEdit ? '<button type="button" class="btn btn-primary btn-pill" id="btnNewClient">' + UI.icon('plus', 15) + ' Daftar Klien Baru</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<input type="search" id="clQuery" class="input search-grow" placeholder="Cari ID CLICH, nama, atau nomor WA..." value="' + UI.esc(clientFilter.query) + '" />' +
        '<select id="clSource" class="select"><option value="">Semua Sumber</option>' + sources.map(function (s) { return '<option value="' + UI.esc(s) + '"' + (clientFilter.source === s ? ' selected' : '') + '>' + UI.esc(s) + '</option>'; }).join('') + '</select>' +
        '<select id="clStatus" class="select"><option value="">Semua Status</option><option value="Baru Daftar">Baru Daftar</option><option value="Dalam Proses">Dalam Proses</option><option value="Selesai">Selesai</option></select>' +
        '<select id="clIc" class="select"><option value="">Semua IC</option><option value="Valid">Valid</option><option value="Pending">Pending</option><option value="Belum Ada">Belum Ada</option></select>' +
      '</div>' +
      '<div id="clientsTableArea">' + UI.skeletonTable(8) + '</div>' +
      '<div id="clientsPagination"></div>' +
      '</div>';

    if (canEdit) document.getElementById('btnNewClient').onclick = function () { Pages.openClientModal(); };
    document.getElementById('btnExportClientsCsv').onclick = function () {
      const items = Pages._lastClients || [];
      UI.exportCsv('data-klien-ich.csv', ['Client_ID', 'Nama', 'WA', 'Sumber', 'Status', 'IC_Status', 'Terakhir_Sesi'],
        items.map(function (c) { return [c.Client_ID, c.Full_Name, c.Phone_WA, c.Marketing_Source, c.Client_Status, c.Informed_Consent_Status, c.Last_Session_Date || '-']; }));
    };

    let t = null;
    document.getElementById('clQuery').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { clientFilter.query = e.target.value; clientFilter.page = 1; loadClients(); }, 250); };
    document.getElementById('clSource').onchange = function (e) { clientFilter.source = e.target.value; clientFilter.page = 1; loadClients(); };
    document.getElementById('clStatus').onchange = function (e) { clientFilter.status = e.target.value; clientFilter.page = 1; loadClients(); };
    document.getElementById('clIc').onchange = function (e) { clientFilter.icStatus = e.target.value; clientFilter.page = 1; loadClients(); };

    loadClients();
  };

  function loadClients(force) {
    const ck = 'clients_' + JSON.stringify(clientFilter);
    API.swr(ck, 'clients.list', clientFilter, function (res) {
      Pages._lastClients = res.items || [];
      const area = document.getElementById('clientsTableArea');
      const pg = document.getElementById('clientsPagination');
      if (!area) return;
      if (!res.items.length) {
        area.innerHTML = UI.emptyState('Belum Ada Data Klien', 'Daftarkan klien pertama untuk mendapatkan ID induk CLICH00001 otomatis.',
          App.state.user.role !== 'Terapis' ? '<button type="button" class="btn btn-primary btn-sm" onclick="Pages.openClientModal()">+ Daftar Klien Baru</button>' : '');
        pg.innerHTML = '';
        return;
      }
      const canEdit = App.state.user.role !== 'Terapis';
      const canArchive = App.state.user.role === 'Owner' || App.state.user.role === 'Admin';
      area.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>ID Klien</th><th>Nama Lengkap &amp; WA</th><th>Sumber Marketing</th><th>Informed Consent</th><th>Terakhir Sesi</th><th>Status</th><th>Aksi</th>' +
        '</tr></thead><tbody>' +
        res.items.map(function (c) {
          return '<tr>' +
            '<td class="mono fw-700"><a href="#/clients/' + UI.esc(c.Client_ID) + '">' + UI.esc(c.Client_ID) + '</a></td>' +
            '<td><div class="fw-600">' + UI.esc(c.Full_Name) + '</div><div class="text-xs muted mono">' + UI.esc(c.Phone_WA) + '</div></td>' +
            '<td><span class="badge badge-blue">' + UI.esc(c.Marketing_Source || 'Lainnya') + '</span></td>' +
            '<td>' + UI.statusBadge(c.Informed_Consent_Status || 'Belum Ada') + '</td>' +
            '<td class="tabular">' + (c.Last_Session_Date ? UI.fmtDateID(c.Last_Session_Date) : '<span class="muted">Belum sesi</span>') + '</td>' +
            '<td>' + UI.statusBadge(c.Client_Status) + '</td>' +
            '<td><div class="row" style="gap:6px">' +
              '<button type="button" class="btn btn-xs btn-soft" onclick="App.go(\'clients/' + UI.esc(c.Client_ID) + '\')">Profil 360°</button>' +
              (canEdit ? '<button type="button" class="btn btn-xs btn-secondary" data-edit-cl="' + UI.esc(c.Client_ID) + '">Edit</button>' : '') +
              (canArchive ? '<button type="button" class="btn btn-xs btn-danger-outline" data-arch-cl="' + UI.esc(c.Client_ID) + '">Arsip</button>' : '') +
            '</div></td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div>';

      area.querySelectorAll('[data-edit-cl]').forEach(function (b) {
        b.onclick = function () {
          const item = res.items.find(function (x) { return x.Client_ID === b.getAttribute('data-edit-cl'); });
          if (item) Pages.openClientModal(item);
        };
      });
      area.querySelectorAll('[data-arch-cl]').forEach(function (b) {
        b.onclick = async function () {
          const id = b.getAttribute('data-arch-cl');
          const reason = prompt('Masukkan alasan pengarsipan (soft delete) klien ' + id + ':');
          if (!reason) return;
          try {
            await API.call('clients.archive', { Client_ID: id, reason: reason });
            UI.toast('Klien berhasil diarsipkan.', 'ok');
            App.refreshBootstrap();
            loadClients(true);
          } catch (e) { UI.toast(e.message, 'err'); }
        };
      });

      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) {
        clientFilter.page = p; clientFilter.pageSize = ps; loadClients();
      }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  Pages.openClientModal = function (existing) {
    const c = existing || {};
    const sources = (App.state.settings && App.state.settings.MARKETING_SOURCES_LIST) || ['Google Search', 'Google Maps', 'TikTok', 'Instagram', 'Referensi', 'Lainnya'];
    const body = UI.openModal(c.Client_ID ? ('Edit Klien ' + c.Client_ID) : 'Daftar Klien Baru (Auto CLICH)',
      '<form id="clientForm" class="stack-md">' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Nama Lengkap *</label><input name="Full_Name" class="input" required value="' + UI.esc(c.Full_Name || '') + '" /></div>' +
          '<div class="field"><label>Nama Panggilan</label><input name="Nickname" class="input" value="' + UI.esc(c.Nickname || '') + '" /></div>' +
          '<div class="field"><label>Nomor WhatsApp *</label><input name="Phone_WA" class="input" placeholder="0812xxxxxxxx" required value="' + UI.esc(c.Phone_WA || '') + '" /></div>' +
          '<div class="field"><label>Email</label><input name="Email" type="email" class="input" value="' + UI.esc(c.Email || '') + '" /></div>' +
          '<div class="field"><label>Jenis Kelamin</label><select name="Gender" class="select"><option value="Perempuan"' + (c.Gender === 'Perempuan' ? ' selected' : '') + '>Perempuan</option><option value="Laki-laki"' + (c.Gender === 'Laki-laki' ? ' selected' : '') + '>Laki-laki</option></select></div>' +
          '<div class="field"><label>Tanggal Lahir</label><input name="Birth_Date" type="date" class="input" value="' + UI.esc((c.Birth_Date || '').slice(0, 10)) + '" /></div>' +
          '<div class="field"><label>Sumber Informasi Marketing *</label><select name="Marketing_Source" class="select">' +
            sources.map(function (s) { return '<option value="' + UI.esc(s) + '"' + (c.Marketing_Source === s ? ' selected' : '') + '>' + UI.esc(s) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>Status Klien</label><select name="Client_Status" class="select">' +
            ['Baru Daftar', 'Dalam Proses', 'Selesai'].map(function (s) { return '<option value="' + s + '"' + ((c.Client_Status || 'Baru Daftar') === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>Pekerjaan</label><input name="Occupation" class="input" value="' + UI.esc(c.Occupation || '') + '" /></div>' +
          '<div class="field"><label>Kontak Darurat</label><input name="Emergency_Contact" class="input" placeholder="Nama & No HP keluarga" value="' + UI.esc(c.Emergency_Contact || '') + '" /></div>' +
        '</div>' +
        '<div class="field"><label>Alamat</label><input name="Address" class="input" value="' + UI.esc(c.Address || '') + '" /></div>' +
        '<div class="field"><label>Catatan Awal</label><textarea name="Notes" class="textarea">' + UI.esc(c.Notes || '') + '</textarea></div>' +
        '<div id="clDupWarn" class="alert alert-amber" hidden></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary" id="btnSaveClient">Simpan Data Klien</button></div>' +
      '</form>', { lg: true });

    const form = body.querySelector('#clientForm');
    form.onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = { Client_ID: c.Client_ID || '' };
      fd.forEach(function (v, k) { payload[k] = v; });
      const btn = form.querySelector('#btnSaveClient');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        const res = await API.call('clients.save', payload);
        UI.toast(res.message || 'Data klien tersimpan!', 'ok');
        UI.closeModal();
        App.refreshBootstrap();
        if (App.currentRoute === 'clients') loadClients(true);
        else if (App.currentRoute === 'client360') Pages.client360(document.getElementById('pageContainer'), { clientId: res.Client_ID });
      } catch (err) {
        if (err.code === 'DUPLICATE_WA') {
          const w = form.querySelector('#clDupWarn');
          w.textContent = err.message;
          w.hidden = false;
        }
        UI.toast(err.message, 'err');
      } finally {
        btn.disabled = false; btn.textContent = 'Simpan Data Klien';
      }
    };
  };

  /* ============================================================
   * W-05: CLIENT 360° PROFILE DETAIL (8 TAB RIWAYAT TERPADU)
   * ============================================================ */
  Pages.client360 = function (container, params) {
    const clientId = params && params.clientId;
    if (!clientId) { App.go('clients'); return; }
    container.innerHTML = '<div class="neu-card card-pad">' + UI.skeletonTable(6) + '</div>';

    API.swr('cl360_' + clientId, 'clients.get360', { clientId: clientId }, function (d) {
      const c = d.client;
      let activeTab = 'biodata';

      function render360() {
        const tabs = [
          { k: 'biodata', l: 'Biodata' },
          { k: 'appointments', l: 'Jadwal (' + d.appointments.length + ')' },
          { k: 'packages', l: 'Paket (' + d.packages.length + ')' }
        ];
        if (d.canViewFinance) tabs.push({ k: 'invoices', l: 'Invoice (' + d.invoices.length + ')' });
        if (d.canViewRme) {
          tabs.push({ k: 'assessments', l: 'Assessment (' + d.assessments.length + ')' });
          tabs.push({ k: 'rme', l: 'RME (' + d.rme.length + ')' });
        }
        tabs.push({ k: 'documents', l: 'Dokumen & IC (' + d.documents.length + ')' });
        tabs.push({ k: 'followups', l: 'Log WA (' + d.followups.length + ')' });

        container.innerHTML =
          '<div class="neu-card card-pad">' +
            '<div class="row-between" style="margin-bottom:14px">' +
              '<button type="button" class="btn btn-sm btn-ghost" onclick="App.go(\'clients\')">← Kembali ke Master Klien</button>' +
              '<div class="row">' +
                '<button type="button" class="btn btn-sm btn-primary" onclick="Pages.openAppointmentModal({Client_ID:\'' + UI.esc(c.Client_ID) + '\', Client_Name:\'' + UI.esc(c.Full_Name) + '\'})">+ Buat Jadwal</button>' +
                (d.canViewRme ? '<button type="button" class="btn btn-sm btn-soft" onclick="App.go(\'rme\', {clientId:\'' + UI.esc(c.Client_ID) + '\'})">Buka RME</button>' : '') +
                (App.state.user.role !== 'Terapis' ? '<button type="button" class="btn btn-sm btn-secondary" id="btnEdit360">Edit Biodata</button>' : '') +
              '</div>' +
            '</div>' +
            '<div class="neu-tile" style="margin-bottom:16px">' +
              '<div class="row-between">' +
                '<div>' +
                  '<div class="row" style="gap:8px;margin-bottom:4px">' +
                    '<span class="badge badge-blue mono">' + UI.esc(c.Client_ID) + '</span>' +
                    UI.statusBadge(c.Client_Status) +
                    UI.statusBadge(c.Informed_Consent_Status || 'Belum Ada') +
                    '<span class="badge badge-indigo">' + UI.esc(c.Marketing_Source || 'Lainnya') + '</span>' +
                  '</div>' +
                  '<h1>' + UI.esc(c.Full_Name) + '</h1>' +
                  '<p class="muted text-sm">WA: ' + UI.esc(c.Phone_WA) + ' · Email: ' + UI.esc(c.Email || '-') + ' · Terakhir Sesi: <strong>' + (c.Last_Session_Date ? UI.fmtDateID(c.Last_Session_Date) : 'Belum ada') + '</strong></p>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="sub-tabs">' +
              tabs.map(function (t) { return '<button type="button" class="sub-tab' + (activeTab === t.k ? ' active' : '') + '" data-t360="' + t.k + '">' + t.l + '</button>'; }).join('') +
            '</div>' +
            '<div id="tab360Content"></div>' +
          '</div>';

        const editBtn = document.getElementById('btnEdit360');
        if (editBtn) editBtn.onclick = function () { Pages.openClientModal(c); };
        container.querySelectorAll('[data-t360]').forEach(function (b) {
          b.onclick = function () { activeTab = b.getAttribute('data-t360'); render360(); };
        });

        const box = document.getElementById('tab360Content');
        if (activeTab === 'biodata') {
          box.innerHTML = '<div class="form-grid-2">' +
            [['Nama Panggilan', c.Nickname], ['Jenis Kelamin', c.Gender], ['Tanggal Lahir', UI.fmtDateID(c.Birth_Date)], ['Pekerjaan', c.Occupation], ['Kontak Darurat', c.Emergency_Contact], ['Alamat', c.Address], ['Catatan', c.Notes], ['Terdaftar Sejak', UI.fmtDateTime(c.Created_At)]].map(function (kv) {
              return '<div class="neu-tile" style="padding:12px"><div class="kpi-label">' + kv[0] + '</div><div class="fw-600" style="margin-top:4px">' + UI.esc(kv[1] || '-') + '</div></div>';
            }).join('') + '</div>';
        } else if (activeTab === 'appointments') {
          box.innerHTML = d.appointments.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Tanggal &amp; Jam</th><th>Terapis</th><th>Layanan</th><th>Status</th></tr></thead><tbody>' +
            d.appointments.map(function (a) { return '<tr><td class="mono">' + UI.esc(a.Appointment_ID) + '</td><td>' + UI.fmtDateID(a.Appointment_Date) + ' ' + UI.esc(a.Start_Time) + '</td><td>' + UI.esc(a.Therapist_Name) + '</td><td>' + UI.esc(a.Service_Type) + '</td><td>' + UI.statusBadge(a.Status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Jadwal', 'Klien ini belum memiliki riwayat janji temu.');
        } else if (activeTab === 'packages') {
          box.innerHTML = d.packages.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Paket</th><th>Kuota</th><th>Sisa</th><th>Berlaku s.d.</th><th>Invoice</th><th>Status</th></tr></thead><tbody>' +
            d.packages.map(function (p) { return '<tr><td class="fw-600">' + UI.esc(p.Package_Name) + '</td><td>' + p.Used_Quota + '/' + p.Total_Quota + '</td><td class="fw-700">' + p.Remaining_Quota + '</td><td>' + UI.fmtDateID(p.Expiry_Date) + '</td><td class="mono">' + UI.esc(p.Invoice_ID) + '</td><td>' + UI.statusBadge(p.Status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Paket', 'Klien ini belum memiliki paket terapi.');
        } else if (activeTab === 'invoices') {
          box.innerHTML = d.invoices.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>No Invoice</th><th>Tanggal</th><th>Total</th><th>Terbayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
            d.invoices.map(function (i) { return '<tr><td class="mono fw-600">' + UI.esc(i.Invoice_ID) + '</td><td>' + UI.fmtDateID(i.Invoice_Date) + '</td><td class="tabular">' + UI.fmtRp(i.Total_Amount) + '</td><td class="tabular">' + UI.fmtRp(i.Paid_Amount) + '</td><td class="tabular">' + UI.fmtRp(i.Remaining_Balance) + '</td><td>' + UI.statusBadge(i.Payment_Status) + '</td><td><button class="btn btn-xs btn-soft" onclick="App.go(\'invoice/' + UI.esc(i.Invoice_ID) + '\')">Preview PDF</button></td></tr>'; }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Invoice', 'Belum ada catatan transaksi pembayaran.');
        } else if (activeTab === 'assessments') {
          box.innerHTML = d.assessments.length ? '<div class="stack-sm">' + d.assessments.map(function (a) {
            return '<div class="neu-tile"><div class="row-between"><strong>' + UI.fmtDateID(a.Assessment_Date) + ' · ' + UI.esc(a.Therapist_Name) + '</strong><span class="mono text-xs muted">' + UI.esc(a.Assessment_ID) + '</span></div>' +
              '<p class="text-sm" style="margin-top:6px"><strong>Keluhan Utama:</strong> ' + UI.esc(a.Main_Complaint) + '</p>' +
              '<p class="text-sm muted" style="margin-top:4px"><strong>Tujuan Terapi:</strong> ' + UI.esc(a.Therapy_Goals || '-') + '</p></div>';
          }).join('') + '</div>' : UI.emptyState('Belum Ada Assessment', 'Belum ada assessment awal untuk klien ini.');
        } else if (activeTab === 'rme') {
          box.innerHTML = d.rme.length ? '<div class="stack-sm">' + d.rme.map(function (r) {
            return '<div class="neu-tile"><div class="row-between"><div class="row"><span class="badge badge-blue">Sesi #' + r.Session_Number + '</span><strong>' + UI.fmtDateID(r.Session_Date) + ' · ' + UI.esc(r.Therapist_Name) + '</strong></div>' + UI.statusBadge(String(r.Is_Finalized) === 'TRUE' ? 'Completed' : 'Draft') + '</div>' +
              '<p class="text-sm" style="margin-top:8px"><strong>Keluhan &amp; Perkembangan:</strong> ' + UI.esc(r.Complaint_Update || '-') + '</p>' +
              '<p class="text-sm" style="margin-top:4px"><strong>Intervensi &amp; Trance:</strong> ' + UI.esc(r.Intervention_Technique || '-') + ' (' + UI.esc(r.Trance_Depth || '-') + ')</p>' +
              '<p class="text-sm" style="margin-top:4px"><strong>Perubahan Pascasesi:</strong> ' + UI.esc(r.Post_Session_Change || '-') + '</p>' +
              '<p class="text-sm" style="margin-top:4px;color:var(--primary-ink)"><strong>Homework:</strong> ' + UI.esc(r.Homework || '-') + '</p></div>';
          }).join('') + '</div>' : UI.emptyState('Belum Ada Riwayat RME', 'Mulai sesi terapi pertama untuk mencatat RME klien ini.');
        } else if (activeTab === 'documents') {
          box.innerHTML = d.documents.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Tipe</th><th>Nama File</th><th>Status</th><th>Diunggah</th><th>Aksi</th></tr></thead><tbody>' +
            d.documents.map(function (doc) { return '<tr><td>' + UI.esc(doc.Doc_Type) + '</td><td>' + UI.esc(doc.File_Name) + '</td><td>' + UI.statusBadge(doc.Verification_Status) + '</td><td>' + UI.fmtDateTime(doc.Created_At) + '</td><td><a class="btn btn-xs btn-secondary" href="' + UI.esc(doc.Drive_URL) + '" target="_blank" rel="noopener">Buka Drive</a></td></tr>'; }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Dokumen', 'Unggah Informed Consent klien di menu Dokumen & IC.');
        } else {
          box.innerHTML = d.followups.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Jenis</th><th>Kanal</th><th>Pesan</th><th>Status</th></tr></thead><tbody>' +
            d.followups.map(function (l) { return '<tr><td class="text-xs">' + UI.fmtDateTime(l.Sent_At) + '</td><td>' + UI.esc(l.Trigger_Type) + '</td><td>' + UI.esc(l.Channel) + '</td><td class="text-xs">' + UI.esc((l.Message_Rendered || '').slice(0, 90)) + '</td><td>' + UI.statusBadge(l.Send_Status) + '</td></tr>'; }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Log WhatsApp', 'Belum ada pesan pengingat atau follow-up terkirim.');
        }
      }
      render360();
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  };
})(window);
