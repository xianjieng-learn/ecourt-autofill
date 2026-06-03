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
  const visibleModalText = Array.from(document.querySelectorAll('.modal, [role="dialog"]'))
    .filter(isVisibleContainer)
    .map(el => el.textContent.toLowerCase())
    .join(' ');

  if (visibleModalText.includes('tambah pihak') ||
      document.querySelector('#status_pihak, #jenis_pihak, #jenis_identitas, #telepon_pihak, #warga_negara')) {
    return 'identity';
  }
  
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
  const effectiveData = {
    jenis_pihak: 'Perorangan',
    jenis_identitas: 'KTP',
    kewarganegaraan: 'Indonesia',
    ...data,
    status_pihak: data.status_pihak || data.role,
  };

  // ─── Build enhanced alamat with WA number ───
  let alamatValue = effectiveData.alamat || '';
  if (effectiveData.telepon && alamatValue && !alamatValue.includes(effectiveData.telepon)) {
    alamatValue = `${alamatValue}, WA: ${effectiveData.telepon}`;
  } else if (effectiveData.telepon && !alamatValue) {
    alamatValue = `WA: ${effectiveData.telepon}`;
  }

  // ─── Field mapping: party data key → form field label pattern ───
  const fieldMap = [
    { key: 'status_pihak',     labels: ['Status Pihak'], type: 'dropdown' },
    { key: 'jenis_pihak',      labels: ['Jenis Pihak'], type: 'dropdown' },
    { key: 'jenis_identitas',  labels: ['Jenis Identitas'], type: 'dropdown' },
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

  return fillFields(fieldMap, effectiveData, filledFields, errors);
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
  const effectiveData = {
    jenis_pihak: 'Perorangan',
    jenis_identitas: 'KTP',
    kewarganegaraan: 'Indonesia',
    ...data,
    telepon: waNumber,
    handphone: waNumber,
    status_pihak: data.status_pihak || data.role,
  };

  // ─── Build enhanced alamat with WA number ───
  let alamatValue = effectiveData.alamat || '';
  if (waNumber && alamatValue && !alamatValue.includes(waNumber)) {
    alamatValue = `${alamatValue}, WA: ${waNumber}`;
  } else if (waNumber && !alamatValue) {
    alamatValue = `WA: ${waNumber}`;
  }

  // ─── Account form field mapping ───
  const fieldMap = [
    { key: 'status_pihak',     labels: ['Status Pihak'], type: 'dropdown' },
    { key: 'jenis_pihak',      labels: ['Jenis Pihak'], type: 'dropdown' },
    { key: 'jenis_identitas',  labels: ['Jenis Identitas'], type: 'dropdown' },
    // Standard fields
    { key: 'nama',             labels: ['Nama', 'Nama Lengkap'], type: 'text' },
    { key: 'nik',              labels: ['Nomor Induk Kependudukan', 'NIK', 'No KTP', 'Nomor Identitas'], type: 'text' },
    { key: 'tempat_lahir',     labels: ['Tempat Lahir'], type: 'text' },
    { key: 'tanggal_lahir',    labels: ['Tanggal Lahir', 'Tgl Lahir'], type: 'text' },
    { key: 'pekerjaan',        labels: ['Pekerjaan'], type: 'text' },
    { key: 'email',            labels: ['Email', 'E-Mail', 'e-mail'], type: 'text' },
    { key: 'telepon',          labels: ['Telepon', 'Nomor Telepon', 'Telp'], type: 'text' },
    { key: 'handphone',        labels: ['Handphone', 'HP', 'No HP'], type: 'text' },
    { key: 'alamat',           labels: ['Alamat'], type: 'text', overrideValue: alamatValue },
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

function isVisibleField(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         style.opacity !== '0' &&
         rect.width > 0 &&
         rect.height > 0;
}

function isVisibleContainer(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== 'none' &&
         style.visibility !== 'hidden' &&
         rect.width > 0 &&
         rect.height > 0;
}

function isUsableSelect(select) {
  if (!select) return false;
  if (isVisibleField(select)) return true;
  if (!select.classList.contains('select2-hidden-accessible')) return false;

  const select2Container = select.nextElementSibling;
  return isVisibleContainer(select2Container) ||
         isVisibleContainer(document.querySelector(`[aria-labelledby="select2-${select.id}-container"]`));
}

/**
 * Fill a text input field by matching label text.
 */
function fillTextInput(labelPatterns, value) {
  // Strategy 0: Direct ID lookup for eCourt's naming convention
  // Try multiple ID variations — Tambah Pengguna uses sz* prefix, Tambah Pihak uses plain IDs
  const keyToFieldIds = {
    'nama': ['szNama', 'nama'],
    'namalengkap': ['szNama', 'nama'],
    'nik': ['szNik', 'szNIK', 'nomor_identitas', 'nik'],
    'nomorindukkependudukan': ['szNik', 'szNIK', 'nomor_identitas'],
    'noktp': ['szNik', 'szNIK', 'nomor_identitas'],
    'nomoridentitas': ['szNik', 'szNIK', 'nomor_identitas'],
    'tempatlahir': ['szTempatLahir', 'tempat_lahir'],
    'tempat_lahir': ['szTempatLahir', 'tempat_lahir'],
    'tanggallahir': ['szTanggalLahir', 'tanggal_lahir'],
    'tanggal_lahir': ['szTanggalLahir', 'tanggal_lahir'],
    'tglahir': ['szTanggalLahir', 'tanggal_lahir'],
    'tgl_lahir': ['szTanggalLahir', 'tanggal_lahir'],
    'pekerjaan': ['szPekerjaan', 'pekerjaan'],
    'alamat': ['alamat', 'szAlamat'],
    'email': ['szEmail', 'email'],
    'e-mail': ['szEmail', 'email'],
    'telepon': ['szNoTelepon', 'telepon_pihak'],
    'telp': ['szNoTelepon', 'telepon_pihak'],
    'notelepon': ['szNoTelepon', 'telepon_pihak'],
    'nomortelepon': ['szNoTelepon', 'telepon_pihak'],
    'handphone': ['szHp'],
    'hp': ['szHp'],
    'nohp': ['szHp'],
    'warganegara': ['szKewarganegaraan', 'warga_negara'],
    'kewarganegaraan': ['szKewarganegaraan', 'warga_negara'],
    'wn': ['szKewarganegaraan', 'warga_negara'],
    'jeniskelamin': ['szJenisKelamin', 'jenis_kelamin'],
    'jenis_kelamin': ['szJenisKelamin', 'jenis_kelamin'],
    'jk': ['szJenisKelamin', 'jenis_kelamin'],
    'agama': ['szAgama', 'agama'],
    'pendidikan': ['szPendidikan', 'jenis_pendidikan'],
    'statuskawin': ['szStatusKawin', 'status_kawin'],
    'status_kawin': ['szStatusKawin', 'status_kawin'],
    'statusperkawinan': ['szStatusKawin', 'status_kawin'],
    'jenisidentitas': ['jenis_identitas'],
    'jenis_identitas': ['jenis_identitas'],
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
      const input = Array.from(document.querySelectorAll(`#${fieldId}`)).find(isVisibleField);
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
        if (input && isVisibleField(input)) {
          setInputValue(input, value);
          return true;
        }
      }
    }
  }

  // Strategy 2: Find inputs by placeholder or nearby text
  const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  for (const input of inputs) {
    if (!isVisibleField(input)) continue;
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
    if (input && isVisibleField(input)) {
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
  const valueLower = normalizeOptionText(value);

  // Strategy 0: Direct ID lookup for eCourt's naming convention
  // Tambah Pengguna uses sz* prefix, Tambah Pihak uses plain IDs
  const keyToFieldIds = {
    'jeniskelamin': ['szJenisKelamin', 'jenis_kelamin'],
    'jenis_kelamin': ['szJenisKelamin', 'jenis_kelamin'],
    'jk': ['szJenisKelamin', 'jenis_kelamin'],
    'agama': ['szAgama', 'agama'],
    'pendidikan': ['szPendidikan', 'jenis_pendidikan'],
    'statuskawin': ['szStatusKawin', 'status_kawin'],
    'status_kawin': ['szStatusKawin', 'status_kawin'],
    'statusperkawinan': ['szStatusKawin', 'status_kawin'],
    'bank': ['szBank'],
    'berkebutuhankhusus': ['szBerkebutuhanKhusus'],
    'statuspihak': ['status_pihak'],
    'jenispihak': ['jenis_pihak'],
    'jenisidentitas': ['jenis_identitas'],
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
        if (select && isUsableSelect(select)) {
          return setSelectValue(select, value);
        }
      }
    }
  }

  // Strategy 2: Find selects by name/id
  const selectElements = document.querySelectorAll('select');
  for (const select of selectElements) {
    if (!isUsableSelect(select)) continue;
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
      const $input = jq(input);
      if ($input.hasClass('hasDatepicker') || $input.hasClass('datepicker') || $input.data('datepicker')) {
        const parts = String(value).split('/');
        if (parts.length === 3 && typeof $input.datepicker === 'function') {
          let [day, month, year] = parts;
          if (year.length === 2) year = '20' + year;
          const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          if (!isNaN(date.getTime())) {
            $input.datepicker('setDate', date);
          }
        }
      }
      $input.val(value).trigger('input').trigger('change').trigger('blur');
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
  const valueLower = normalizeOptionText(value);
  const options = Array.from(select.options);
  const mappings = getDropdownMappings(select);
  const mappedValue = mappings[valueLower] || valueLower;
  
  let option = options.find(o => normalizeOptionText(o.value) === valueLower || 
                                 normalizeOptionText(o.text) === valueLower);

  if (!option) {
    option = options.find(o => 
      normalizeOptionText(o.text) === mappedValue ||
      normalizeOptionText(o.value) === mappedValue
    );
  }

  if (!option) {
    option = options.find(o => 
      !isPlaceholderOption(o) &&
      (normalizeOptionText(o.text).includes(mappedValue) ||
       normalizeOptionText(o.value).includes(mappedValue) ||
       mappedValue.includes(normalizeOptionText(o.text)))
    );
  }

  if (option) {
    option.selected = true;
    select.value = option.value;
    select.selectedIndex = options.indexOf(option);
    updateSelect2Display(select, option);
    updateSelectInPageContext(select, option);
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));

    // Use Select2 API if available (eCourt uses Select2 for dropdowns)
    if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
      try {
        const jq = jQuery || $;
        const $select = jq(select);
        // Check if Select2 is initialized on this element
        if ($select.data('select2') || select.classList.contains('select2-hidden-accessible')) {
          $select
            .val(option.value)
            .trigger('input')
            .trigger('change')
            .trigger({
              type: 'select2:select',
              params: { data: { id: option.value, text: option.text, element: option } },
            });
          updateSelect2Display(select, option);
          updateSelectInPageContext(select, option);
          return true;
        }
      } catch (e) { /* fall through to native */ }
    }
    
    // Native select fallback
    select.value = option.value;
    select.selectedIndex = options.indexOf(option);
    updateSelect2Display(select, option);
    updateSelectInPageContext(select, option);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false;
}

