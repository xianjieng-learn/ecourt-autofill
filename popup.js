/**
 * eCourt AutoFill - Popup Script
 * Handles both Account Creation and Identity forms.
 */

const jsonInput = document.getElementById('jsonInput');
const btnPaste = document.getElementById('btnPaste');
const btnParse = document.getElementById('btnParse');
const btnFill = document.getElementById('btnFill');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const partiesList = document.getElementById('partiesList');

let parsedData = null;
let selectedParty = null;

// ─── Status helpers ───
function showStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.className = `status show ${type}`;
}

function hideStatus() {
  statusEl.className = 'status';
}

// ─── Parse JSON ───
function parseJSON() {
  const raw = jsonInput.value.trim();
  if (!raw) {
    showStatus('⚠️ Belum ada data. Paste JSON dari PTSP Helper dulu.', 'error');
    return;
  }

  try {
    const data = JSON.parse(raw);
    parsedData = normalizeData(data);
    
    if (parsedData.parties && parsedData.parties.length > 0) {
      showStatus(`✅ Terdeteksi ${parsedData.parties.length} pihak. Pilih yang mau di-fill.`, 'success');
      renderParties(parsedData.parties);
      btnFill.disabled = false;
    } else if (parsedData.nama) {
      // Single party object
      selectedParty = parsedData;
      showStatus(`✅ Data "${parsedData.nama}" siap di-fill.`, 'success');
      renderPreview(parsedData);
      btnFill.disabled = false;
    } else {
      showStatus('⚠️ Format JSON tidak dikenali. Pastikan dari tombol "Copy JSON" PTSP Helper.', 'error');
    }
  } catch (e) {
    showStatus(`❌ JSON tidak valid: ${e.message}`, 'error');
  }
}

// ─── Normalize data from PTSP Helper ───
function normalizeData(data) {
  // If it's an array of parties
  if (Array.isArray(data)) {
    return { parties: data.map(normalizeParty) };
  }
  
  // If it has parties array
  if (data.parties && Array.isArray(data.parties)) {
    return { parties: data.parties.map(normalizeParty) };
  }
  
  // If it has penggugat/tergugat/pemohon/termohon keys
  if (data.penggugat || data.tergugat || data.pemohon || data.termohon) {
    const parties = [];
    for (const role of ['penggugat', 'tergugat', 'pemohon', 'termohon']) {
      if (data[role] && Array.isArray(data[role])) {
        data[role].forEach(p => {
          parties.push(normalizeParty({ ...p, role }));
        });
      }
    }
    return { parties };
  }
  
  // Single party object
  return normalizeParty(data);
}

function normalizeParty(p) {
  const nama = p.nama || p.name || '';

  return {
    role: p.role || p.status_pihak || 'penggugat',
    status_pihak: p.status_pihak || p.role || 'penggugat',
    jenis_pihak: p.jenis_pihak || 'Perorangan',
    jenis_identitas: p.jenis_identitas || 'KTP',
    nama,
    nik: p.nik || p.nomor_identitas || '',
    alamat: p.alamat || p.address || '',
    tempat_lahir: p.tempat_lahir || p.tempatLahir || '',
    tanggal_lahir: p.tanggal_lahir || p.tanggalLahir || '',
    pekerjaan: p.pekerjaan || '',
    agama: p.agama || p.religion || '',
    pendidikan: p.pendidikan || p.pendidikan_terakhir || p.tingkat_pendidikan || '',
    kewarganegaraan: p.kewarganegaraan || p.warga_negara || p.wargaNegara || 'Indonesia',
    email: p.email || p.email_pihak || p.domisili_email || p.domisili_elektronik || '',
    telepon: p.telepon || p.telepon_pihak || p.nomor_telepon || p.no_telepon || p.no_telp || p.telp || p.domisili_wa || p.wa || p.no_wa || p.no_hp || p.hp || p.phone || '',
    handphone: p.handphone || p.telepon_pihak || p.nomor_telepon || p.no_telepon || p.no_telp || p.telp || p.domisili_wa || p.wa || p.no_wa || p.no_hp || p.hp || '',
    jenis_kelamin: p.jenis_kelamin || p.kelamin || p.gender || p.jk || inferGenderFromName(nama),
    status_kawin: p.status_kawin || '',
    // Account-specific fields (for Tambah Pengguna)
    bank: p.bank || '',
    no_rekening: p.no_rekening || '',
    akun_bank: p.akun_bank || '',
    _raw: p,
  };
}

function inferGenderFromName(nama) {
  const normalized = ` ${String(nama || '').toLowerCase().replace(/\s+/g, ' ')} `;
  if (normalized.includes(' binti ')) return 'Perempuan';
  if (normalized.includes(' bin ')) return 'Laki-laki';
  return '';
}

