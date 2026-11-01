# Keterbatasan Jude dan solusinya

Fokus Jude: **mencatat keterangan saksi di sidang, menunjukkan bagian yang berbeda dari BAP dengan kutipan asli, lalu advokat yang memutuskan.**

Dasar hukum: KUHAP Pasal 185(1) dan 163 (UU 8/1981); padanannya di UU 20/2025 perlu diverifikasi ke naskah resmi. Berita acara sidang hanya mencatat "hal penting", sehingga perbedaan dari BAP mudah terlewat.

## Keterbatasan

| # | Keterbatasan | Solusi sederhana | Status |
|---|---|---|---|
| 1 | UI berbahasa Inggris, padahal pengguna advokat Indonesia | Terjemahkan UI dengan istilah KUHAP (Keterangan Saksi, BAP, Penuntut Umum, Penasihat Hukum) | Belum |
| 2 | Temuan belum menyandingkan keterangan sidang dan BAP secara langsung | Kartu "Berbeda dari BAP": kutipan sidang di kiri, kutipan BAP + halaman di kanan | Sebagian |
| 3 | Transkripsi bisa salah (ASR, aksen, suara tumpang tindih) | Tombol putar audio ±5 detik per temuan; segmen dengan confidence rendah ditandai "dengarkan dulu" dan tidak bisa menjadi satu-satunya dasar temuan | Sebagian (confidence sudah tampil) |
| 4 | Label pembicara bisa tertukar setelah koneksi diperbarui | Simpan pemetaan label → nama; perbaikan cukup satu klik | Belum |
| 5 | Merekam sidang butuh izin hakim ketua (Perma 5/2020) | Centang "Majelis telah mengizinkan perekaman" sebelum audio dimulai | Belum |
| 6 | Tanpa izin rekam, fitur live tidak bisa dipakai | Mode catatan ketik: advokat mengetik poin keterangan, Jude tetap membandingkan dengan BAP | Sebagian (input manual sudah ada) |
| 7 | Sidang tertutup (anak/SPPA, kekerasan seksual/TPKS) melarang rekaman | Sakelar "Sidang tertutup": audio mati, ekspor dikunci | Belum |
| 8 | Data pribadi dikirim ke penyedia AI di luar negeri (UU PDP) | Samarkan nama saksi/korban ("Saksi A") sebelum dikirim ke AI dan saat ekspor | Belum |
| 9 | Advokat bisa terlalu percaya AI (automation bias) | Setiap temuan wajib diberi status Ditanyakan / Abaikan + alasan singkat | Sebagian (reviewed + catatan sudah ada) |
| 10 | Inkonsistensi bukan bukti saksi berbohong | Bahasa netral "Berbeda dari BAP"; tanpa skor kredibilitas atau kesalahan | Terpenuhi |
| 11 | AI bisa berhalusinasi kutipan | Kutipan wajib persis sama dengan sumber; tanpa kutipan, tanpa temuan | Terpenuhi |
| 12 | Hasil kerja belum berbentuk dokumen yang langsung dipakai | Ekspor "Daftar Perbedaan Keterangan Saksi vs BAP" (kutipan, waktu, halaman BAP) untuk pertanyaan lanjutan, permohonan pencatatan di berita acara, dan pledoi | Belum |
| 13 | Penyedia (Speechmatics, OpenRouter, Pasal.id, Supabase) belum diuji dengan akun asli | Uji end-to-end dengan kunci asli sebelum demo; simulasi sintetis sebagai cadangan | Belum |

## Urutan pengerjaan

1. UI Bahasa Indonesia (#1)
2. Kartu "Berbeda dari BAP" + putar audio + Ditanyakan/Abaikan (#2, #3, #9)
3. Izin rekam, mode ketik, sidang tertutup (#5, #6, #7)
4. Ekspor Daftar Perbedaan (#12)
5. Penyamaran nama dan label pembicara (#8, #4)

## Di luar cakupan

Prediksi putusan, skor kredibilitas, alur kerja jaksa/hakim, dan graf bukti baru.
