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

function extractAddressPart(address = '', labelPatterns = []) {
  const text = String(address || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  for (const label of labelPatterns) {
    const pattern = new RegExp(`${label}\\s+([^,;.]+)`, 'i');
    const match = text.match(pattern);
    if (match && match[1]) {
      return cleanupRegionName(match[1]);
    }
  }

  return '';
}

function cleanupRegionName(value = '') {
  return String(value || '')
    .replace(/\b(kota administrasi|kabupaten|kab\.?|kota|provinsi|kecamatan|kelurahan|desa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

function normalizeProvinceName(value = '') {
  const normalized = normalizeText(value);
  const aliases = {
    'daerah khusus jakarta': 'DKI Jakarta',
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

function scheduleLocationDropdownFill(party = {}) {
  const steps = [
    { value: party.provinsi, labels: ['Provinsi'], delay: 250 },
    { value: party.kabupaten, labels: ['Kabupaten', 'Kota', 'Kabupaten/Kota'], delay: 900 },
    { value: party.kecamatan, labels: ['Kecamatan'], delay: 1500 },
    { value: party.kelurahan, labels: ['Kelurahan', 'Desa'], delay: 2200 },
  ];

  for (const step of steps) {
    if (!step.value) continue;
    setTimeout(() => {
      try {
        fillDropdown(step.labels, step.value);
      } catch (e) {
        // Keep autofill resilient when a cascading location dropdown is not ready yet.
      }
    }, step.delay);
  }
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
    { key: 'domisili_negara', labels: ['Negara'], type: 'dropdown' },
    { key: 'provinsi',        labels: ['Provinsi'], type: 'dropdown' },
    { key: 'kabupaten',       labels: ['Kabupaten', 'Kota', 'Kabupaten/Kota'], type: 'dropdown' },
    { key: 'kecamatan',       labels: ['Kecamatan'], type: 'dropdown' },
    { key: 'kelurahan',       labels: ['Kelurahan', 'Desa'], type: 'dropdown' },
  ];

  const result = fillFields(fieldMap, party, errors);
  scheduleLocationDropdownFill(party);
  return result;
}
