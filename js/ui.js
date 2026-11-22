/**
 * ui.js — Pustaka komponen UI ringan (inline SVG icons, toast, modal, searchable autocomplete 2-3 char,
 * paginasi 20/30, skeleton loader, badge status pastel, serta lazy loader Chart.js / SheetJS / jsPDF).
 */
(function (global) {
  'use strict';

  /* Subset Ikon SVG 1.75px stroke (tanpa CDN ikon berat) */
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    fileMed: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>',
    creditCard: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    barChart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>'
  };

  function icon(name, size) {
    const s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  function esc(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtRp(num) {
    const n = Number(num || 0);
    return (n < 0 ? '-Rp ' : 'Rp ') + Math.abs(Math.round(n)).toLocaleString('id-ID');
  }

  function fmtDateID(iso) {
    if (!iso) return '-';
    const s = String(iso).slice(0, 10);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return s;
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return parseInt(m[3], 10) + ' ' + bulan[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  function fmtDateTime(iso) {
    if (!iso) return '-';
    const s = String(iso);
    return fmtDateID(s) + (s.length >= 16 ? (' ' + s.slice(11, 16)) : '');
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function statusBadge(status) {
    const s = String(status || '-');
    let cls = 'badge-neutral';
    if (/^(Paid|Completed|Valid|Active|Aktif|Selesai|Sent|Terkirim|Terdaftar|Format Valid|CREATE|LOGIN)$/i.test(s)) cls = 'badge-mint';
    else if (/^(Scheduled|Pending|Partial|Queued|Antri|Berjalan|Dalam Proses|UPDATE|ADJUST_COMMISSION|Belum Dicek)$/i.test(s)) cls = 'badge-amber';
    else if (/^(Unpaid|Cancelled|No Show|Rejected|Nonaktif|Failed|Gagal|Refund|Belum Ada|Tidak Terdaftar|SOFT_DELETE|Format Salah|Exhausted|Expired)$/i.test(s)) cls = 'badge-rose';
    else if (/^(Confirmed|Manual_Opened|Baru Daftar|EXPORT|CONFIG|VERIFY_DOC)$/i.test(s)) cls = 'badge-blue';
    else if (/^(Owner)$/i.test(s)) cls = 'badge-indigo';
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }

  function toast(msg, type) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    const cls = type === 'err' ? 'toast-err' : type === 'warn' ? 'toast-warn' : type === 'info' ? 'toast-info' : 'toast-ok';
    el.className = 'toast ' + cls;
    el.textContent = String(msg || '');
    stack.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 220);
    }, type === 'err' ? 4500 : 2800);
  }

  function openModal(title, bodyHtml, opts) {
    opts = opts || {};
    const root = document.getElementById('modalRoot');
    root.innerHTML = '<div class="modal-box ' + (opts.lg ? 'modal-lg' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h2>' + esc(title) + '</h2><button type="button" class="btn-icon-ghost" id="modalCloseBtn" aria-label="Tutup">' + icon('close', 18) + '</button></div>' +
      '<div id="modalBody">' + bodyHtml + '</div>' +
      '</div>';
    root.hidden = false;
    document.getElementById('modalCloseBtn').onclick = closeModal;
    root.onclick = function (e) { if (e.target === root) closeModal(); };
    return document.getElementById('modalBody');
  }

  function closeModal() {
    const root = document.getElementById('modalRoot');
    if (root) { root.hidden = true; root.innerHTML = ''; }
  }

  function skeletonTable(rows) {
    let h = '<div class="stack-sm">';
    for (let i = 0; i < (rows || 6); i++) {
      h += '<div class="skeleton" style="height:40px;width:100%"></div>';
    }
    return h + '</div>';
  }

  function emptyState(title, desc, ctaHtml) {
    return '<div class="empty-state">' +
      '<div class="empty-icon">' + icon('clipboard', 24) + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p class="text-sm" style="max-width:400px">' + esc(desc) + '</p>' +
      (ctaHtml ? '<div style="margin-top:6px">' + ctaHtml + '</div>' : '') +
      '</div>';
  }

  function renderPagination(meta, onPageChange, opts) {
    const total = meta.total || 0;
    const page = meta.page || 1;
    const pageSize = Number(meta.pageSize) || 10;
    const totalPages = meta.totalPages || 1;
    const from = total ? ((page - 1) * pageSize + 1) : 0;
    const to = Math.min(total, page * pageSize);
    const sizes = (opts && opts.sizes) || [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    const wrap = document.createElement('div');
    wrap.className = 'pagination-bar';
    wrap.innerHTML = '<div>Menampilkan <strong>' + from + '–' + to + '</strong> dari <strong>' + total + '</strong> data</div>' +
      '<div class="row">' +
      '<label class="text-xs muted">Baris:</label>' +
      '<select class="select" style="height:32px;width:78px;padding:0 8px" data-pg-size>' +
      sizes.map(function (s) { return '<option value="' + s + '"' + (pageSize === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
      '</select>' +
      '<button type="button" class="btn btn-sm btn-secondary" data-pg-prev' + (page <= 1 ? ' disabled' : '') + '>‹ Prev</button>' +
      '<span class="text-xs fw-600 tabular">Hal ' + page + ' / ' + totalPages + '</span>' +
      '<button type="button" class="btn btn-sm btn-secondary" data-pg-next' + (page >= totalPages ? ' disabled' : '') + '>Next ›</button>' +
      '</div>';

    wrap.querySelector('[data-pg-size]').onchange = function (e) { onPageChange(1, Number(e.target.value)); };
    wrap.querySelector('[data-pg-prev]').onclick = function () { if (page > 1) onPageChange(page - 1, pageSize); };
    wrap.querySelector('[data-pg-next]').onclick = function () { if (page < totalPages) onPageChange(page + 1, pageSize); };
    return wrap;
  }

  /**
   * Searchable Client Autocomplete (ketik 2-3 karakter, instan 0ms dari clientsMini cache + fallback server)
   */
  function mountClientAutocomplete(containerEl, opts) {
    opts = opts || {};
    const initialId = opts.initialId || '';
    const initialLabel = opts.initialLabel || '';
    const uid = 'ac_' + Math.random().toString(36).slice(2, 8);

    containerEl.innerHTML = '<div class="ac-wrap">' +
      '<input type="hidden" id="' + uid + '_val" value="' + esc(initialId) + '" />' +
      '<input type="text" id="' + uid + '_txt" class="input" autocomplete="off" value="' + esc(initialLabel) + '" placeholder="' + esc(opts.placeholder || 'Ketik 2–3 karakter: CLICH, Nama, atau No. WA...') + '" />' +
      '<div id="' + uid + '_list" class="autocomplete-dropdown" hidden></div>' +
      '</div>';

    const hiddenEl = document.getElementById(uid + '_val');
    const inputEl = document.getElementById(uid + '_txt');
    const dropEl = document.getElementById(uid + '_list');
    let timer = null;

    function renderItems(items) {
      if (!items.length) {
        dropEl.innerHTML = '<div class="ac-item"><span class="muted text-sm">Klien tidak ditemukan</span></div>';
        dropEl.hidden = false;
        return;
      }
      dropEl.innerHTML = items.map(function (c) {
        return '<div class="ac-item" data-cid="' + esc(c.Client_ID) + '">' +
          '<div><div class="ac-item-title">' + esc(c.Full_Name) + '</div>' +
          '<div class="ac-item-sub mono">' + esc(c.Client_ID) + ' · ' + esc(c.Phone_WA || '-') + '</div></div>' +
          statusBadge(c.Informed_Consent_Status || 'Belum Ada') +
          '</div>';
      }).join('');
      dropEl.hidden = false;
      dropEl.querySelectorAll('.ac-item[data-cid]').forEach(function (row) {
        row.onclick = function () {
          const cid = row.getAttribute('data-cid');
          const found = items.find(function (x) { return x.Client_ID === cid; });
          hiddenEl.value = cid;
          inputEl.value = found ? (found.Client_ID + ' — ' + found.Full_Name) : cid;
          dropEl.hidden = true;
          if (opts.onSelect) opts.onSelect(found);
        };
      });
    }

    function doSearch(q) {
      const mini = (global.App && global.App.state && global.App.state.clientsMini) || [];
      const ql = q.toLowerCase();
      if (mini.length > 0 && mini.length < 3000) {
        const hits = mini.filter(function (c) {
          return String(c.Client_ID).toLowerCase().indexOf(ql) > -1 ||
            String(c.Full_Name).toLowerCase().indexOf(ql) > -1 ||
            String(c.Phone_WA || '').toLowerCase().indexOf(ql) > -1;
        }).slice(0, 20);
        renderItems(hits);
      } else {
        API.call('clients.search', { q: q }).then(function (r) {
          renderItems(r.items || []);
        }).catch(function () {});
      }
    }

    inputEl.addEventListener('input', function () {
      const q = inputEl.value.trim();
      if (!q) { hiddenEl.value = ''; dropEl.hidden = true; return; }
      clearTimeout(timer);
      if (q.length < 2) {
        dropEl.innerHTML = '<div class="ac-item"><span class="muted text-xs">Ketik minimal 2 karakter untuk mencari...</span></div>';
        dropEl.hidden = false;
        return;
      }
      timer = setTimeout(function () { doSearch(q); }, 200);
    });

    inputEl.addEventListener('focus', function () {
      const q = inputEl.value.trim();
      if (q.length >= 2) doSearch(q);
    });

    document.addEventListener('click', function (e) {
      if (!containerEl.contains(e.target)) dropEl.hidden = true;
    });

    return {
      getValue: function () { return hiddenEl.value; },
      setValue: function (id, label) { hiddenEl.value = id || ''; inputEl.value = label || ''; }
    };
  }

  /* ============================================================
   * LAZY LOADERS CDN (Chart.js, SheetJS XLSX, jsPDF) & EKSPOR
   * ============================================================ */
  const _loadedScripts = {};
  function loadScriptOnce(src) {
    if (_loadedScripts[src]) return _loadedScripts[src];
    _loadedScripts[src] = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Gagal memuat pustaka: ' + src)); };
      document.head.appendChild(s);
    });
    return _loadedScripts[src];
  }

  function loadChartJs() {
    if (global.Chart) return Promise.resolve();
    return loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js');
  }

  function loadXlsx() {
    if (global.XLSX) return Promise.resolve();
    return loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
  }

  function loadJsPdf() {
    if (global.jspdf && global.jspdf.jsPDF) return Promise.resolve();
    return loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      .then(function () { return loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'); });
  }

  function exportCsv(filename, headers, rows) {
    const csvCell = function (v) {
      const s = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
      return '"' + s + '"';
    };
    const lines = [headers.map(csvCell).join(',')];
    rows.forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename.endsWith('.csv') ? filename : filename + '.csv');
  }

  async function exportExcel(filename, sheetName, headers, rows) {
    toast('Menyiapkan berkas Excel (.xlsx)...', 'info');
    await loadXlsx();
    const aoa = [headers].concat(rows);
    const ws = global.XLSX.utils.aoa_to_sheet(aoa);
    const wb = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Data').slice(0, 31));
    global.XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
    toast('Berkas Excel berhasil diunduh.', 'ok');
  }

  async function exportTablePdf(filename, title, subtitle, headers, rows) {
    toast('Menyiapkan dokumen PDF...', 'info');
    await loadJsPdf();
    const doc = new global.jspdf.jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    doc.setFontSize(15);
    doc.text(title || 'Laporan ICH HYPNOTHERAPY', 40, 42);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle || ('Dicetak: ' + fmtDateTime(new Date().toISOString())), 40, 58);
    doc.autoTable({
      startY: 72,
      head: [headers],
      body: rows,
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [43, 127, 255] }
    });
    doc.save(filename.endsWith('.pdf') ? filename : filename + '.pdf');
    toast('Dokumen PDF berhasil diunduh.', 'ok');
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  global.UI = {
    icon: icon,
    esc: esc,
    fmtRp: fmtRp,
    fmtDateID: fmtDateID,
    fmtDateTime: fmtDateTime,
    todayStr: todayStr,
    statusBadge: statusBadge,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    skeletonTable: skeletonTable,
    emptyState: emptyState,
    renderPagination: renderPagination,
    mountClientAutocomplete: mountClientAutocomplete,
    loadChartJs: loadChartJs,
    loadXlsx: loadXlsx,
    loadJsPdf: loadJsPdf,
    exportCsv: exportCsv,
    exportExcel: exportExcel,
    exportTablePdf: exportTablePdf
  };
})(window);
