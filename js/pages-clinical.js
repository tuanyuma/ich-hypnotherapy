/**
 * pages-clinical.js — W-06 Initial Assessment, W-07 Appointments & Scheduling Manager, & W-08 RME Clinical Workspace.
 */
(function (global) {
  'use strict';

  const Pages = global.Pages || (global.Pages = {});

  /* ============================================================
   * W-06: INITIAL ASSESSMENT WORKSPACE (LIST + MODAL TAMBAH/EDIT + DETAIL)
   * ============================================================ */
  const asmState = { query: '', therapistId: '', page: 1, pageSize: 10 };

  Pages.assessments = function (container) {
    const user = App.state.user || {};
    const therapists = App.state.therapists || [];

    container.innerHTML =
      '<div class="neu-card card-pad">' +
        '<div class="card-header">' +
          '<div><h1>Assessment Awal Klien</h1><p class="card-subtitle">Riwayat asesmen klinis awal, keluhan utama, tujuan terapi, &amp; skrining risiko</p></div>' +
          '<div class="row">' +
            '<button type="button" class="btn btn-secondary btn-sm" id="btnExportAsmCsv">' + UI.icon('download', 15) + ' Export CSV</button>' +
            '<button type="button" class="btn btn-primary btn-pill" id="btnAddAsm">' + UI.icon('plus', 15) + ' Tambah Assessment</button>' +
          '</div>' +
        '</div>' +
        '<div class="filter-bar">' +
          '<input type="search" id="asmSearch" class="input search-grow" placeholder="Cari ID CLICH, nama klien, atau keluhan..." value="' + UI.esc(asmState.query) + '" />' +
          (user.role !== 'Terapis'
            ? '<select id="asmFilterTh" class="select"><option value="">Semua Terapis</option>' +
                therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '"' + (asmState.therapistId === t.Therapist_ID ? ' selected' : '') + '>' + UI.esc(t.Full_Name) + '</option>'; }).join('') +
              '</select>'
            : '') +
        '</div>' +
        '<div id="asmTable">' + UI.skeletonTable(6) + '</div>' +
        '<div id="asmPag"></div>' +
      '</div>';

    document.getElementById('btnAddAsm').onclick = function () { Pages.openAssessmentModal(); };
    document.getElementById('btnExportAsmCsv').onclick = function () {
      const items = Pages._lastAssessments || [];
      UI.exportCsv('assessment-awal-ich.csv', ['Assessment_ID', 'Tanggal', 'Client_ID', 'Nama_Klien', 'Terapis', 'Keluhan_Utama', 'Tujuan_Terapi', 'Skrining_Risiko', 'Rekomendasi'],
        items.map(function (a) { return [a.Assessment_ID, a.Assessment_Date, a.Client_ID, a.Client_Name, a.Therapist_Name, a.Main_Complaint, a.Therapy_Goals, a.Risk_Screening, a.Initial_Recommendation]; }));
    };

    let t = null;
    document.getElementById('asmSearch').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { asmState.query = e.target.value; asmState.page = 1; loadAssessments(); }, 250); };
    const thSel = document.getElementById('asmFilterTh');
    if (thSel) thSel.onchange = function (e) { asmState.therapistId = e.target.value; asmState.page = 1; loadAssessments(); };

    loadAssessments();
  };

  function loadAssessments(force) {
    API.swr('asm_' + JSON.stringify(asmState), 'assessments.list', asmState, function (res) {
      Pages._lastAssessments = res.items || [];
      const el = document.getElementById('asmTable');
      const pg = document.getElementById('asmPag');
      if (!el) return;
      if (!res.items.length) {
        el.innerHTML = UI.emptyState('Belum Ada Assessment', 'Klik tombol "+ Tambah Assessment" di kanan atas untuk mencatat asesmen awal klien.',
          '<button type="button" class="btn btn-primary btn-sm" onclick="Pages.openAssessmentModal()">+ Tambah Assessment</button>');
        pg.innerHTML = ''; return;
      }
      el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Tanggal</th><th>Klien</th><th>Terapis</th><th>Keluhan Utama</th><th>Tujuan Terapi</th><th>Rekomendasi</th><th>Aksi</th>' +
        '</tr></thead><tbody>' +
        res.items.map(function (a) {
          return '<tr class="row-clickable" data-view-asm="' + UI.esc(a.Assessment_ID) + '" title="Klik baris untuk melihat detail lengkap assessment">' +
            '<td class="tabular"><div class="fw-600">' + UI.fmtDateID(a.Assessment_Date) + '</div><div class="text-xs mono muted">' + UI.esc(a.Assessment_ID) + '</div></td>' +
            '<td><div class="fw-600" style="color:var(--primary)">' + UI.esc(a.Client_Name) + '</div><div class="text-xs mono muted">' + UI.esc(a.Client_ID) + '</div></td>' +
            '<td>' + UI.esc(a.Therapist_Name) + '</td>' +
            '<td>' + UI.esc((a.Main_Complaint || '').slice(0, 75)) + ((a.Main_Complaint || '').length > 75 ? '…' : '') + '</td>' +
            '<td>' + UI.esc((a.Therapy_Goals || '-').slice(0, 65)) + ((a.Therapy_Goals || '').length > 65 ? '…' : '') + '</td>' +
            '<td>' + UI.esc(a.Initial_Recommendation || '-') + '</td>' +
            '<td><button type="button" class="btn btn-xs btn-secondary" data-edit-asm="' + UI.esc(a.Assessment_ID) + '">Edit</button></td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>';

      el.querySelectorAll('tr[data-view-asm]').forEach(function (tr) {
        tr.onclick = function (e) {
          if (e.target.closest('button')) return;
          const item = res.items.find(function (x) { return x.Assessment_ID === tr.getAttribute('data-view-asm'); });
          if (item) openAssessmentDetailModal(item);
        };
      });
      el.querySelectorAll('[data-edit-asm]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          const item = res.items.find(function (x) { return x.Assessment_ID === b.getAttribute('data-edit-asm'); });
          if (item) Pages.openAssessmentModal(item);
        };
      });

      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) { asmState.page = p; asmState.pageSize = ps; loadAssessments(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function openAssessmentDetailModal(a) {
    const body = UI.openModal('Detail Assessment — ' + a.Assessment_ID,
      '<div class="stack-md">' +
        '<div class="neu-tile" style="padding:14px">' +
          '<div class="row-between">' +
            '<div><span class="badge badge-blue mono">' + UI.esc(a.Client_ID) + '</span> <strong style="margin-left:6px;font-size:15px">' + UI.esc(a.Client_Name) + '</strong>' +
            '<div class="text-xs muted" style="margin-top:4px">Terapis Penilai: <strong>' + UI.esc(a.Therapist_Name) + '</strong> · Tanggal: <strong>' + UI.fmtDateID(a.Assessment_Date) + '</strong></div></div>' +
            '<button type="button" class="btn btn-xs btn-soft" id="btnAsmGo360">Profil 360° Klien</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-grid-2">' +
          '<div class="neu-tile" style="padding:12px"><div class="kpi-label">Keluhan Utama</div><div class="text-sm" style="margin-top:5px;white-space:pre-wrap">' + UI.esc(a.Main_Complaint || '-') + '</div></div>' +
          '<div class="neu-tile" style="padding:12px"><div class="kpi-label">Durasi &amp; Riwayat Keluhan</div><div class="text-sm" style="margin-top:5px;white-space:pre-wrap">' + UI.esc(a.Complaint_Duration_History || '-') + '</div></div>' +
          '<div class="neu-tile" style="padding:12px"><div class="kpi-label">Riwayat Medis / Psikologis</div><div class="text-sm" style="margin-top:5px;white-space:pre-wrap">' + UI.esc(a.Medical_Psych_History || '-') + '</div></div>' +
          '<div class="neu-tile" style="padding:12px"><div class="kpi-label">Tujuan Terapi (Therapy Goals)</div><div class="text-sm" style="margin-top:5px;white-space:pre-wrap">' + UI.esc(a.Therapy_Goals || '-') + '</div></div>' +
          '<div class="neu-tile" style="padding:12px"><div class="kpi-label">Skrining Risiko Klinis</div><div class="text-sm" style="margin-top:5px">' + UI.esc(a.Risk_Screening || '-') + '</div></div>' +
          '<div class="neu-tile" style="padding:12px"><div class="kpi-label">Rekomendasi Rencana Awal</div><div class="text-sm" style="margin-top:5px">' + UI.esc(a.Initial_Recommendation || '-') + '</div></div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Tutup</button>' +
          '<button type="button" class="btn btn-primary" id="btnAsmDetailEdit">Edit Assessment</button>' +
        '</div>' +
      '</div>', { lg: true });

    body.querySelector('#btnAsmGo360').onclick = function () { UI.closeModal(); App.go('clients/' + a.Client_ID); };
    body.querySelector('#btnAsmDetailEdit').onclick = function () { Pages.openAssessmentModal(a); };
  }

  Pages.openAssessmentModal = function (existing) {
    const a = existing || {};
    const user = App.state.user || {};
    const therapists = App.state.therapists || [];
    const selectedTh = a.Therapist_ID || (user.role === 'Terapis' ? user.therapistId : (therapists[0] ? therapists[0].Therapist_ID : ''));

    const body = UI.openModal(a.Assessment_ID ? ('Edit Assessment — ' + a.Assessment_ID) : 'Tambah Assessment Awal Klien',
      '<form id="asmForm" class="stack-md">' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>Cari Klien (Ketik 2–3 Karakter) *</label><div id="asmClientAc"></div></div>' +
          '<div class="field"><label>Terapis Penilai *</label><select name="Therapist_ID" id="asmTherapist" class="select"' + (user.role === 'Terapis' ? ' disabled' : '') + '>' +
            therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '"' + (selectedTh === t.Therapist_ID ? ' selected' : '') + '>' + UI.esc(t.Full_Name) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>Tanggal Assessment</label><input type="date" name="Assessment_Date" class="input" value="' + UI.esc((a.Assessment_Date || '').slice(0, 10) || UI.todayStr()) + '" /></div>' +
        '</div>' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Keluhan Utama *</label><textarea name="Main_Complaint" class="textarea" required placeholder="Deskripsikan keluhan utama klien...">' + UI.esc(a.Main_Complaint || '') + '</textarea></div>' +
          '<div class="field"><label>Durasi &amp; Riwayat Keluhan</label><textarea name="Complaint_Duration_History" class="textarea" placeholder="Sejak kapan muncul, pemicu utama, frekuensi...">' + UI.esc(a.Complaint_Duration_History || '') + '</textarea></div>' +
          '<div class="field"><label>Riwayat Medis / Psikologis</label><textarea name="Medical_Psych_History" class="textarea" placeholder="Riwayat pengobatan, psikiater, trauma masa lalu...">' + UI.esc(a.Medical_Psych_History || '') + '</textarea></div>' +
          '<div class="field"><label>Tujuan Terapi (Therapy Goals)</label><textarea name="Therapy_Goals" class="textarea" placeholder="Target perubahan terukur yang diinginkan klien...">' + UI.esc(a.Therapy_Goals || '') + '</textarea></div>' +
          '<div class="field"><label>Skrining Risiko Klinis</label><input name="Risk_Screening" class="input" placeholder="cth: Tidak ada risiko self-harm; aman untuk induksi hipnosis" value="' + UI.esc(a.Risk_Screening || '') + '" /></div>' +
          '<div class="field"><label>Rekomendasi Rencana Awal</label><input name="Initial_Recommendation" class="input" placeholder="cth: Rekomendasi Paket Ansietas 4 sesi" value="' + UI.esc(a.Initial_Recommendation || '') + '" /></div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button>' +
          '<button type="submit" class="btn btn-primary" id="btnSaveAsm">' + (a.Assessment_ID ? 'Simpan Perubahan' : 'Simpan Assessment Awal') + '</button>' +
        '</div>' +
      '</form>', { lg: true });

    const ac = UI.mountClientAutocomplete(body.querySelector('#asmClientAc'), {
      initialId: a.Client_ID || '',
      initialLabel: a.Client_ID ? (a.Client_ID + ' — ' + (a.Client_Name || '')) : ''
    });

    const form = body.querySelector('#asmForm');
    form.onsubmit = async function (e) {
      e.preventDefault();
      const cid = ac.getValue();
      if (!cid) { UI.toast('Silakan pilih klien dari daftar pencarian terlebih dahulu.', 'warn'); return; }
      const fd = new FormData(form);
      const payload = {
        Assessment_ID: a.Assessment_ID || '',
        Client_ID: cid,
        Therapist_ID: user.role === 'Terapis' ? user.therapistId : body.querySelector('#asmTherapist').value
      };
      fd.forEach(function (v, k) { payload[k] = v; });
      const btn = body.querySelector('#btnSaveAsm');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        const r = await API.call('assessments.save', payload);
        UI.toast(r.message, 'ok');
        UI.closeModal();
        loadAssessments(true);
      } catch (err) { UI.toast(err.message, 'err'); }
      finally { btn.disabled = false; btn.textContent = a.Assessment_ID ? 'Simpan Perubahan' : 'Simpan Assessment Awal'; }
    };
  };

  /* ============================================================
   * W-07: APPOINTMENTS & SCHEDULING MANAGER
   * ============================================================ */
  const apptState = { status: 'All', therapistId: '', query: '', startDate: '', endDate: '', page: 1, pageSize: 20 };

  Pages.appointments = function (container) {
    const therapists = App.state.therapists || [];
    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Penjadwalan Sesi (Appointments)</h1><p class="card-subtitle">Status baku: Scheduled, Confirmed, Completed, Cancelled, No Show · Deteksi bentrok terapis otomatis</p></div>' +
        '<button type="button" class="btn btn-primary btn-pill" id="btnBookAppt">' + UI.icon('plus', 15) + ' Buat Jadwal Baru</button>' +
      '</div>' +
      '<div class="pill-tabs" id="apptStatusPills" style="margin-bottom:12px">' +
        ['All', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'].map(function (s) {
          return '<button type="button" class="pill-tab' + (apptState.status === s ? ' active' : '') + '" data-st="' + s + '">' + (s === 'All' ? 'Semua' : s) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="filter-bar">' +
        '<input type="search" id="apQuery" class="input search-grow" placeholder="Cari ID, klien, atau terapis..." value="' + UI.esc(apptState.query) + '" />' +
        '<select id="apTh" class="select"><option value="">Semua Terapis</option>' + therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '">' + UI.esc(t.Full_Name) + '</option>'; }).join('') + '</select>' +
        '<input type="date" id="apStart" class="input" value="' + UI.esc(apptState.startDate) + '" />' +
        '<input type="date" id="apEnd" class="input" value="' + UI.esc(apptState.endDate) + '" />' +
      '</div>' +
      '<div id="apTable">' + UI.skeletonTable(8) + '</div><div id="apPag"></div>' +
      '</div>';

    document.getElementById('btnBookAppt').onclick = function () { Pages.openAppointmentModal(); };
    document.getElementById('apptStatusPills').querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        apptState.status = b.getAttribute('data-st'); apptState.page = 1;
        document.getElementById('apptStatusPills').querySelectorAll('.pill-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
        loadAppointments();
      };
    });
    let t = null;
    document.getElementById('apQuery').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { apptState.query = e.target.value; apptState.page = 1; loadAppointments(); }, 250); };
    document.getElementById('apTh').onchange = function (e) { apptState.therapistId = e.target.value; apptState.page = 1; loadAppointments(); };
    document.getElementById('apStart').onchange = function (e) { apptState.startDate = e.target.value; apptState.page = 1; loadAppointments(); };
    document.getElementById('apEnd').onchange = function (e) { apptState.endDate = e.target.value; apptState.page = 1; loadAppointments(); };
    loadAppointments();
  };

  function loadAppointments(force) {
    API.swr('appts_' + JSON.stringify(apptState), 'appointments.list', apptState, function (res) {
      const el = document.getElementById('apTable');
      const pg = document.getElementById('apPag');
      if (!el) return;
      if (!res.items.length) {
        el.innerHTML = UI.emptyState('Belum Ada Jadwal', 'Tidak ada jadwal sesi yang sesuai filter.',
          '<button type="button" class="btn btn-primary btn-sm" onclick="Pages.openAppointmentModal()">+ Buat Jadwal Baru</button>');
        pg.innerHTML = ''; return;
      }
      const canRme = App.hasPerm('rme');
      el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>Tanggal &amp; Jam</th><th>Klien</th><th>Terapis</th><th>Layanan / Kuota</th><th>Tarif</th><th>Status</th><th>Aksi</th>' +
        '</tr></thead><tbody>' +
        res.items.map(function (a) {
          const icTag = a.Client_IC_Status !== 'Valid' ? '<span class="badge badge-rose">IC Belum Valid</span>' : '';
          const pkgInfo = a.Package_Name ? ('<div class="text-xs muted">' + UI.esc(a.Package_Name) + ' (Sisa ' + a.Package_Remaining + '/' + a.Package_Total + ')</div>') : '';
          return '<tr>' +
            '<td class="tabular"><div class="fw-600">' + UI.fmtDateID(a.Appointment_Date) + '</div><div class="text-xs muted">' + UI.esc(a.Start_Time + '–' + a.End_Time) + '</div></td>' +
            '<td><a href="#/clients/' + UI.esc(a.Client_ID) + '" class="fw-600">' + UI.esc(a.Client_Name) + '</a><div class="text-xs mono muted">' + UI.esc(a.Client_ID) + '</div></td>' +
            '<td>' + UI.esc(a.Therapist_Name) + '</td>' +
            '<td><div>' + UI.esc(a.Service_Type) + ' ' + icTag + '</div>' + pkgInfo + '</td>' +
            '<td class="tabular">' + UI.fmtRp(a.Session_Fee) + '</td>' +
            '<td>' + UI.statusBadge(a.Status) + '</td>' +
            '<td><div class="row" style="gap:5px">' +
              (a.Status === 'Scheduled' ? '<button class="btn btn-xs btn-mint" data-set-st="Confirmed" data-id="' + UI.esc(a.Appointment_ID) + '">Confirm</button>' : '') +
              (canRme && a.Status !== 'Cancelled' ? '<button class="btn btn-xs btn-primary" onclick="App.go(\'rme\', {appointmentId:\'' + UI.esc(a.Appointment_ID) + '\', clientId:\'' + UI.esc(a.Client_ID) + '\'})">RME</button>' : '') +
              (a.Status !== 'Completed' && a.Status !== 'Cancelled' ? '<button class="btn btn-xs btn-danger-outline" data-set-st="Cancelled" data-id="' + UI.esc(a.Appointment_ID) + '">Batal</button>' : '') +
              (a.Status === 'Scheduled' || a.Status === 'Confirmed' ? '<button class="btn btn-xs btn-secondary" data-set-st="No Show" data-id="' + UI.esc(a.Appointment_ID) + '">No Show</button>' : '') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>';

      el.querySelectorAll('[data-set-st]').forEach(function (b) {
        b.onclick = async function () {
          const id = b.getAttribute('data-id');
          const st = b.getAttribute('data-set-st');
          b.disabled = true;
          try {
            const r = await API.call('appointments.setStatus', { Appointment_ID: id, Status: st });
            UI.toast(r.message, 'ok');
            loadAppointments(true);
          } catch (e) { UI.toast(e.message, 'err'); b.disabled = false; }
        };
      });

      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) { apptState.page = p; apptState.pageSize = ps; loadAppointments(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  Pages.openAppointmentModal = function (prefill) {
    const p = prefill || {};
    const therapists = App.state.therapists || [];
    const body = UI.openModal(p.Appointment_ID ? ('Edit Jadwal ' + p.Appointment_ID) : 'Buat Jadwal Sesi Baru',
      '<form id="apptForm" class="stack-md">' +
        '<div class="field"><label>Cari Klien (Ketik 2–3 Karakter) *</label><div id="apModalClientAc"></div></div>' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Terapis *</label><select name="Therapist_ID" id="apModalTh" class="select" required>' +
            therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '" data-fee="' + (t.Default_Session_Fee || 0) + '"' + (p.Therapist_ID === t.Therapist_ID ? ' selected' : '') + '>' + UI.esc(t.Full_Name) + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>Status Awal</label><select name="Status" class="select"><option value="Scheduled">Scheduled</option><option value="Confirmed">Confirmed</option></select></div>' +
          '<div class="field"><label>Tanggal Sesi *</label><input type="date" name="Appointment_Date" class="input" required value="' + UI.esc(p.Appointment_Date || UI.todayStr()) + '" /></div>' +
          '<div class="field"><label>Layanan / Topik Sesi</label><input name="Service_Type" class="input" value="' + UI.esc(p.Service_Type || 'Sesi Hipnoterapi Klinis') + '" /></div>' +
          '<div class="field"><label>Jam Mulai *</label><input type="time" name="Start_Time" class="input" required value="' + UI.esc(p.Start_Time || '09:00') + '" /></div>' +
          '<div class="field"><label>Jam Selesai *</label><input type="time" name="End_Time" class="input" required value="' + UI.esc(p.End_Time || '10:30') + '" /></div>' +
          '<div class="field"><label>Tautkan Paket Aktif Klien (Opsional)</label><select name="Client_Pkg_ID" id="apModalPkg" class="select"><option value="">-- Sesi Satuan (Non-Paket) --</option></select></div>' +
          '<div class="field"><label>Tarif Sesi (Rp)</label><input type="number" name="Session_Fee" id="apModalFee" class="input tabular" value="' + (p.Session_Fee || (therapists[0] ? therapists[0].Default_Session_Fee : 750000)) + '" /></div>' +
        '</div>' +
        '<label class="row text-sm" style="cursor:pointer"><input type="checkbox" name="autoCreateInvoice" value="1" /> Terbitkan Invoice otomatis jika Sesi Satuan</label>' +
        '<div class="field"><label>Catatan Jadwal</label><textarea name="Notes" class="textarea" style="min-height:60px"></textarea></div>' +
        '<div id="apConflictErr" class="alert alert-rose" hidden></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary" id="btnSaveAppt">Simpan Jadwal</button></div>' +
      '</form>');

    const pkgSel = body.querySelector('#apModalPkg');
    function loadClientPkgs(cid) {
      if (!cid) return;
      API.call('packages.clientList', { clientId: cid, status: 'Active', pageSize: 20 }).then(function (r) {
        pkgSel.innerHTML = '<option value="">-- Sesi Satuan (Non-Paket) --</option>' +
          (r.items || []).filter(function (x) { return Number(x.Remaining_Quota) > 0; }).map(function (x) {
            return '<option value="' + UI.esc(x.Client_Pkg_ID) + '">' + UI.esc(x.Package_Name) + ' (Sisa ' + x.Remaining_Quota + '/' + x.Total_Quota + ')</option>';
          }).join('');
      }).catch(function () {});
    }

    const ac = UI.mountClientAutocomplete(body.querySelector('#apModalClientAc'), {
      initialId: p.Client_ID || '',
      initialLabel: p.Client_ID ? (p.Client_ID + ' — ' + (p.Client_Name || '')) : '',
      onSelect: function (cl) { if (cl) loadClientPkgs(cl.Client_ID); }
    });
    if (p.Client_ID) loadClientPkgs(p.Client_ID);

    body.querySelector('#apModalTh').onchange = function (e) {
      const opt = e.target.selectedOptions[0];
      if (opt && opt.getAttribute('data-fee')) body.querySelector('#apModalFee').value = opt.getAttribute('data-fee');
    };

    const form = body.querySelector('#apptForm');
    form.onsubmit = async function (e) {
      e.preventDefault();
      const cid = ac.getValue();
      if (!cid) { UI.toast('Pilih klien terlebih dahulu.', 'warn'); return; }
      const fd = new FormData(form);
      const payload = { Client_ID: cid, autoCreateInvoice: form.querySelector('[name=autoCreateInvoice]').checked };
      fd.forEach(function (v, k) { if (k !== 'autoCreateInvoice') payload[k] = v; });
      const btn = body.querySelector('#btnSaveAppt');
      btn.disabled = true; btn.textContent = 'Menyimpan...';
      try {
        const res = await API.call('appointments.save', payload);
        UI.toast(res.message, 'ok');
        UI.closeModal();
        if (App.currentRoute === 'appointments') loadAppointments(true);
        else if (App.currentRoute === 'dashboard') Pages.dashboard(document.getElementById('pageContainer'));
      } catch (err) {
        if (err.code === 'SCHEDULE_CONFLICT') {
          const er = body.querySelector('#apConflictErr'); er.textContent = err.message; er.hidden = false;
        }
        UI.toast(err.message, 'err');
      } finally { btn.disabled = false; btn.textContent = 'Simpan Jadwal'; }
    };
  };

  /* ============================================================
   * W-08: THERAPY SESSION / REKAM MEDIS ELEKTRONIK (RME)
   * ============================================================ */
  const rmeListState = { query: '', page: 1, pageSize: 20 };

  Pages.rme = function (container, params) {
    params = params || {};
    const user = App.state.user || {};
    const therapists = App.state.therapists || [];

    container.innerHTML =
      '<div id="rmeIcWarning" class="alert alert-rose" hidden>' +
        '<div><strong>PERINGATAN KLINIS — INFORMED CONSENT BELUM VALID!</strong><div class="text-sm" id="rmeIcWarnText"></div></div>' +
        '<button type="button" class="btn btn-sm btn-danger-outline" onclick="App.go(\'documents\')">Buka Verifikasi Dokumen IC</button>' +
      '</div>' +
      '<div class="neu-card card-pad">' +
        '<div class="card-header">' +
          '<div><h1>Sesi Terapi / Rekam Medis Elektronik (RME)</h1><p class="card-subtitle">Pencatatan klinis tanpa batas sesi · Ringkasan sesi lalu otomatis · Sinkronisasi atomik kuota &amp; komisi</p></div>' +
          '<div id="rmeSessionBadge"></div>' +
        '</div>' +
        '<div class="form-grid-3" style="margin-bottom:14px">' +
          '<div class="field"><label>Cari Klien (Ketik 2–3 Karakter) *</label><div id="rmeClientAc"></div></div>' +
          '<div class="field"><label>Tautkan Jadwal Sesi (Opsional)</label><select id="rmeApptSel" class="select"><option value="">-- Pilih Klien Dahulu --</option></select></div>' +
          '<div class="field"><label>Paket Aktif (Kuota Terpotong Saat Selesai)</label><select id="rmePkgSel" class="select"><option value="">-- Sesi Satuan --</option></select></div>' +
        '</div>' +
        '<div id="rmePrevBox" class="alert alert-blue" style="margin-bottom:16px;display:block" hidden></div>' +
        '<form id="rmeForm" class="stack-md">' +
          '<input type="hidden" id="rmeIdInput" value="" />' +
          '<div class="form-grid-3">' +
            '<div class="field"><label>Terapis Penanggung Jawab *</label><select id="rmeTherapist" class="select"' + (user.role === 'Terapis' ? ' disabled' : '') + '>' +
              therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '"' + (user.therapistId === t.Therapist_ID ? ' selected' : '') + '>' + UI.esc(t.Full_Name) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><label>Tanggal Sesi *</label><input type="date" id="rmeDate" class="input" value="' + UI.todayStr() + '" required /></div>' +
            '<div class="field"><label>Skala SUDS (0 Tenang – 10 Maksimal): <strong id="sudsVal">5</strong>/10</label><input type="range" id="rmeSuds" min="0" max="10" step="0.5" value="5" style="margin-top:8px" /></div>' +
          '</div>' +
          '<div class="form-grid-2">' +
            '<div class="field"><label>Perkembangan Keluhan Hari Ini *</label><textarea id="rmeComplaint" class="textarea" required placeholder="Keluhan terkini, intensitas gejala, perkembangan dari sesi sebelumnya..."></textarea></div>' +
            '<div class="field"><label>Materi Konseling &amp; Eksplorasi Subconscious</label><textarea id="rmeCounseling" class="textarea" placeholder="Temuan akar masalah, keyakinan bawah sadar, refleksi konseling..."></textarea></div>' +
            '<div class="field"><label>Rancangan Hipnoterapi &amp; Induksi</label><textarea id="rmePlan" class="textarea" placeholder="Metode induksi, deepener, sugesti pra-intervensi..."></textarea></div>' +
            '<div class="field"><label>Teknik Intervensi Klinis</label><textarea id="rmeIntervention" class="textarea" placeholder="cth: Age Regression, Parts Integration, Cognitive Reframing, Kinesthetic Anchor..."></textarea></div>' +
            '<div class="field"><label>Kedalaman Trance</label><select id="rmeTrance" class="select">' +
              ['Light / Hypnoidal', 'Medium / Cataleptic', 'Deep / Somnambulism', 'Esdaile State'].map(function (tr) { return '<option value="' + tr + '">' + tr + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><label>Respons Klien Selama Sesi</label><textarea id="rmeResponse" class="textarea" placeholder="Respons ideomotor, abreaksi, relaksasi napas..."></textarea></div>' +
            '<div class="field"><label>Perubahan Pascasesi (Waking State)</label><textarea id="rmeChange" class="textarea" placeholder="Perubahan fisik & emosional setelah bangun dari trance..."></textarea></div>' +
            '<div class="field"><label>Tugas Rumah (Homework)</label><textarea id="rmeHomework" class="textarea" placeholder="Latihan anchor harian, audio self-hypnosis, jurnal..."></textarea></div>' +
          '</div>' +
          '<div class="field"><label>Rekomendasi Sesi Berikutnya</label><input id="rmeNextNote" class="input" placeholder="Rencana tindak lanjut atau fokus sesi berikutnya..." /></div>' +
          '<div class="sticky-action-bar">' +
            '<div class="text-xs muted">Aksi <strong>Finalize &amp; Selesaikan</strong> bersifat atomik (<code>LockService</code>): status jadwal → Completed, kuota paket -1 (sekali), Terakhir Sesi terupdate, &amp; snapshot komisi tercipta.</div>' +
            '<div class="row">' +
              '<button type="button" class="btn btn-secondary" id="btnRmeDraft">Simpan Draft RME</button>' +
              '<button type="button" class="btn btn-primary btn-pill" id="btnRmeFinalize">' + UI.icon('check', 16) + ' Finalize &amp; Selesaikan Sesi</button>' +
            '</div>' +
          '</div>' +
        '</form>' +
      '</div>' +
      '<div class="neu-card card-pad">' +
        '<div class="card-header"><div><h2>Riwayat Sesi Terapi (RME)</h2></div><input type="search" id="rmeListSearch" class="input" style="width:240px" placeholder="Cari klien atau keluhan..." /></div>' +
        '<div id="rmeHistoryTable">' + UI.skeletonTable(5) + '</div><div id="rmeHistoryPag"></div>' +
      '</div>';

    document.getElementById('rmeSuds').oninput = function (e) { document.getElementById('sudsVal').textContent = e.target.value; };

    let currentClientId = params.clientId || '';
    const ac = UI.mountClientAutocomplete(document.getElementById('rmeClientAc'), {
      initialId: currentClientId,
      onSelect: function (cl) {
        if (cl) { currentClientId = cl.Client_ID; loadRmeContext(cl.Client_ID, ''); }
      }
    });

    function loadRmeContext(cid, apptId) {
      if (!cid && !apptId) return;
      API.call('rme.context', { clientId: cid, appointmentId: apptId }).then(function (ctxData) {
        currentClientId = ctxData.client.Client_ID;
        ac.setValue(ctxData.client.Client_ID, ctxData.client.Client_ID + ' — ' + ctxData.client.Full_Name);

        // Banner Peringatan Informed Consent
        const warn = document.getElementById('rmeIcWarning');
        if (ctxData.icWarning) {
          document.getElementById('rmeIcWarnText').textContent = ctxData.client.Full_Name + ' (' + ctxData.client.Client_ID + ') berstatus Informed Consent: ' + (ctxData.client.Informed_Consent_Status || 'Belum Ada') + '. Pastikan persetujuan tindakan sudah diverifikasi sebelum induksi.';
          warn.hidden = false;
        } else {
          warn.hidden = true;
        }

        document.getElementById('rmeSessionBadge').innerHTML =
          '<span class="badge badge-blue">Sesi Ke-' + ctxData.nextSessionNumber + '</span> ' +
          (ctxData.icValid ? '<span class="badge badge-mint">IC Valid</span>' : '<span class="badge badge-rose">IC Belum Valid</span>');

        // Isi dropdown jadwal & paket aktif
        const apSel = document.getElementById('rmeApptSel');
        apSel.innerHTML = '<option value="">-- Tanpa Tautan Jadwal --</option>' +
          (ctxData.openAppointments || []).map(function (a) {
            const sel = (ctxData.appointment && ctxData.appointment.Appointment_ID === a.Appointment_ID) ? ' selected' : '';
            return '<option value="' + UI.esc(a.Appointment_ID) + '"' + sel + '>' + UI.fmtDateID(a.Appointment_Date) + ' ' + UI.esc(a.Start_Time) + ' (' + UI.esc(a.Status) + ')</option>';
          }).join('');

        const pkgSel = document.getElementById('rmePkgSel');
        pkgSel.innerHTML = '<option value="">-- Sesi Satuan (Tidak Potong Kuota) --</option>' +
          (ctxData.activePackages || []).map(function (p) {
            const sel = (ctxData.appointment && ctxData.appointment.Client_Pkg_ID === p.Client_Pkg_ID) ? ' selected' : '';
            return '<option value="' + UI.esc(p.Client_Pkg_ID) + '"' + sel + '>' + UI.esc(p.Package_Name) + ' (Sisa ' + p.Remaining_Quota + '/' + p.Total_Quota + ')</option>';
          }).join('');

        // Panel Ringkasan Sesi Sebelumnya
        const prevBox = document.getElementById('rmePrevBox');
        if (ctxData.previousRme) {
          const pr = ctxData.previousRme;
          prevBox.innerHTML =
            '<div class="row-between" style="margin-bottom:6px"><strong>Ringkasan RME Sesi Sebelumnya (Sesi #' + pr.Session_Number + ' · ' + UI.fmtDateID(pr.Session_Date) + ' · ' + UI.esc(pr.Therapist_Name || '-') + ')</strong>' +
            (pr.SUDS_Score !== '' ? '<span class="badge badge-mint">SUDS Lalu: ' + pr.SUDS_Score + '/10</span>' : '') + '</div>' +
            '<div class="form-grid-3 text-sm">' +
              '<div><strong>Keluhan &amp; Perubahan:</strong><div class="muted">' + UI.esc(pr.Complaint_Update || '-') + ' → ' + UI.esc(pr.Post_Session_Change || '-') + '</div></div>' +
              '<div><strong>Intervensi &amp; Trance:</strong><div class="muted">' + UI.esc(pr.Intervention_Technique || '-') + ' (' + UI.esc(pr.Trance_Depth || '-') + ')</div></div>' +
              '<div><strong>Homework Sesi Lalu:</strong><div style="color:var(--primary-ink);font-weight:600">' + UI.esc(pr.Homework || 'Tidak ada homework') + '</div></div>' +
            '</div>';
          prevBox.hidden = false;
        } else if (ctxData.latestAssessment) {
          prevBox.innerHTML = '<strong>Konteks Assessment Awal (' + UI.fmtDateID(ctxData.latestAssessment.Assessment_Date) + '):</strong> ' + UI.esc(ctxData.latestAssessment.Main_Complaint) + ' · Target: ' + UI.esc(ctxData.latestAssessment.Therapy_Goals || '-');
          prevBox.hidden = false;
        } else {
          prevBox.hidden = true;
        }

        // Bila sudah ada draft/RME untuk appointment ini, muat ke form
        if (ctxData.existingRme) {
          const ex = ctxData.existingRme;
          document.getElementById('rmeIdInput').value = ex.RME_ID;
          document.getElementById('rmeDate').value = (ex.Session_Date || '').slice(0, 10) || UI.todayStr();
          if (ex.SUDS_Score !== '') { document.getElementById('rmeSuds').value = ex.SUDS_Score; document.getElementById('sudsVal').textContent = ex.SUDS_Score; }
          document.getElementById('rmeComplaint').value = ex.Complaint_Update || '';
          document.getElementById('rmeCounseling').value = ex.Counseling_Material || '';
          document.getElementById('rmePlan').value = ex.Hypnotherapy_Plan || '';
          document.getElementById('rmeIntervention').value = ex.Intervention_Technique || '';
          document.getElementById('rmeTrance').value = ex.Trance_Depth || 'Medium / Cataleptic';
          document.getElementById('rmeResponse').value = ex.Client_Response || '';
          document.getElementById('rmeChange').value = ex.Post_Session_Change || '';
          document.getElementById('rmeHomework').value = ex.Homework || '';
          document.getElementById('rmeNextNote').value = ex.Next_Session_Note || '';
        } else {
          document.getElementById('rmeIdInput').value = '';
        }
      }).catch(function (e) { UI.toast(e.message, 'err'); });
    }

    if (params.clientId || params.appointmentId) loadRmeContext(params.clientId, params.appointmentId);

    async function submitRme(finalize) {
      if (!currentClientId) { UI.toast('Pilih klien terlebih dahulu.', 'warn'); return; }
      const complaint = document.getElementById('rmeComplaint').value.trim();
      if (!complaint) { UI.toast('Kolom Perkembangan Keluhan wajib diisi.', 'warn'); return; }
      const btn = document.getElementById(finalize ? 'btnRmeFinalize' : 'btnRmeDraft');
      btn.disabled = true;
      try {
        const res = await API.call('rme.save', {
          RME_ID: document.getElementById('rmeIdInput').value,
          Client_ID: currentClientId,
          Appointment_ID: document.getElementById('rmeApptSel').value,
          Therapist_ID: user.role === 'Terapis' ? user.therapistId : document.getElementById('rmeTherapist').value,
          Client_Pkg_ID: document.getElementById('rmePkgSel').value,
          Session_Date: document.getElementById('rmeDate').value,
          SUDS_Score: document.getElementById('rmeSuds').value,
          Complaint_Update: complaint,
          Counseling_Material: document.getElementById('rmeCounseling').value,
          Hypnotherapy_Plan: document.getElementById('rmePlan').value,
          Intervention_Technique: document.getElementById('rmeIntervention').value,
          Trance_Depth: document.getElementById('rmeTrance').value,
          Client_Response: document.getElementById('rmeResponse').value,
          Post_Session_Change: document.getElementById('rmeChange').value,
          Homework: document.getElementById('rmeHomework').value,
          Next_Session_Note: document.getElementById('rmeNextNote').value,
          finalize: finalize
        });
        UI.toast(res.message, 'ok');
        if (finalize) {
          document.getElementById('rmeForm').reset();
          document.getElementById('rmeIdInput').value = '';
          loadRmeContext(currentClientId, '');
        }
        loadRmeHistory(true);
      } catch (err) { UI.toast(err.message, 'err'); }
      finally { btn.disabled = false; }
    }

    document.getElementById('btnRmeDraft').onclick = function () { submitRme(false); };
    document.getElementById('btnRmeFinalize').onclick = function () { submitRme(true); };

    let t = null;
    document.getElementById('rmeListSearch').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { rmeListState.query = e.target.value; rmeListState.page = 1; loadRmeHistory(); }, 250); };
    loadRmeHistory();
  };

  function loadRmeHistory(force) {
    API.swr('rme_list_' + JSON.stringify(rmeListState), 'rme.list', rmeListState, function (res) {
      const el = document.getElementById('rmeHistoryTable');
      const pg = document.getElementById('rmeHistoryPag');
      if (!el) return;
      if (!res.items.length) {
        el.innerHTML = UI.emptyState('Belum Ada Riwayat RME', 'Catatan sesi terapi yang disimpan akan muncul di sini.');
        pg.innerHTML = ''; return;
      }
      el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Sesi</th><th>Tanggal</th><th>Klien</th><th>Terapis</th><th>Keluhan &amp; Perubahan</th><th>Trance / SUDS</th><th>Status</th></tr></thead><tbody>' +
        res.items.map(function (r) {
          return '<tr><td><span class="badge badge-blue">#' + r.Session_Number + '</span></td>' +
            '<td class="tabular">' + UI.fmtDateID(r.Session_Date) + '</td>' +
            '<td><a href="#/clients/' + UI.esc(r.Client_ID) + '" class="fw-600">' + UI.esc(r.Client_Name) + '</a><div class="text-xs mono muted">' + UI.esc(r.Client_ID) + '</div></td>' +
            '<td>' + UI.esc(r.Therapist_Name) + '</td>' +
            '<td><div class="text-sm">' + UI.esc((r.Complaint_Update || '').slice(0, 75)) + '</div><div class="text-xs muted">HW: ' + UI.esc((r.Homework || '-').slice(0, 60)) + '</div></td>' +
            '<td class="text-xs">' + UI.esc(r.Trance_Depth || '-') + (r.SUDS_Score !== '' ? (' · SUDS ' + r.SUDS_Score) : '') + '</td>' +
            '<td>' + UI.statusBadge(String(r.Is_Finalized) === 'TRUE' ? 'Completed' : 'Draft') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      pg.innerHTML = '';
      pg.appendChild(UI.renderPagination(res, function (p, ps) { rmeListState.page = p; rmeListState.pageSize = ps; loadRmeHistory(); }));
    }, { force: force }).catch(function (e) { UI.toast(e.message, 'err'); });
  }
})(window);
