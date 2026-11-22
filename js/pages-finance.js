/**
 * pages-finance.js — W-09 Packages/Quota/Invoices, W-10 Invoice Print Preview & PDF,
 * W-11 Therapist Commissions & Manual Adjustment, & W-12 Documents & Informed Consent Verification (Split Layout).
 */
(function (global) {
  'use strict';

  const Pages = global.Pages || (global.Pages = {});

  /* ============================================================
   * W-09: PACKAGES, QUOTA & INVOICES / PAYMENTS
   * ============================================================ */
  const pkgState = { tab: 'invoices', status: 'All', method: 'All', query: '', page: 1, pageSize: 20 };

  Pages.packages = function (container) {
    const canManageMaster = App.state.user && (App.state.user.role === 'Owner' || App.state.user.role === 'Admin');

    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Paket Terapi, Kuota &amp; Invoice Pembayaran</h1><p class="card-subtitle">Nomor invoice baku <code>INV-YYYYMM-00001</code> · Kuota hanya terpotong saat sesi RME Completed</p></div>' +
        '<div class="row">' +
          '<button type="button" class="btn btn-soft btn-sm" id="btnNewSingleInv">+ Invoice Satuan</button>' +
          '<button type="button" class="btn btn-primary btn-pill" id="btnAssignPkg">' + UI.icon('plus', 15) + ' Berikan Paket &amp; Invoice</button>' +
        '</div>' +
      '</div>' +
      '<div class="sub-tabs" id="pkgSubTabs">' +
        '<button type="button" class="sub-tab' + (pkgState.tab === 'invoices' ? ' active' : '') + '" data-pt="invoices">Invoice &amp; Pembayaran</button>' +
        '<button type="button" class="sub-tab' + (pkgState.tab === 'clientPkgs' ? ' active' : '') + '" data-pt="clientPkgs">Paket Klien &amp; Sisa Kuota</button>' +
        (canManageMaster ? '<button type="button" class="sub-tab' + (pkgState.tab === 'master' ? ' active' : '') + '" data-pt="master">Katalog Master Paket</button>' : '') +
      '</div>' +
      '<div id="pkgBody"></div>' +
      '</div>';

    document.getElementById('btnAssignPkg').onclick = openAssignPackageModal;
    document.getElementById('btnNewSingleInv').onclick = openSingleInvoiceModal;
    document.getElementById('pkgSubTabs').querySelectorAll('[data-pt]').forEach(function (b) {
      b.onclick = function () {
        pkgState.tab = b.getAttribute('data-pt'); pkgState.page = 1;
        Pages.packages(container);
      };
    });

    if (pkgState.tab === 'invoices') renderInvoicesTab();
    else if (pkgState.tab === 'clientPkgs') renderClientPackagesTab();
    else renderMasterPackagesTab();
  };

  function renderInvoicesTab() {
    const body = document.getElementById('pkgBody');
    body.innerHTML =
      '<div class="pill-tabs" id="invStPills" style="margin-bottom:12px">' +
        ['All', 'Paid', 'Partial', 'Unpaid', 'Refund'].map(function (s) {
          return '<button type="button" class="pill-tab' + (pkgState.status === s ? ' active' : '') + '" data-ist="' + s + '">' + (s === 'All' ? 'Semua' : s) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="filter-bar">' +
        '<input type="search" id="invQ" class="input search-grow" placeholder="Cari No. Invoice (INV-...) atau nama klien..." value="' + UI.esc(pkgState.query) + '" />' +
        '<select id="invMeth" class="select"><option value="All">Semua Metode</option><option value="Transfer">Transfer</option><option value="QRIS">QRIS</option><option value="Tunai">Tunai</option><option value="EDC">EDC</option></select>' +
      '</div>' +
      '<div id="invTable">' + UI.skeletonTable(6) + '</div><div id="invPag"></div>';

    document.getElementById('invStPills').querySelectorAll('[data-ist]').forEach(function (b) {
      b.onclick = function () {
        pkgState.status = b.getAttribute('data-ist'); pkgState.page = 1;
        document.getElementById('invStPills').querySelectorAll('.pill-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        loadInvoices();
      };
    });
    let t = null;
    document.getElementById('invQ').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { pkgState.query = e.target.value; pkgState.page = 1; loadInvoices(); }, 250); };
    document.getElementById('invMeth').onchange = function (e) { pkgState.method = e.target.value; pkgState.page = 1; loadInvoices(); };
    loadInvoices();
  }

  function loadInvoices(force) {
    API.swr('invs_' + JSON.stringify(pkgState), 'invoices.list', pkgState, function (res) {
      const el = document.getElementById('invTable');
      const pg = document.getElementById('invPag');
      if (!el) return;
      if (!res.items.length) {
        el.innerHTML = UI.emptyState('Belum Ada Invoice', 'Berikan paket terapi atau buat invoice sesi satuan untuk mulai mencatat pembayaran.');
        pg.innerHTML = ''; return;
      }
      el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>No. Invoice</th><th>Tanggal</th><th>Klien</th><th>Item</th><th>Total / Terbayar</th><th>Sisa</th><th>Status</th><th>Aksi</th>' +
        '</tr></thead><tbody>' +
        res.items.map(function (i) {
          return '<tr>' +
            '<td class="mono fw-700"><a href="#/invoice/' + UI.esc(i.Invoice_ID) + '">' + UI.esc(i.Invoice_ID) + '</a></td>' +
            '<td class="tabular">' + UI.fmtDateID(i.Invoice_Date) + '</td>' +
            '<td><a href="#/clients/' + UI.esc(i.Client_ID) + '" class="fw-600">' + UI.esc(i.Client_Name) + '</a><div class="text-xs mono muted">' + UI.esc(i.Client_ID) + '</div></td>' +
            '<td class="text-xs">' + UI.esc(i.Item_Label) + '<div class="muted">' + UI.esc(i.Payment_Method) + '</div></td>' +
            '<td class="tabular"><div class="fw-600">' + UI.fmtRp(i.Total_Amount) + '</div><div class="text-xs" style="color:var(--mint-ink)">Bayar: ' + UI.fmtRp(i.Paid_Amount) + '</div></td>' +
            '<td class="tabular fw-600" style="color:' + (Number(i.Remaining_Balance) > 0 ? 'var(--rose-ink)' : 'var(--text-muted)') + '">' + UI.fmtRp(i.Remaining_Balance) + '</td>' +
            '<td>' + UI.statusBadge(i.Payment_Status) + '</td>' +
            '<td><div class="row" style="gap:5px">' +
              '<button class="btn btn-xs btn-soft" onclick="App.go(\'invoice/' + UI.esc(i.Invoice_ID) + '\')">PDF</button>' +
              (i.Payment_Status !== 'Paid' && i.Payment_Status !== 'Refund' ? '<button class="btn btn-xs btn-mint" data-pay-inv="' + UI.esc(i.Invoice_ID) + '">Bayar</button>' : '') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';

      el.querySelectorAll('[data-pay-inv]').forEach(function (b) {
        b.onclick = function () {
          const inv = res.items.find(function (x) { return x.Invoice_ID === b.getAttribute('data-pay-inv'); });
          if (inv) openRecordPaymentModal(inv);
        };
      });
      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) { pkgState.page = p; pkgState.pageSize = ps; loadInvoices(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function renderClientPackagesTab() {
    const body = document.getElementById('pkgBody');
    body.innerHTML = '<div class="filter-bar"><input type="search" id="cpkQ" class="input search-grow" placeholder="Cari klien atau nama paket..." /></div>' +
      '<div id="cpkTable">' + UI.skeletonTable(6) + '</div><div id="cpkPag"></div>';
    let q = '', page = 1, pageSize = 20;
    function load() {
      API.swr('cpk_' + q + '_' + page + '_' + pageSize, 'packages.clientList', { query: q, page: page, pageSize: pageSize }, function (res) {
        const el = document.getElementById('cpkTable');
        const pg = document.getElementById('cpkPag');
        if (!el) return;
        if (!res.items.length) { el.innerHTML = UI.emptyState('Belum Ada Paket Klien', 'Klik "Berikan Paket & Invoice" untuk mengaktifkan kuota sesi klien.'); pg.innerHTML = ''; return; }
        el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Klien</th><th>Nama Paket</th><th>Progres Kuota</th><th>Sisa</th><th>Berlaku s.d.</th><th>Invoice</th><th>Status</th></tr></thead><tbody>' +
          res.items.map(function (p) {
            const pct = p.Total_Quota > 0 ? Math.round((Number(p.Used_Quota) / Number(p.Total_Quota)) * 100) : 0;
            return '<tr><td><a href="#/clients/' + UI.esc(p.Client_ID) + '" class="fw-600">' + UI.esc(p.Client_Name) + '</a><div class="text-xs mono muted">' + UI.esc(p.Client_ID) + '</div></td>' +
              '<td class="fw-600">' + UI.esc(p.Package_Name) + '</td>' +
              '<td style="min-width:140px"><div class="text-xs tabular">Terpakai ' + p.Used_Quota + ' dari ' + p.Total_Quota + ' sesi</div><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></td>' +
              '<td class="fw-700 tabular">' + p.Remaining_Quota + ' sesi</td>' +
              '<td class="tabular">' + UI.fmtDateID(p.Expiry_Date) + '</td>' +
              '<td class="mono"><a href="#/invoice/' + UI.esc(p.Invoice_ID) + '">' + UI.esc(p.Invoice_ID) + '</a></td>' +
              '<td>' + UI.statusBadge(p.Status) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        pg.innerHTML = '';
        pg.appendChild(UI.renderPagination(res, function (np, nps) { page = np; pageSize = nps; load(); }));
      }).catch(function (e) { UI.toast(e.message, 'err'); });
    }
    let t = null;
    document.getElementById('cpkQ').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { q = e.target.value; page = 1; load(); }, 250); };
    load();
  }

  function renderMasterPackagesTab() {
    const body = document.getElementById('pkgBody');
    const items = App.state.packagesMaster || [];
    body.innerHTML = '<div class="row-between" style="margin-bottom:12px"><span class="text-sm muted">Daftar katalog paket terapi aktif yang tersedia untuk dijual ke klien</span>' +
      '<button type="button" class="btn btn-sm btn-primary" id="btnAddMasterPkg">+ Tambah Katalog Paket</button></div>' +
      (items.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Nama Paket</th><th>Jumlah Sesi</th><th>Harga Paket</th><th>Masa Berlaku</th><th>Aksi</th></tr></thead><tbody>' +
        items.map(function (m) {
          return '<tr><td class="mono">' + UI.esc(m.Master_Pkg_ID) + '</td><td class="fw-600">' + UI.esc(m.Package_Name) + '<div class="text-xs muted">' + UI.esc(m.Description || '') + '</div></td>' +
            '<td class="tabular">' + m.Total_Sessions + ' sesi</td><td class="tabular fw-600">' + UI.fmtRp(m.Package_Price) + '</td><td>' + m.Validity_Days + ' hari</td>' +
            '<td><button class="btn btn-xs btn-secondary" data-edit-mp="' + UI.esc(m.Master_Pkg_ID) + '">Edit</button></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.emptyState('Katalog Paket Kosong', 'Tambahkan paket sesi pertama klinik Anda.'));

    document.getElementById('btnAddMasterPkg').onclick = function () { openMasterPkgModal(); };
    body.querySelectorAll('[data-edit-mp]').forEach(function (b) {
      b.onclick = function () {
        const m = items.find(function (x) { return x.Master_Pkg_ID === b.getAttribute('data-edit-mp'); });
        if (m) openMasterPkgModal(m);
      };
    });
  }

  function openMasterPkgModal(m) {
    m = m || {};
    const body = UI.openModal(m.Master_Pkg_ID ? 'Edit Katalog Paket' : 'Tambah Katalog Paket',
      '<form id="mpForm" class="stack-md">' +
        '<div class="field"><label>Nama Paket *</label><input name="Package_Name" class="input" required value="' + UI.esc(m.Package_Name || '') + '" /></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>Total Sesi *</label><input type="number" name="Total_Sessions" class="input" min="1" required value="' + (m.Total_Sessions || 4) + '" /></div>' +
          '<div class="field"><label>Harga Paket (Rp) *</label><input type="number" name="Package_Price" class="input" min="0" required value="' + (m.Package_Price || 2500000) + '" /></div>' +
          '<div class="field"><label>Masa Berlaku (Hari)</label><input type="number" name="Validity_Days" class="input" min="1" value="' + (m.Validity_Days || 90) + '" /></div>' +
        '</div>' +
        '<div class="field"><label>Deskripsi</label><textarea name="Description" class="textarea">' + UI.esc(m.Description || '') + '</textarea></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Paket</button></div>' +
      '</form>');
    body.querySelector('#mpForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = { Master_Pkg_ID: m.Master_Pkg_ID || '' };
      fd.forEach(function (v, k) { payload[k] = v; });
      try {
        await API.call('packages.masterSave', payload);
        UI.toast('Katalog paket tersimpan!', 'ok');
        UI.closeModal();
        await App.refreshBootstrap();
        Pages.packages(document.getElementById('pageContainer'));
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  function openAssignPackageModal() {
    const masters = App.state.packagesMaster || [];
    const body = UI.openModal('Berikan Paket Terapi & Terbitkan Invoice',
      '<form id="assignPkgForm" class="stack-md">' +
        '<div class="field"><label>Cari Klien (Ketik 2–3 Karakter) *</label><div id="asgClientAc"></div></div>' +
        '<div class="field"><label>Pilih Paket Terapi *</label><select name="Master_Pkg_ID" id="asgMaster" class="select" required>' +
          masters.map(function (m) { return '<option value="' + UI.esc(m.Master_Pkg_ID) + '" data-price="' + m.Package_Price + '">' + UI.esc(m.Package_Name) + ' — ' + m.Total_Sessions + ' sesi (' + UI.fmtRp(m.Package_Price) + ')</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>Subtotal (Rp)</label><input type="number" name="Subtotal" id="asgSub" class="input tabular" value="' + (masters[0] ? masters[0].Package_Price : 0) + '" /></div>' +
          '<div class="field"><label>Diskon (Rp)</label><input type="number" name="Discount" class="input tabular" value="0" /></div>' +
          '<div class="field"><label>Dibayar Sekarang (Rp)</label><input type="number" name="Paid_Amount" class="input tabular" value="0" /></div>' +
        '</div>' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Metode Pembayaran</label><select name="Payment_Method" class="select"><option>Transfer</option><option>QRIS</option><option>Tunai</option><option>EDC</option></select></div>' +
          '<div class="field"><label>Tanggal Pembelian</label><input type="date" name="Purchase_Date" class="input" value="' + UI.todayStr() + '" /></div>' +
        '</div>' +
        '<div class="field"><label>Catatan</label><input name="Notes" class="input" placeholder="Opsional..." /></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary" id="btnDoAssign">Terbitkan Paket &amp; Invoice</button></div>' +
      '</form>');
    const ac = UI.mountClientAutocomplete(body.querySelector('#asgClientAc'));
    body.querySelector('#asgMaster').onchange = function (e) {
      const opt = e.target.selectedOptions[0];
      if (opt) body.querySelector('#asgSub').value = opt.getAttribute('data-price') || 0;
    };
    body.querySelector('#assignPkgForm').onsubmit = async function (e) {
      e.preventDefault();
      const cid = ac.getValue();
      if (!cid) { UI.toast('Pilih klien terlebih dahulu.', 'warn'); return; }
      const fd = new FormData(e.target);
      const payload = { Client_ID: cid };
      fd.forEach(function (v, k) { payload[k] = v; });
      const btn = body.querySelector('#btnDoAssign');
      btn.disabled = true; btn.textContent = 'Memproses...';
      try {
        const res = await API.call('packages.assign', payload);
        UI.toast(res.message, 'ok');
        UI.closeModal();
        loadInvoices(true);
      } catch (err) { UI.toast(err.message, 'err'); }
      finally { btn.disabled = false; btn.textContent = 'Terbitkan Paket & Invoice'; }
    };
  }

  function openSingleInvoiceModal() {
    const body = UI.openModal('Terbitkan Invoice Sesi Satuan',
      '<form id="singleInvForm" class="stack-md">' +
        '<div class="field"><label>Cari Klien *</label><div id="sinvAc"></div></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>Subtotal (Rp) *</label><input type="number" name="Subtotal" class="input tabular" required value="750000" /></div>' +
          '<div class="field"><label>Diskon (Rp)</label><input type="number" name="Discount" class="input tabular" value="0" /></div>' +
          '<div class="field"><label>Dibayar Sekarang (Rp)</label><input type="number" name="Paid_Amount" class="input tabular" value="0" /></div>' +
        '</div>' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Metode</label><select name="Payment_Method" class="select"><option>Transfer</option><option>QRIS</option><option>Tunai</option><option>EDC</option></select></div>' +
          '<div class="field"><label>Tanggal Invoice</label><input type="date" name="Invoice_Date" class="input" value="' + UI.todayStr() + '" /></div>' +
        '</div>' +
        '<div class="field"><label>Keterangan</label><input name="Notes" class="input" value="Sesi Hipnoterapi Satuan" /></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Terbitkan Invoice</button></div>' +
      '</form>');
    const ac = UI.mountClientAutocomplete(body.querySelector('#sinvAc'));
    body.querySelector('#singleInvForm').onsubmit = async function (e) {
      e.preventDefault();
      const cid = ac.getValue();
      if (!cid) { UI.toast('Pilih klien.', 'warn'); return; }
      const fd = new FormData(e.target);
      const payload = { Client_ID: cid, Reference_Type: 'Single_Session' };
      fd.forEach(function (v, k) { payload[k] = v; });
      try {
        const res = await API.call('invoices.save', payload);
        UI.toast(res.message, 'ok');
        UI.closeModal();
        loadInvoices(true);
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  function openRecordPaymentModal(inv) {
    const canRefund = App.state.user && (App.state.user.role === 'Owner' || App.state.user.role === 'Admin');
    const body = UI.openModal('Catat Pembayaran — ' + inv.Invoice_ID,
      '<div class="alert alert-blue" style="margin-bottom:14px">' +
        '<span>Total: <strong>' + UI.fmtRp(inv.Total_Amount) + '</strong> · Sudah Dibayar: <strong>' + UI.fmtRp(inv.Paid_Amount) + '</strong> · Sisa: <strong>' + UI.fmtRp(inv.Remaining_Balance) + '</strong></span>' +
      '</div>' +
      '<form id="payInvForm" class="stack-md">' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Nominal Pembayaran Masuk (Rp) *</label><input type="number" name="Add_Payment_Amount" class="input tabular" required max="' + inv.Remaining_Balance + '" value="' + inv.Remaining_Balance + '" /></div>' +
          '<div class="field"><label>Metode Pembayaran</label><select name="Payment_Method" class="select"><option>Transfer</option><option>QRIS</option><option>Tunai</option><option>EDC</option></select></div>' +
        '</div>' +
        '<div class="field"><label>Catatan</label><input name="Notes" class="input" placeholder="cth: Pelunasan via BCA" /></div>' +
        '<div class="modal-foot">' +
          (canRefund ? '<button type="button" class="btn btn-danger-outline" id="btnDoRefund">Tandai Refund</button>' : '') +
          '<button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button>' +
          '<button type="submit" class="btn btn-primary">Simpan Pembayaran</button>' +
        '</div>' +
      '</form>');

    const refBtn = body.querySelector('#btnDoRefund');
    if (refBtn) {
      refBtn.onclick = async function () {
        const reason = prompt('Masukkan alasan Refund untuk ' + inv.Invoice_ID + ':');
        if (!reason) return;
        try {
          const r = await API.call('invoices.recordPayment', { Invoice_ID: inv.Invoice_ID, isRefund: true, reason: reason });
          UI.toast(r.message, 'ok'); UI.closeModal(); loadInvoices(true);
        } catch (err) { UI.toast(err.message, 'err'); }
      };
    }

    body.querySelector('#payInvForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = { Invoice_ID: inv.Invoice_ID };
      fd.forEach(function (v, k) { payload[k] = v; });
      try {
        const r = await API.call('invoices.recordPayment', payload);
        UI.toast(r.message, 'ok'); UI.closeModal(); loadInvoices(true);
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  /* ============================================================
   * W-10: INVOICE PRINT PREVIEW & PDF / WA ACTION PAGE
   * ============================================================ */
  Pages.invoice = function (container, params) {
    const invoiceId = params && params.invoiceId;
    if (!invoiceId) { App.go('packages'); return; }
    container.innerHTML = '<div class="neu-card card-pad">' + UI.skeletonTable(6) + '</div>';

    API.call('invoices.get', { invoiceId: invoiceId }).then(function (d) {
      const inv = d.invoice, cl = d.client, cln = d.clinic;
      const stampCls = inv.Payment_Status === 'Paid' ? 'badge-mint' : inv.Payment_Status === 'Partial' ? 'badge-amber' : 'badge-rose';
      const itemDesc = d.pkg ? (d.pkg.Package_Name + ' (' + d.pkg.Total_Quota + ' Sesi)') : ('Layanan Sesi Hipnoterapi (' + (inv.Reference_ID || '-') + ')');

      container.innerHTML =
        '<div class="row-between no-print" style="max-width:820px;margin:0 auto 12px;width:100%">' +
          '<button type="button" class="btn btn-sm btn-secondary" onclick="App.go(\'packages\')">← Kembali ke Daftar Invoice</button>' +
          '<div class="row">' +
            '<button type="button" class="btn btn-sm btn-secondary" onclick="window.print()">' + UI.icon('printer', 15) + ' Cetak Langsung</button>' +
            '<button type="button" class="btn btn-sm btn-primary" id="btnInvPdf">' + UI.icon('download', 15) + ' Unduh PDF</button>' +
            '<button type="button" class="btn btn-sm btn-mint" id="btnInvWa">' + UI.icon('message', 15) + ' Kirim WA</button>' +
          '</div>' +
        '</div>' +
        '<div class="invoice-sheet">' +
          '<div class="row-between" style="border-bottom:2px solid var(--border-soft);padding-bottom:18px;margin-bottom:20px;align-items:flex-start">' +
            '<div>' +
              '<h1 style="color:var(--primary-ink)">' + UI.esc(cln.name || 'ICH HYPNOTHERAPY') + '</h1>' +
              '<p class="text-sm muted" style="margin-top:4px">' + UI.esc(cln.address) + '</p>' +
              '<p class="text-sm muted">Telp/WA: ' + UI.esc(cln.phone) + ' · Email: ' + UI.esc(cln.email) + '</p>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div class="text-xs muted fw-700" style="letter-spacing:0.1em">INVOICE RESMI</div>' +
              '<div class="mono fw-700" style="font-size:18px;margin:4px 0">' + UI.esc(inv.Invoice_ID) + '</div>' +
              '<div class="text-xs muted">Tanggal: ' + UI.fmtDateID(inv.Invoice_Date) + '</div>' +
              '<div style="margin-top:8px"><span class="invoice-stamp ' + stampCls + '">' + UI.esc(inv.Payment_Status).toUpperCase() + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="form-grid-2" style="margin-bottom:22px">' +
            '<div><div class="kpi-label">Ditagihkan Kepada</div><div class="fw-700" style="font-size:15px;margin-top:4px">' + UI.esc(cl.Full_Name || '-') + '</div><div class="text-sm mono muted">' + UI.esc(cl.Client_ID || '') + ' · ' + UI.esc(cl.Phone_WA || '') + '</div></div>' +
            '<div><div class="kpi-label">Informasi Rekening Pembayaran</div><div class="text-sm fw-600" style="margin-top:4px">' + UI.esc(cln.bankInfo) + '</div><div class="text-xs muted">Metode Tercatat: ' + UI.esc(inv.Payment_Method) + '</div></div>' +
          '</div>' +
          '<div class="table-wrap" style="margin-bottom:20px"><table class="data-table"><thead><tr><th>Deskripsi Layanan / Paket</th><th>Subtotal</th><th>Diskon</th><th>Total Tagihan</th></tr></thead><tbody>' +
            '<tr><td class="fw-600">' + UI.esc(itemDesc) + '<div class="text-xs muted">' + UI.esc(inv.Notes || '') + '</div></td>' +
            '<td class="tabular">' + UI.fmtRp(inv.Subtotal) + '</td><td class="tabular">' + UI.fmtRp(inv.Discount) + '</td><td class="tabular fw-700">' + UI.fmtRp(inv.Total_Amount) + '</td></tr>' +
          '</tbody></table></div>' +
          '<div class="row-between" style="align-items:flex-end">' +
            '<div style="max-width:420px"><p class="text-xs muted">' + UI.esc(cln.footerNote) + '</p>' +
              (d.proofDoc ? '<p class="text-xs" style="margin-top:8px">Bukti Bayar: <a href="' + UI.esc(d.proofDoc.Drive_URL) + '" target="_blank" rel="noopener">' + UI.esc(d.proofDoc.File_Name) + '</a></p>' : '') +
            '</div>' +
            '<div class="neu-tile" style="min-width:250px;background:var(--surface-sunken)">' +
              '<div class="row-between text-sm"><span>Total Tagihan</span><strong class="tabular">' + UI.fmtRp(inv.Total_Amount) + '</strong></div>' +
              '<div class="row-between text-sm" style="margin-top:6px;color:var(--mint-ink)"><span>Sudah Dibayar</span><strong class="tabular">' + UI.fmtRp(inv.Paid_Amount) + '</strong></div>' +
              '<div class="row-between" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-soft)"><strong>Sisa Tagihan</strong><strong class="tabular" style="font-size:16px">' + UI.fmtRp(inv.Remaining_Balance) + '</strong></div>' +
            '</div>' +
          '</div>' +
        '</div>';

      document.getElementById('btnInvPdf').onclick = function () {
        UI.exportTablePdf(inv.Invoice_ID + '.pdf', (cln.name || 'ICH HYPNOTHERAPY') + ' — ' + inv.Invoice_ID,
          'Klien: ' + (cl.Full_Name || '-') + ' (' + cl.Client_ID + ') | Status: ' + inv.Payment_Status + ' | Tanggal: ' + UI.fmtDateID(inv.Invoice_Date),
          ['Deskripsi', 'Subtotal', 'Diskon', 'Total', 'Terbayar', 'Sisa'],
          [[itemDesc, UI.fmtRp(inv.Subtotal), UI.fmtRp(inv.Discount), UI.fmtRp(inv.Total_Amount), UI.fmtRp(inv.Paid_Amount), UI.fmtRp(inv.Remaining_Balance)]]);
      };

      document.getElementById('btnInvWa').onclick = function () {
        const msg = 'Halo ' + (cl.Full_Name || '') + ',\nBerikut rincian Invoice *' + inv.Invoice_ID + '* dari ' + (cln.name || 'ICH Hypnotherapy') + ':\n• Item: ' + itemDesc + '\n• Total: ' + UI.fmtRp(inv.Total_Amount) + '\n• Terbayar: ' + UI.fmtRp(inv.Paid_Amount) + '\n• Sisa: ' + UI.fmtRp(inv.Remaining_Balance) + '\n• Status: *' + inv.Payment_Status + '*\nRekening: ' + cln.bankInfo;
        const hp = String(cl.Phone_WA || '').replace(/[^\d]/g, '').replace(/^0/, '62');
        window.open('https://wa.me/' + hp + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      };
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  };

  /* ============================================================
   * W-11: THERAPIST COMMISSIONS & AUDITED MANUAL ADJUSTMENT
   * ============================================================ */
  const commState = { therapistId: '', payoutStatus: 'All', startDate: '', endDate: '', page: 1, pageSize: 20 };

  Pages.commissions = function (container) {
    const user = App.state.user || {};
    const canAdjust = user.role === 'Owner' || user.role === 'Admin';
    const therapists = App.state.therapists || [];

    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Komisi Terapis (Snapshot Historis)</h1><p class="card-subtitle">Tarif &amp; rate komisi terkunci saat sesi selesai · Penyesuaian manual wajib alasan &amp; tercatat di Audit Trail</p></div>' +
      '</div>' +
      '<div id="commKpis" class="kpi-grid-4" style="margin-bottom:14px"></div>' +
      '<div class="filter-bar">' +
        (canAdjust ? '<select id="cmTh" class="select"><option value="">Semua Terapis</option>' + therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '">' + UI.esc(t.Full_Name) + '</option>'; }).join('') + '</select>' : '') +
        '<select id="cmPay" class="select"><option value="All">Semua Status Bayar</option><option value="Pending">Pending</option><option value="Paid">Paid</option></select>' +
        '<input type="date" id="cmStart" class="input" /><input type="date" id="cmEnd" class="input" />' +
      '</div>' +
      '<div id="commTable">' + UI.skeletonTable(6) + '</div><div id="commPag"></div>' +
      '</div>';

    if (canAdjust) document.getElementById('cmTh').onchange = function (e) { commState.therapistId = e.target.value; commState.page = 1; loadCommissions(); };
    document.getElementById('cmPay').onchange = function (e) { commState.payoutStatus = e.target.value; commState.page = 1; loadCommissions(); };
    document.getElementById('cmStart').onchange = function (e) { commState.startDate = e.target.value; commState.page = 1; loadCommissions(); };
    document.getElementById('cmEnd').onchange = function (e) { commState.endDate = e.target.value; commState.page = 1; loadCommissions(); };
    loadCommissions();
  };

  function loadCommissions(force) {
    const canAdjust = App.state.user && (App.state.user.role === 'Owner' || App.state.user.role === 'Admin');
    API.swr('comm_' + JSON.stringify(commState), 'commissions.list', commState, function (res) {
      const s = res.summary || {};
      const kpi = document.getElementById('commKpis');
      if (kpi) {
        kpi.innerHTML = [
          ['Komisi Otomatis', UI.fmtRp(s.totalAuto)],
          ['Penyesuaian Manual', UI.fmtRp(s.totalAdjustment)],
          ['Belum Dibayar (Pending)', UI.fmtRp(s.totalPending)],
          ['Sudah Dibayar (Paid)', UI.fmtRp(s.totalPaid)]
        ].map(function (x) {
          return '<div class="neu-tile"><div class="kpi-label">' + x[0] + '</div><div class="kpi-value" style="font-size:19px">' + x[1] + '</div></div>';
        }).join('');
      }
      const el = document.getElementById('commTable');
      const pg = document.getElementById('commPag');
      if (!el) return;
      if (!res.items.length) { el.innerHTML = UI.emptyState('Belum Ada Data Komisi', 'Komisi otomatis tercipta saat sesi RME difinalisasi (Completed).'); pg.innerHTML = ''; return; }

      el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Tanggal</th><th>Terapis</th><th>Klien</th><th>Snapshot Tarif</th><th>Snapshot Rate</th><th>Auto</th><th>Penyesuaian</th><th>Final</th><th>Status</th>' + (canAdjust ? '<th>Aksi</th>' : '') +
        '</tr></thead><tbody>' +
        res.items.map(function (c) {
          const rateTxt = c.Snapshot_Commission_Type === 'Fixed' ? UI.fmtRp(c.Snapshot_Commission_Rate) : (c.Snapshot_Commission_Rate + '%');
          return '<tr><td class="tabular">' + UI.fmtDateID(c.Session_Date) + '</td>' +
            '<td class="fw-600">' + UI.esc(c.Therapist_Name) + '</td>' +
            '<td>' + UI.esc(c.Client_Name) + '<div class="text-xs mono muted">' + UI.esc(c.RME_ID) + '</div></td>' +
            '<td class="tabular">' + UI.fmtRp(c.Snapshot_Session_Fee) + '</td>' +
            '<td><span class="badge badge-neutral">' + UI.esc(rateTxt) + '</span></td>' +
            '<td class="tabular">' + UI.fmtRp(c.Auto_Commission_Amount) + '</td>' +
            '<td class="tabular">' + UI.fmtRp(c.Manual_Adjustment_Amount) + (c.Adjustment_Reason ? '<div class="text-xs muted">' + UI.esc(c.Adjustment_Reason) + '</div>' : '') + '</td>' +
            '<td class="tabular fw-700">' + UI.fmtRp(c.Final_Commission_Amount) + '</td>' +
            '<td>' + UI.statusBadge(c.Payout_Status) + '</td>' +
            (canAdjust ? '<td><div class="row" style="gap:5px"><button class="btn btn-xs btn-secondary" data-adj="' + UI.esc(c.Commission_ID) + '">Adjust</button>' +
              (c.Payout_Status !== 'Paid' ? '<button class="btn btn-xs btn-mint" data-paid="' + UI.esc(c.Commission_ID) + '">Paid</button>' : '') + '</div></td>' : '') +
            '</tr>';
        }).join('') + '</tbody></table></div>';

      if (canAdjust) {
        el.querySelectorAll('[data-adj]').forEach(function (b) {
          b.onclick = function () {
            const c = res.items.find(function (x) { return x.Commission_ID === b.getAttribute('data-adj'); });
            if (c) openAdjustCommModal(c);
          };
        });
        el.querySelectorAll('[data-paid]').forEach(function (b) {
          b.onclick = async function () {
            try {
              const r = await API.call('commissions.markPaid', { Commission_ID: b.getAttribute('data-paid') });
              UI.toast(r.message, 'ok'); loadCommissions(true);
            } catch (e) { UI.toast(e.message, 'err'); }
          };
        });
      }
      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) { commState.page = p; commState.pageSize = ps; loadCommissions(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function openAdjustCommModal(c) {
    const body = UI.openModal('Penyesuaian Manual Komisi — ' + c.Commission_ID,
      '<div class="alert alert-blue" style="margin-bottom:14px"><span>Terapis: <strong>' + UI.esc(c.Therapist_Name) + '</strong> · Komisi Otomatis (Snapshot): <strong>' + UI.fmtRp(c.Auto_Commission_Amount) + '</strong></span></div>' +
      '<form id="adjCommForm" class="stack-md">' +
        '<div class="field"><label>Nominal Penyesuaian (+/- Rp) *</label><input type="number" name="Manual_Adjustment_Amount" class="input tabular" required value="' + (c.Manual_Adjustment_Amount || 0) + '" /><small class="muted">Gunakan angka negatif (mis. -50000) untuk pengurangan atau positif untuk bonus.</small></div>' +
        '<div class="field"><label>Alasan Penyesuaian (WAJIB — Tercatat di Audit Trail) *</label><textarea name="Adjustment_Reason" class="textarea" required minlength="4" placeholder="Jelaskan alasan penyesuaian komisi secara jelas...">' + UI.esc(c.Adjustment_Reason || '') + '</textarea></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Penyesuaian</button></div>' +
      '</form>');
    body.querySelector('#adjCommForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const r = await API.call('commissions.adjust', {
          Commission_ID: c.Commission_ID,
          Manual_Adjustment_Amount: fd.get('Manual_Adjustment_Amount'),
          Adjustment_Reason: fd.get('Adjustment_Reason')
        });
        UI.toast(r.message, 'ok'); UI.closeModal(); loadCommissions(true);
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  /* ============================================================
   * W-12: DOCUMENTS & INFORMED CONSENT VERIFICATION (SPLIT LAYOUT)
   * ============================================================ */
  const docState = { docType: 'All', status: 'All', query: '', page: 1, pageSize: 20, selectedId: '' };

  Pages.documents = function (container) {
    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Dokumen &amp; Verifikasi Informed Consent</h1><p class="card-subtitle">Berkas tersimpan aman di Google Drive · Verifikasi Valid otomatis menghilangkan peringatan di RME</p></div>' +
        '<button type="button" class="btn btn-primary btn-pill" id="btnUploadDoc">' + UI.icon('upload', 15) + ' Unggah Dokumen (Maks 5MB)</button>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<input type="search" id="docQ" class="input search-grow" placeholder="Cari klien atau nama berkas..." value="' + UI.esc(docState.query) + '" />' +
        '<select id="docTypeSel" class="select"><option value="All">Semua Tipe</option><option value="Informed_Consent">Informed Consent</option><option value="Payment_Proof">Bukti Pembayaran</option><option value="Assessment_Doc">Dokumen Assessment</option><option value="Other">Lainnya</option></select>' +
        '<select id="docStSel" class="select"><option value="All">Semua Status</option><option value="Pending">Pending</option><option value="Valid">Valid</option><option value="Rejected">Rejected</option></select>' +
      '</div>' +
      '<div class="split-view">' +
        '<div class="stack-sm"><div id="docQueueList">' + UI.skeletonTable(5) + '</div><div id="docPag"></div></div>' +
        '<div class="neu-tile" id="docReviewPanel"></div>' +
      '</div>' +
      '</div>';

    document.getElementById('btnUploadDoc').onclick = openUploadDocModal;
    let t = null;
    document.getElementById('docQ').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { docState.query = e.target.value; docState.page = 1; loadDocuments(); }, 250); };
    document.getElementById('docTypeSel').onchange = function (e) { docState.docType = e.target.value; docState.page = 1; loadDocuments(); };
    document.getElementById('docStSel').onchange = function (e) { docState.status = e.target.value; docState.page = 1; loadDocuments(); };
    loadDocuments();
  };

  function loadDocuments(force) {
    API.swr('docs_' + JSON.stringify(docState), 'documents.list', docState, function (res) {
      const listEl = document.getElementById('docQueueList');
      const revEl = document.getElementById('docReviewPanel');
      const pgEl = document.getElementById('docPag');
      if (!listEl) return;
      if (!res.items.length) {
        listEl.innerHTML = UI.emptyState('Belum Ada Dokumen', 'Unggah Informed Consent atau bukti pembayaran untuk mulai verifikasi.');
        revEl.innerHTML = UI.emptyState('Pratinjau Dokumen', 'Pilih dokumen di panel kiri untuk memeriksa pratinjau Drive.');
        pgEl.innerHTML = ''; return;
      }

      const selected = res.items.find(function (d) { return d.Doc_ID === docState.selectedId; }) || res.items[0];
      docState.selectedId = selected.Doc_ID;

      listEl.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Klien</th><th>Tipe &amp; Berkas</th><th>Status</th></tr></thead><tbody>' +
        res.items.map(function (d) {
          const activeBg = d.Doc_ID === selected.Doc_ID ? ' style="background:#EBF3FE"' : '';
          return '<tr data-sel-doc="' + UI.esc(d.Doc_ID) + '" style="cursor:pointer"' + activeBg + '>' +
            '<td><div class="fw-600">' + UI.esc(d.Client_Name) + '</div><div class="text-xs mono muted">' + UI.esc(d.Client_ID) + '</div></td>' +
            '<td><div class="text-xs fw-600">' + UI.esc(d.Doc_Type) + '</div><div class="text-xs muted">' + UI.esc(d.File_Name) + '</div></td>' +
            '<td>' + UI.statusBadge(d.Verification_Status) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

      listEl.querySelectorAll('[data-sel-doc]').forEach(function (tr) {
        tr.onclick = function () { docState.selectedId = tr.getAttribute('data-sel-doc'); loadDocuments(false); };
      });

      const canVerify = App.state.user && (App.state.user.role === 'Owner' || App.state.user.role === 'Admin');
      const isImg = /^image\//i.test(selected.Mime_Type || '');
      revEl.innerHTML =
        '<div class="row-between" style="margin-bottom:10px">' +
          '<div><h3>' + UI.esc(selected.File_Name) + '</h3><div class="text-xs muted">' + UI.esc(selected.Client_ID + ' — ' + selected.Client_Name) + ' · ' + UI.esc(selected.Doc_Type) + '</div></div>' +
          '<a class="btn btn-xs btn-secondary" href="' + UI.esc(selected.Drive_URL) + '" target="_blank" rel="noopener">Buka Drive ↗</a>' +
        '</div>' +
        '<div class="doc-preview-frame" style="margin-bottom:12px">' +
          (isImg
            ? '<img src="' + UI.esc(selected.Thumbnail_URL) + '" alt="Pratinjau Dokumen" />'
            : '<iframe src="' + UI.esc(selected.Preview_URL) + '" title="Pratinjau PDF"></iframe>') +
        '</div>' +
        '<div class="row-between text-xs muted" style="margin-bottom:10px"><span>Diunggah: ' + UI.esc(selected.Uploaded_By) + ' (' + UI.fmtDateTime(selected.Created_At) + ')</span>' + UI.statusBadge(selected.Verification_Status) + '</div>' +
        (canVerify
          ? '<div class="stack-sm">' +
              '<input id="docVerReason" class="input" placeholder="Catatan verifikasi (wajib diisi bila Reject)..." value="' + UI.esc(selected.Rejection_Reason || '') + '" />' +
              '<div class="row">' +
                '<button type="button" class="btn btn-primary" style="flex:1" id="btnDocApprove">Verifikasi VALID (Sinkron IC)</button>' +
                '<button type="button" class="btn btn-danger-outline" id="btnDocReject">Reject</button>' +
              '</div>' +
            '</div>'
          : '<div class="text-xs muted">Verifikasi status dilakukan oleh Admin atau Owner.</div>');

      if (canVerify) {
        document.getElementById('btnDocApprove').onclick = async function () {
          try {
            const r = await API.call('documents.verify', { Doc_ID: selected.Doc_ID, Verification_Status: 'Valid' });
            UI.toast(r.message, 'ok'); App.refreshBootstrap(); loadDocuments(true);
          } catch (e) { UI.toast(e.message, 'err'); }
        };
        document.getElementById('btnDocReject').onclick = async function () {
          const reason = document.getElementById('docVerReason').value.trim();
          if (reason.length < 3) { UI.toast('Isi alasan penolakan minimal 3 karakter.', 'warn'); return; }
          try {
            const r = await API.call('documents.verify', { Doc_ID: selected.Doc_ID, Verification_Status: 'Rejected', Rejection_Reason: reason });
            UI.toast(r.message, 'ok'); loadDocuments(true);
          } catch (e) { UI.toast(e.message, 'err'); }
        };
      }

      pgEl.innerHTML = '';
      pgEl.appendChild(UI.renderPagination(res, function (p, ps) { docState.page = p; docState.pageSize = ps; loadDocuments(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function openUploadDocModal() {
    const canAutoValid = App.state.user && (App.state.user.role === 'Owner' || App.state.user.role === 'Admin');
    const body = UI.openModal('Unggah Dokumen Klien ke Google Drive',
      '<form id="upDocForm" class="stack-md">' +
        '<div class="field"><label>Cari Klien *</label><div id="upDocAc"></div></div>' +
        '<div class="field"><label>Jenis Dokumen</label><select name="Doc_Type" class="select"><option value="Informed_Consent">Informed Consent</option><option value="Payment_Proof">Bukti Pembayaran</option><option value="Assessment_Doc">Dokumen Assessment</option><option value="Other">Dokumen Lainnya</option></select></div>' +
        '<div class="field"><label>Pilih Berkas (PDF / JPG / PNG, Maks 5 MB) *</label><input type="file" id="upDocFile" class="input" accept=".pdf,image/jpeg,image/png,image/webp" required style="padding:7px" /></div>' +
        (canAutoValid ? '<label class="row text-sm" style="cursor:pointer"><input type="checkbox" name="autoVerify" value="1" checked /> Langsung tandai VALID</label>' : '') +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary" id="btnDoUpload">Unggah ke Drive</button></div>' +
      '</form>');
    const ac = UI.mountClientAutocomplete(body.querySelector('#upDocAc'));
    body.querySelector('#upDocForm').onsubmit = function (e) {
      e.preventDefault();
      const cid = ac.getValue();
      const file = body.querySelector('#upDocFile').files[0];
      if (!cid || !file) { UI.toast('Pilih klien dan berkas terlebih dahulu.', 'warn'); return; }
      if (file.size > 5 * 1024 * 1024) { UI.toast('Ukuran berkas melebihi 5 MB.', 'err'); return; }
      const btn = body.querySelector('#btnDoUpload');
      btn.disabled = true; btn.textContent = 'Mengunggah...';
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const r = await API.call('documents.upload', {
            Client_ID: cid,
            Doc_Type: body.querySelector('[name=Doc_Type]').value,
            File_Name: file.name,
            Mime_Type: file.type || 'application/pdf',
            Base64_Data: reader.result,
            autoVerify: !!(body.querySelector('[name=autoVerify]') && body.querySelector('[name=autoVerify]').checked)
          });
          UI.toast(r.message, 'ok'); UI.closeModal(); App.refreshBootstrap(); loadDocuments(true);
        } catch (err) { UI.toast(err.message, 'err'); }
        finally { btn.disabled = false; btn.textContent = 'Unggah ke Drive'; }
      };
      reader.readAsDataURL(file);
    };
  }
})(window);