function updateSelect2Display(select, option) {
  if (!select || !option) return;

  const containers = [];
  if (select.id) {
    containers.push(document.getElementById(`select2-${select.id}-container`));
    containers.push(document.querySelector(`#s2id_${select.id} .select2-chosen`));
    containers.push(document.querySelector(`#s2id_${select.id} .select2-choice span`));
  }
  if (select.nextElementSibling) {
    containers.push(select.nextElementSibling.querySelector('.select2-selection__rendered'));
    containers.push(select.nextElementSibling.querySelector('.select2-chosen'));
  }
  if (select.parentElement) {
    containers.push(select.parentElement.querySelector('.select2-selection__rendered'));
    containers.push(select.parentElement.querySelector('.select2-chosen'));
  }

  for (const container of containers.filter(Boolean)) {
    container.textContent = option.text;
    container.title = option.text;
  }

  for (const opt of Array.from(select.options || [])) {
    opt.removeAttribute('selected');
  }
  option.setAttribute('selected', 'selected');
}

function updateSelectInPageContext(select, option) {
  if (!select?.id || !option) return;

  const payload = JSON.stringify({
    id: select.id,
    value: option.value,
    text: option.text,
  });
  const script = document.createElement('script');
  script.textContent = `(() => {
    const payload = ${payload};
    const select = document.getElementById(payload.id);
    if (!select) return;

    select.value = payload.value;
    const option = Array.from(select.options || []).find(opt => opt.value === payload.value);
    if (option) {
      Array.from(select.options || []).forEach(opt => opt.removeAttribute('selected'));
      option.selected = true;
      option.setAttribute('selected', 'selected');
      select.selectedIndex = Array.from(select.options).indexOf(option);
    }

    const rendered =
      document.getElementById('select2-' + payload.id + '-container') ||
      document.querySelector('#s2id_' + payload.id + ' .select2-chosen') ||
      document.querySelector('#s2id_' + payload.id + ' .select2-choice span');
    if (rendered) {
      rendered.textContent = payload.text;
      rendered.title = payload.text;
    }

    if (window.jQuery) {
      const $select = window.jQuery(select);
      $select
        .val(payload.value)
        .trigger('input')
        .trigger('change')
        .trigger({
          type: 'select2:select',
          params: { data: { id: payload.value, text: payload.text, element: option || select } },
        });
    } else {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })();`;
  document.documentElement.appendChild(script);
  script.remove();
}

