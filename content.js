/**
 * eCourt AutoFill - Content Script
 * Injected into ecourt.mahkamahagung.go.id pages.
 * Handles TWO forms:
 *   1. Tambah Pengguna (account creation)
 *   2. Input Identitas Pihak (case registration)
 */

// Listen for messages from popup
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

/**
 * Detect which form is currently visible.
 */
function detectFormType() {
  const bodyText = (document.body?.textContent || '').toLowerCase();
  
  if (bodyText.includes('tambah pengguna') || bodyText.includes('buat akun')) {
    return 'account';
  }
  if (bodyText.includes('pendaftaran perkara') || bodyText.includes('identitas pihak')) {
    return 'identity';
  }
  
  // Check for specific fields
  if (document.querySelector('input[placeholder*="Rekening"]') || 
      document.querySelector('input[name*="rekening"]')) {
    return 'account';
  }
  
  return 'unknown';
}

/**
 * Main form filling function for Identity form.
 * Alamat includes WA number if available.
 */
function fillEcourtForm(data) {
  let filledFields = 0;
  const errors = [];

  // ─── Build enhanced alamat with WA number ───
  let alamatValue = data.alamat || '';
  if (data.telepon && alamatValue && !alamatValue.includes(data.telepon)) {
    alamatValue = `${alamatValue}, WA: ${data.telepon}`;
  } else if (data.telepon && !alamatValue) {
    alamatValue = `WA: ${data.telepon}`;
  }

  // ─── Field mapping: party data key → form field label pattern ───
  const fieldMap = [
    { key: 'nama',             labels: ['Nama', 'Nama Lengkap'], type: 'text' },
    { key: 'nik',              labels: ['Nomor Identitas', 'NIK', 'No KTP', 'Nomor Induk Kependudukan'], type: 'text' },
    { key: 'alamat',           labels: ['Alamat'], type: 'text', overrideValue: alamatValue },
    { key: 'tempat_lahir',     labels: ['Tempat Lahir'], type: 'text' },
    { key: 'tanggal_lahir',    labels: ['Tanggal Lahir', 'Tgl Lahir'], type: 'text' },
    { key: 'pekerjaan',        labels: ['Pekerjaan'], type: 'text' },
    { key: 'kewarganegaraan',  labels: ['Warga Negara', 'WN'], type: 'text' },
    { key: 'email',            labels: ['Email', 'e-mail'], type: 'text' },
    { key: 'telepon',          labels: ['Telepon', 'Telp', 'HP', 'No HP', 'No Telp', 'Handphone'], type: 'text' },
    { key: 'agama',            labels: ['Agama'], type: 'dropdown' },
    { key: 'jenis_kelamin',    labels: ['Jenis Kelamin', 'JK'], type: 'dropdown' },
    { key: 'pendidikan',       labels: ['Pendidikan'], type: 'dropdown' },
    { key: 'status_kawin',     labels: ['Status Kawin', 'Status Perkawinan'], type: 'dropdown' },
  ];

  return fillFields(fieldMap, data, filledFields, errors);
}

/**
 * Form filling for Account Creation (Tambah Pengguna).
 * Has additional fields: Bank, No Rekening, Akun Bank, Umur, Berkebutuhan Khusus.
 */
