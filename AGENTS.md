# AGENTS.md — eCourt AutoFill Chrome Extension

## What This Is
Chrome extension (Manifest V3) that auto-fills eCourt forms (Mahkamah Agung RI) from JSON data produced by PTSP Helper.

**Target site:** `https://ecourt.mahkamahagung.go.id/` (public eCourt system)

## Architecture
- `manifest.json` — Extension config, permissions, content script registration
- `popup.html` / `popup.js` — Extension popup UI + parse logic
- `content.js` — Content script that handles all form filling (injected into page)
- Unlike sipp-autofill, this extension runs filling logic directly in the content script (no MAIN world injection needed)

## Supported Forms
1. **Tambah Pengguna** (Create Account) — fills name, NIK, DOB, job, email, phone, address, gender, religion, marital status, education
2. **Input Identitas Pihak** (Party Identity for case registration) — similar fields plus case-specific metadata

## Data Flow
1. User extracts legal document via PTSP Helper
2. PTSP Helper outputs JSON via "Copy JSON (eCourt)" or "Copy Semua JSON" button
3. User pastes JSON into extension popup → Parse → Select party → Fill
4. Content script auto-detects which form is open and fills accordingly

## Key Functions in content.js
- `detectFormType()` — Identifies if page has "Tambah Pengguna" or "Input Identitas" form
- `fillForm(data)` — Main fill dispatcher
- `fillTextInput(labelPatterns, value)` — Finds input by label text, placeholder, or name/id attribute
- `fillDropdown(labelPatterns, value)` — Finds select/dropdown by label or name, matches option text
- `setInputValue(input, value)` — Sets value via native setter + triggers jQuery events

## Critical Pitfalls
1. **No single-quote in names** — eCourt rejects names with `'` (apostrophe) because it breaks ePayment. Extension auto-strips them, but verify before submit
2. **Dropdown matching** — eCourt uses custom styled selects. Match by label text or nearby text, not just element type
3. **Form detection** — Must check for actual form elements, not just page text. Use `document.querySelector` for specific form IDs/actions
4. **Bank fields manual** — Bank, No Rekening, Akun Bank are NOT in the legal document, must be filled manually

## JSON Format (from PTSP Helper)
```json
{
  "pihak": [
    {
      "nama": "...",
      "nik": "...",
      "tempat_lahir": "...",
      "tanggal_lahir": "DD/MM/YYYY",
      "jenis_kelamin": "Laki-laki/Perempuan",
      "agama": "...",
      "pekerjaan": "...",
      "status_kawin": "...",
      "pendidikan": "...",
      "kewarganegaraan": "WNI",
      "alamat": "...",
      "domisili_email": "...",
      "domisili_wa": "..."
    }
  ]
}
```

## Relationship to sipp-autofill
Both extensions consume JSON from PTSP Helper but target different systems:
- **ecourt-autofill** → eCourt (account creation + party identity for case registration)
- **sipp-autofill** → SIPP (case data: children, posita, petitum, marriage info)