function isPlaceholderOption(option) {
  const text = normalizeOptionText(option.text);
  const value = normalizeOptionText(option.value);
  return !value || value === '0' || text.startsWith('pilih ');
}

function normalizeOptionText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[|._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get common dropdown value mappings for eCourt fields.
 */
function getDropdownMappings(select) {
  const nameId = ((select.name || '') + (select.id || '') + getNearbyText(select)).toLowerCase();
  
  if (nameId.includes('agama')) {
    return {
      'islam': 'islam',
      'kristen': 'protestan',
      'kristen protestan': 'protestan',
      'protestan': 'protestan',
      'katolik': 'katolik',
      'kristen katolik': 'katolik',
      'hindu': 'hindu',
      'budha': 'budha',
      'buddha': 'budha',
      'konghucu': 'kong hu cu',
      'kong hu cu': 'kong hu cu',
      'lain lain': 'lainnya',
      'lainnya': 'lainnya',
    };
  }
  
  if (nameId.includes('kelamin') || nameId.includes('jk') || nameId.includes('gender')) {
    return {
      'l': 'laki laki',
      'lk': 'laki laki',
      'laki laki': 'laki laki',
      'laki': 'laki laki',
      'pria': 'laki laki',
      'p': 'perempuan',
      'pr': 'perempuan',
      'perempuan': 'perempuan',
      'wanita': 'perempuan',
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
