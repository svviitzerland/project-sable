# 0001. Tetap di AWS, data tersimpan pindah ke Jakarta saat ada klien berbayar

- Tanggal: 2 November 2026
- Status: diterima
- Dasar: [laporan riset lokasi data dan biaya hosting](../../research/hosting-dan-biaya/reports/Lokasi%20data%20dan%20biaya%20hosting%20Jude.md), dengan catatan riset di folder yang sama. Angka biaya dan daftar layanan AWS diverifikasi lewat AWS CLI dan AWS Price List API pada tanggal di atas.

## Pertanyaan

1. Apakah data Jude wajib disimpan dan diproses di Indonesia?
2. Bisakah biaya ditekan, sampai gratis bila mungkin, dengan layanan seperti Supabase, Neon atau Cloudflare R2?
3. Bagaimana tetap memakai AWS sebanyak mungkin dengan biaya serendah mungkin?

## Fakta yang menentukan

- **Klien swasta tidak mewajibkan lokalisasi.** Jude adalah PSE Lingkup Privat. PP 71/2019 membolehkan penyimpanan di dalam atau di luar negeri, dengan syarat pengawasan tetap efektif. UU PDP dan PP 33/2026 tidak mewajibkan lokalisasi, tetapi mulai 16 Januari 2027 transfer ke luar negeri harus terdokumentasi, dan persetujuan saja tidak cukup untuk transfer rutin.
- **Klien instansi negara mewajibkan lokalisasi.** Contohnya pengadilan, kejaksaan, kepolisian, BPHN sebagai operator, atau institusi yang ditunjuknya. Mereka termasuk PSE Lingkup Publik, sehingga penyimpanan dan pemrosesan wajib di Indonesia.
- **Supabase, Neon dan Cloudflare R2 tidak punya lokasi Indonesia.** Supabase dan Neon tidak punya region Jakarta di paket apa pun, gratis maupun berbayar, dan region terdekatnya Singapura. R2 tidak menjamin data tetap di Indonesia. Paket gratis Supabase (500 MB, dijeda setelah seminggu tidak aktif) dan Neon (1 GB) juga terlalu kecil untuk basis data Jude (sekitar 20 GB). Paket berbayarnya sekitar $26 per bulan, tidak lebih murah dari RDS.
- **Harga AWS Jakarta sama dengan Singapura.** EC2 t4g, RDS db.t4g.micro dan S3 punya harga yang sama di kedua region. Keluarga t3a tidak tersedia di Jakarta.
- **Amazon Transcribe tidak ada di Jakarta.** Transkripsi live tetap diproses di Singapura.
- **Bedrock Jakarta punya model open-weight in-region.** Contohnya Qwen3 235B, DeepSeek V3.2, Kimi K2.5, gpt-oss-120b, GLM 5, MiniMax M2.5 dan Nova v1. Analisis AI bisa berjalan di Indonesia. Saat keputusan ini dibuat, akses ke model itu masih tertahan verifikasi akun AWS, dan kualitasnya untuk kesaksian berbahasa Indonesia belum diuji.

## Opsi yang dipertimbangkan

