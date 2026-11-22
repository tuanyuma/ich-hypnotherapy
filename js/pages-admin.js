/**
 * pages-admin.js — W-15 System Settings, Staff RBAC Matrix, Master Therapists,
 * ScriptProperties Secrets (Masked), Utilitas Migrasi Database (Dry-Run Pindai + Delta-Sync), & Audit Trail.
 */
(function (global) {
  'use strict';

  const Pages = global.Pages || (global.Pages = {});
  const adminState = { tab: 'therapists' };

  Pages.settings = function (container) {
    const isOwner = App.state.user && App.state.user.role === 'Owner';
    const hasAudit = App.hasPerm('audit');
    if (!isOwner && adminState.tab === 'staff') adminState.tab = 'therapists';

    container.innerHTML = '<div class="neu-card card-pad">' +
      '<div class="card-header">' +
        '<div><h1>Pengaturan Sistem, RBAC, Migrasi &amp; Audit Trail</h1><p class="card-subtitle">Kredensial API disimpan eksklusif di Script Properties (tersamar) · Migrasi aman tanpa menyentuh spreadsheet lama</p></div>' +
        '<div class="row">' +
          '<button type="button" class="btn btn-sm btn-secondary" id="btnMyPass">Ubah Sandi Saya</button>' +
          (isOwner ? '<button type="button" class="btn btn-sm btn-soft" id="btnSeedDemo" title="Hanya berjalan bila database masih kosong">Muat Data Contoh</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="sub-tabs" id="admSubTabs">' +
        '<button type="button" class="sub-tab' + (adminState.tab === 'therapists' ? ' active' : '') + '" data-at="therapists">Master Terapis</button>' +
        (isOwner ? '<button type="button" class="sub-tab' + (adminState.tab === 'staff' ? ' active' : '') + '" data-at="staff">Akun Staf &amp; RBAC</button>' : '') +
        (isOwner ? '<button type="button" class="sub-tab' + (adminState.tab === 'config' ? ' active' : '') + '" data-at="config">Klinik, WA API &amp; Rahasia</button>' : '') +
        (isOwner ? '<button type="button" class="sub-tab' + (adminState.tab === 'migrasi' ? ' active' : '') + '" data-at="migrasi">Migrasi Database</button>' : '') +
        (hasAudit ? '<button type="button" class="sub-tab' + (adminState.tab === 'audit' ? ' active' : '') + '" data-at="audit">Audit Trail</button>' : '') +
      '</div>' +
      '<div id="admBody"></div>' +
      '</div>';

    document.getElementById('btnMyPass').onclick = openChangeMyPasswordModal;
    const seedBtn = document.getElementById('btnSeedDemo');
    if (seedBtn) {
      seedBtn.onclick = async function () {
        if (!confirm('Muat 3 klien, 2 terapis, 2 paket, 3 jadwal, dan 1 RME contoh? (Hanya berjalan jika database klien masih kosong)')) return;
        try {
          const r = await API.call('system.seedDemo', {});
          UI.toast(r.message, 'ok');
          await App.refreshBootstrap();
          App.go('dashboard');
        } catch (e) { UI.toast(e.message, 'err'); }
      };
    }

    document.getElementById('admSubTabs').querySelectorAll('[data-at]').forEach(function (b) {
      b.onclick = function () { adminState.tab = b.getAttribute('data-at'); Pages.settings(container); };
    });

    if (adminState.tab === 'therapists') renderTherapistsTab();
    else if (adminState.tab === 'staff') renderStaffTab();
    else if (adminState.tab === 'config') renderConfigSecretsTab();
    else if (adminState.tab === 'migrasi') renderMigrasiTab();
    else renderAuditTab();
  };

  /* 1. MASTER TERAPIS */
  function renderTherapistsTab() {
    const body = document.getElementById('admBody');
    const items = App.state.therapists || [];
    body.innerHTML = '<div class="row-between" style="margin-bottom:12px"><span class="text-sm muted">Tarif &amp; rate komisi default yang dijadikan snapshot saat sesi RME selesai</span>' +
      '<button type="button" class="btn btn-sm btn-primary" id="btnAddTh">+ Tambah Terapis</button></div>' +
      (items.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Nama Terapis</th><th>Spesialisasi</th><th>Tarif Default</th><th>Komisi Default</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
        items.map(function (t) {
          const commTxt = t.Commission_Type === 'Fixed' ? UI.fmtRp(t.Commission_Rate) : (t.Commission_Rate + '%');
          return '<tr><td class="mono">' + UI.esc(t.Therapist_ID) + '</td><td class="fw-600">' + UI.esc(t.Full_Name) + '<div class="text-xs muted">' + UI.esc(t.Phone_WA || '') + '</div></td>' +
            '<td class="text-xs">' + UI.esc(t.Specialization || '-') + '</td><td class="tabular">' + UI.fmtRp(t.Default_Session_Fee) + '</td>' +
            '<td><span class="badge badge-blue">' + UI.esc(commTxt) + '</span></td><td>' + UI.statusBadge(String(t.Status_Active) !== 'FALSE' ? 'Aktif' : 'Nonaktif') + '</td>' +
            '<td><button class="btn btn-xs btn-secondary" data-edit-th="' + UI.esc(t.Therapist_ID) + '">Edit</button></td></tr>';
        }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Terapis', 'Tambahkan praktisi hipnoterapi klinik terlebih dahulu.'));

    document.getElementById('btnAddTh').onclick = function () { openTherapistModal(); };
    body.querySelectorAll('[data-edit-th]').forEach(function (b) {
      b.onclick = function () {
        const th = items.find(function (x) { return x.Therapist_ID === b.getAttribute('data-edit-th'); });
        if (th) openTherapistModal(th);
      };
    });
  }

  function openTherapistModal(t) {
    t = t || {};
    const body = UI.openModal(t.Therapist_ID ? ('Edit Terapis ' + t.Therapist_ID) : 'Tambah Master Terapis',
      '<form id="thForm" class="stack-md">' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Nama Lengkap &amp; Gelar *</label><input name="Full_Name" class="input" required value="' + UI.esc(t.Full_Name || '') + '" /></div>' +
          '<div class="field"><label>No. WA</label><input name="Phone_WA" class="input" value="' + UI.esc(t.Phone_WA || '') + '" /></div>' +
          '<div class="field"><label>Email</label><input name="Email" type="email" class="input" value="' + UI.esc(t.Email || '') + '" /></div>' +
          '<div class="field"><label>Spesialisasi</label><input name="Specialization" class="input" value="' + UI.esc(t.Specialization || '') + '" /></div>' +
          '<div class="field"><label>Tarif Sesi Default (Rp)</label><input type="number" name="Default_Session_Fee" class="input tabular" value="' + (t.Default_Session_Fee || 750000) + '" /></div>' +
          '<div class="field"><label>Tipe &amp; Rate Komisi</label><div class="row"><select name="Commission_Type" class="select" style="width:130px"><option value="Percent"' + (t.Commission_Type !== 'Fixed' ? ' selected' : '') + '>Persentase (%)</option><option value="Fixed"' + (t.Commission_Type === 'Fixed' ? ' selected' : '') + '>Nominal Tetap</option></select><input type="number" name="Commission_Rate" class="input tabular" style="flex:1" value="' + (t.Commission_Rate || 40) + '" /></div></div>' +
        '</div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Terapis</button></div>' +
      '</form>');
    body.querySelector('#thForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const p = { Therapist_ID: t.Therapist_ID || '' };
      fd.forEach(function (v, k) { p[k] = v; });
      try {
        await API.call('therapists.save', p);
        UI.toast('Data terapis tersimpan.', 'ok'); UI.closeModal();
        await App.refreshBootstrap(); renderTherapistsTab();
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  /* 2. AKUN STAF & MATRIKS RBAC (KHUSUS OWNER) */
  function renderStaffTab() {
    const body = document.getElementById('admBody');
    body.innerHTML = UI.skeletonTable(4);
    API.call('staff.list', {}).then(function (r) {
      const items = r.items || [];
      body.innerHTML = '<div class="row-between" style="margin-bottom:12px"><span class="text-sm muted">Kelola akun Owner, Admin (izin menu granular), Terapis (terhubung THERAPIST_ID), &amp; CS</span>' +
        '<button type="button" class="btn btn-sm btn-primary" id="btnAddStaff">+ Tambah Akun Staf</button></div>' +
        (items.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>Username</th><th>Nama Lengkap</th><th>Peran</th><th>Link Terapis</th><th>Status</th><th>Login Terakhir</th><th>Aksi</th></tr></thead><tbody>' +
          items.map(function (u) {
            return '<tr><td class="mono fw-600">' + UI.esc(u.Username) + '</td><td>' + UI.esc(u.Full_Name) + '</td>' +
              '<td>' + UI.statusBadge(u.Role) + '</td><td class="mono text-xs">' + UI.esc(u.Therapist_ID || '-') + '</td>' +
              '<td>' + UI.statusBadge(u.Status_Active ? 'Aktif' : 'Nonaktif') + '</td>' +
              '<td class="text-xs muted">' + UI.fmtDateTime(u.Last_Login) + '</td>' +
              '<td><div class="row" style="gap:5px"><button class="btn btn-xs btn-secondary" data-ed-stf="' + UI.esc(u.User_ID) + '">Edit/Izin</button>' +
              '<button class="btn btn-xs btn-danger-outline" data-tg-stf="' + UI.esc(u.User_ID) + '">' + (u.Status_Active ? 'Nonaktif' : 'Aktifkan') + '</button></div></td></tr>';
          }).join('') + '</tbody></table></div>' : UI.emptyState('Belum Ada Akun Staf Reguler', 'Tambahkan akun Admin, Terapis, dan CS agar staf dapat masuk sesuai perannya.'));

      document.getElementById('btnAddStaff').onclick = function () { openStaffModal({}, r.allMenus, r.defaultRolePerms); };
      body.querySelectorAll('[data-ed-stf]').forEach(function (b) {
        b.onclick = function () {
          const u = items.find(function (x) { return x.User_ID === b.getAttribute('data-ed-stf'); });
          if (u) openStaffModal(u, r.allMenus, r.defaultRolePerms);
        };
      });
      body.querySelectorAll('[data-tg-stf]').forEach(function (b) {
        b.onclick = async function () {
          try { await API.call('staff.toggleActive', { User_ID: b.getAttribute('data-tg-stf') }); UI.toast('Status akun diubah.', 'ok'); renderStaffTab(); } catch (e) { UI.toast(e.message, 'err'); }
        };
      });
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  function openStaffModal(u, allMenus, defaultPerms) {
    const therapists = App.state.therapists || [];
    const curPerms = u.Permissions || defaultPerms.Admin || [];
    const body = UI.openModal(u.User_ID ? ('Edit Staf ' + u.Username) : 'Tambah Akun Staf Baru',
      '<form id="stfForm" class="stack-md">' +
        '<div class="form-grid-2">' +
          '<div class="field"><label>Username *</label><input name="Username" class="input" required value="' + UI.esc(u.Username || '') + '" /></div>' +
          '<div class="field"><label>Nama Lengkap *</label><input name="Full_Name" class="input" required value="' + UI.esc(u.Full_Name || '') + '" /></div>' +
          '<div class="field"><label>Peran (Role) *</label><select name="Role" id="stfRole" class="select">' +
            ['Owner', 'Admin', 'Terapis', 'CS'].map(function (r) { return '<option value="' + r + '"' + ((u.Role || 'Admin') === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>Tautkan Master Terapis (Khusus Role Terapis)</label><select name="Therapist_ID" class="select"><option value="">-- Tidak Ditautkan --</option>' +
            therapists.map(function (t) { return '<option value="' + UI.esc(t.Therapist_ID) + '"' + (u.Therapist_ID === t.Therapist_ID ? ' selected' : '') + '>' + UI.esc(t.Therapist_ID + ' — ' + t.Full_Name) + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        '<div class="field"><label>' + (u.User_ID ? 'Kata Sandi Baru (Kosongkan bila tidak ganti)' : 'Kata Sandi Awal (Min. 6 karakter) *') + '</label><input type="password" name="Password" class="input" ' + (u.User_ID ? '' : 'required minlength="6"') + ' /></div>' +
        '<div class="field"><label>Izin Menu Granular (Matriks RBAC)</label><div class="row" style="gap:10px;padding:10px;background:var(--surface-sunken);border-radius:12px">' +
          (allMenus || []).map(function (m) {
            return '<label class="row text-xs fw-600" style="gap:5px;cursor:pointer"><input type="checkbox" name="perm" value="' + m + '"' + (curPerms.indexOf(m) > -1 ? ' checked' : '') + ' /> ' + m + '</label>';
          }).join('') +
        '</div></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Akun Staf</button></div>' +
      '</form>', { lg: true });

    body.querySelector('#stfRole').onchange = function (e) {
      const def = (defaultPerms && defaultPerms[e.target.value]) || ['dashboard'];
      body.querySelectorAll('input[name=perm]').forEach(function (cb) { cb.checked = def.indexOf(cb.value) > -1; });
    };
    body.querySelector('#stfForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const perms = [];
      body.querySelectorAll('input[name=perm]:checked').forEach(function (cb) { perms.push(cb.value); });
      try {
        const r = await API.call('staff.save', {
          User_ID: u.User_ID || '',
          Username: fd.get('Username'),
          Full_Name: fd.get('Full_Name'),
          Role: fd.get('Role'),
          Therapist_ID: fd.get('Therapist_ID'),
          Password: fd.get('Password'),
          Permissions: perms
        });
        UI.toast(r.message, 'ok'); UI.closeModal(); renderStaffTab();
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }

  /* 3. PENGATURAN KLINIK, MATRIKS NOTIFIKASI, & RAHASIA SCRIPT PROPERTIES */
  function renderConfigSecretsTab() {
    const body = document.getElementById('admBody');
    body.innerHTML = UI.skeletonTable(6);
    API.call('settings.get', {}).then(function (d) {
      const s = d.settings || {};
      const sec = d.secrets || {};
      const mat = d.notifMatriks || {};

      body.innerHTML =
        '<div class="stack-lg">' +
          '<form id="secForm" class="neu-tile stack-md">' +
            '<div class="row-between"><div><h3>Kredensial WhatsApp Gateway (Script Properties — Zero Literal Secrets)</h3><p class="text-xs muted">Nilai rahasia hanya ditampilkan tersamar. Kosongkan kolom bila tidak ingin mengubah; isi <code>__HAPUS__</code> untuk menghapus.</p></div><span class="badge badge-mint">Aman di ScriptProperties</span></div>' +
            '<div class="form-grid-2">' +
              '<div class="field"><label>Provider Gateway Aktif</label><select name="WA_PROVIDER" class="select"><option value="MOONWA"' + (sec.WA_PROVIDER !== 'FONNTE' ? ' selected' : '') + '>Moonwa.id API (Default PRD)</option><option value="FONNTE"' + (sec.WA_PROVIDER === 'FONNTE' ? ' selected' : '') + '>Fonnte API (Support /validate)</option></select></div>' +
              '<div class="field"><label>URL Endpoint Moonwa.id</label><input name="MOONWA_API_URL" class="input" value="' + UI.esc(sec.MOONWA_API_URL || 'https://moonwa.id/api/send-message') + '" /></div>' +
              '<div class="field"><label>Nomor Pengirim Moonwa (Sender 628xxx)</label><input name="MOONWA_SENDER" class="input" placeholder="62812xxxx" value="' + UI.esc(sec.MOONWA_SENDER || '') + '" /></div>' +
              '<div class="field"><label>MOONWA_API_KEY ' + (sec.MOONWA_API_KEY && sec.MOONWA_API_KEY.ada ? '<span class="badge badge-mint">' + UI.esc(sec.MOONWA_API_KEY.samar) + '</span>' : '<span class="badge badge-rose">Belum diisi</span>') + '</label><input type="password" name="MOONWA_API_KEY" class="input" placeholder="Tempel API Key baru (kosong = tidak berubah)" /></div>' +
              '<div class="field"><label>FONNTE_TOKEN ' + (sec.FONNTE_TOKEN && sec.FONNTE_TOKEN.ada ? '<span class="badge badge-mint">' + UI.esc(sec.FONNTE_TOKEN.samar) + '</span>' : '<span class="badge badge-neutral">Opsional</span>') + '</label><input type="password" name="FONNTE_TOKEN" class="input" placeholder="Tempel Token Fonnte (kosong = tidak berubah)" /></div>' +
            '</div>' +
            '<div class="row" style="justify-content:flex-end">' +
              '<button type="button" class="btn btn-sm btn-secondary" id="btnTestWa">Uji Koneksi Gateway WA</button>' +
              '<button type="submit" class="btn btn-sm btn-primary">Simpan ke Script Properties</button>' +
            '</div>' +
          '</form>' +
          '<form id="cfgForm" class="neu-tile stack-md">' +
            '<h3>Profil Klinik, Kop Invoice &amp; Saklar Notifikasi 2 Lapis</h3>' +
            '<div class="form-grid-2">' +
              '<div class="field"><label>Nama Klinik</label><input name="CLINIC_NAME" class="input" value="' + UI.esc(s.CLINIC_NAME || '') + '" /></div>' +
              '<div class="field"><label>No. Telepon / WA Klinik</label><input name="CLINIC_PHONE" class="input" value="' + UI.esc(s.CLINIC_PHONE || '') + '" /></div>' +
              '<div class="field"><label>Alamat Klinik (Kop Invoice)</label><input name="CLINIC_ADDRESS" class="input" value="' + UI.esc(s.CLINIC_ADDRESS || '') + '" /></div>' +
              '<div class="field"><label>Rekening Pembayaran Invoice</label><input name="INVOICE_BANK_INFO" class="input" value="' + UI.esc(s.INVOICE_BANK_INFO || '') + '" /></div>' +
              '<div class="field"><label>Daftar Saluran Marketing (pisah koma)</label><input name="MARKETING_SOURCES" class="input" value="' + UI.esc(s.MARKETING_SOURCES || '') + '" /></div>' +
              '<div class="field"><label>Saklar Global WA &amp; Email</label><div class="row"><select name="NOTIF_WA_AKTIF" class="select" style="flex:1"><option value="YA"' + (s.NOTIF_WA_AKTIF === 'YA' ? ' selected' : '') + '>WA: AKTIF</option><option value="TIDAK"' + (s.NOTIF_WA_AKTIF !== 'YA' ? ' selected' : '') + '>WA: MATI</option></select><select name="NOTIF_EMAIL_AKTIF" class="select" style="flex:1"><option value="YA"' + (s.NOTIF_EMAIL_AKTIF === 'YA' ? ' selected' : '') + '>Email: AKTIF</option><option value="TIDAK"' + (s.NOTIF_EMAIL_AKTIF !== 'YA' ? ' selected' : '') + '>Email: MATI</option></select></div></div>' +
            '</div>' +
            '<div class="table-wrap"><table class="data-table"><thead><tr><th>Kejadian Notifikasi (Matriks Lapis 2)</th><th>WA</th><th>Email</th></tr></thead><tbody>' +
              Object.keys(mat).map(function (k) {
                return '<tr><td class="text-sm fw-600">' + UI.esc(mat[k].label || k) + '</td>' +
                  '<td><input type="checkbox" data-m-wa="' + k + '"' + (mat[k].wa ? ' checked' : '') + ' /></td>' +
                  '<td><input type="checkbox" data-m-em="' + k + '"' + (mat[k].email ? ' checked' : '') + ' /></td></tr>';
              }).join('') +
            '</tbody></table></div>' +
            '<div class="row" style="justify-content:flex-end"><button type="submit" class="btn btn-primary">Simpan Pengaturan Klinik</button></div>' +
          '</form>' +
        '</div>';

      document.getElementById('btnTestWa').onclick = async function () {
        try { const r = await API.call('wa.testConnection', {}); UI.toast(r.message, 'ok'); } catch (e) { UI.toast(e.message, 'err'); }
      };
      document.getElementById('secForm').onsubmit = async function (e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const p = {}; fd.forEach(function (v, k) { p[k] = v; });
        try { const r = await API.call('settings.saveSecrets', p); UI.toast(r.message, 'ok'); renderConfigSecretsTab(); } catch (err) { UI.toast(err.message, 'err'); }
      };
      document.getElementById('cfgForm').onsubmit = async function (e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const p = {}; fd.forEach(function (v, k) { p[k] = v; });
        const newMat = {};
        Object.keys(mat).forEach(function (k) {
          newMat[k] = {
            wa: !!document.querySelector('[data-m-wa="' + k + '"]').checked,
            email: !!document.querySelector('[data-m-em="' + k + '"]').checked
          };
        });
        p.NOTIF_MATRIKS = newMat;
        try { const r = await API.call('settings.save', p); UI.toast(r.message, 'ok'); App.refreshBootstrap(); } catch (err) { UI.toast(err.message, 'err'); }
      };
    }).catch(function (e) { UI.toast(e.message, 'err'); });
  }

  /* 4. UTILITAS MIGRASI DATABASE (8 PRINSIP WAJIB gas-migrasi-database) */
  function renderMigrasiTab() {
    const body = document.getElementById('admBody');
    body.innerHTML =
      '<div class="neu-tile stack-md">' +
        '<div><h3>Migrasi &amp; Delta-Sync Antar-Spreadsheet (App Lama Tidak Disentuh)</h3>' +
        '<p class="text-sm muted">Membaca spreadsheet lama secara read-only berbasis nama header, upsert idempoten tanpa duplikasi, normalisasi WA 08xxx, dan wajib Pindai (Dry-Run) sebelum eksekusi.</p></div>' +
        '<div class="field"><label>ID atau URL Spreadsheet Sumber (Versi Lama — Akun Google Sama)</label>' +
          '<input id="migSource" class="input" placeholder="Tempel URL https://docs.google.com/spreadsheets/d/... atau ID spreadsheet lama" />' +
        '</div>' +
        '<div class="row">' +
          '<button type="button" class="btn btn-soft" id="btnMigScan">① Pindai Simulasi (Dry-Run)</button>' +
          '<button type="button" class="btn btn-primary" id="btnMigExec" disabled>② Jalankan Migrasi / Delta-Sync</button>' +
        '</div>' +
        '<div id="migResult"></div>' +
      '</div>';

    document.getElementById('btnMigScan').onclick = async function () {
      const src = document.getElementById('migSource').value.trim();
      if (!src) { UI.toast('Masukkan ID atau URL Spreadsheet lama.', 'warn'); return; }
      const box = document.getElementById('migResult');
      box.innerHTML = UI.skeletonTable(5);
      try {
        const r = await API.call('migrasi.scan', { sourceIdOrUrl: src });
        renderMigTable(r, box);
        document.getElementById('btnMigExec').disabled = false;
        UI.toast('Pindai selesai dari "' + r.sourceName + '" (tidak ada data yang ditulis).', 'info');
      } catch (e) { box.innerHTML = '<div class="alert alert-rose">' + UI.esc(e.message) + '</div>'; UI.toast(e.message, 'err'); }
    };

    document.getElementById('btnMigExec').onclick = async function () {
      const src = document.getElementById('migSource').value.trim();
      if (!confirm('Jalankan migrasi / delta-sync idempoten ke spreadsheet baru sekarang? Spreadsheet lama tetap aman & tidak disentuh.')) return;
      const btn = document.getElementById('btnMigExec');
      btn.disabled = true; btn.textContent = 'Memproses Migrasi...';
      try {
        const r = await API.call('migrasi.execute', { sourceIdOrUrl: src });
        renderMigTable(r, document.getElementById('migResult'));
        UI.toast('Migrasi / Delta-Sync selesai dengan aman!', 'ok');
        App.refreshBootstrap();
      } catch (e) { UI.toast(e.message, 'err'); }
      finally { btn.disabled = false; btn.textContent = '② Jalankan Migrasi / Delta-Sync'; }
    };
  }

  function renderMigTable(r, box) {
    box.innerHTML = '<div class="alert ' + (r.dryRun ? 'alert-blue' : 'alert-mint') + '" style="margin-bottom:10px"><span><strong>' + (r.dryRun ? 'HASIL PINDAI (DRY-RUN)' : 'MIGRASI SELESAI') + ':</strong> Sumber "' + UI.esc(r.sourceName) + '"</span></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Sheet Target</th><th>Ditemukan</th><th>Baris Sumber</th><th>Akan/Sudah Tambah</th><th>Diperbarui</th><th>Dilewati</th></tr></thead><tbody>' +
      (r.sheets || []).map(function (s) {
        return '<tr><td class="mono fw-600">' + UI.esc(s.target) + '</td><td>' + (s.foundInSource ? '<span class="badge badge-mint">Ada</span>' : '<span class="badge badge-neutral">Tidak ada</span>') + '</td>' +
          '<td class="tabular">' + s.sourceRows + '</td><td class="tabular fw-600" style="color:var(--mint-ink)">+' + s.inserted + '</td><td class="tabular">' + s.updated + '</td><td class="tabular muted">' + s.skipped + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* 5. AUDIT TRAIL APPEND-ONLY + EKSPOR CSV/EXCEL */
  function renderAuditTab() {
    const body = document.getElementById('admBody');
    const st = { query: '', actionType: 'All', page: 1, pageSize: 20 };
    body.innerHTML =
      '<div class="filter-bar">' +
        '<input type="search" id="audQ" class="input search-grow" placeholder="Cari Record ID, ringkasan, atau alasan..." />' +
        '<select id="audAct" class="select"><option value="All">Semua Aksi</option><option>LOGIN</option><option>CREATE</option><option>UPDATE</option><option>SOFT_DELETE</option><option>ADJUST_COMMISSION</option><option>VERIFY_DOC</option><option>CONFIG</option></select>' +
        '<button type="button" class="btn btn-sm btn-secondary" id="btnAudCsv">Export CSV</button>' +
        '<button type="button" class="btn btn-sm btn-secondary" id="btnAudXlsx">Export Excel</button>' +
      '</div>' +
      '<div id="audTable">' + UI.skeletonTable(6) + '</div><div id="audPag"></div>';

    let lastAud = [];
    function load() {
      API.call('audit.list', st).then(function (res) {
        lastAud = res.items || [];
        const el = document.getElementById('audTable');
        const pg = document.getElementById('audPag');
        if (!el) return;
        if (!lastAud.length) { el.innerHTML = UI.emptyState('Belum Ada Log Audit', 'Seluruh aktivitas penting staf otomatis tercatat di sini.'); pg.innerHTML = ''; return; }
        el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Modul / ID</th><th>Ringkasan &amp; Alasan</th></tr></thead><tbody>' +
          lastAud.map(function (a) {
            return '<tr><td class="text-xs tabular">' + UI.fmtDateTime(a.Timestamp) + '</td>' +
              '<td><div class="fw-600 text-sm">' + UI.esc(a.User_Name) + '</div><div class="text-xs muted">' + UI.esc(a.User_Role) + '</div></td>' +
              '<td>' + UI.statusBadge(a.Action) + '</td>' +
              '<td class="text-xs"><div class="fw-600">' + UI.esc(a.Module) + '</div><div class="mono muted">' + UI.esc(a.Record_ID) + '</div></td>' +
              '<td class="text-xs">' + UI.esc(a.Summary_Text) + (a.Reason_Note ? '<div style="color:var(--amber-ink);font-weight:600">Alasan: ' + UI.esc(a.Reason_Note) + '</div>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        pg.innerHTML = '';
        pg.appendChild(UI.renderPagination(res, function (p, ps) { st.page = p; st.pageSize = ps; load(); }));
      }).catch(function (e) { UI.toast(e.message, 'err'); });
    }

    let t = null;
    document.getElementById('audQ').oninput = function (e) { clearTimeout(t); t = setTimeout(function () { st.query = e.target.value; st.page = 1; load(); }, 250); };
    document.getElementById('audAct').onchange = function (e) { st.actionType = e.target.value; st.page = 1; load(); };
    document.getElementById('btnAudCsv').onclick = function () {
      UI.exportCsv('audit-trail-ich.csv', ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Record_ID', 'Summary', 'Reason'],
        lastAud.map(function (a) { return [a.Timestamp, a.User_Name, a.User_Role, a.Action, a.Module, a.Record_ID, a.Summary_Text, a.Reason_Note]; }));
    };
    document.getElementById('btnAudXlsx').onclick = function () {
      UI.exportExcel('audit-trail-ich.xlsx', 'Audit Trail', ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Record_ID', 'Summary', 'Reason'],
        lastAud.map(function (a) { return [a.Timestamp, a.User_Name, a.User_Role, a.Action, a.Module, a.Record_ID, a.Summary_Text, a.Reason_Note]; }));
    };
    load();
  }

  function openChangeMyPasswordModal() {
    const body = UI.openModal('Ubah Kata Sandi Akun Saya',
      '<form id="myPassForm" class="stack-md">' +
        '<div class="field"><label>Kata Sandi Lama *</label><input type="password" name="oldPassword" class="input" required /></div>' +
        '<div class="field"><label>Kata Sandi Baru (Min. 8 karakter) *</label><input type="password" name="newPassword" class="input" required minlength="8" /></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-secondary" onclick="UI.closeModal()">Batal</button><button type="submit" class="btn btn-primary">Simpan Sandi Baru</button></div>' +
      '</form>');
    body.querySelector('#myPassForm').onsubmit = async function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const r = await API.call('auth.changePassword', { oldPassword: fd.get('oldPassword'), newPassword: fd.get('newPassword') });
        UI.toast(r.message, 'ok'); UI.closeModal();
      } catch (err) { UI.toast(err.message, 'err'); }
    };
  }
})(window);
