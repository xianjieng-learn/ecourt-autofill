# eCourt AutoFill - Chrome Extension

Auto-fill form identitas pihak **dan** form buat akun di eCourt dari hasil ekstraksi PTSP Helper.

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
3. Buka form di **eCourt** (Tambah Pengguna atau Input Identitas)
4. Klik icon extension di toolbar Chrome
5. Klik **📋 Paste** (atau paste manual Ctrl+V)
6. Klik **🔍 Parse** untuk preview data
7. Pilih pihak yang mau di-fill (kalau ada banyak)
8. Klik **⚡ Fill Form** — extension otomatis detect form type

---

## Form yang Didukung

### 1. Tambah Pengguna (Buat Akun)

| Field eCourt | Sumber dari PTSP Helper |
|---|---|
| Nama * | nama (tanda petik dihapus otomatis!) |
| Nomor Induk Kependudukan * | nik |
| Tempat Lahir | tempat_lahir |
| Tanggal Lahir | tanggal_lahir |
| Pekerjaan * | pekerjaan |
| E-Mail * | domisili_email |
| Nomor Telepon | domisili_wa |
| Handphone | domisili_wa |
| Alamat * | alamat |
| Jenis Kelamin | jenis_kelamin (dropdown) |
| Agama | agama (dropdown) |
| Status Kawin | status_kawin (dropdown) |
| Pendidikan | pendidikan (dropdown) |

> ⚠️ **Bank, No Rekening, Akun Bank** perlu diisi manual karena tidak ada di dokumen gugatan.

### 2. Input Identitas Pihak (Daftar Perkara)

| Field eCourt | Sumber dari PTSP Helper |
|---|---|
| Nama * | nama |
| Status Pihak * | role / status_pihak |
| Jenis Pihak * | otomatis "Perorangan" |
| Jenis Identitas * | otomatis "KTP" |
| Nomor Identitas * | nik |
| Alamat * | alamat |
| Tempat Lahir * | tempat_lahir |
| Tanggal Lahir * | tanggal_lahir |
| Pekerjaan * | pekerjaan |
| Warga Negara | kewarganegaraan |
| Email * | domisili_email |
| Telepon | domisili_wa |
| Agama | agama (dropdown) |
| Jenis Kelamin | jenis_kelamin (dropdown) |
| Pendidikan | pendidikan (dropdown) |
| Status Kawin | status_kawin (dropdown) |

### Yang Perlu Di-Fill Manual

**Form Tambah Pengguna:**
- Bank, No Rekening, Akun Bank
- Umur/Usia
- Berkebutuhan Khusus

**Form Identitas Pihak:**
- Provinsi, Kabupaten, Kecamatan, Kelurahan

---

## ⚠️ Penting: Nama Tidak Boleh Pakai Tanda Petik

eCourt **tidak mengizinkan tanda petik (')** di field Nama karena akan bermasalah di tahap ePayment.

Extension otomatis menghapus tanda petik dari nama. Tapi tetap cek ulang sebelum submit!

---

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
├── popup.js           # Popup logic (handles both forms)
├── content.js         # Form filling logic (auto-detects form type)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```