function fillAccountForm(data) {
  let filledFields = 0;
  const errors = [];

  // ─── WA number goes to BOTH telepon and handphone ───
  const waNumber = data.telepon || data.handphone || '';
  const effectiveData = { ...data, telepon: waNumber, handphone: waNumber };

  // ─── Account form field mapping ───
  const fieldMap = [
    // Standard fields
    { key: 'nama',             labels: ['Nama', 'Nama Lengkap'], type: 'text' },
    { key: 'nik',              labels: ['Nomor Induk Kependudukan', 'NIK', 'No KTP', 'Nomor Identitas'], type: 'text' },
    { key: 'tempat_lahir',     labels: ['Tempat Lahir'], type: 'text' },
    { key: 'tanggal_lahir',    labels: ['Tanggal Lahir', 'Tgl Lahir'], type: 'text' },
    { key: 'pekerjaan',        labels: ['Pekerjaan'], type: 'text' },
    { key: 'email',            labels: ['Email', 'E-Mail', 'e-mail'], type: 'text' },
    { key: 'telepon',          labels: ['Telepon', 'Nomor Telepon', 'Telp'], type: 'text' },
    { key: 'handphone',        labels: ['Handphone', 'HP', 'No HP'], type: 'text' },
    { key: 'alamat',           labels: ['Alamat'], type: 'text' },
    // Dropdowns
    { key: 'jenis_kelamin',    labels: ['Jenis Kelamin', 'JK'], type: 'dropdown' },
    { key: 'agama',            labels: ['Agama'], type: 'dropdown' },
    { key: 'status_kawin',     labels: ['Status Kawin', 'Status Perkawinan'], type: 'dropdown' },
    { key: 'pendidikan',       labels: ['Pendidikan'], type: 'dropdown' },
    // Account-specific fields
    { key: 'bank',             labels: ['Bank'], type: 'dropdown' },
    { key: 'no_rekening',      labels: ['No Rekening', 'Nomor Rekening'], type: 'text' },
    { key: 'akun_bank',        labels: ['Akun Bank', 'Nama Rekening', 'Atas Nama'], type: 'text' },
  ];

  return fillFields(fieldMap, effectiveData, filledFields, errors);
}

/**
 * Shared fill logic for both forms.
 */
