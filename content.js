/**
 * eCourt AutoFill - Content Script
 * Injected into ecourt.mahkamahagung.go.id pages.
 * Handles:
 *   1. Tambah Pengguna (account creation)
 *   2. Input Identitas Pihak / Tambah Pihak (case party identity)
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'detectForm') {
    const type = detectFormType();
    sendResponse({ type });
  } else if (request.action === 'fillForm') {
    const result = fillEcourtForm(request.data);
    sendResponse(result);
  } else if (request.action === 'fillAccountForm') {
    const result = fillAccountForm(request.data);
    sendResponse(result);
  }
  return true;
});

function detectFormType() {
  const bodyText = (document.body?.textContent || '').toLowerCase();

  if (document.querySelector('#modal-tambah_pihak, #form-tambah_pihak, select#status_pihak, select#jenis_pihak')) {
    return 'identity';
  }

  if (bodyText.includes('tambah pengguna') || bodyText.includes('buat akun')) {
    return 'account';
  }

  if (bodyText.includes('pendaftaran perkara') ||
      bodyText.includes('identitas pihak') ||
      bodyText.includes('tambah pihak')) {
    return 'identity';
  }

  if (document.querySelector('input[placeholder*="Rekening"]') ||
      document.querySelector('input[name*="rekening"]')) {
    return 'account';
  }

  return 'unknown';
}

function fillEcourtForm(data) {
  const errors = [];
  const party = normalizePartyForEcourt(data);

  const alamatValue = buildAddressValue(party, { appendPhone: !isTambahPihakForm() });

  const fieldMap = [
    // Status Pihak is intentionally NOT defaulted because PTSP-Helper single-party JSON
    // usually cannot know whether the party is Penggugat/Tergugat/Pemohon/Termohon.
    { key: 'status_pihak',    labels: ['Status Pihak'], type: 'dropdown' },
    { key: 'jenis_pihak',     labels: ['Jenis Pihak'], type: 'dropdown', defaultValue: 'Perorangan' },
    { key: 'status_alamat',   labels: ['Status Alamat'], type: 'dropdown', defaultValue: party.alamat ? 'Diketahui Alamatnya' : '' },
    { key: 'jenis_identitas', labels: ['Jenis Identitas'], type: 'dropdown', defaultValue: party.nik ? 'KTP' : '' },

    { key: 'nama',            labels: ['Nama', 'Nama Lengkap'], type: 'text' },
    { key: 'nik',             labels: ['Nomor Identitas', 'NIK', 'No KTP', 'Nomor Induk Kependudukan'], type: 'text' },
    { key: 'alamat',          labels: ['Alamat'], type: 'text', overrideValue: alamatValue },
    { key: 'telepon',         labels: ['Telepon', 'Telp', 'HP', 'No HP', 'No Telp', 'Handphone'], type: 'text' },
    { key: 'email',           labels: ['Email', 'e-mail'], type: 'text' },
    { key: 'tempat_lahir',    labels: ['Tempat Lahir'], type: 'text' },
    { key: 'tanggal_lahir',   labels: ['Tanggal Lahir', 'Tgl Lahir'], type: 'text' },
    { key: 'jenis_kelamin',   labels: ['Jenis Kelamin', 'JK'], type: 'dropdown' },
    { key: 'kewarganegaraan', labels: ['Warga Negara', 'WN'], type: 'text' },
    { key: 'pekerjaan',       labels: ['Pekerjaan'], type: 'text' },
    { key: 'status_kawin',    labels: ['Status Kawin', 'Status Perkawinan'], type: 'dropdown' },
    { key: 'pendidikan',      labels: ['Pendidikan'], type: 'dropdown' },
    { key: 'agama',           labels: ['Agama'], type: 'dropdown' },

    { key: 'domisili_pihak',  labels: ['Domisili Pihak'], type: 'dropdown', defaultValue: party.alamat ? 'Dalam Negeri' : '' },
    { key: 'domisili_negara', labels: ['Negara'], type: 'dropdown' },
    { key: 'provinsi',        labels: ['Provinsi'], type: 'dropdown' },
    { key: 'kabupaten',       labels: ['Kabupaten', 'Kota', 'Kabupaten/Kota'], type: 'dropdown' },
    { key: 'kecamatan',       labels: ['Kecamatan'], type: 'dropdown' },
    { key: 'kelurahan',       labels: ['Kelurahan', 'Desa'], type: 'dropdown' },
  ];

  return fillFields(fieldMap, party, errors);
}

function fillAccountForm(data) {
  const errors = [];
  const waNumber = data.telepon || data.handphone || data.domisili_wa || '';
  const effectiveData = { ...data, telepon: waNumber, handphone: waNumber };
  const alamatValue = buildAddressValue(effectiveData, { appendPhone: true });

  const fieldMap = [
    { key: 'nama',            labels: ['Nama', 'Nama Lengkap'], type: 'text' },
    { key: 'nik',             labels: ['Nomor Induk Kependudukan', 'NIK', 'No KTP', 'Nomor Identitas'], type: 'text' },
    { key: 'tempat_lahir',    labels: ['Tempat Lahir'], type: 'text' },
    { key: 'tanggal_lahir',   labels: ['Tanggal Lahir', 'Tgl Lahir'], type: 'text' },
    { key: 'pekerjaan',       labels: ['Pekerjaan'], type: 'text' },
    { key: 'email',           labels: ['Email', 'E-Mail', 'e-mail'], type: 'text' },
    { key: 'telepon',         labels: ['Telepon', 'Nomor Telepon', 'Telp'], type: 'text' },
    { key: 'handphone',       labels: ['Handphone', 'HP', 'No HP'], type: 'text' },
    { key: 'alamat',          labels: ['Alamat'], type: 'text', overrideValue: alamatValue },
    { key: 'jenis_kelamin',   labels: ['Jenis Kelamin', 'JK'], type: 'dropdown' },
    { key: 'agama',           labels: ['Agama'], type: 'dropdown' },
    { key: 'status_kawin',    labels: ['Status Kawin', 'Status Perkawinan'], type: 'dropdown' },
    { key: 'pendidikan',      labels: ['Pendidikan'], type: 'dropdown' },
    { key: 'bank',            labels: ['Bank'], type: 'dropdown' },
    { key: 'no_rekening',     labels: ['No Rekening', 'Nomor Rekening'], type: 'text' },
    { key: 'akun_bank',       labels: ['Akun Bank', 'Nama Rekening', 'Atas Nama'], type: 'text' },
  ];

  return fillFields(fieldMap, effectiveData, errors);
}

function inferStatusKawinFromCase(data = {}) {
  const caseText = normalizeText(
    data.jenis_perkara || data.klasifikasi_perkara || data.perkara || data.jenis_perkara_lain || ''
  );
  if (!caseText) return '';
  if (caseText.includes('cerai gugat') || caseText.includes('cerai talak')) return 'Kawin';
  if (caseText.includes('istbat nikah') || caseText.includes('isbat nikah')) return 'Belum Kawin';
  return '';
}

function normalizePartyForEcourt(data = {}) {
  const raw = data._raw || {};
  const party = { ...raw, ...data };

  const explicitRole = party.status_pihak || party.role || party.kedudukan || party.pihak || '';
  const nik = party.nik || party.nomor_identitas || party.nomor_induk_kependudukan || party.no_ktp || '';
  const telepon = party.telepon || party.handphone || party.domisili_wa || party.phone || '';
  const email = party.email || party.domisili_email || '';

  return {
    ...party,
    role: explicitRole,
    status_pihak: explicitRole ? normalizeRoleForTambahPihak(explicitRole) : '',
    jenis_pihak: party.jenis_pihak || party.tipe_pihak || 'Perorangan',
    status_alamat: party.status_alamat || party.alamatnya || (party.alamat ? 'Diketahui Alamatnya' : ''),
    jenis_identitas: party.jenis_identitas || party.tipe_identitas || (nik ? 'KTP' : ''),
    nama: party.nama || party.name || '',
    nik,
    alamat: party.alamat || party.address || '',
    tempat_lahir: party.tempat_lahir || party.tempatLahir || '',
    tanggal_lahir: normalizeDateForEcourt(party.tanggal_lahir || party.tanggalLahir || ''),
    pekerjaan: party.pekerjaan || '',
    agama: party.agama || '',
    pendidikan: party.pendidikan || '',
    kewarganegaraan: party.kewarganegaraan || party.warga_negara || 'Indonesia',
    email,
    telepon,
    handphone: party.handphone || telepon,
    jenis_kelamin: party.jenis_kelamin || party.jk || '',
    status_kawin: party.status_kawin || party.status_perkawinan || inferStatusKawinFromCase(party) || '',
    domisili_pihak: party.domisili_pihak || party.domisili || (party.alamat ? 'Dalam Negeri' : ''),
    domisili_negara: party.domisili_negara || party.negara || '',
    provinsi: party.provinsi || '',
    kabupaten: party.kabupaten || party.kota || '',
    kecamatan: party.kecamatan || '',
    kelurahan: party.kelurahan || party.desa || '',
  };
}

function normalizeRoleForTambahPihak(role = '') {
  const value = normalizeText(role);
  const roleMap = {
    penggugat: 'Penggugat',
    tergugat: 'Tergugat',
    intervensi: 'Intervensi',
    'turut tergugat': 'Turut Tergugat',
    turuttergugat: 'Turut Tergugat',
    pemohon: 'Pemohon',
    termohon: 'Termohon',
    pelawan: 'Pelawan',
    terlawan: 'Terlawan',
  };
  return roleMap[value] || role || '';
}

function normalizeDateForEcourt(value) {
  if (!value) return '';
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`;
  }
  return text;
}

function isTambahPihakForm() {
  return Boolean(document.querySelector('#modal-tambah_pihak, #form-tambah_pihak'));
}

function buildAddressValue(data, { appendPhone }) {
  let alamatValue = data.alamat || '';
  const phone = data.telepon || data.handphone || '';

  if (appendPhone && phone && alamatValue && !alamatValue.includes(phone)) {
    alamatValue = `${alamatValue}, WA: ${phone}`;
  } else if (appendPhone && phone && !alamatValue) {
    alamatValue = `WA: ${phone}`;
  }

  return alamatValue;
}

function fillFields(fieldMap, data, errors) {
  let filledFields = 0;

  for (const field of fieldMap) {
    const value = field.overrideValue ?? data[field.key] ?? field.defaultValue ?? '';
    if (value === undefined || value === null || String(value).trim() === '') continue;

    try {
      let success = false;

      if (field.type === 'dropdown') {
        success = fillDropdown(field.labels, String(value));
      } else {
        let cleanValue = String(value);
        if (field.key === 'nama') {
          cleanValue = cleanValue.replace(/['']/g, '').replace(/['"`]/g, '');
        }
        success = fillTextInput(field.labels, cleanValue);
      }

      if (success) {
        filledFields++;
      } else {
        errors.push(`${field.key}: field tidak ditemukan`);
      }
    } catch (e) {
      errors.push(`${field.key}: ${e.message}`);
    }
  }

  if (filledFields === 0 && errors.length > 0) {
    return {
      success: false,
      error: `Tidak ada field yang berhasil diisi. Pastikan form eCourt sedang terbuka. ${errors.join('; ')}`,
    };
  }

  return {
    success: true,
    filledFields,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function fillTextInput(labelPatterns, value) {
  const keyToFieldIds = {
    nama: ['szNama', 'nama'],
    namalengkap: ['szNama', 'nama'],
    nik: ['szNik', 'szNIK', 'nomor_identitas', 'nik'],
    nomorindukkependudukan: ['szNik', 'szNIK', 'nomor_identitas'],
    noktp: ['szNik', 'szNIK', 'nomor_identitas'],
    nomoridentitas: ['szNik', 'szNIK', 'nomor_identitas'],
    tempatlahir: ['szTempatLahir', 'tempat_lahir'],
    tempat_lahir: ['szTempatLahir', 'tempat_lahir'],
    tanggallahir: ['szTanggalLahir', 'tanggal_lahir'],
    tanggal_lahir: ['szTanggalLahir', 'tanggal_lahir'],
    tglahir: ['szTanggalLahir', 'tanggal_lahir'],
    tgl_lahir: ['szTanggalLahir', 'tanggal_lahir'],
    pekerjaan: ['szPekerjaan', 'pekerjaan'],
    alamat: ['alamat', 'szAlamat'],
    email: ['szEmail', 'email'],
    'e-mail': ['szEmail', 'email'],
    telepon: ['szNoTelepon', 'telepon_pihak'],
    telp: ['szNoTelepon', 'telepon_pihak'],
    notelepon: ['szNoTelepon', 'telepon_pihak'],
    nomortelepon: ['szNoTelepon', 'telepon_pihak'],
    handphone: ['szHp', 'telepon_pihak'],
    hp: ['szHp', 'telepon_pihak'],
    nohp: ['szHp', 'telepon_pihak'],
    warganegara: ['szKewarganegaraan', 'warga_negara'],
    kewarganegaraan: ['szKewarganegaraan', 'warga_negara'],
    wn: ['szKewarganegaraan', 'warga_negara'],
    bank: ['szBank'],
    norekening: ['szNoRekening'],
    no_rekening: ['szNoRekening'],
    akunbank: ['szAkunBank'],
    akun_bank: ['szAkunBank'],
    namarekening: ['szAkunBank'],
    umur: ['szUmur'],
    usia: ['szUmur'],
  };

  for (const pattern of labelPatterns) {
    const normalizedKey = normalizeKey(pattern);
    const fieldIds = keyToFieldIds[normalizedKey] || [];
    for (const fieldId of fieldIds) {
      const input = getInputById(fieldId);
      if (input) {
        setInputValue(input, value);
        return true;
      }
    }
  }

  const allLabels = document.querySelectorAll('label, .label, span, div, td, th');
  for (const labelEl of allLabels) {
    const labelText = normalizeText(labelEl.textContent || '');
    for (const pattern of labelPatterns) {
      if (labelText.includes(normalizeText(pattern))) {
        const input = findAssociatedInput(labelEl);
        if (input) {
          setInputValue(input, value);
          return true;
        }
      }
    }
  }

  const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input:not([type]), textarea');
  for (const input of inputs) {
    const placeholder = normalizeText(input.placeholder || '');
    const nearbyText = normalizeText(getNearbyText(input));
    for (const pattern of labelPatterns) {
      const normalizedPattern = normalizeText(pattern);
      if (placeholder.includes(normalizedPattern) || nearbyText.includes(normalizedPattern)) {
        setInputValue(input, value);
        return true;
      }
    }
  }

  const nameMap = {
    nama: ['nama', 'name', 'partyname'],
    nik: ['nik', 'noktp', 'noidentitas', 'nomor_identitas', 'identitynumber'],
    alamat: ['alamat', 'address'],
    tempat_lahir: ['tempatlahir', 'tempat_lahir', 'placeofbirth'],
    tanggal_lahir: ['tanggallahir', 'tanggal_lahir', 'dateofbirth', 'dob'],
    pekerjaan: ['pekerjaan', 'occupation', 'job'],
    kewarganegaraan: ['warganegara', 'kewarganegaraan', 'citizenship'],
    email: ['email'],
    telepon: ['telepon', 'phone', 'telp'],
    handphone: ['handphone', 'hp', 'mobile'],
    no_rekening: ['rekening', 'norekening'],
    akun_bank: ['akunbank', 'namarekening', 'atasnama'],
  };

  const key = normalizeKey(labelPatterns[0]);
  const namePatterns = nameMap[key] || [];
  for (const namePattern of namePatterns) {
    const input = document.querySelector(`input[name*="${namePattern}" i], input[id*="${namePattern}" i], textarea[name*="${namePattern}" i], textarea[id*="${namePattern}" i]`);
    if (input) {
      setInputValue(input, value);
      return true;
    }
  }

  return false;
}

function fillDropdown(labelPatterns, value) {
  const keyToFieldIds = {
    statuspihak: ['status_pihak'],
    jenispihak: ['jenis_pihak'],
    statusalamat: ['alamatnya'],
    jenisidentitas: ['jenis_identitas'],
    jeniskelamin: ['szJenisKelamin', 'jenis_kelamin'],
    jenis_kelamin: ['szJenisKelamin', 'jenis_kelamin'],
    jk: ['szJenisKelamin', 'jenis_kelamin'],
    agama: ['szAgama', 'agama'],
    pendidikan: ['szPendidikan', 'jenis_pendidikan'],
    statuskawin: ['szStatusKawin', 'status_kawin'],
    status_kawin: ['szStatusKawin', 'status_kawin'],
    statusperkawinan: ['szStatusKawin', 'status_kawin'],
    domisilipihak: ['domisili_pihak'],
    negara: ['domisili_negara'],
    domisilinegara: ['domisili_negara'],
    provinsi: ['provinsi'],
    kabupaten: ['kabupaten'],
    kota: ['kabupaten'],
    kabupatenkota: ['kabupaten'],
    kecamatan: ['kecamatan'],
    kelurahan: ['kelurahan'],
    desa: ['kelurahan'],
    bank: ['szBank'],
    berkebutuhankhusus: ['szBerkebutuhanKhusus'],
  };

  for (const pattern of labelPatterns) {
    const normalizedKey = normalizeKey(pattern);
    const fieldIds = keyToFieldIds[normalizedKey] || [];
    for (const fieldId of fieldIds) {
      const select = getSelectById(fieldId);
      if (select && setSelectValue(select, value)) {
        return true;
      }
    }
  }

  const allLabels = document.querySelectorAll('label, .label, span, div, td, th');
  for (const labelEl of allLabels) {
    const labelText = normalizeText(labelEl.textContent || '');
    for (const pattern of labelPatterns) {
      if (labelText.includes(normalizeText(pattern))) {
        const select = findAssociatedSelect(labelEl);
        if (select && setSelectValue(select, value)) {
          return true;
        }
      }
    }
  }

  const selectElements = document.querySelectorAll('select');
  for (const select of selectElements) {
    const nameId = normalizeText(`${select.name || ''} ${select.id || ''}`);
    const nearbyText = normalizeText(getNearbyText(select));
    for (const pattern of labelPatterns) {
      const normalizedPattern = normalizeText(pattern);
      if (nameId.includes(normalizedPattern) || nearbyText.includes(normalizedPattern)) {
        if (setSelectValue(select, value)) return true;
      }
    }
  }

  const customDropdowns = document.querySelectorAll('.dropdown, [role="listbox"], [role="combobox"], .select-wrapper, .ant-select, .MuiSelect-root');
  for (const dropdown of customDropdowns) {
    const nearbyText = normalizeText(getNearbyText(dropdown));
    for (const pattern of labelPatterns) {
      if (nearbyText.includes(normalizeText(pattern))) {
        return fillCustomDropdown(dropdown, value);
      }
    }
  }

  return false;
}

function getInputById(fieldId) {
  return document.querySelector(`input#${cssEscape(fieldId)}, textarea#${cssEscape(fieldId)}`) ||
         document.getElementById(fieldId);
}

function getSelectById(fieldId) {
  return document.querySelector(`select#${cssEscape(fieldId)}`) ||
         Array.from(document.querySelectorAll(`#${cssEscape(fieldId)}`)).find(el => el.tagName === 'SELECT') ||
         null;
}

function findAssociatedInput(labelEl) {
  if (labelEl.htmlFor) {
    const input = getInputById(labelEl.htmlFor);
    if (input) return input;
  }

  const nestedInput = labelEl.querySelector('input, textarea');
  if (nestedInput) return nestedInput;

  let sibling = labelEl.nextElementSibling;
  for (let i = 0; i < 5 && sibling; i++) {
    const input = sibling.querySelector('input, textarea') ||
                  (sibling.matches('input, textarea') ? sibling : null);
    if (input) return input;
    sibling = sibling.nextElementSibling;
  }

  const parent = labelEl.parentElement;
  if (parent) {
    const parentInput = parent.querySelector('input:not([type="hidden"]), textarea');
    if (parentInput && parentInput !== labelEl) return parentInput;
  }

  return null;
}

function findAssociatedSelect(labelEl) {
  if (labelEl.htmlFor) {
    const select = getSelectById(labelEl.htmlFor);
    if (select) return select;
  }

  const nestedSelect = labelEl.querySelector('select');
  if (nestedSelect) return nestedSelect;

  let sibling = labelEl.nextElementSibling;
  for (let i = 0; i < 5 && sibling; i++) {
    const select = sibling.querySelector('select') ||
                   (sibling.matches('select') ? sibling : null);
    if (select) return select;
    sibling = sibling.nextElementSibling;
  }

  const parent = labelEl.parentElement;
  if (parent) {
    const parentSelect = parent.querySelector('select');
    if (parentSelect) return parentSelect;
  }

  return null;
}

function getNearbyText(element) {
  const parent = element.closest('.form-group, .form-row, .field, tr, .input-group, [class*="form"]');
  if (parent) return parent.textContent || '';
  return element.parentElement?.textContent || '';
}

function setInputValue(input, value) {
  input.focus();
  input.click();
  input.value = '';

  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

  if (valueSetter) {
    valueSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
    try {
      const jq = jQuery || $;
      jq(input).val(value).trigger('input').trigger('change').trigger('blur');
      if (jq(input).hasClass('datepicker') && typeof jq(input).datepicker === 'function') {
        jq(input).datepicker('update', value).trigger('changeDate');
      }
    } catch (e) { /* ignore jQuery errors */ }
  }

  if (input.value !== value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function setSelectValue(select, value) {
  const options = Array.from(select.options || []);
  if (!options.length) return false;

  const candidates = getSelectCandidates(select, value);
  let option = null;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);
    if (!normalizedCandidate) continue;

    option = options.find(o => normalizeText(o.value) === normalizedCandidate || normalizeText(o.text) === normalizedCandidate);
    if (option) break;

    option = options.find(o => normalizeText(o.text).includes(normalizedCandidate) || normalizedCandidate.includes(normalizeText(o.text)));
    if (option) break;

    option = options.find(o => normalizeText(o.value).includes(normalizedCandidate));
    if (option) break;
  }

  if (!option) return false;

  if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
    try {
      const jq = jQuery || $;
      const $select = jq(select);
      if ($select.data('select2') || select.classList.contains('select2-hidden-accessible')) {
        $select.val(option.value).trigger('change').trigger('select2:select');
        return true;
      }
      $select.val(option.value).trigger('change');
    } catch (e) { /* fall through to native */ }
  }

  select.value = option.value;
  select.dispatchEvent(new Event('input', { bubbles: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function getSelectCandidates(select, value) {
  const base = String(value || '').trim();
  const normalized = normalizeText(base);
  const nameId = normalizeText(`${select.name || ''} ${select.id || ''} ${getNearbyText(select)}`);
  const candidates = [base, normalized];

  const mappings = getDropdownMappings(nameId);
  if (mappings[normalized]) {
    candidates.push(mappings[normalized]);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function getDropdownMappings(nameId) {
  if (nameId.includes('agama')) {
    return {
      islam: 'islam',
      kristen: 'protestan',
      protestan: 'protestan',
      katolik: 'katolik',
      hindu: 'hindu',
      budha: 'budha',
      buddha: 'budha',
      konghucu: 'kong hu cu',
      'kong hu cu': 'kong hu cu',
    };
  }

  if (nameId.includes('kelamin') || nameId.includes('jk') || nameId.includes('gender')) {
    return {
      'laki-laki': 'laki-laki',
      'laki laki': 'laki-laki',
      laki: 'laki-laki',
      pria: 'laki-laki',
      male: 'laki-laki',
      l: 'laki-laki',
      perempuan: 'perempuan',
      wanita: 'perempuan',
      female: 'perempuan',
      p: 'perempuan',
    };
  }

  if (nameId.includes('kawin') || nameId.includes('perkawinan')) {
    return {
      kawin: 'kawin',
      menikah: 'kawin',
      'belum kawin': 'belum kawin',
      belum: 'belum kawin',
      duda: 'duda',
      janda: 'janda',
      'cerai hidup': 'duda',
      'cerai mati': 'duda',
    };
  }

  if (nameId.includes('pendidikan')) {
    return {
      'tidak sekolah': 'tidak ada',
      'tidak ada': 'tidak ada',
      tk: 'taman kanak-kanak',
      sd: 'sekolah dasar',
      sdn: 'sekolah dasar',
      smp: 'sekolah lanjutan tingkat pertama',
      sltp: 'sekolah lanjutan tingkat pertama',
      mts: 'sekolah lanjutan tingkat pertama',
      sma: 'sekolah lanjutan tingkat atas',
      smk: 'sekolah lanjutan tingkat atas',
      slta: 'sekolah lanjutan tingkat atas',
      ma: 'sekolah lanjutan tingkat atas',
      d1: 'diploma i',
      di: 'diploma i',
      d2: 'diploma ii',
      dii: 'diploma ii',
      d3: 'diploma iii',
      diii: 'diploma iii',
      d4: 'diploma iv',
      div: 'diploma iv',
      s1: 'strata i',
      sarjana: 'strata i',
      s2: 'strata ii',
      magister: 'strata ii',
      s3: 'strata iii',
      doktor: 'strata iii',
    };
  }

  if (nameId.includes('status') && nameId.includes('pihak')) {
    return {
      penggugat: 'penggugat',
      tergugat: 'tergugat',
      intervensi: 'intervensi',
      'turut tergugat': 'turut tergugat',
      turuttergugat: 'turut tergugat',
      pemohon: 'pemohon',
      termohon: 'termohon',
      pelawan: 'pelawan',
      terlawan: 'terlawan',
    };
  }

  if (nameId.includes('jenis') && nameId.includes('pihak')) {
    return {
      perorangan: 'perorangan',
      orang: 'perorangan',
      personal: 'perorangan',
      individu: 'perorangan',
      pemerintah: 'pemerintah',
      'badan hukum': 'badan hukum',
      badan: 'badan hukum',
      perusahaan: 'badan hukum',
    };
  }

  if (nameId.includes('jenis') && nameId.includes('identitas')) {
    return {
      ktp: 'ktp',
      nik: 'ktp',
      paspor: 'paspor',
      passport: 'paspor',
      passpor: 'paspor',
      sim: 'sim',
    };
  }

  if (nameId.includes('alamatnya') || nameId.includes('status alamat')) {
    return {
      'diketahui alamatnya': 'diketahui alamatnya',
      diketahui: 'diketahui alamatnya',
      'tidak diketahui alamatnya': 'tidak diketahui alamatnya',
      'tidak diketahui': 'tidak diketahui alamatnya',
      ghoib: 'tidak diketahui alamatnya',
    };
  }

  if (nameId.includes('domisili_pihak') || nameId.includes('domisili pihak')) {
    return {
      'dalam negeri': 'dalam negeri',
      indonesia: 'dalam negeri',
      lokal: 'dalam negeri',
      'luar negeri': 'luar negeri',
      asing: 'luar negeri',
    };
  }

  if (nameId.includes('bank')) {
    return {
      bri: 'bri',
      bni: 'bni',
      mandiri: 'mandiri',
      bca: 'bca',
      bsi: 'bsi',
      btn: 'btn',
      bukopin: 'bukopin',
      danamon: 'danamon',
      permata: 'permata',
      cimb: 'cimb niaga',
      mega: 'bank mega',
    };
  }

  return {};
}

function fillCustomDropdown(dropdown, value) {
  const trigger = dropdown.querySelector('[role="combobox"], .dropdown-toggle, .select-trigger, button, [class*="trigger"]') || dropdown;
  trigger.click();

  setTimeout(() => {
    const options = document.querySelectorAll('[role="option"], .dropdown-item, .select-option, li[class*="option"]');
    const valueText = normalizeText(value);
    for (const option of options) {
      if (normalizeText(option.textContent).includes(valueText)) {
        option.click();
        break;
      }
    }
  }, 200);

  return true;
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[\s\-\/_.]+/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/[._/|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return String(value).replace(/([#.;?+*~':"!^$[\]()=>|/@])/g, '\\$1');
}
