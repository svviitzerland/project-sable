# Jude boleh di Singapura, Jakarta menunggu klien

## Ringkasan eksekutif

**Untuk klien swasta (advokat, kantor hukum, organisasi bantuan hukum), data Jude saat ini tidak wajib disimpan atau diproses di Indonesia.** Jude adalah Penyelenggara Sistem Elektronik (PSE) Lingkup Privat, dan PP 71/2019 mengizinkan PSE privat menyimpan data di dalam negeri, di luar negeri, atau keduanya, asalkan kementerian dan aparat penegak hukum tetap bisa mengawasi dan mengakses data tersebut ([Hukumonline](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)). UU PDP dan PP 33/2026 juga tidak mewajibkan lokalisasi. Keduanya hanya mengatur syarat transfer ke luar negeri, dan syarat itu menjadi jauh lebih ketat ketika **PP 33/2026 berlaku pada 16 Januari 2027** ([KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)). **Kewajiban lokal baru muncul bila Jude dipakai atau dioperasikan untuk instansi negara** (pengadilan, kejaksaan, BPHN sebagai operator, atau institusi yang ditunjuk instansi), karena PSE Lingkup Publik wajib mengelola dan menyimpan data di Indonesia. Dengan begitu, tahap lomba bisa tetap di AWS Singapura dan biayanya bisa ditekan dari sekitar **$65 per bulan menjadi sekitar $10 sampai $22 per bulan**, atau praktis $0 bila ditutup kredit AWS. Untuk tahap berbayar, rekomendasinya adalah memindahkan data tersimpan ke **AWS Jakarta (ap-southeast-3)**, karena harga EC2, RDS dan S3 di sana ternyata **sama persis dengan Singapura**, sehingga posisi "data tersimpan di Indonesia" didapat tanpa biaya tambahan. Supabase, Neon dan Cloudflare R2 sudah dipertimbangkan dan ditolak: **tidak satu pun punya region Jakarta di paket gratis maupun berbayar**, dan paket gratisnya terlalu kecil untuk basis data Jude. Kalau data wajib di Indonesia, pilihan gratis itu gugur dan Jude tetap di AWS.

Catatan status: angka biaya produksi, harga Transcribe dan Nova 2 Lite, daftar model Bedrock di Jakarta, dan ketiadaan Transcribe di Jakarta di bawah ini **diverifikasi langsung lewat AWS CLI dan AWS Price List API pada 2 November 2026**. Isi PP 33/2026 bersumber dari ringkasan kantor hukum, bukan teks Lembaran Negara resmi, sehingga nomor pasalnya perlu dicek ulang sebelum dipakai dalam dokumen hukum.

## Regulasi: PSE privat bebas memilih lokasi, PSE publik wajib lokal

### PP 71/2019 dan Permenkominfo 5/2020 membedakan lingkup publik dan privat