// ─── Render parties list ───
function renderParties(parties) {
  partiesList.innerHTML = '';
  partiesList.style.display = 'block';
  previewEl.className = 'preview';

  parties.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.className = 'party-btn';
    btn.innerHTML = `
      <span class="party-name">${p.nama || 'Tanpa Nama'}</span>
      <span class="party-role">${p.role}</span>
    `;
    btn.onclick = () => {
      selectedParty = p;
      document.querySelectorAll('.party-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      renderPreview(p);
    };
    partiesList.appendChild(btn);
  });

  // Auto-select first party
  if (parties.length > 0) {
    selectedParty = parties[0];
    partiesList.children[0].classList.add('selected');
    renderPreview(parties[0]);
  }
}

// ─── Render preview ───
function renderPreview(party) {
  const fields = [
    ['Nama', party.nama],
    ['NIK', party.nik],
    ['Alamat', party.alamat],
    ['Tempat Lahir', party.tempat_lahir],
    ['Tgl Lahir', party.tanggal_lahir],
    ['Pekerjaan', party.pekerjaan],
    ['Agama', party.agama],
    ['Pendidikan', party.pendidikan],
    ['WN', party.kewarganegaraan],
    ['Email', party.email],
    ['Telepon', party.telepon],
    ['JK', party.jenis_kelamin],
    ['Status Kawin', party.status_kawin],
    // Account-specific
    ['Bank', party.bank],
    ['No Rekening', party.no_rekening],
    ['Akun Bank', party.akun_bank],
  ];

  const filled = fields.filter(([_, v]) => v);
  
  let html = `
    <div class="preview-header">
      <span>📋 Preview: ${party.nama || 'Tanpa Nama'}</span>
      <span class="field-count">${filled.length} field terisi</span>
    </div>
  `;

  fields.forEach(([label, value]) => {
    if (value) {
      html += `
        <div class="preview-field">
          <span class="preview-label">${label}</span>
          <span class="preview-value" title="${value}">${value}</span>
        </div>
      `;
    }
  });

  previewEl.innerHTML = html;
  previewEl.className = 'preview show';
}

// ─── Fill form (auto-detect type) ───
async function fillForm() {
  if (!selectedParty) {
    showStatus('⚠️ Pilih pihak yang mau di-fill dulu.', 'error');
    return;
  }

  btnFill.disabled = true;
  btnFill.textContent = '⏳ Filling...';
  showStatus('⏳ Mengisi form eCourt...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url.includes('ecourt.mahkamahagung.go.id')) {
      showStatus('❌ Buka halaman form eCourt dulu!', 'error');
      btnFill.disabled = false;
      btnFill.textContent = '⚡ Fill Form';
      return;
    }

    // First detect form type, with auto-inject fallback
    let detectResponse;
    try {
      detectResponse = await chrome.tabs.sendMessage(tab.id, {
        action: 'detectForm',
      });
    } catch (sendErr) {
      // Content script not injected yet — inject it programmatically, then retry
      showStatus('⏳ Injecting content script...', 'info');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      await new Promise(r => setTimeout(r, 200));
      detectResponse = await chrome.tabs.sendMessage(tab.id, {
        action: 'detectForm',
      });
    }

    let response;
    if (detectResponse && detectResponse.type === 'account') {
      // Fill account creation form
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillAccountForm',
        data: selectedParty,
      });
    } else {
      // Fill identity form (default)
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillForm',
        data: selectedParty,
      });
    }

    if (response && response.success) {
      const filledCount = response.filledFields || 0;
      const formType = detectResponse?.type === 'account' ? 'akun' : 'identitas';
      showStatus(`✅ Berhasil mengisi ${filledCount} field di form ${formType}!`, 'success');
    } else {
      showStatus(`⚠️ ${response?.error || 'Gagal mengisi form'}`, 'error');
    }
  } catch (e) {
    showStatus(`❌ Error: ${e.message}. Coba refresh halaman eCourt.`, 'error');
  }

  btnFill.disabled = false;
  btnFill.textContent = '⚡ Fill Form';
}

// ─── Event listeners ───
btnPaste.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    jsonInput.value = text;
    showStatus('📋 Berhasil paste dari clipboard.', 'info');
    parseJSON();
  } catch (e) {
    showStatus('❌ Gagal akses clipboard. Paste manual (Ctrl+V).', 'error');
  }
});

btnParse.addEventListener('click', parseJSON);
btnFill.addEventListener('click', fillForm);

// Auto-parse if there's content
if (jsonInput.value.trim()) {
  parseJSON();
}