| Opsi | Keputusan | Alasan |
|---|---|---|
| Supabase (gratis atau Pro) | Ditolak | Tidak ada region Jakarta, gratisnya terlalu kecil dan dijeda, Pro tidak lebih murah dari RDS |
| Neon | Ditolak | Tidak ada region Jakarta, untuk 20 GB sekitar $26 per bulan |
| Cloudflare R2 | Ditolak untuk data perkara | Tidak ada jaminan lokasi Indonesia, penghematan kecil di volume Jude |
| Lightsail | Cadangan | Hemat beberapa dolar, tetapi meninggalkan Terraform, deploy OIDC dan IAM instance role |
| PostgreSQL di EC2 yang sama | Diterima untuk tahap lomba | Menghapus biaya RDS sekitar $21 per bulan, backup lewat pg_dump ke S3 |
| RDS PostgreSQL | Diterima untuk tahap berbayar | Backup otomatis, enkripsi, pemulihan titik waktu |
| Aurora Serverless v2 | Ditolak | Paling banter impas dengan RDS, ditambah jeda saat bangun |
| Fargate, App Runner, Lambda | Ditolak | Job latar dan SSE butuh satu proses yang selalu hidup |
| AWS Jakarta | Diterima untuk tahap berbayar | Harga sama, menjawab pertanyaan pengadaan "data kami di mana" |
| Whisper self-hosted di GPU Jakarta | Disimpan untuk klien instansi | Satu-satunya jalan ASR penuh di Indonesia, mahal dan rumit untuk satu sidang |
| Gemini free tier, Deepgram | Ditolak untuk data nyata | Di luar AWS, dan data tier gratis Gemini dipakai untuk meningkatkan produk Google |
| Cloud lokal (Biznet Gio dan sejenisnya) | Cadangan terakhir | Murah, tetapi tanpa Postgres terkelola dan tanpa Bedrock |

## Keputusan

1. **Tetap di AWS.** Layanan gratis di luar AWS tidak memberi lokasi Indonesia dan tidak lebih murah pada ukuran Jude.
2. **Tahap lomba: tetap di Singapura.** Data demonya catatan publik. Biaya tetap diturunkan dari sekitar $65 menjadi sekitar $10 sampai $22 per bulan, dengan cara:
   - satu EC2 t4g.small (arm64) dengan PostgreSQL di Docker;
   - RDS dihapus setelah snapshot terakhir;
   - EC2 dihentikan saat tidak dipakai.

   Ajukan AWS Activate Founders ($1.000) untuk menutup sisanya.
3. **Tahap berbayar dengan klien swasta: data tersimpan pindah ke Jakarta sebelum 16 Januari 2027.** Ini mencakup EC2, RDS dan S3. Transkripsi live tetap di Transcribe Singapura. Uji model in-region Jakarta setelah verifikasi akun selesai. Kalau kualitasnya lolos, analisis AI ikut pindah ke Jakarta.
4. **Klien instansi: tenant terpisah di Jakarta.** Hanya model in-region yang dipakai. ASR dijalankan sendiri di GPU Jakarta, atau lewat pengecualian "teknologi tidak tersedia di dalam negeri".
5. **Klaim pemasaran "data di Indonesia" hanya untuk data tersimpan.** Pemrosesan AI tidak termasuk, kecuali pada konfigurasi klien instansi.

## Konsekuensi dan pekerjaan lanjutan

- **Build:** image Docker dibuat multi-arch (arm64) supaya bisa jalan di t4g.
- **Backup:** pg_dump harian ke S3 selama RDS dihapus.
- **Kepatuhan:**
  - pendaftaran PSE Lingkup Privat lewat OSS;
  - DPIA, karena Jude memproses data biometrik dan data perkara dengan AI;
  - perjanjian pemrosesan data yang mencantumkan AWS sebagai subprosesor;
  - konfirmasi izin hakim sebelum merekam (Perma 5/2020);
  - tabel lokasi pemrosesan di kebijakan privasi.
- **Penghematan per jam sidang:**
  - prompt caching untuk konteks perkara yang berulang;
  - Transcribe batch untuk rekaman unggahan ($0,36 per jam, bukan $0,60);
  - Bedrock batch untuk analisis ulang pascasidang.

## Kapan ditinjau ulang

- Lembaga PDP terbentuk dan menerbitkan daftar negara memadai atau klausul kontrak baku.
- Amazon Transcribe hadir di Jakarta, atau Supabase atau Neon membuka region Jakarta.
- Klien instansi pertama, atau klien yang mensyaratkan seluruh pemrosesan di Indonesia.
- Nova 2 Lite mendekati akhir masa hidup (model card menyebut paling cepat 2 Desember 2026).