PP 71/2019 mendefinisikan PSE Lingkup Publik sebagai "instansi penyelenggara negara dan institusi yang ditunjuk instansi". Lingkup privat mencakup operator portal, situs atau aplikasi untuk perdagangan, transaksi keuangan, konten berbayar, komunikasi, pencarian, dan **pemrosesan data pribadi** ([Hukumonline](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)). Lingkup publik "wajib melakukan pengelolaan, pemrosesan, dan/atau penyimpanan SE/DE di wilayah Indonesia", kecuali bila teknologi penyimpanannya tidak tersedia di dalam negeri, yang diputuskan oleh komite lintas lembaga. Lingkup privat **boleh menyimpan di dalam negeri, di luar negeri, atau keduanya**, dengan syarat wajib memastikan efektivitas pengawasan oleh kementerian, lembaga dan penegak hukum ([Hukumonline](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all)). Pasal yang umum dirujuk adalah Pasal 20 (publik) dan Pasal 21 (privat), dan teks primernya tersedia di [BPK: PP 71/2019](https://peraturan.bpk.go.id/Details/122030/pp-no-71-tahun-2019). Permenkomdigi 5/2025 tentang PSE Lingkup Publik diterbitkan berdasarkan Pasal 20 ayat (7) ([domain.go.id](https://domain.go.id/file-landing/PM-Komdigi-No-5-Tahun-2025.pdf)), tetapi isinya belum ditelaah.

Jude dijual kepada advokat, kantor hukum dan organisasi bantuan hukum, yang semuanya entitas swasta. Organisasi bantuan hukum yang didanai BPHN tetap badan swasta, jadi pendanaan saja kemungkinan besar tidak membuat Jude menjadi PSE publik. Namun komentar 2019 menyebut data yang dibiayai APBN sebagai data yang sebaiknya disimpan di dalam negeri, sehingga ada sisa ketidakpastian untuk klien yang dibiayai negara. Kewajiban yang pasti berlaku untuk Jude sekarang adalah **pendaftaran PSE Lingkup Privat lewat OSS**. Tanpa Tanda Daftar PSE, akses dapat diblokir berdasarkan Permenkominfo 5/2020 Pasal 7 ayat (2) ([SIP Law Firm](https://siplawfirm.id/resources/cloud-computing)). Ancaman ini nyata pada 2026: Komdigi memberi tenggat 22 September 2026 kepada 25 PSE privat ([GEBRAK.ID](https://www.gebrak.id/2026/09/komdigi-minta-25-pse-segera-penuhi-kewajiban-pendaftaran-tenggat-22-september-2026.html), [Kompas](https://nasional.kompas.com/read/2026/07/09/12144631/komdigi-baru-3-dari-25-pse-wajib-daftar-yang-penuhi-komitmen)) dan membatasi fitur login Wikimedia pada 25 Februari 2026 karena belum terdaftar ([ePPID Komdigi](https://eppid.komdigi.go.id/berita/detail/kemkomdigi-batasi-fitur-login-wikimedia-karena-belum-daftar-pse-privat)).

### UU PDP dan PP 33/2026 mengatur transfer, bukan lokasi

UU 27/2022 berlaku penuh sejak 17 Oktober 2024 ([BPK: UU 27/2022](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)). Peraturan pelaksananya, **PP 33/2026, diundangkan 16 Juli 2026 (LN 2026 No. 88) dan berlaku 16 Januari 2027** ([KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp), [SIP Law Firm](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi)). Ringkasan yang ditelaah tidak menemukan kewajiban lokalisasi di PP ini. Yang ada adalah urutan dasar transfer lintas batas: pertama kecukupan (negara tujuan masuk daftar yang diterbitkan lembaga PDP), lalu pengaman yang memadai (klausul kontrak baku dari lembaga atau BCR), dan terakhir persetujuan subjek data. Persetujuan hanya boleh dipakai untuk **transfer yang tidak berulang dengan subjek data terbatas**, setelah penilaian risiko dan dilaporkan ke lembaga (PP 33/2026 Pasal 162 sampai 165, menurut [KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)). Mahkamah Konstitusi menolak uji materi atas Pasal 56 UU PDP dan menyatakan kerangka berjenjang ini konstitusional ([AHP](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/)).

Masalah praktisnya adalah **lembaga PDP belum terbentuk**. Rancangan Perpres diserahkan ke Presiden pada 20 Mei 2026 dan masih belum ditandatangani pada September 2026. Sementara itu, fungsi PDP dijalankan Ditjen Pengawasan Ruang Digital Komdigi ([Kompas](https://nasional.kompas.com/read/2026/09/04/17150021/segera-bentuk-badan-pelindungan-data-pribadi?page=all), [Kompas](https://nasional.kompas.com/read/2026/07/27/15423511/komdigi-ungkap-perpres-pembentukan-badan-perlindungan-data-pribadi-sedang)). Akibatnya belum ada daftar negara yang memadai dan belum ada klausul kontrak baku resmi ([ABNR](https://www.abnrlaw.com/news/the-data-deal-what-the-indonesia-us-reciprocal-trade-agreement-means-for-cross-border-data-transfers)). Bagi SaaS seperti Jude yang mentransfer data setiap hari, persetujuan tidak cukup sebagai dasar tunggal setelah 16 Januari 2027. Posisi yang paling bisa dipertahankan sampai lembaga menerbitkan aturannya adalah penilaian dampak transfer tertulis, pengaman kontraktual (DPA AWS beserta klausul standarnya), pemberitahuan kepada subjek data, dan memilih tujuan transfer yang paling mudah dibela. Singapura dengan PDPA 2012 lebih mudah dibela daripada perutean global. Perjanjian dagang Indonesia dan Amerika Serikat (19 Februari 2026) memuat komitmen mengakui AS sebagai negara memadai, tetapi per Maret 2026 belum efektif dan pemerintah menyatakan transfer tetap tunduk pada UU PDP ([AHP](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/), [Tempo](https://en.tempo.co/read/2088778/data-transfers-to-the-us-remain-subject-to-indonesian-rules)).

Jude juga memproses **data pribadi spesifik**. Pasal 4 ayat (2) UU PDP memasukkan data biometrik dan catatan kejahatan ke kategori ini ([BPK: UU 27/2022](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022)). Voiceprint jelas biometrik. Apakah dakwaan yang masih berjalan dalam BAP termasuk "catatan kejahatan" belum pasti, tetapi praktik konservatif memperlakukannya sebagai data spesifik. Ditambah analisis AI, kombinasi ini memicu DPIA (PP 33/2026 Pasal 120 sampai 122 menyebut AI dan machine learning sebagai contoh teknologi baru) dan kemungkinan kewajiban menunjuk pejabat pelindungan data pada skala besar ([KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)).

### Aturan sektor: kerahasiaan advokat dan izin merekam sidang

UU 18/2003 Pasal 19 mewajibkan advokat merahasiakan segala yang diketahui dari klien dan melindungi berkas serta komunikasi elektroniknya ([BPK: UU 18/2003](https://peraturan.bpk.go.id/Details/40446/uu-no-18-tahun-2003)). Ini kewajiban kerahasiaan, bukan kewajiban lokasi. Hosting di luar negeri tidak otomatis melanggar Pasal 19, tetapi kantor hukum bisa mengangkat risiko yurisdiksi asing (misalnya jangkauan hukum AS atas penyedia cloud AS) dalam proses pengadaan. Untuk rekaman sidang, Perma 5/2020 Pasal 4 ayat (6) mensyaratkan bahwa pengambilan foto, rekaman audio dan audio visual "harus seizin hakim/ketua majelis hakim yang bersangkutan yang dilakukan sebelum dimulainya persidangan" ([Hukumonline](https://www.hukumonline.com/berita/a/melihat-pedoman-protokol-dan-pengamanan-persidangan-lt5fdc57afbee7d/), [BPK: Perma 5/2020](https://peraturan.bpk.go.id/Details/206077/perma-no-5-tahun-2020), [BPK: Perma 6/2020](https://peraturan.bpk.go.id/Details/206078/perma-no-6-tahun-2020)). Risiko hukum terbesar Jude di sini adalah pengguna yang merekam tanpa izin hakim, bukan lokasi server.

### Kesimpulan regulasi dan kapan wajib lokal

| Situasi | Wajib di Indonesia? | Dasar |
|---|---|---|
| Lomba dan demo dengan data rekaman sidang publik | Tidak | PSE privat, data publik |
| Klien swasta, sekarang sampai 15 Januari 2027 | Tidak | PP 71/2019 lingkup privat, UU PDP Pasal 56 |
| Klien swasta, mulai 16 Januari 2027 | Tidak, tetapi transfer ke luar negeri harus terdokumentasi dan diberitahukan | PP 33/2026 Pasal 162 sampai 165 |
| Organisasi bantuan hukum yang didanai BPHN | Kemungkinan tidak, belum pasti | Badan swasta, syarat hibah BPHN belum diteliti |
| Pengadilan, kejaksaan, kepolisian, BPHN sebagai operator, atau institusi yang ditunjuknya | **Ya** | PP 71/2019 lingkup publik, kecuali teknologi tidak tersedia di dalam negeri |

Tidak ditemukan peraturan menteri pengganti Permenkominfo 5/2020 sampai November 2026. Pergantian nama Kominfo menjadi Komdigi tidak mengubah aturan PSE privat.

## Opsi yang dipertimbangkan beserta alasan diterima atau ditolak

Bagian ini sengaja ditulis sebagai catatan keputusan supaya alasan setiap pilihan bisa ditelusuri kembali.

**Supabase: ditolak.** Paket gratis hanya memberi basis data 500 MB per proyek, penyimpanan berkas 1 GB, dan **proyek dijeda setelah satu minggu tidak aktif**. Paket Pro mulai $25 per bulan dengan disk 8 GB ([Supabase pricing](https://supabase.com/pricing)). Basis data Jude sekitar 20 GB, jadi biaya Pro menjadi sekitar $25 + 12 GB × $0,125 ≈ $26,50 per bulan, lebih mahal dari RDS db.t4g.micro. Yang lebih menentukan, **daftar region Supabase tidak memuat Jakarta atau ap-southeast-3 di paket apa pun**. Region terdekat adalah Singapura ([Supabase regions](https://supabase.com/docs/guides/platform/regions)). Premis "Supabase Jakarta tidak gratis" jadi kurang tepat: Supabase Jakarta tidak ada sama sekali, berapa pun harganya. Kesimpulannya justru lebih kuat. Jika data wajib di Indonesia, Supabase gugur, baik gratis maupun berbayar. Supabase self-hosted di EC2 Jakarta mungkin dilakukan, tetapi menambah beberapa kontainer (auth, REST, storage, gateway) yang tidak dibutuhkan karena Jude sudah punya backend sendiri.

**Neon: ditolak.** Paket gratis memberi 1 GB per proyek dan **scale-to-zero setelah 5 menit yang tidak bisa dimatikan**. pgvector tersedia di semua paket ([Neon pricing](https://neon.com/pricing)). Dengan 20 GB di paket Launch, biayanya sekitar $7 penyimpanan ditambah sekitar $19 komputasi selalu aktif, total sekitar $26 per bulan, tidak lebih murah dari RDS. Region Neon juga tidak mencakup Jakarta, yang terdekat Singapura ([Neon regions](https://neon.com/docs/introduction/regions)).

**Cloudflare R2: ditolak untuk penyimpanan data perkara, boleh untuk aset publik.** R2 memberi 10 GB gratis per bulan dan **egress gratis**, dengan harga $0,015 per GB-bulan ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)). Namun petunjuk lokasi `apac` hanya "best effort and not a guarantee", dan yurisdiksi yang dijamin hanya eu, us dan fedramp ([R2 data location](https://developers.cloudflare.com/r2/reference/data-location/)). Tidak ada jaminan data tetap di Indonesia atau bahkan di Asia Pasifik. Pada volume puluhan GB, S3 hanya beberapa dolar per bulan, jadi R2 tidak memberi penghematan berarti dan malah mengeluarkan berkas dari model izin IAM instance role. CDN dan DNS gratis Cloudflare tetap boleh dipasang di depan AWS untuk TLS dan cache halaman publik.

**Lightsail: dipertimbangkan, disimpan sebagai cadangan.** Paket 2 vCPU dan 4 GB seharga $24 per bulan (atau $20 khusus IPv6) sudah termasuk SSD 80 GB dan transfer 4 TB. Penyimpanan objek 100 GB seharga $3. Lightsail tersedia di Jakarta dengan jatah transfer setengah ([Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)). Total sekitar $27 per bulan dengan Postgres self-hosted. Basis data terkelola Lightsail termurah ($15) **tidak terenkripsi**, jadi tidak cocok untuk berkas hukum, dan dukungan pgvector belum dipastikan. Alasan utama tidak dipilih: Jude sudah memakai Terraform, deploy OIDC dan IAM instance role untuk S3 dan Bedrock di EC2. Pindah ke Lightsail hanya menghemat beberapa dolar dibanding EC2 t4g yang dirampingkan, tetapi memaksa pemakaian access key statis.

**EC2 saja dengan Postgres di instance yang sama: diterima untuk tahap lomba.** Ini opsi termurah karena menghapus baris RDS ($18,25 instans + $2,76 penyimpanan per bulan). Konsekuensinya, backup menjadi tanggung jawab sendiri (pg_dump terjadwal ke S3 dan snapshot EBS). Job migrasi `db/migrate.mjs` tidak berubah karena hanya butuh `DATABASE_URL`.

**RDS PostgreSQL: diterima untuk tahap berbayar.** db.t4g.micro single-AZ seharga $0,025 per jam (≈ $18,25 per bulan) dan Multi-AZ $0,051 per jam, dengan harga yang sama di Jakarta dan Singapura ([RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/)). Untuk data klien berbayar, backup otomatis, enkripsi saat diam dan pemulihan titik waktu sepadan dengan biayanya.

**Aurora Serverless v2: ditolak.** Aurora sudah mendukung minimum 0 ACU dengan jeda otomatis sejak November 2024 ([AWS What's New](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity)). Dengan tarif $0,12 per ACU-jam di US East ([Aurora pricing](https://aws.amazon.com/rds/aurora/pricing/)), 0,5 ACU sepanjang waktu berarti sekitar $44 per bulan, lebih mahal dari RDS. Dengan sekitar 8 jam aktif per hari biayanya turun ke sekitar $15 ditambah I/O, paling banter impas dengan RDS, plus jeda saat bangun dari tidur. Jatah Aurora di paket gratis hanya 1 GiB penyimpanan. Aurora DSQL tidak diteliti tuntas karena halaman harganya galat, dan dukungan pgvector-nya belum terverifikasi.

**Fargate, App Runner dan Lambda: ditolak.** AGENTS.md mewajibkan job latar berjalan di dalam proses, dan Jude memakai SSE. Keduanya butuh satu proses yang selalu hidup, sehingga server tidak bisa diturunkan ke nol tanpa merusak pemrosesan job.

**AWS Jakarta versus Singapura: Singapura untuk lomba, Jakarta untuk tahap berbayar.** Harga on-demand yang diambil dari price map resmi AWS pada 2 November 2026 identik di kedua region: t3.medium $0,0528, t4g.medium $0,0424, t4g.small $0,0212, RDS db.t4g.micro $0,025, S3 $0,025 per GB-bulan ([EC2 on-demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/), [S3 pricing](https://aws.amazon.com/s3/pricing/)). Satu-satunya perbedaan: **keluarga t3a tidak tersedia di Jakarta**, jadi instans saat ini harus diganti t4g (arm64, lebih murah) atau t3. Jakarta harus diaktifkan (opt-in) dulu, dan di akun ini sudah aktif. Hambatannya ada di layanan AI. **Amazon Transcribe tidak punya endpoint di ap-southeast-3** (terverifikasi: `transcribe.ap-southeast-3.amazonaws.com` tidak dapat di-resolve, dan Jakarta tidak ada di tabel region [Amazon Transcribe](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html)). Untuk Bedrock, Nova 2 Lite dan Kimi K3 dari Jakarta hanya tersedia lewat profil global ([Nova 2 Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html), [Kimi K3 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k3.html)). Akan tetapi, verifikasi CLI menunjukkan `list-foundation-models` ON_DEMAND di Jakarta memuat **model open-weight yang berjalan di dalam region**: qwen.qwen3-235b-a22b-2507, qwen.qwen3-32b, moonshotai.kimi-k2.5, openai.gpt-oss-120b dan gpt-oss-20b, deepseek.v3.2, zai.glm-5 dan glm-4.7, minimax.minimax-m2.5, nvidia.nemotron-super-3-120b, serta amazon.nova-pro-v1 dan nova-lite-v1. Halaman harga Bedrock juga mencantumkan baris harga Jakarta, misalnya DeepSeek V3.2 $0,74/$2,22, MiniMax M2.5 $0,36/$1,44 dan Nemotron 3 Super $0,18/$0,78 per juta token masuk/keluar ([Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)). Artinya **inferensi LLM di dalam Indonesia memungkinkan**, dengan syarat lolos uji kualitas. Saat ini pemanggilan model tersebut dari Jakarta masih mengembalikan "Your account is currently being verified", yaitu penahanan verifikasi akun AWS, bukan penolakan permanen. Statusnya **tertunda**.

**ASR self-hosted (Whisper) di Jakarta: ditolak untuk sekarang, disimpan untuk klien instansi.** Jakarta punya instans GPU g5, g7e, p5 dan p5en. Bukti akurasi Whisper large-v3 untuk bahasa Indonesia bervariasi, dan studi arXiv 2024 menemukan Whisper yang di-fine-tune memberi hasil terbaik di antara sistem yang diuji ([arXiv 2410.08828](https://arxiv.org/html/2410.08828v2)). Kendalanya: Whisper tidak streaming secara bawaan (butuh pseudo-streaming berbasis potongan atau VAD dengan tambahan latensi 1 sampai 3 detik), diarisasi butuh pyannote di GPU, dan instans spot bisa terputus di tengah sidang. Self-hosting baru lebih murah dari Transcribe ($0,60 per jam) bila satu GPU melayani beberapa sidang sekaligus. Ini satu-satunya jalan untuk ASR yang sepenuhnya di Indonesia di AWS, jadi relevan hanya untuk klien instansi.

**Gemini free tier dan Deepgram: dicatat, ditolak untuk data nyata.** Gemini API memberi tier gratis untuk beberapa model Flash dan Flash-Lite, tetapi data tier gratis dipakai untuk meningkatkan produk Google ([Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)). Deepgram memberi kredit $200 dan mendukung bahasa Indonesia, tetapi berjalan di AS atau UE ([Deepgram pricing](https://deepgram.com/pricing)). Keduanya keluar dari AWS dan tidak cocok untuk data perkara. Untuk demo dengan data publik pun penghematannya kecil, karena biaya demo bisa ditekan dengan cara lain (lihat langkah hemat di bawah).

**Cloud lokal Indonesia (Biznet Gio dan sejenisnya): cadangan terakhir.** VM 2 vCPU dan 4 GB Biznet Gio hanya Rp139.000 per bulan dan penyimpanan objek Rp1.000 per GB ([Biznet Gio pricelist](https://www.biznetgio.com/en/pricelist)). Namun tidak ada Postgres terkelola dan tidak ada Bedrock, dan seluruh pipeline Terraform serta OIDC harus dibangun ulang. Hyperscaler lain juga tidak memberi keunggulan residensi: Azure Indonesia Central tidak ada di tabel model Foundry maupun region Speech ([Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions)), dan Gemini tidak tersedia di region Jakarta Google Cloud ([Vertex AI locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)).

## Biaya hari ini: $65 tetap per bulan dan sekitar $2,8 per jam sidang

Angka berikut diverifikasi lewat AWS CLI dan Price List API pada 2 November 2026.

| Komponen produksi (Singapura) | Tarif | Per bulan (730 jam) |
|---|---|---|
| EC2 t3a.medium | $0,0472/jam | $34,46 |
| RDS PostgreSQL db.t4g.micro single-AZ | $0,025/jam | $18,25 |
| EBS gp3 40 GB | $0,096/GB-bulan | $3,84 |
| Penyimpanan RDS gp3 20 GB | $0,138/GB-bulan | $2,76 |
| 1 IPv4 publik | $0,005/jam | $3,65 |
| S3 dan lain-lain (snapshot, ECR) | $0,025/GB-bulan | sekitar $2 |
| **Total tetap** | | **≈ $65** |

| Komponen per jam sidang | Dasar | Per jam sidang |
|---|---|---|
| Amazon Transcribe streaming Singapura (APS1-StreamingAudio) | $0,0001667/detik | $0,60 |
| Nova 2 Lite profil global, $0,41/$3,39 per juta token | ≈ $0,0045 per panggilan × ≈ 300 pernyataan saksi per jam (diukur pada sidang Sambo publik) | ≈ $1,32 |
| Kimi K3 profil global, $3/$15 per juta token, **hanya untuk pernyataan yang ditandai** | ≈ 5% pernyataan, ≈ 15 panggilan × ≈ $0,063 | ≈ $0,90 |
| **Total** | | **≈ $2,8 (kisaran $2 sampai $3)** |

Satu koreksi penting atas catatan riset: beberapa perhitungan menganggap peninjau Kimi K3 berjalan di seluruh ±300 panggilan, sehingga menghasilkan $18 sampai $21 per jam. Itu **keliru**. Kimi hanya dijalankan pada pernyataan yang ditandai berpotensi tidak konsisten, jadi biayanya sekitar $0,9 per jam. Untuk unggahan rekaman (bukan siaran langsung), Transcribe batch di Singapura hanya $0,0001 per detik (APS1-TranscribeAudio), atau **$0,36 per jam**, dengan diarisasi sudah termasuk ([Transcribe pricing](https://aws.amazon.com/transcribe/pricing/)).

## Arsitektur rekomendasi untuk tiga tahap

### (a) Tahap lomba dan demo: satu EC2 kecil di Singapura

Tetap di Singapura supaya tidak ada risiko migrasi selama lomba dan karena penahanan verifikasi akun masih memblokir Bedrock di Jakarta. Data demo berupa rekaman sidang publik (paket `sambo-796-public`), jadi tidak ada isu lokalisasi. Susunannya: satu **EC2 t4g.small** (2 vCPU, 2 GB, Graviton) yang menjalankan SvelteKit dan PostgreSQL di Docker, EBS gp3 20 GB, S3 untuk berkas dan pg_dump harian, RDS dihapus setelah snapshot terakhir. Bila layanan suara (`apps/voice`) harus ikut hidup dan memorinya tidak cukup, naikkan ke t4g.medium dan jalankan layanan suara hanya saat dibutuhkan. Image Docker perlu dibangun multi-arch (arm64) di `deploy.yml`.

| Komponen | Selalu hidup | Hidup hanya saat kerja (≈ 176 jam/bulan) |
|---|---|---|
| EC2 t4g.small ($0,0212/jam) | $15,48 | $3,73 |
| EBS gp3 20 GB | $1,92 | $1,92 |
| IPv4 publik | $3,65 | $3,65 bila Elastic IP disimpan |
| S3 | ≈ $0,5 | ≈ $0,5 |
| **Total per bulan** | **≈ $21,5** | **≈ $10** |

Biaya per jam sidang tetap sekitar $2,8, atau sekitar $2,4 bila prompt caching diaktifkan (perkiraan di bagian berikut). Biaya ini bisa dibuat nol untuk setiap demo dengan memutar ulang hasil analisis yang sudah tersimpan, bukan menjalankan ulang Transcribe dan Bedrock di depan juri. Kredit AWS menutup sisanya: akun Paid plan baru bisa mendapat hingga $200, dan **AWS Activate Founders memberi $1.000** (hingga $5.000 untuk peserta terpilih) bagi startup pra-Seri B dengan akun Paid plan ([AWS Activate](https://aws.amazon.com/startups/credits), [AWS Free Tier](https://aws.amazon.com/free/)). Akun Free plan tidak bisa menerima kredit promosi dan ditutup setelah 6 bulan, jadi jangan dipakai untuk produksi. Dengan $1.000 dan biaya sekitar $10 sampai $22 per bulan ditambah beberapa jam sidang uji, kredit cukup untuk lebih dari dua tahun. **Tahap lomba praktis gratis.**

### (b) Tahap berbayar awal dengan klien swasta: data tersimpan di Jakarta

Secara hukum Singapura masih boleh, tetapi Jakarta direkomendasikan karena harganya sama, menjawab pertanyaan pengadaan "data kami di mana?", dan mempersempit analisis transfer PP 33/2026 menjadi pemrosesan AI yang bersifat sementara saja. Idealnya migrasi selesai sebelum 16 Januari 2027. Susunannya: EC2 t4g.medium Jakarta, RDS PostgreSQL db.t4g.micro Jakarta dengan backup otomatis dan enkripsi, S3 Jakarta, ucapan langsung tetap dikirim dari browser ke Transcribe Singapura memakai kredensial sementara (audio tidak melewati server Jakarta, jadi tidak ada biaya transfer antar-region dari server), dan Bedrock dipanggil dari Jakarta.

| Komponen | Per bulan |
|---|---|
| EC2 t4g.medium Jakarta ($0,0424/jam) | $30,95 |
| RDS db.t4g.micro single-AZ ($0,025/jam) | $18,25 |
| EBS 40 GB dan RDS 20 GB (tarif Singapura, tarif Jakarta belum diverifikasi) | ≈ $6,60 |
| IPv4, S3, backup | ≈ $6 |
| **Total tetap** | **≈ $62** (≈ $41 bila Postgres tetap di EC2) |

Ada dua varian LLM. Varian pertama mempertahankan Nova 2 Lite dan Kimi K3 lewat profil global, dengan biaya per jam sidang sekitar $2,8 (sekitar $2,4 dengan caching). Konsekuensinya, AWS menyatakan permintaan lewat profil global bisa dirutekan ke region tujuan mana pun dan prompt serta hasilnya "may be stored in the opt-in Regions for abuse detection purposes" ([AWS inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)). Hal ini wajib diungkapkan di kebijakan privasi. Varian kedua memindahkan analisis per pernyataan ke model in-region Jakarta setelah verifikasi akun selesai dan uji kualitas lolos. Dengan campuran token yang sama seperti pengukuran Nova 2 Lite (perkiraan sekitar 6.000 token masuk dan 600 token keluar per panggilan), MiniMax M2.5 sekitar $0,0030 per panggilan atau **≈ $0,91 per jam**, dan DeepSeek V3.2 sekitar $0,0058 per panggilan atau ≈ $1,73 per jam. Varian kedua bisa **lebih murah sekaligus lebih lokal** daripada Nova 2 Lite global, tetapi kualitasnya untuk analisis kesaksian berbahasa Indonesia belum diuji. Total per jam sidang varian kedua dengan peninjau Kimi K3 global sekitar $2,4, atau sekitar $1,6 bila peninjau juga diganti model in-region.

### (c) Klien instansi atau pemerintah yang wajib lokal: seluruh pemrosesan di Jakarta

Untuk PSE Lingkup Publik, penyimpanan dan pemrosesan harus di Indonesia. Susunannya: deployment terpisah (tenant khusus) di Jakarta dengan EC2 t4g.medium, RDS Multi-AZ, S3 Jakarta, LLM hanya model in-region Jakarta (misalnya MiniMax M2.5, DeepSeek V3.2, Qwen3 235B atau Kimi K2.5 sebagai peninjau), tanpa profil global. Karena Transcribe tidak ada di Jakarta, ASR harus memilih salah satu dari tiga jalan: Whisper self-hosted di GPU Jakarta, mengajukan pengecualian "teknologi tidak tersedia di dalam negeri" kepada komite untuk pemrosesan suara sementara di Singapura, atau membatasi fitur menjadi unggah rekaman yang ditranskripsi secara batch oleh Whisper di Jakarta.

| Komponen | Per bulan |
|---|---|
| EC2 t4g.medium | $30,95 |
| RDS db.t4g.micro Multi-AZ ($0,051/jam) | $37,23 |
| Penyimpanan (EBS, RDS Multi-AZ), IPv4, S3, backup | ≈ $15 |
| **Total tetap sebelum GPU** | **≈ $85** |

Biaya per jam sidang adalah LLM in-region (sekitar $0,9 sampai $1,7) ditambah tarif GPU per jam dibagi jumlah sidang yang berjalan bersamaan. Tarif GPU g5 atau g7e di Jakarta belum diverifikasi. Perkiraan kasar untuk satu GPU kelas L4 sekitar $0,8 per jam on-demand (belum dicek ke harga AWS), sehingga satu sidang tunggal kira-kira $1,7 sampai $2,5 per jam. Harga ke klien instansi juga harus menutup kerja integrasi ASR dan biaya kepatuhan pengadaan pemerintah (SPBE dan Pusat Data Nasional, belum diteliti).

## Langkah hemat biaya di AWS, diurutkan menurut prioritas

| Prioritas | Langkah | Perkiraan penghematan |
|---|---|---|
| 1 | Pertahankan Kimi K3 hanya untuk pernyataan yang ditandai, jangan pernah di semua panggilan | Menghindari biaya ≈ $18 per jam |
| 2 | Hapus RDS di tahap lomba, jalankan Postgres di EC2 dengan pg_dump harian ke S3 | ≈ $21 per bulan |
| 3 | Ganti t3a.medium ke t4g.small (atau t4g.medium bila memori kurang) | ≈ $19 per bulan (≈ $3,5 untuk t4g.medium) |
| 4 | Jadwalkan EC2 berhenti di luar jam kerja dan saat tidak ada demo | ≈ 75% biaya komputasi, ≈ $12 per bulan pada t4g.small |
| 5 | Ajukan AWS Activate Founders setelah upgrade ke Paid plan | Menutup $1.000 sampai $5.000 biaya |
| 6 | Putar ulang hasil demo yang tersimpan, bukan analisis ulang langsung | ≈ $2,8 per jam demo menjadi $0 |
| 7 | Aktifkan prompt caching Nova untuk konteks perkara yang berulang | Perkiraan ≈ $0,4 per jam sidang (diskon cache Nova 2 Lite belum diverifikasi) |
| 8 | Pakai Transcribe batch untuk rekaman unggahan | $0,24 per jam ($0,60 menjadi $0,36) |
| 9 | Pakai Bedrock batch (diskon 50%) untuk laporan dan analisis ulang pascasidang | ≈ 50% biaya LLM pascasidang ([Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)) |
| 10 | Uji model in-region Jakarta yang lebih murah (MiniMax M2.5, Nemotron 3 Super) | ≈ $0,4 per jam atau lebih terhadap Nova 2 Lite |
| 11 | Kecilkan EBS 40 GB ke 20 GB, pasang lifecycle snapshot dan ECR, hindari NAT Gateway dan Elastic IP menganggur | ≈ $2 per bulan, NAT Gateway yang terhindar ≈ $33 per bulan ([VPC pricing](https://aws.amazon.com/vpc/pricing/)) |
| 12 | Di tahap berbayar, ambil Compute Savings Plan 1 tahun untuk EC2 dan Reserved Instance untuk RDS | Umumnya 30 sampai 40% (belum diverifikasi) |

Prompt caching tidak bisa digabung dengan batch inference ([Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)), jadi caching untuk analisis langsung dan batch untuk pascasidang. Setelah langkah 7 sampai 10, Transcribe streaming ($0,60) menjadi komponen per jam terbesar yang tidak punya pengganti AWS selain self-hosting.

## Kewajiban kepatuhan yang harus disiapkan

**Pendaftaran PSE Lingkup Privat** lewat OSS di [pse.komdigi.go.id](https://pse.komdigi.go.id/home) sebelum melayani pengguna berbayar. Ini memerlukan badan hukum Indonesia, dan Komdigi aktif memutus akses pada 2026.

**DPIA** sebelum 16 Januari 2027, karena Jude memproses data spesifik (biometrik dan data perkara pidana) dengan AI. Metodologi resminya masih menunggu aturan lembaga PDP, jadi gunakan struktur PP 33/2026 Pasal 120 sampai 122 dan perbarui saat aturan terbit. Siapkan juga ROPA (minimal 13 elemen), kebijakan retensi, kebijakan insiden dengan notifikasi tertulis dalam 3 × 24 jam, dan evaluasi kebutuhan pejabat pelindungan data ([KRES.ID](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp)).

**Perjanjian pemrosesan data** dengan setiap kantor hukum atau organisasi bantuan hukum. Klien adalah pengendali data perkara, sedangkan Jude adalah prosesor (dan pengendali untuk data akun serta tagihan). Perjanjian harus memuat 11 elemen minimum PP 33/2026 Pasal 14 sampai 15 dan mencantumkan AWS (S3, RDS, EC2, Transcribe, Bedrock) sebagai subprosesor yang disetujui tertulis. Lampirkan penilaian dampak transfer untuk Singapura dan untuk perutean global Bedrock.

**Izin merekam berdasarkan Perma 5/2020.** Produk perlu meminta pengguna mengonfirmasi izin hakim atau ketua majelis sebelum merekam, mencatat konfirmasi itu, dan menampilkan pengingat di layar perekaman. Rekaman memuat suara hakim, jaksa, saksi dan terdakwa, jadi tetap data pribadi meskipun sidangnya terbuka.

**Transparansi lokasi pemrosesan.** Kebijakan privasi dan halaman keamanan perlu memuat tabel per jenis data: berkas dan basis data (Singapura, lalu Jakarta di tahap berbayar), audio langsung (diproses sementara oleh Transcribe Singapura), analisis LLM (profil global AWS yang bisa dirutekan ke region mana pun dan dapat disimpan untuk deteksi penyalahgunaan, atau Jakarta bila memakai model in-region), dan voiceprint (per perkara, dapat dihapus, tidak ikut ekspor `.jude`). Klaim "data di Indonesia" hanya boleh dipakai untuk data tersimpan, bukan untuk pemrosesan AI, kecuali pada konfigurasi (c).

## Risiko dan hal yang belum terverifikasi

Teks resmi PP 33/2026 belum diverifikasi, dan nomor pasalnya bergantung pada dua ringkasan sekunder yang saling cocok. Teks UU 27/2022, UU 18/2003 dan PP 71/2019 Pasal 20 sampai 21 tidak diambil ulang dalam riset ini. Status Perpres lembaga PDP setelah September 2026, ratifikasi perjanjian dagang Indonesia dan AS oleh DPR, isi Permenkomdigi 5/2025, serta syarat hibah BPHN terhadap lokasi data juga belum diketahui. Definisi "institusi yang ditunjuk instansi" bisa saja mencakup vendor pengadilan, dan itu belum diperiksa.

Dari sisi teknis, penahanan verifikasi akun AWS masih memblokir model in-region Jakarta, dan kualitas model open-weight tersebut untuk analisis kesaksian berbahasa Indonesia belum diuji. Model card Nova 2 Lite menyebut "EOL no sooner than" 2 Desember 2026 ([Nova 2 Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html)), jadi masa hidupnya perlu dipantau karena bisa memaksa migrasi model dalam waktu dekat. Harga penyimpanan EBS dan RDS di Jakarta, tarif transfer antar-region, tarif GPU Jakarta, diskon cache Nova 2 Lite, persentase Savings Plan, dan cakupan kredit Activate untuk Bedrock belum diverifikasi. Dukungan id-ID dengan label pembicara di Transcribe Malaysia (ap-southeast-5) dan Thailand (ap-southeast-7) juga belum dicek. Profil global tidak bisa dipersempit ke Asia Pasifik dengan SCP, karena permintaan CRIS gagal bila salah satu region tujuan diblokir ([AWS inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)).

## Kesimpulan

Pertanyaan "wajib di Indonesia atau tidak" ternyata kurang tepat sebagai penentu arsitektur. Yang menentukan adalah jenis klien. Untuk pasar swasta, hukum memberi kebebasan lokasi tetapi menuntut dokumentasi transfer yang serius mulai Januari 2027. Untuk pasar instansi, lokalisasi wajib dan hambatan nyatanya adalah ASR, bukan basis data. Temuan bahwa Jakarta berharga sama dengan Singapura dan bahwa Bedrock Jakarta sudah punya model in-region yang murah mengubah hitungan. "Data di Indonesia" bukan lagi kemewahan berbiaya tinggi, melainkan keunggulan jualan yang hampir gratis, dan analisis LLM lokal bisa jadi lebih murah daripada Nova 2 Lite global.

Urutan kerja yang disarankan: rampingkan Singapura sekarang dan ajukan kredit Activate untuk lomba, daftarkan PSE dan mulai DPIA, lalu setelah verifikasi akun selesai uji model in-region Jakarta dan pindahkan data tersimpan ke Jakarta sebelum 16 Januari 2027. Supabase, Neon dan R2 tidak perlu dipertimbangkan ulang kecuali salah satunya membuka region Jakarta. Satu-satunya komponen yang masih memaksa data keluar Indonesia adalah Transcribe, dan itu baru perlu dipecahkan ketika klien instansi pertama datang.

## Daftar sumber

Regulasi dan kebijakan:
[PP 71/2019 (BPK)](https://peraturan.bpk.go.id/Details/122030/pp-no-71-tahun-2019),
[Permenkominfo 5/2020 (BPK)](https://peraturan.bpk.go.id/Details/203049/permenkominfo-no-5-tahun-2020),
[Permenkomdigi 5/2025](https://domain.go.id/file-landing/PM-Komdigi-No-5-Tahun-2025.pdf),
[UU 27/2022 (BPK)](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022),
[UU 18/2003 (BPK)](https://peraturan.bpk.go.id/Details/40446/uu-no-18-tahun-2003),
[Perma 5/2020 (BPK)](https://peraturan.bpk.go.id/Details/206077/perma-no-5-tahun-2020),
[Perma 6/2020 (BPK)](https://peraturan.bpk.go.id/Details/206078/perma-no-6-tahun-2020),
[Hukumonline: pokok-pokok PP PSTE](https://www.hukumonline.com/berita/a/mengenal-pokok-pokok-aturan-baru-pp-pste-lt5de653d86d627/?page=all),
[Hukumonline: protokol persidangan](https://www.hukumonline.com/berita/a/melihat-pedoman-protokol-dan-pengamanan-persidangan-lt5fdc57afbee7d/),
[Hukumonline: PP 33/2026 dan penegakan hukum](https://www.hukumonline.com/berita/a/pelindungan-data-pribadi-dalam-penegakan-hukum-dan-konfigurasi-beracara-di-bawah-pp-33-2026-lt6ac4acd9db1bd/),
[KRES.ID: PP 33/2026](https://www.kres.id/pp-33-2026-aturan-pelaksana-uu-pdp),
[SIP Law Firm: PP 33/2026](https://siplawfirm.id/id/publikasi/pp-33-2026-pelindungan-data-pribadi),
[SIP Law Firm: cloud computing](https://siplawfirm.id/resources/cloud-computing),
[AHP: pembaruan UU PDP](https://www.ahp.id/indonesias-pdp-law-updates-dpa-u-s-traderelated-data-transfers-and-recent-court-rulings/),
[ABNR: perjanjian dagang dan transfer data](https://www.abnrlaw.com/news/the-data-deal-what-the-indonesia-us-reciprocal-trade-agreement-means-for-cross-border-data-transfers),
[Tempo English](https://en.tempo.co/read/2088778/data-transfers-to-the-us-remain-subject-to-indonesian-rules),
[Kompas, 9 Juli 2026](https://nasional.kompas.com/read/2026/07/09/12144631/komdigi-baru-3-dari-25-pse-wajib-daftar-yang-penuhi-komitmen),
[Kompas, 27 Juli 2026](https://nasional.kompas.com/read/2026/07/27/15423511/komdigi-ungkap-perpres-pembentukan-badan-perlindungan-data-pribadi-sedang),
[Kompas, 4 September 2026](https://nasional.kompas.com/read/2026/09/04/17150021/segera-bentuk-badan-pelindungan-data-pribadi?page=all),
[GEBRAK.ID](https://www.gebrak.id/2026/09/komdigi-minta-25-pse-segera-penuhi-kewajiban-pendaftaran-tenggat-22-september-2026.html),
[ePPID Komdigi: Wikimedia](https://eppid.komdigi.go.id/berita/detail/kemkomdigi-batasi-fitur-login-wikimedia-karena-belum-daftar-pse-privat),
[Portal PSE Komdigi](https://pse.komdigi.go.id/home).

AWS:
[EC2 on-demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/),
[RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/),
[S3 pricing](https://aws.amazon.com/s3/pricing/),
[VPC pricing](https://aws.amazon.com/vpc/pricing/),
[Lightsail pricing](https://aws.amazon.com/lightsail/pricing/),
[Aurora pricing](https://aws.amazon.com/rds/aurora/pricing/),
[Aurora scale to zero](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-aurora-serverless-v2-scaling-zero-capacity),
[AWS Free Tier](https://aws.amazon.com/free/),
[AWS Activate](https://aws.amazon.com/startups/credits),
[Amazon Transcribe region](https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html),
[Transcribe pricing](https://aws.amazon.com/transcribe/pricing/),
[Bedrock pricing](https://aws.amazon.com/bedrock/pricing/),
[Bedrock prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html),
[Bedrock inference profiles](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html),
[Bedrock ketersediaan model per region](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html),
[Nova 2 Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.html),
[Kimi K3 model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k3.html),
serta verifikasi langsung lewat AWS CLI dan AWS Price List API pada 2 November 2026 (`list-inference-profiles` dan `list-foundation-models` di ap-southeast-3, resolusi DNS endpoint Transcribe Jakarta, kode harga APS1-StreamingAudio dan APS1-TranscribeAudio).

Alternatif non-AWS:
[Supabase pricing](https://supabase.com/pricing),
[Supabase regions](https://supabase.com/docs/guides/platform/regions),
[Neon pricing](https://neon.com/pricing),
[Neon regions](https://neon.com/docs/introduction/regions),
[Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/),
[Cloudflare R2 data location](https://developers.cloudflare.com/r2/reference/data-location/),
[Biznet Gio pricelist](https://www.biznetgio.com/en/pricelist),
[Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing),
[Deepgram pricing](https://deepgram.com/pricing),
[Vertex AI locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations),
[Azure Speech regions](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/regions),
[arXiv 2410.08828: ASR bahasa Indonesia](https://arxiv.org/html/2410.08828v2).
