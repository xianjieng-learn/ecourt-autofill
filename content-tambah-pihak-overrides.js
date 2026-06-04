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

function fillEcourtForm(data) {
  const errors = [];
  const party = normalizePartyForEcourt(data);
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

  return fillFields(fieldMap, party, errors);
}
