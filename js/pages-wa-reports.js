/**
 * pages-wa-reports.js — W-13 WhatsApp Follow-up, BlastWA, CRM Kontak, Templates & Logs (gas-notifikasi-wa-crm)
 * + W-14 Clinic Reports & Marketing Effectiveness Analytics (4 Grafik Interaktif Click-to-Drilldown & Ekspor PDF/Excel/CSV).
 */
(function (global) {
  'use strict';

  const Pages = global.Pages || (global.Pages = {});
  const _repCharts = {};

  function killRepChart(k) {
    if (_repCharts[k]) { try { _repCharts[k].destroy(); } catch (e) {} delete _repCharts[k]; }
  }

  /* ============================================================
   * W-13: WHATSAPP FOLLOW-UP, BLAST WA, CRM KONTAK, TEMPLATES & LOGS
   * ============================================================ */
  const waState = { tab: 'queue', trigger: 'All', query: '', page: 1, pageSize: 20 };

  Pages.whatsapp = function (container) {
    const canAdmin = App.state.user && (App.state.user.role === 'Owner' || App.state.user.role === 'Admin');
    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Follow-up WhatsApp, Blast &amp; CRM Kontak</h1><p class="card-subtitle">Antrean non-blocking Moonwa.id / Fonnte API + fallback manual <code>wa.me</code> · Hormati Opt-Out</p></div>' +
        '<div class="row">' +
          '<button type="button" class="btn btn-sm btn-secondary" id="btnDrainWa">Proses Antrean Sekarang</button>' +
          '<button type="button" class="btn btn-sm btn-primary btn-pill" id="btnManualWa">+ Kirim Pesan Manual</button>' +
        '</div>' +
      '</div>' +
      '<div class="sub-tabs" id="waSubTabs">' +
        '<button type="button" class="sub-tab' + (waState.tab === 'queue' ? ' active' : '') + '" data-wt="queue">Antrean Follow-up</button>' +
        '<button type="button" class="sub-tab' + (waState.tab === 'crm' ? ' active' : '') + '" data-wt="crm">CRM Kontak</button>' +
        (canAdmin ? '<button type="button" class="sub-tab' + (waState.tab === 'blast' ? ' active' : '') + '" data-wt="blast">Blast WA Massal</button>' : '') +
        (canAdmin ? '<button type="button" class="sub-tab' + (waState.tab === 'templates' ? ' active' : '') + '" data-wt="templates">Template Variabel</button>' : '') +
        '<button type="button" class="sub-tab' + (waState.tab === 'logs' ? ' active' : '') + '" data-wt="logs">Log Pengiriman</button>' +
      '</div>' +
      '<div id="waBody"></div>' +
      '</div>';

    document.getElementById('btnManualWa').onclick = openManualWaModal;
    document.getElementById('btnDrainWa').onclick = async function () {
      try {
        const r = await API.call('wa.drainQueue', {});
        UI.toast('Antrean diproses: ' + (r.processed || 0) + ' pesan (' + (r.sent || 0) + ' terkirim).', 'ok');
      } catch (e) { UI.toast(e.message, 'err'); }
    };
    document.getElementById('waSubTabs').querySelectorAll('[data-wt]').forEach(function (b) {
      b.onclick = function () { waState.tab = b.getAttribute('data-wt'); waState.page = 1; Pages.whatsapp(container); };
    });

    if (waState.tab === 'queue') renderWaQueue();
    else if (waState.tab === 'crm') renderCrmTab();
    else if (waState.tab === 'blast') renderBlastTab();
    else if (waState.tab === 'templates') renderTemplatesTab();
    else renderWaLogs();
  };

  function renderWaQueue() {
    const body = document.getElementById('waBody');
    body.innerHTML =
      '<div class="pill-tabs" id="waTrigPills" style="margin-bottom:12px">' +
        ['All:Semua', 'Reminder_Jadwal:Reminder H-1', 'Followup_H1:H+1', 'Followup_H3:H+3', 'Followup_H7:H+7', 'Ulang_Tahun:Ulang Tahun'].map(function (t) {
          const sp = t.split(':');
          return '<button type="button" class="pill-tab' + (waState.trigger === sp[0] ? ' active' : '') + '" data-tr="' + sp[0] + '">' + sp[1] + '</button>';
        }).join('') +
      '</div>' +
      '<div id="waQTable">' + UI.skeletonTable(5) + '</div><div id="waQPag"></div>';

    document.getElementById('waTrigPills').querySelectorAll('[data-tr]').forEach(function (b) {
      b.onclick = function () {
        waState.trigger = b.getAttribute('data-tr'); waState.page = 1;
        document.getElementById('waTrigPills').querySelectorAll('.pill-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        loadWaQueue();
      };
    });
    loadWaQueue();
  }

  function loadWaQueue(force) {
    API.swr('waq_' + JSON.stringify(waState), 'wa.queueList', waState, function (res) {
      const el = document.getElementById('waQTable');
      const pg = document.getElementById('waQPag');
      if (!el) return;
      if (!res.items.length) {
        el.innerHTML = UI.emptyState('Antrean Follow-up Bersih', 'Tidak ada pengingat jadwal, follow-up H+1/H+3/H+7, atau ulang tahun untuk filter ini.');
        pg.innerHTML = ''; return;
      }
      el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Klien &amp; WA</th><th>Trigger</th><th>Pratinjau Pesan</th><th>Status</th><th>Kirim (API / wa.me)</th></tr></thead><tbody>' +
        res.items.map(function (x, idx) {
          return '<tr><td><div class="fw-600">' + UI.esc(x.Client_Name) + '</div><div class="text-xs mono muted">' + UI.esc(x.Client_ID + ' · ' + x.Phone_WA) + '</div></td>' +
            '<td><span class="badge badge-blue">' + UI.esc(x.Trigger_Type) + '</span></td>' +
            '<td class="text-xs" style="max-width:340px">' + UI.esc(x.Message_Rendered) + '</td>' +
            '<td>' + UI.statusBadge(x.Status) + '</td>' +
            '<td><div class="row" style="gap:6px">' +
              '<button class="btn btn-xs btn-primary" data-send-api="' + idx + '">Kirim ' + UI.esc(res.waProvider || 'API') + '</button>' +
              '<button class="btn btn-xs btn-mint" data-send-wame="' + idx + '">wa.me ↗</button>' +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';

      el.querySelectorAll('[data-send-api]').forEach(function (b) {
        b.onclick = async function () {
          const item = res.items[Number(b.getAttribute('data-send-api'))];
          b.disabled = true;
          try {
            const r = await API.call('wa.sendSingle', { Client_ID: item.Client_ID, Appointment_ID: item.Appointment_ID, Target_Phone: item.Phone_WA, Trigger_Type: item.Trigger_Type, Message_Rendered: item.Message_Rendered, Channel: 'Moonwa_API' });
            UI.toast(r.message, r.Send_Status === 'Failed' ? 'err' : 'ok');
            loadWaQueue(true);
          } catch (e) { UI.toast(e.message, 'err'); b.disabled = false; }
        };
      });
      el.querySelectorAll('[data-send-wame]').forEach(function (b) {
        b.onclick = async function () {
          const item = res.items[Number(b.getAttribute('data-send-wame'))];
          const hp62 = String(item.Phone_WA || '').replace(/[^\d]/g, '').replace(/^0/, '62');
          window.open('https://wa.me/' + hp62 + '?text=' + encodeURIComponent(item.Message_Rendered), '_blank', 'noopener');
          API.call('wa.sendSingle', { Client_ID: item.Client_ID, Appointment_ID: item.Appointment_ID, Target_Phone: item.Phone_WA, Trigger_Type: item.Trigger_Type, Message_Rendered: item.Message_Rendered, Channel: 'WA_Me' }).catch(function () {});
        };
      });
      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) { waState.page = p; waState.pageSize = ps; loadWaQueue(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function renderCrmTab() {
    const body = document.getElementById('waBody');
    body.innerHTML =
      '<div class="filter-bar">' +
        '<input type="search" id="crmQ" class="input search-grow" placeholder="Cari nama, WA, tag, atau ID..." />' +
        '<select id="crmOpt" class="select"><option value="All">Semua Opt-Out</option><option value="TIDAK">Aktif (Terima Pesan)</option><option value="YA">Opt-Out (Berhenti)</option></select>' +
        '<button type="button" class="btn btn-sm btn-soft" id="btnCrmSync">Sinkron dari Klien</button>' +
        '<button type="button" class="btn btn-sm btn-secondary" id="btnCrmVal">Validasi Nomor WA</button>' +
        '<button type="button" class="btn btn-sm btn-primary" id="btnCrmAdd">+ Kontak CRM</button>' +
      '</div>' +
      '<div id="crmTable">' + UI.skeletonTable(6) + '</div><div id="crmPag"></div>';

    let q = '', optOut = 'All', page = 1, pageSize = 20;
    function load(force) {
      API.swr('crm_' + q + '_' + optOut + '_' + page, 'crm.list', { query: q, optOut: optOut, page: page, pageSize: pageSize }, function (res) {
        const el = document.getElementById('crmTable');
        const pg = document.getElementById('crmPag');
        if (!el) return;
        if (!res.items.length) { el.innerHTML = UI.emptyState('CRM Kontak Kosong', 'Klik "Sinkron dari Klien" untuk menarik seluruh kontak klien ke CRM.'); pg.innerHTML = ''; return; }
        el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Kontak</th><th>No. WA &amp; Validasi</th><th>Sumber &amp; Tag</th><th>Opt-Out</th><th>Interaksi</th><th>Aksi</th></tr></thead><tbody>' +
          res.items.map(function (k) {
            return '<tr><td><div class="fw-600">' + UI.esc(k.Nama) + '</div><div class="text-xs mono muted">' + UI.esc(k.KontakID + (k.RefID ? ' · ' + k.RefID : '')) + '</div></td>' +
              '<td><div class="mono text-sm">' + UI.esc(k.NoWA) + '</div>' + UI.statusBadge(k.StatusWA || 'Belum Dicek') + '</td>' +
              '<td><span class="badge badge-blue">' + UI.esc(k.Sumber || '-') + '</span> <span class="text-xs muted">' + UI.esc(k.Tag || '') + '</span></td>' +
              '<td>' + (k.OptOut === 'YA' ? '<span class="badge badge-rose">Opt-Out</span>' : '<span class="badge badge-mint">Aktif</span>') + '</td>' +
              '<td class="text-xs tabular">' + (k.JumlahPesan || 0) + ' pesan<div class="muted">' + UI.fmtDateID(k.TerakhirDihubungi) + '</div></td>' +
              '<td><button class="btn btn-xs btn-secondary" data-edit-crm="' + UI.esc(k.KontakID) + '">Edit/Tag</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        el.querySelectorAll('[data-edit-crm]').forEach(function (b) {
          b.onclick = function () {
            const k = res.items.find(function (x) { return x.KontakID === b.getAttribute('data-edit-crm'); });
            if (k) openCrmModal(k, function () { load(true); });
          };
        });
        pg.innerHTML = '';
        pg.appendChild(UI.renderPagination(res, function (np, nps) { page = np; pageSize = nps; load(); }));
      }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
    }

    document.getElementById('btnCrmSync').onclick = async function () {
      try { const r = await API.call('crm.sync', {}); UI.toast(r.message, 'ok'); load(true); } catch (e) { UI.toast(e.message, 'err'); }
    };
    document.getElementById('btnCrmVal').onclick = async function () {
      try { const r = await API.call('crm.validateWA', {}); UI.toast(r.message, 'ok'); load(true); } catch (e) { UI.toast(e.message, 'err'); }
    };
    document.getElementById('btnCrmAdd').onclick = function () { openCrmModal({}, function () { load(true); }); };
    let t = null;
    document.getElementById('crmQ').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { q = e.target.value; page = 1; load(); }, 250); };
    document.getElementById('crmOpt').onchange = function (e) { optOut = e.target.value; page = 1; load(); };
    load();
  }

  function openCrmModal(k, onSaved) {
    const body = UI.openModal(k.KontakID ? ('Edit Kontak CRM ' + k.KontakID) : 'Tambah Kontak CRM',
      '<form id="crmForm" class="stack-md">' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Nama *</label><input name="Nama" class="input" required value="' + UI.esc(k.Nama || '') + '" /></div>' +
          '<div class="field"><label>No. WhatsApp</label><input name="NoWA" class="input" value="' + UI.esc(k.NoWA || '') + '" /></div>' +
          '<div class="field"><label>Tag (pisahkan koma)</label><input name="Tag" class="input" placeholder="VIP, Alumni, Ansietas" value="' + UI.esc(k.Tag || '') + '" /></div>' +
          '<div class="field"><label>Preferensi Opt-Out Blast</label><select name="OptOut" class="select"><option value="TIDAK"' + (k.OptOut !== 'YA' ? ' selected' : '') + '>TIDAK (Boleh menerima broadcast)</option><option value="YA"' + (k.OptOut === 'YA' ? ' selected' : '') + '>YA (Keluarkan dari Blast WA)</option></select></div>' +
        '</div>' +
        '<div class="field"><label>Catatan Admin CRM</label><textarea name="Catatan" class="textarea">' + UI.esc(k.Catatan || '') + '</textarea></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Kontak</button></div>' +
      '</form>');
    body.querySelector('#crmForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const p = { KontakID: k.KontakID || '' };
      fd.forEach(function (v, key) { p[key] = v; });
      try {
        await API.call('crm.save', p);
        UI.toast('Kontak CRM tersimpan.', 'ok'); UI.closeModal(); if (onSaved) onSaved();
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  function renderBlastTab() {
    const body = document.getElementById('waBody');
    body.innerHTML =
      '<form id="blastForm" class="neu-tile stack-md" style="margin-bottom:16px">' +
        '<h3>Buat Blast WA Ber-Batch (Anti-Banned &amp; Hormati Opt-Out)</h3>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>Judul Kampanye *</label><input name="Judul" class="input" required placeholder="cth: Edukasi Relaksasi Bulanan" /></div>' +
          '<div class="field"><label>Sasaran (Segmen / Sumber / Tag)</label><input name="Sasaran" class="input" value="Semua" placeholder="Semua / Google Search / VIP" /></div>' +
          '<div class="field"><label>Ukuran Batch &amp; Jeda</label><div class="row"><select name="UkuranBatch" class="select" style="width:95px"><option value="10">10</option><option value="20" selected>20</option><option value="50">50</option></select><input type="number" name="JedaDetik" class="input" min="3" max="8" value="4" style="width:80px" title="Jeda detik" /><span class="text-xs muted">dtk</span></div></div>' +
        '</div>' +
        '<div class="field"><label>Isi Pesan (Gunakan <code>{{nama_klien}}</code> &amp; <code>{{institusi}}</code>) *</label><textarea name="Pesan" class="textarea" required placeholder="Halo {{nama_klien}}, ..."></textarea></div>' +
        '<div class="row" style="justify-content:flex-end"><button type="submit" class="btn btn-primary">Masukkan ke Antrean Blast Non-Blocking</button></div>' +
      '</form>' +
      '<div id="blastList">' + UI.skeletonTable(4) + '</div>';

    function loadBlasts() {
      API.call('wa.blastList', {}).then(function (r) {
        const el = document.getElementById('blastList');
        if (!el) return;
        const items = r.items || [];
        el.innerHTML = items.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>BlastID</th><th>Judul</th><th>Sasaran</th><th>Progres</th><th>Batch/Jeda</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
          items.map(function (b) {
            return '<tr><td class="mono">' + UI.esc(b.BlastID) + '</td><td class="fw-600">' + UI.esc(b.Judul) + '</td><td>' + UI.esc(b.Sasaran) + '</td>' +
              '<td class="tabular">' + b.Terkirim + ' terkirim / ' + b.Gagal + ' gagal (Total ' + b.Total + ')</td>' +
              '<td>' + b.UkuranBatch + ' / ' + b.JedaDetik + 's</td><td>' + UI.statusBadge(b.Status) + '</td>' +
              '<td>' + (b.Status === 'Berjalan' ? '<button class="btn btn-xs btn-danger-outline" data-stop-b="' + UI.esc(b.BlastID) + '">Hentikan</button>' : '-') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Riwayat Blast', 'Kontak berstatus Opt-Out otomatis dikecualikan dari setiap blast.');
        el.querySelectorAll('[data-stop-b]').forEach(function (btn) {
          btn.onclick = async function () {
            await API.call('wa.blastStop', { BlastID: btn.getAttribute('data-stop-b') });
            UI.toast('Blast dihentikan.', 'warn'); loadBlasts();
          };
        });
      }).catch(function (e) { UI.toast(e.message, 'err'); });
    }

    document.getElementById('blastForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const p = {}; fd.forEach(function (v, k) { p[k] = v; });
      try {
        const r = await API.call('wa.blastCreate', p);
        UI.toast(r.message, 'ok'); e.target.reset(); loadBlasts();
      } catch (err) { UI.toast(err.message, 'err'); }
    };
    loadBlasts();
  }

  function renderTemplatesTab() {
    const body = document.getElementById('waBody');
    body.innerHTML = UI.skeletonTable(4);
    API.call('wa.templatesList', {}).then(function (r) {
      const items = r.items || [];
      body.innerHTML = '<div class="stack-md">' + items.map(function (t) {
        return '<div class="neu-tile stack-sm"><div class="row-between"><strong>' + UI.esc(t.Template_Name) + ' <span class="badge badge-blue">' + UI.esc(t.Trigger_Type) + '</span></strong>' +
          '<button type="button" class="btn btn-xs btn-primary" data-save-tpl="' + UI.esc(t.Template_ID) + '">Simpan Perubahan</button></div>' +
          '<textarea class="textarea" id="tplBody_' + UI.esc(t.Template_ID) + '">' + UI.esc(t.Message_Body) + '</textarea>' +
          '<div class="text-xs muted">Variabel: <code>{{nama_klien}}</code> <code>{{tanggal}}</code> <code>{{jam}}</code> <code>{{terapis}}</code> <code>{{no_invoice}}</code> <code>{{institusi}}</code></div></div>';
      }).join('') + '</div>';
      body.querySelectorAll('[data-save-tpl]').forEach(function (btn) {
        btn.onclick = async function () {
          const id = btn.getAttribute('data-save-tpl');
          const tpl = items.find(function (x) { return x.Template_ID === id; });
          try {
            await API.call('wa.templateSave', { Template_ID: id, Template_Name: tpl.Template_Name, Trigger_Type: tpl.Trigger_Type, Message_Body: document.getElementById('tplBody_' + id).value });
            UI.toast('Template diperbarui.', 'ok');
          } catch (e) { UI.toast(e.message, 'err'); }
        };
      });
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function renderWaLogs() {
    const body = document.getElementById('waBody');
    body.innerHTML = UI.skeletonTable(6);
    API.call('wa.logsList', { page: 1, pageSize: 30 }).then(function (r) {
      body.innerHTML = (r.items && r.items.length)
        ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Klien</th><th>Trigger</th><th>Kanal</th><th>Nomor</th><th>Status</th><th>Respon</th></tr></thead><tbody>' +
          r.items.map(function (l) {
            return '<tr><td class="text-xs tabular">' + UI.fmtDateTime(l.Sent_At) + '</td><td>' + UI.esc(l.Client_Name) + '</td><td>' + UI.esc(l.Trigger_Type) + '</td><td>' + UI.esc(l.Channel) + '</td><td class="mono text-xs">' + UI.esc(l.Target_Phone) + '</td><td>' + UI.statusBadge(l.Send_Status) + '</td><td class="text-xs muted">' + UI.esc((l.API_Response_Snippet || '').slice(0, 70)) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : UI.emptyState('Belum Ada Log Pengiriman', 'Riwayat pengiriman WA API dan wa.me tercatat otomatis di sini.');
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function openManualWaModal() {
    const body = UI.openModal('Kirim Pesan WhatsApp Manual',
      '<form id="mWaForm" class="stack-md">' +
        '<div class="field"><label>Cari Klien (Opsional — isi nomor otomatis)</label><div id="mWaAc"></div></div>' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Nomor WhatsApp *</label><input id="mWaPhone" class="input" required placeholder="0812xxxxxxxx" /></div>' +
          '<div class="field"><label>Kanal Pengiriman</label><select id="mWaChan" class="select"><option value="Moonwa_API">Gateway API (Moonwa / Fonnte)</option><option value="WA_Me">Manual via wa.me</option></select></div>' +
        '</div>' +
        '<div class="field"><label>Isi Pesan *</label><textarea id="mWaMsg" class="textarea" required placeholder="Tulis pesan untuk klien..."></textarea></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Kirim Sekarang</button></div>' +
      '</form>');
    const ac = UI.mountClientAutocomplete(body.querySelector('#mWaAc'), {
      onSelect: function (cl) { if (cl && cl.Phone_WA) body.querySelector('#mWaPhone').value = cl.Phone_WA; }
    });
    body.querySelector('#mWaForm').onsubmit = async function (e) {
      e.preventDefault();
      const chan = body.querySelector('#mWaChan').value;
      const phone = body.querySelector('#mWaPhone').value;
      const msg = body.querySelector('#mWaMsg').value;
      if (chan === 'WA_Me') {
        const hp62 = String(phone).replace(/[^\d]/g, '').replace(/^0/, '62');
        window.open('https://wa.me/' + hp62 + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      }
      try {
        const r = await API.call('wa.sendSingle', { Client_ID: ac.getValue(), Target_Phone: phone, Channel: chan, Trigger_Type: 'Manual', Message_Rendered: msg });
        UI.toast(r.message, r.Send_Status === 'Failed' ? 'err' : 'ok');
        UI.closeModal();
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  /* ============================================================
   * W-14: CLINIC REPORTS & MARKETING EFFECTIVENESS ANALYTICS
   * (4 GRAFIK INTERAKTIF CLICK-TO-DRILLDOWN + EKSPOR PDF/EXCEL/CSV)
   * ============================================================ */
  const repState = { period: 'month', startDate: '', endDate: '', therapistId: '', status: 'All', paymentMethod: 'All', query: '', drillFilter: null, page: 1, pageSize: 20 };

  Pages.reports = function (container) {
    const therapists = App.state.therapists || [];
    container.innerHTML =
      '<div class="neu-card card-pad">' +
        '<div class="card-header">' +
          '<div><h1>Laporan Klinik &amp; Efektivitas Marketing</h1><p class="card-subtitle">100% Data Aktual Database · Klik elemen grafik mana pun untuk membuka rincian data sumbernya</p></div>' +
          '<div class="row no-print">' +
            '<button type="button" class="btn btn-sm btn-secondary" onclick="window.print()">' + UI.icon('printer', 14) + ' Cetak</button>' +
            '<button type="button" class="btn btn-sm btn-secondary" id="btnRepPdf">' + UI.icon('download', 14) + ' PDF</button>' +
            '<button type="button" class="btn btn-sm btn-secondary" id="btnRepXlsx">' + UI.icon('download', 14) + ' Excel</button>' +
            '<button type="button" class="btn btn-sm btn-secondary" id="btnRepCsv">' + UI.icon('download', 14) + ' CSV</button>' +
          '</div>' +
        '</div>' +
        '<div class="row-between no-print" style="margin-bottom:12px">' +
          '<div class="pill-tabs" id="repPerTabs">' +
            ['today:Hari Ini', 'week:Minggu Ini', 'month:Bulan Ini', 'year:Tahun Ini', 'custom:Custom'].map(function (p) {
              const sp = p.split(':');
              return '<button type="button" class="pill-tab' + (repState.period === sp[0] ? ' active' : '') + '" data-rp="' + sp[0] + '">' + sp[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div id="repCustomRow" class="row" ' + (repState.period === 'custom' ? '' : 'hidden') + '>' +
            '<input type="date" id="repStart" class="input" style="width:155px" value="' + UI.esc(repState.startDate || UI.todayStr()) + '" />' +
            '<input type="date" id="repEnd" class="input" style="width:155px" value="' + UI.esc(repState.endDate || UI.todayStr()) + '" />' +
            '<button type="button" class="btn btn-sm btn-primary" id="repApply">Terapkan</button>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar no-print">' +
          '<input type="search" id="repQ" class="input search-grow" placeholder="Cari klien, invoice, sumber marketing..." value="' + UI.esc(repState.query) + '" />' +
          '<select id="repTh" class="select"><option value="">Semua Terapis</option>' + therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '">' + UI.esc(t.Full_Name) + '</option>'; }).join('') + '</select>' +
          '<select id="repMeth" class="select"><option value="All">Semua Metode Bayar</option><option>Transfer</option><option>QRIS</option><option>Tunai</option><option>EDC</option></select>' +
        '</div>' +
        '<div id="repFinSummary" class="kpi-grid-5" style="margin-bottom:16px"></div>' +
        '<div class="kpi-grid-2" style="margin-bottom:16px">' +
          '<div class="neu-tile"><h3>1. Tren Pertumbuhan Klien, Sesi &amp; Pendapatan</h3><div class="chart-box" style="margin-top:8px"><canvas id="repChartTrend"></canvas></div></div>' +
          '<div class="neu-tile"><h3>2. Proporsi Status Klien &amp; Pembayaran</h3><div class="kpi-grid-2" style="margin-top:8px"><div class="chart-box-sm"><canvas id="repChartDonut1"></canvas></div><div class="chart-box-sm"><canvas id="repChartDonut2"></canvas></div></div></div>' +
          '<div class="neu-tile"><h3>3. Funnel Efektivitas Marketing (Klik Sumber untuk Filter)</h3><div class="chart-box" style="margin-top:8px"><canvas id="repChartFunnel"></canvas></div></div>' +
          '<div class="neu-tile"><h3>4. Performa Terapis (Klik Terapis untuk Filter)</h3><div class="chart-box" style="margin-top:8px"><canvas id="repChartTh"></canvas></div></div>' +
        '</div>' +
        '<div class="row-between" style="margin-bottom:10px">' +
          '<h2>Tabel Rincian Laporan Terintegrasi</h2>' +
          '<div id="repDrillChip"></div>' +
        '</div>' +
        '<div id="repTableArea">' + UI.skeletonTable(6) + '</div><div id="repTablePag"></div>' +
      '</div>';

    document.getElementById('repPerTabs').querySelectorAll('[data-rp]').forEach(function (b) {
      b.onclick = function () {
        repState.period = b.getAttribute('data-rp'); repState.page = 1; repState.drillFilter = null;
        document.getElementById('repPerTabs').querySelectorAll('.pill-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        document.getElementById('repCustomRow').hidden = repState.period !== 'custom';
        if (repState.period !== 'custom') loadReports(true);
      };
    });
    document.getElementById('repApply').onclick = function () {
      repState.startDate = document.getElementById('repStart').value;
      repState.endDate = document.getElementById('repEnd').value;
      loadReports(true);
    };
    let t = null;
    document.getElementById('repQ').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { repState.query = e.target.value; repState.page = 1; loadReports(); }, 250); };
    document.getElementById('repTh').onchange = function (e) { repState.therapistId = e.target.value; repState.page = 1; loadReports(); };
    document.getElementById('repMeth').onchange = function (e) { repState.paymentMethod = e.target.value; repState.page = 1; loadReports(); };

    const getExportPayload = function () {
      const rows = getFilteredReportRows();
      const headers = ['Tanggal', 'Tipe', 'ID', 'Client_ID', 'Nama Klien', 'Sumber Marketing', 'Terapis', 'Status', 'Metode', 'Total', 'Terbayar'];
      return {
        headers: headers,
        rows: rows.map(function (r) { return [r.Date, r.Record_Type, r.Record_ID, r.Client_ID, r.Client_Name, r.Marketing_Source, r.Therapist_Name, r.Status, r.Payment_Method, r.Total_Amount, r.Paid_Amount]; })
      };
    };
    document.getElementById('btnRepCsv').onclick = function () { const p = getExportPayload(); UI.exportCsv('laporan-ich-hypnotherapy.csv', p.headers, p.rows); };
    document.getElementById('btnRepXlsx').onclick = function () { const p = getExportPayload(); UI.exportExcel('laporan-ich-hypnotherapy.xlsx', 'Laporan Klinik', p.headers, p.rows); };
    document.getElementById('btnRepPdf').onclick = function () { const p = getExportPayload(); UI.exportTablePdf('laporan-ich-hypnotherapy.pdf', 'Laporan Klinik & Marketing — ICH HYPNOTHERAPY', 'Periode: ' + repState.period, p.headers, p.rows); };

    loadReports();
  };

  function getFilteredReportRows() {
    let rows = (Pages._lastReport && Pages._lastReport.table) || [];
    if (repState.drillFilter) {
      const df = repState.drillFilter;
      rows = rows.filter(function (r) {
        if (df.type === 'source') return r.Marketing_Source === df.value;
        if (df.type === 'therapist') return r.Therapist_Name === df.value;
        if (df.type === 'status') return r.Status === df.value;
        return true;
      });
    }
    return rows;
  }

  function renderReportTable() {
    const el = document.getElementById('repTableArea');
    const pg = document.getElementById('repTablePag');
    const chip = document.getElementById('repDrillChip');
    if (!el) return;

    chip.innerHTML = repState.drillFilter
      ? '<span class="badge badge-blue">Drill-Down: ' + UI.esc(repState.drillFilter.label) + ' <button type="button" style="border:0;background:transparent;cursor:pointer;font-weight:700;color:inherit" id="clrDrill">×</button></span>'
      : '';
    if (document.getElementById('clrDrill')) {
      document.getElementById('clrDrill').onclick = function () { repState.drillFilter = null; repState.page = 1; renderReportTable(); };
    }

    const allRows = getFilteredReportRows();
    const total = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / repState.pageSize));
    const page = Math.min(totalPages, repState.page);
    const slice = allRows.slice((page - 1) * repState.pageSize, page * repState.pageSize);

    if (!slice.length) {
      el.innerHTML = UI.emptyState('Tidak Ada Data Laporan', 'Ubah rentang tanggal atau reset filter untuk melihat transaksi lainnya.');
      pg.innerHTML = ''; return;
    }

    el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Tipe / ID</th><th>Klien</th><th>Sumber</th><th>Terapis</th><th>Status</th><th>Total</th><th>Terbayar</th></tr></thead><tbody>' +
      slice.map(function (r) {
        return '<tr><td class="tabular">' + UI.fmtDateID(r.Date) + '</td><td class="mono text-xs">' + UI.esc(r.Record_Type + ' · ' + r.Record_ID) + '</td>' +
          '<td><a href="#/clients/' + UI.esc(r.Client_ID) + '" class="fw-600">' + UI.esc(r.Client_Name) + '</a></td>' +
          '<td><span class="badge badge-blue">' + UI.esc(r.Marketing_Source) + '</span></td>' +
          '<td>' + UI.esc(r.Therapist_Name) + '</td><td>' + UI.statusBadge(r.Status) + '</td>' +
          '<td class="tabular">' + UI.fmtRp(r.Total_Amount) + '</td><td class="tabular fw-600">' + UI.fmtRp(r.Paid_Amount) + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    pg.innerHTML = '';
    pg.appendChild(UI.renderPagination({ total: total, page: page, pageSize: repState.pageSize, totalPages: totalPages }, function (p, ps) {
      repState.page = p; repState.pageSize = ps; renderReportTable();
    }));
  }

  function loadReports(force) {
    const params = { period: repState.period, startDate: repState.startDate, endDate: repState.endDate, therapistId: repState.therapistId, paymentMethod: repState.paymentMethod, query: repState.query };
    API.swr('rep_' + JSON.stringify(params), 'reports.analytics', params, function (d) {
      Pages._lastReport = d;
      const f = d.financial || {};
      const fin = document.getElementById('repFinSummary');
      if (fin) {
        fin.innerHTML = [
          ['Total Pendapatan', UI.fmtRp(f.totalRevenue)],
          ['Lunas (Paid)', UI.fmtRp(f.paidRevenue)],
          ['Belum Lunas', UI.fmtRp(f.unpaidRevenue)],
          ['Komisi Terapis', UI.fmtRp(f.therapistCommissions)],
          ['Pendapatan Bersih ICH', UI.fmtRp(f.netIchRevenue)]
        ].map(function (x) { return '<div class="neu-tile" style="padding:12px"><div class="kpi-label">' + x[0] + '</div><div class="fw-700 tabular" style="font-size:16px;margin-top:4px">' + x[1] + '</div></div>'; }).join('');
      }
      renderReportTable();
      UI.loadChartJs().then(function () {
        if (App.currentRoute !== 'reports') return;
        renderReportCharts(d);
      }).catch(function () {});
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function renderReportCharts(d) {
    // 1. Line & Area Trend
    const c1 = document.getElementById('repChartTrend');
    if (c1) {
      killRepChart('t');
      const s = d.trendSeries || [];
      _repCharts.t = new Chart(c1, {
        type: 'line',
        data: {
          labels: s.map(function (x) { return x.label; }),
          datasets: [
            { label: 'Klien Baru', data: s.map(function (x) { return x.clients; }), borderColor: '#2B7FFF', tension: 0.35 },
            { label: 'Sesi Selesai', data: s.map(function (x) { return x.sessions; }), borderColor: '#4F46E5', backgroundColor: 'rgba(79,70,229,0.14)', fill: true, tension: 0.35 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
    }

    // 2. Dual Donuts (click-to-drilldown)
    const d1 = document.getElementById('repChartDonut1');
    if (d1) {
      killRepChart('d1');
      const cs = (d.donuts && d.donuts.clientStatus) || {};
      _repCharts.d1 = new Chart(d1, {
        type: 'doughnut',
        data: { labels: ['Baru Daftar', 'Dalam Proses', 'Selesai'], datasets: [{ data: [cs['Baru Daftar'] || 0, cs['Dalam Proses'] || 0, cs['Selesai'] || 0], backgroundColor: ['#2B7FFF', '#F59E0B', '#10B981'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
      });
    }
    const d2 = document.getElementById('repChartDonut2');
    if (d2) {
      killRepChart('d2');
      const ps = (d.donuts && d.donuts.paymentStatus) || {};
      const labels = ['Paid', 'Partial', 'Unpaid', 'Refund'];
      _repCharts.d2 = new Chart(d2, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: labels.map(function (l) { return ps[l] || 0; }), backgroundColor: ['#10B981', '#F59E0B', '#F43F5E', '#64748B'], borderWidth: 0 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
          onClick: function (ev, els) {
            if (els.length) {
              const lbl = labels[els[0].index];
              repState.drillFilter = { type: 'status', value: lbl, label: 'Status Bayar: ' + lbl };
              repState.page = 1; renderReportTable();
            }
          }
        }
      });
    }

    // 3. Marketing Effectiveness Funnel (click-to-drilldown by source!)
    const fEl = document.getElementById('repChartFunnel');
    if (fEl) {
      killRepChart('fn');
      const fn = d.marketingFunnel || [];
      _repCharts.fn = new Chart(fEl, {
        type: 'bar',
        data: {
          labels: fn.map(function (x) { return x.source; }),
          datasets: [
            { label: 'Klien (Lead)', data: fn.map(function (x) { return x.leads; }), backgroundColor: '#93C5FD' },
            { label: 'Terjadwal', data: fn.map(function (x) { return x.scheduled; }), backgroundColor: '#2B7FFF' },
            { label: 'Sesi Selesai', data: fn.map(function (x) { return x.completed; }), backgroundColor: '#10B981' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          onClick: function (ev, els) {
            if (els.length) {
              const src = fn[els[0].index].source;
              repState.drillFilter = { type: 'source', value: src, label: 'Sumber: ' + src };
              repState.page = 1; renderReportTable();
            }
          }
        }
      });
    }

    // 4. Therapist Performance (click-to-drilldown by therapist!)
    const thEl = document.getElementById('repChartTh');
    if (thEl) {
      killRepChart('th');
      const tp = d.therapistPerformance || [];
      _repCharts.th = new Chart(thEl, {
        type: 'bar',
        data: {
          labels: tp.map(function (x) { return x.Therapist_Name; }),
          datasets: [
            { label: 'Klien Unik', data: tp.map(function (x) { return x.clientsCount; }), backgroundColor: '#2B7FFF' },
            { label: 'Sesi Selesai', data: tp.map(function (x) { return x.sessionsCount; }), backgroundColor: '#4F46E5' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          onClick: function (ev, els) {
            if (els.length) {
              const nm = tp[els[0].index].Therapist_Name;
              repState.drillFilter = { type: 'therapist', value: nm, label: 'Terapis: ' + nm };
              repState.page = 1; renderReportTable();
            }
          }
        }
      });
    }
  }
})(window);