function fillFields(fieldMap, data, filledFields, errors) {
  for (const field of fieldMap) {
    const value = field.overrideValue || data[field.key];
    if (!value) continue;

    try {
      let success = false;
      
      if (field.type === 'dropdown') {
        success = fillDropdown(field.labels, value);
      } else {
        // Special handling for nama: remove apostrophes (eCourt requirement!)
        let cleanValue = value;
        if (field.key === 'nama') {
          cleanValue = value.replace(/['']/g, '').replace(/[''"`]/g, '');
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
      error: `Tidak ada field yang berhasil diisi. Pastikan form eCourt sedang terbuka. ${errors.join('; ')}` 
    };
  }

  return { 
    success: true, 
    filledFields,
    errors: errors.length > 0 ? errors : undefined 
  };
}

/**
 * Fill a text input field by matching label text.
 */
function fillTextInput(labelPatterns, value) {
  // Strategy 0: Direct ID lookup for eCourt's naming convention
  // Try multiple ID variations (case sensitivity varies across forms)
  const keyToFieldIds = {
    'nama': ['szNama'],
    'namalengkap': ['szNama'],
    'nik': ['szNik', 'szNIK', 'szNIK'],
    'nomorindukkependudukan': ['szNik', 'szNIK'],
    'noktp': ['szNik', 'szNIK'],
    'nomoridentitas': ['szNik', 'szNIK'],
    'tempatlahir': ['szTempatLahir'],
    'tempat_lahir': ['szTempatLahir'],
    'tanggallahir': ['szTanggalLahir'],
    'tanggal_lahir': ['szTanggalLahir'],
    'tglahir': ['szTanggalLahir'],
    'tgl_lahir': ['szTanggalLahir'],
    'pekerjaan': ['szPekerjaan'],
    'alamat': ['alamat', 'szAlamat'],
    'email': ['szEmail', 'email'],
    'e-mail': ['szEmail'],
    'telepon': ['szNoTelepon'],
    'telp': ['szNoTelepon'],
    'notelepon': ['szNoTelepon'],
    'nomortelepon': ['szNoTelepon'],
    'handphone': ['szHp'],
    'hp': ['szHp'],
    'nohp': ['szHp'],
    'warganegara': ['szKewarganegaraan'],
    'kewarganegaraan': ['szKewarganegaraan'],
    'wn': ['szKewarganegaraan'],
    'jeniskelamin': ['szJenisKelamin'],
    'jenis_kelamin': ['szJenisKelamin'],
    'jk': ['szJenisKelamin'],
    'agama': ['szAgama'],
    'pendidikan': ['szPendidikan'],
    'statuskawin': ['szStatusKawin'],
    'status_kawin': ['szStatusKawin'],
    'statusperkawinan': ['szStatusKawin'],
    'bank': ['szBank'],
    'norekening': ['szNoRekening'],
    'no_rekening': ['szNoRekening'],
    'akunbank': ['szAkunBank'],
    'akun_bank': ['szAkunBank'],
    'namarekening': ['szAkunBank'],
    'umur': ['szUmur'],
    'usia': ['szUmur'],
  };
  
  for (const pattern of labelPatterns) {
    const normalizedKey = pattern.toLowerCase().replace(/[\s\-\/]+/g, '');
    const fieldIds = keyToFieldIds[normalizedKey] || [];
    for (const fieldId of fieldIds) {
      const input = document.getElementById(fieldId);
      if (input) {
        setInputValue(input, value);
        return true;
      }
    }
  }

  // Strategy 1: Find by label text in nearby elements
  const allLabels = document.querySelectorAll('label, .label, span, div, td, th');
  
  for (const labelEl of allLabels) {
    const labelText = (labelEl.textContent || '').trim().toLowerCase();
    
    for (const pattern of labelPatterns) {
      if (labelText.includes(pattern.toLowerCase())) {
        const input = findAssociatedInput(labelEl);
        if (input) {
          setInputValue(input, value);
          return true;
        }
      }
    }
  }

  // Strategy 2: Find inputs by placeholder or nearby text
  const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  for (const input of inputs) {
    const placeholder = (input.placeholder || '').toLowerCase();
    const nearbyText = getNearbyText(input).toLowerCase();
    
    for (const pattern of labelPatterns) {
      if (placeholder.includes(pattern.toLowerCase()) || nearbyText.includes(pattern.toLowerCase())) {
        setInputValue(input, value);
        return true;
      }
    }
  }

  // Strategy 3: Try by input name or id attributes
  const nameMap = {
    'nama': ['nama', 'name', 'partyname'],
    'nik': ['nik', 'noktp', 'noidentitas', 'identitynumber', 'noktp'],
    'alamat': ['alamat', 'address'],
    'tempat_lahir': ['tempatlahir', 'tempat_lahir', 'placeofbirth'],
    'tanggal_lahir': ['tanggallahir', 'tanggal_lahir', 'dateofbirth', 'dob'],
    'pekerjaan': ['pekerjaan', 'occupation', 'job'],
    'kewarganegaraan': ['warganegara', 'kewarganegaraan', 'citizenship'],
    'email': ['email'],
    'telepon': ['telepon', 'phone', 'telp'],
    'handphone': ['handphone', 'hp', 'mobile'],
    'no_rekening': ['rekening', 'norekening'],
    'akun_bank': ['akunbank', 'namarekening', 'atasnama'],
  };

  const key = labelPatterns[0].toLowerCase().replace(/\s+/g, '');
  const namePatterns = nameMap[key] || [];
  
  for (const namePattern of namePatterns) {
    const input = document.querySelector(
      `input[name*="${namePattern}" i], input[id*="${namePattern}" i]`
    );
    if (input) {
      setInputValue(input, value);
      return true;
    }
  }

  return false;
}

/**
 * Fill a dropdown/select field by matching label text.
 */
function fillDropdown(labelPatterns, value) {
  const valueLower = value.toLowerCase();

  // Strategy 0: Direct ID lookup for eCourt's naming convention
  const keyToFieldIds = {
    'jeniskelamin': ['szJenisKelamin'],
    'jenis_kelamin': ['szJenisKelamin'],
    'jk': ['szJenisKelamin'],
    'agama': ['szAgama'],
    'pendidikan': ['szPendidikan'],
    'statuskawin': ['szStatusKawin'],
    'status_kawin': ['szStatusKawin'],
    'statusperkawinan': ['szStatusKawin'],
    'bank': ['szBank'],
    'berkebutuhankhusus': ['szBerkebutuhanKhusus'],
    'statuspihak': ['szStatusPihak'],
    'jenispihak': ['szJenisPihak'],
    'jenisidentitas': ['szJenisIdentitas'],
  };

  for (const pattern of labelPatterns) {
    const normalizedKey = pattern.toLowerCase().replace(/[\s\-\/]+/g, '');
    const fieldIds = keyToFieldIds[normalizedKey] || [];
    for (const fieldId of fieldIds) {
      const select = document.getElementById(fieldId);
      if (select && (select.tagName === 'SELECT' || select.classList.contains('select2-hidden-accessible'))) {
        return setSelectValue(select, value);
      }
    }
  }

  // Strategy 1: Find <select> elements near labels
  const allLabels = document.querySelectorAll('label, .label, span, div, td, th');
  
  for (const labelEl of allLabels) {
    const labelText = (labelEl.textContent || '').trim().toLowerCase();
    
    for (const pattern of labelPatterns) {
      if (labelText.includes(pattern.toLowerCase())) {
        const select = findAssociatedSelect(labelEl);
        if (select) {
          return setSelectValue(select, value);
        }
      }
    }
  }

  // Strategy 2: Find selects by name/id
  const selectElements = document.querySelectorAll('select');
  for (const select of selectElements) {
    const nameId = ((select.name || '') + (select.id || '')).toLowerCase();
    const nearbyText = getNearbyText(select).toLowerCase();
    
    for (const pattern of labelPatterns) {
      const p = pattern.toLowerCase();
      if (nameId.includes(p) || nearbyText.includes(p)) {
        return setSelectValue(select, value);
      }
    }
  }

  // Strategy 3: Custom dropdown components
  const customDropdowns = document.querySelectorAll(
    '.dropdown, [role="listbox"], [role="combobox"], .select-wrapper, .ant-select, .MuiSelect-root'
  );
  
  for (const dropdown of customDropdowns) {
    const nearbyText = getNearbyText(dropdown).toLowerCase();
    for (const pattern of labelPatterns) {
      if (nearbyText.includes(pattern.toLowerCase())) {
        return fillCustomDropdown(dropdown, value);
      }
    }
  }

  return false;
}

/**
 * Find the input element associated with a label.
 */
function findAssociatedInput(labelEl) {
  if (labelEl.htmlFor) {
    const input = document.getElementById(labelEl.htmlFor);
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

/**
 * Find the select element associated with a label.
 */
function findAssociatedSelect(labelEl) {
  if (labelEl.htmlFor) {
    const select = document.getElementById(labelEl.htmlFor);
    if (select && select.tagName === 'SELECT') return select;
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

  return null;
}

/**
 * Get text content near an element (for matching labels).
 */
function getNearbyText(element) {
  const parent = element.closest('.form-group, .form-row, .field, tr, .input-group, [class*="form"]');
  if (parent) {
    return parent.textContent || '';
  }
  return element.parentElement?.textContent || '';
}

/**
 * Set input value and trigger events for frameworks.
 * Also triggers jQuery events since eCourt uses jQuery.
 */
function setInputValue(input, value) {
  input.focus();
  input.click();
  input.value = '';
  
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;
  
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }
  
  // Dispatch standard DOM events
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // Trigger jQuery events if available (eCourt uses jQuery)
  if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
    try {
      const jq = jQuery || $;
      jq(input).val(value).trigger('input').trigger('change').trigger('blur');
    } catch (e) { /* ignore jQuery errors */ }
  }
  
  if (input.value !== value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * Set select element value.
 * Supports Select2 (eCourt uses Select2 for dropdowns).
 */
function setSelectValue(select, value) {
  const valueLower = value.toLowerCase();
  const options = Array.from(select.options);
  
  let option = options.find(o => o.value.toLowerCase() === valueLower || 
                                 o.text.toLowerCase() === valueLower);
  
  if (!option) {
    option = options.find(o => 
      o.text.toLowerCase().includes(valueLower) || 
      valueLower.includes(o.text.toLowerCase())
    );
  }

  if (!option) {
    const mappings = getDropdownMappings(select);
    const mappedValue = mappings[valueLower] || valueLower;
    option = options.find(o => 
      o.text.toLowerCase().includes(mappedValue) || 
      o.value.toLowerCase().includes(mappedValue)
    );
  }

  if (option) {
    // Use Select2 API if available (eCourt uses Select2 for dropdowns)
    if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
      try {
        const jq = jQuery || $;
        const $select = jq(select);
        // Check if Select2 is initialized on this element
        if ($select.data('select2') || select.classList.contains('select2-hidden-accessible')) {
          $select.val(option.value).trigger('change').trigger('select2:select');
          return true;
        }
      } catch (e) { /* fall through to native */ }
    }
    
    // Native select fallback
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}

/**
 * Get common dropdown value mappings for eCourt fields.
 */
function getDropdownMappings(select) {
  const nameId = ((select.name || '') + (select.id || '') + getNearbyText(select)).toLowerCase();
  
  if (nameId.includes('agama')) {
    return {
      'islam': 'islam', 'kristen': 'kristen', 'katolik': 'katolik',
      'hindu': 'hindu', 'budha': 'budha', 'buddha': 'budha', 'konghucu': 'konghucu',
    };
  }
  
  if (nameId.includes('kelamin') || nameId.includes('jk') || nameId.includes('gender')) {
    return {
      'laki-laki': 'laki-laki', 'laki laki': 'laki-laki', 'laki': 'laki-laki',
      'perempuan': 'perempuan', 'pria': 'laki-laki', 'wanita': 'perempuan',
    };
  }
  
  if (nameId.includes('kawin') || nameId.includes('perkawinan')) {
    return {
      'kawin': 'kawin', 'belum kawin': 'belum kawin',
      'cerai hidup': 'cerai hidup', 'cerai mati': 'cerai mati',
    };
  }
  
  if (nameId.includes('pendidikan')) {
    return {
      'tidak sekolah': 'tidak sekolah', 'tidak tamat sd': 'tidak tamat sd',
      'sd': 'sekolah dasar', 'smp': 'sekolah lanjutan tingkat pertama',
      'sma': 'sekolah menengah atas', 'smk': 'sekolah menengah kejuruan',
      'd1': 'diploma i', 'd2': 'diploma ii', 'd3': 'diploma iii', 'd4': 'diploma iv',
      's1': 'strata i', 's2': 'strata ii', 's3': 'strata iii',
    };
  }
  
  if (nameId.includes('status') && nameId.includes('pihak')) {
    return { 'penggugat': 'penggugat', 'tergugat': 'tergugat', 'pemohon': 'pemohon', 'termohon': 'termohon' };
  }
  
  if (nameId.includes('jenis') && nameId.includes('pihak')) {
    return { 'perorangan': 'perorangan', 'badan hukum': 'badan hukum' };
  }
  
  if (nameId.includes('jenis') && nameId.includes('identitas')) {
    return { 'ktp': 'ktp', 'passpor': 'passpor', 'sim': 'sim' };
  }
  
  if (nameId.includes('bank')) {
    return {
      'bri': 'bri', 'bni': 'bni', 'mandiri': 'mandiri', 'bca': 'bca',
      'bsi': 'bsi', 'btn': 'btn', 'bukopin': 'bukopin', 'danamon': 'danamon',
      'permata': 'permata', 'cimb': 'cimb niaga', 'mega': 'bank mega',
    };
  }
  
  return {};
}

/**
 * Handle custom dropdown components (non-native selects).
 */
function fillCustomDropdown(dropdown, value) {
  const trigger = dropdown.querySelector(
    '[role="combobox"], .dropdown-toggle, .select-trigger, button, [class*="trigger"]'
  ) || dropdown;
  
  trigger.click();
  
  setTimeout(() => {
    const options = document.querySelectorAll(
      '[role="option"], .dropdown-item, .select-option, li[class*="option"]'
    );
    
    const valueLower = value.toLowerCase();
    for (const option of options) {
      if (option.textContent.toLowerCase().includes(valueLower)) {
        option.click();
        break;
      }
    }
  }, 200);
  
  return true;
}
