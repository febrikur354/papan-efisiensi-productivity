# Papan Efisiensi Productivity

Project siap deploy ke GitHub + Vercel + JSONBin.

## Struktur
- `index.html` — dashboard admin
- `public.html` — dashboard public
- `api/auth.mjs` — login admin dengan session cookie
- `api/productivity.mjs` — API Vercel ke JSONBin
- `.gitignore` — mencegah file rahasia masuk GitHub

## Environment Variables di Vercel
Tambahkan:
1. `JSONBIN_BIN_ID` = `6ab49609ffd5d1605328f577`
2. `JSONBIN_ACCESS_KEY` = Access Key JSONBin baru milik kamu
3. `ADMIN_PASSWORD` = password admin pilihan kamu
4. `SESSION_SECRET` = string acak panjang, contoh `prod-2026-ganti-dengan-string-acak-panjang`

Jangan masukkan Access Key atau password ke file HTML/GitHub.

## Rumus
- Target Produksi = Waktu Produksi (menit) × 60 / CT Standard
- Efisiensi = CT Standard / CT Actual × 100
- Achievement = Aktual Produksi / Target × 100
- GOOD >= 95%
- WARNING >= 85%
- LOW < 85%

## Deploy
1. Buat repository GitHub baru.
2. Upload semua isi folder project ini, bukan file ZIP.
3. Import repository ke Vercel.
4. Tambahkan 4 Environment Variables di atas untuk Production, Preview, dan Development bila diperlukan.
5. Deploy.
6. Buka `/` untuk Admin dan `/public.html` untuk Public Board.

Catatan: Access Key JSONBin yang pernah tampil di chat/screenshot sebaiknya direvoke setelah setup, lalu gunakan key baru di Vercel.
