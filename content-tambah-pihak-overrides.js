function normalizeRoleForTambahPihak(role = '') {
  const value = normalizeText(role);
  const roleMap = {
    penggugat: 'Penggugat',
    tergugat: 'Tergugat',
    intervensi: 'Intervensi',
    'turut tergugat': 'Turut Tergugat',
    turuttergugat: 'Turut Tergugat',
    pemohon: 'Pemohon',
    termohon: 'Tergugat',
    pelawan: 'Pelawan',
    terlawan: 'Terlawan',
  };
  return roleMap[value] || role || '';
}

function shouldAppendPhoneForPartyAddress(data = {}) {
  const roleText = normalizeText(`${data.status_pihak || ''} ${data.role || ''} ${data.kedudukan || ''} ${data.pihak || ''}`);
  return roleText.includes('tergugat') || roleText.includes('termohon');
}

function normalizeLoose(value = '') {
  return normalizeText(value)
    .replace(/\b(kota administrasi|kabupaten|kab|kota|provinsi|propinsi|kecamatan|kelurahan|desa)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function isLooseMatch(a = '', b = '') {
  const left = normalizeLoose(a);
  const right = normalizeLoose(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function extractAddressPart(address = '', labelPatterns = []) {
  const text = String(address || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  for (const label of labelPatterns) {
    const pattern = new RegExp(`${label}\\s+([^,;.]+)`, 'i');
    const match = text.match(pattern);
    if (match && match[1]) return cleanupRegionName(match[1]);
  }

  return '';
}

function cleanupRegionName(value = '') {
  return String(value || '')
    .replace(/\b(kota administrasi|kabupaten|kab\.?|kota|provinsi|propinsi|kecamatan|kelurahan|desa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function normalizeProvinceName(value = '') {
  const normalized = normalizeText(value);
  const aliases = {
    'daerah khusus jakarta': 'DKI Jakarta',
    'daerah khusus ibukota jakarta': 'DKI Jakarta',
    'dki jakarta': 'DKI Jakarta',
    jakarta: 'DKI Jakarta',
    'daerah istimewa yogyakarta': 'DI Yogyakarta',
    yogyakarta: 'DI Yogyakarta',
    diy: 'DI Yogyakarta',
  };
  return aliases[normalized] || value;
}

function enrichPartyLocations(party = {}) {
  const alamat = party.alamat || '';
  const extractedProvinsi = extractAddressPart(alamat, ['Provinsi', 'Propinsi']);
  const extractedKabupaten = extractAddressPart(alamat, ['Kota Administrasi', 'Kabupaten', 'Kab\\.?', 'Kota']);
  const extractedKecamatan = extractAddressPart(alamat, ['Kecamatan']);
  const extractedKelurahan = extractAddressPart(alamat, ['Kelurahan', 'Desa']);

  return {
    ...party,
    provinsi: party.provinsi || normalizeProvinceName(extractedProvinsi),
    kabupaten: party.kabupaten || party.kota || extractedKabupaten,
    kecamatan: party.kecamatan || extractedKecamatan,
    kelurahan: party.kelurahan || party.desa || extractedKelurahan,
  };
}

function getAutofillStatusBox() {
  let box = document.getElementById('ecourt-autofill-status-box');
  if (box) return box;

  box = document.createElement('div');
  box.id = 'ecourt-autofill-status-box';
  box.style.cssText = [
    'position:fixed',
    'right:16px',
    'bottom:16px',
    'z-index:999999',
    'max-width:360px',
    'padding:12px',
    'border-radius:10px',
    'background:#111827',
    'color:#ffffff',
    'font:12px/1.45 Arial, sans-serif',
    'box-shadow:0 8px 24px rgba(0,0,0,.25)'
  ].join(';');
  box.innerHTML = '<b>eCourt AutoFill</b><div id="ecourt-autofill-status-lines" style="margin-top:6px"></div>';
  document.body.appendChild(box);
  return box;
}

function addAutofillStatus(label, value, ok, detail = '') {
  const box = getAutofillStatusBox();
  const lines = box.querySelector('#ecourt-autofill-status-lines');
  const line = document.createElement('div');
  line.textContent = `${ok ? '✓' : '✗'} ${label}: ${value || '-'} ${detail ? '(' + detail + ')' : ''}`;
  line.style.color = ok ? '#bbf7d0' : '#fecaca';
  lines.appendChild(line);
}

function findSelectForLabels(labels = []) {
  for (const label of labels) {
    const key = normalizeKey(label);
    const idMap = {
      provinsi: 'provinsi',
      kabupaten: 'kabupaten',
      kota: 'kabupaten',
      kabupatenkota: 'kabupaten',
      kecamatan: 'kecamatan',
      kelurahan: 'kelurahan',
      desa: 'kelurahan',
    };
    const fieldId = idMap[key];
    if (fieldId) {
      const select = getSelectById(fieldId);
      if (select) return select;
    }
  }
  return null;
}

function findLooseOption(select, value) {
  const options = Array.from(select?.options || []);
  const candidates = getSelectCandidates(select, value);

  for (const candidate of candidates) {
    let option = options.find(o => isLooseMatch(o.text, candidate) || isLooseMatch(o.value, candidate));
    if (option) return option;

    option = options.find(o => isLooseMatch(`${o.text || ''} ${o.value || ''}`, candidate));
    if (option) return option;
  }

  return null;
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

    // includes() match — collect all matches, prefer "Kota" over "Kabupaten" when ambiguous
    const textMatches = options.filter(o => normalizeText(o.text).includes(normalizedCandidate) || normalizedCandidate.includes(normalizeText(o.text)));
    if (textMatches.length === 1) {
      option = textMatches[0];
      break;
    } else if (textMatches.length > 1) {
      option = textMatches.find(o => normalizeText(o.text).startsWith('kota')) || textMatches[0];
      break;
    }

    option = options.find(o => normalizeText(o.value).includes(normalizedCandidate));
    if (option) break;
  }

  if (!option) option = findLooseOption(select, value);
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

function isSelectFilledWith(select, value) {
  if (!select || !value) return false;
  const selected = select.options[select.selectedIndex];
  return Boolean(
    selected && (
      isLooseMatch(selected.text, value) ||
      isLooseMatch(selected.value, value) ||
      isLooseMatch(`${selected.text || ''} ${selected.value || ''}`, value)
    )
  );
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fillLocationStep(label, labels, value, waitBefore = 0) {
  if (!value) {
    addAutofillStatus(label, value, false, 'data kosong');
    return false;
  }

  await wait(waitBefore);

  for (let attempt = 1; attempt <= 6; attempt++) {
    const select = findSelectForLabels(labels);
    const optionCount = select ? Array.from(select.options || []).filter(o => String(o.value || o.text || '').trim()).length : 0;

    if (!select || optionCount <= 1) {
      await wait(350);
      continue;
    }

    const ok = fillDropdown(labels, value);
    await wait(250);

    const verified = isSelectFilledWith(select, value) || ok;
    if (verified) {
      addAutofillStatus(label, value, true, `attempt ${attempt}`);
      return true;
    }

    await wait(350);
  }

  addAutofillStatus(label, value, false, 'dropdown belum siap/opsi tidak cocok');
  return false;
}

async function scheduleLocationDropdownFill(party = {}) {
  getAutofillStatusBox();

  await fillLocationStep('Provinsi', ['Provinsi'], party.provinsi, 450);
  await fillLocationStep('Kabupaten/Kota', ['Kabupaten', 'Kota', 'Kabupaten/Kota'], party.kabupaten, 350);
  await fillLocationStep('Kecamatan', ['Kecamatan'], party.kecamatan, 350);
  await fillLocationStep('Kelurahan/Desa', ['Kelurahan', 'Desa'], party.kelurahan, 350);
}

function forceFillPhone(phone = '') {
  if (!phone) return false;
  const selectors = [
    'input#telepon_pihak',
    'input[name="telepon_pihak"]',
    'input#szNoTelepon',
    'input[name="telepon"]',
    'input[name*="telepon" i]',
    'input[name*="phone" i]',
    'input[id*="telepon" i]',
    'input[id*="phone" i]'
  ];

  for (const selector of selectors) {
    const input = document.querySelector(selector);
    if (input) {
      setInputValue(input, phone);
      return true;
    }
  }

  return fillTextInput(['Telepon', 'Telp', 'HP', 'No HP', 'No Telp', 'Handphone'], phone);
}

function fillEcourtForm(data) {
  const errors = [];
  const party = enrichPartyLocations(normalizePartyForEcourt(data));
  const shouldAppendPhoneToAddress = !isTambahPihakForm() || shouldAppendPhoneForPartyAddress(party);
  const alamatValue = buildAddressValue(party, { appendPhone: shouldAppendPhoneToAddress });

  const fieldMap = [
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
    { key: 'domisili_negara', labels: ['Negara'], type: 'dropdown' }
  ];

  const result = fillFields(fieldMap, party, errors);

  if (party.telepon || party.handphone) {
    const phoneOk = forceFillPhone(party.telepon || party.handphone);
    addAutofillStatus('Telepon', party.telepon || party.handphone, phoneOk, phoneOk ? 'terisi' : 'field tidak ditemukan');
  }

  scheduleLocationDropdownFill(party);
  return result;
}
