# eCourt AutoFill - Chrome Extension

Auto-fill form identitas pihak di eCourt dari hasil ekstraksi PTSP Helper.

## Cara Pakai

### 1. Install Chrome Extension

1. Buka Chrome, ketik `chrome://extensions/` di address bar
2. Aktifkan **Developer mode** (toggle di pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `ecourt-autofill` ini
5. Extension akan muncul di toolbar Chrome

### 2. Pakai di eCourt

1. Upload dokumen gugatan ke **PTSP Helper**
2. Klik tombol **"📋 Copy JSON (eCourt)"** di samping data pihak
   - Atau klik **"📋 Copy Semua JSON (eCourt AutoFill)"** untuk copy semua pihak
3. Buka form pendaftaran perkara di **eCourt**
4. Klik icon extension di toolbar Chrome
5. Klik **📋 Paste** (atau paste manual Ctrl+V)
6. Klik **🔍 Parse** untuk preview data
7. Pilih pihak yang mau di-fill (kalau ada banyak)
8. Klik **⚡ Fill Form**

### 3. Yang Di-Fill Otomatis

| Field eCourt | Sumber dari PTSP Helper |
|---|---|
| Nama | nama |
| Nomor Identitas | nik |
| Alamat | alamat |
| Tempat Lahir | tempat_lahir |
| Tanggal Lahir | tanggal_lahir |
| Pekerjaan | pekerjaan |
| Warga Negara | kewarganegaraan |
| Email | domisili_email |
| Telepon | domisili_wa |
| Agama | agama (dropdown) |
| Jenis Kelamin | jenis_kelamin (dropdown) |
| Pendidikan | pendidikan (dropdown) |
| Status Kawin | status_kawin (dropdown) |

### 4. Yang Perlu Di-Fill Manual

Beberapa field dropdown yang bergantung pada alamat:
- **Provinsi** → pilih manual
- **Kabupaten** → pilih manual
- **Kecamatan** → pilih manual
- **Kelurahan** → pilih manual
- **Status Pihak** → Penggugat/Tergugat (pilih manual)
- **Jenis Pihak** → Perorangan/Badan Hukum (pilih manual)
- **Jenis Identitas** → KTP (biasanya sudah default)

## Troubleshooting

### "Tidak ada field yang berhasil diisi"
- Pastikan form eCourt sedang terbuka
- Coba refresh halaman eCourt
- Cek apakah form sudah dalam mode "edit" (bukan "view")

### Extension tidak muncul
- Klik icon puzzle piece di toolbar Chrome
- Pin extension "eCourt AutoFill"

### JSON tidak terbaca
- Pastikan JSON dari PTSP Helper sudah ter-copy
- Coba paste manual (Ctrl+V) ke text area

## File Structure

```
ecourt-autofill/
├── manifest.json      # Extension config
├── popup.html         # UI popup
├── popup.js           # Popup logic
├── content.js         # Form filling logic (runs on eCourt page)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## Development

Untuk modify extension:
1. Edit file yang diperlukan
2. Buka `chrome://extensions/`
3. Klik refresh (↻) di extension card
4. Test di halaman eCourt
