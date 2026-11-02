import type { Messages } from "./en";

/**
 * Bahasa Indonesia UI messages, the primary language. Uses KUHAP terms
 * (Keterangan Saksi, BAP, Penuntut Umum, Penasihat Hukum, Majelis Hakim,
 * Terdakwa). Finding statuses stay descriptive: a difference from a source is
 * never a judgment of honesty or credibility.
 */
export const id: Messages = {
  // Metadata dokumen
  "meta.title": "Jude: Kecerdasan ruang sidang berbasis bukti",
  "meta.description":
    "Ikuti setiap keterangan. Lihat perkara secara utuh. Kenali Jude, pendamping AI berbasis bukti untuk ruang sidang yang dibangun bagi praktisi hukum Indonesia.",
  "meta.workspaceTitle": "Ruang kerja perkara | Jude",

  // Pemilih bahasa
  "lang.group": "Bahasa",
  "lang.id": "Bahasa Indonesia",
  "lang.en": "English",

  // Kata umum
  "common.page": "Halaman {page}",
  "common.pageSuffix": " · Halaman {page}",
  "common.copied": "Tersalin",
  "common.copyQuestion": "Salin pertanyaan",
  "common.questionToConsider": "Pertanyaan untuk dipertimbangkan",
  "common.whatToVerify": "Yang perlu diverifikasi",
  "common.atSource": "Di sumbernya",
  "common.downloadOriginal": "Unduh file asli",
  "common.openHearing": "Buka sidang",
  "common.close": "Tutup",
  "common.cancel": "Batal",
  "common.tryAgain": "Coba lagi",
  "common.searching": "Mencari…",
  "common.saving": "Menyimpan…",
  "common.reviewed": "Sudah ditinjau",
  "common.hearingTranscript": "Transkrip sidang",
  "common.syntheticExercise": "Latihan sintetis",
  "common.importedTranscript": "Transkrip impor",
  "common.loadingContent": "Memuat konten…",
  "common.openingWorkspace": "Membuka ruang kerja Anda…",
  "common.loadingCases": "Memuat perkara Anda…",
  "common.signIn": "Masuk",
  "count.statements.one": "{count} pernyataan",
  "count.statements.other": "{count} pernyataan",
  "count.sources.one": "{count} sumber",
  "count.sources.other": "{count} sumber",
  "count.documents.one": "{count} dokumen",
  "count.documents.other": "{count} dokumen",
  "count.pages.one": "{count} halaman",
  "count.pages.other": "{count} halaman",
  "count.passages.one": "{count} kutipan yang cocok",
  "count.passages.other": "{count} kutipan yang cocok",
  "count.findings.one": "{count} temuan",
  "count.findings.other": "{count} temuan",
  "count.examining.one": "{count} pernyataan sedang diperiksa",
  "count.examining.other": "{count} pernyataan sedang diperiksa",

  // Status temuan
  "status.supported": "Didukung sumber",
  "status.potential_inconsistency": "Berbeda dari sumber",
  "status.context_needed": "Perlu konteks",
  "status.insufficient_evidence": "Bukti belum cukup",

  // Hubungan antarbukti
  "relation.supports": "mendukung",
  "relation.conflicts": "berbeda",
  "relation.context": "konteks",
  "relation.related": "terkait",

  // Pesan kesalahan
  "error.generic":
    "Permintaan ini tidak dapat diselesaikan. Silakan coba lagi nanti.",
  "error.form": "Periksa isian formulir, lalu coba lagi.",
  "error.server":
    "Server tidak dapat menyelesaikan permintaan ini. Silakan coba lagi.",
  "error.unexpected": "Terjadi kesalahan. Silakan coba lagi.",
  "error.serverUnavailable":
    "Server Jude tidak tersedia. Silakan muat ulang ruang kerja.",
  "error.loadCase": "Perkara ini tidak dapat dimuat.",
  "error.badCredentials": "Email atau kata sandi salah.",
  "error.emailTaken": "Email ini sudah terdaftar. Silakan masuk.",
  "error.signIn": "Silakan masuk untuk melanjutkan.",
  "error.rateLimited":
    "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.",
  "error.format": "Permintaan tidak sesuai dengan format yang diharapkan.",
  "error.tooLarge": "Ukuran permintaan terlalu besar.",
  "error.notFound": "Tidak ditemukan.",
  "error.caseNotFound": "Perkara tidak ditemukan.",
  "error.hearingNotFound": "Sidang tidak ditemukan.",
  "error.documentNotFound": "Dokumen tidak ditemukan.",
  "error.findingNotFound": "Temuan tidak ditemukan.",
  "error.sourceNotFound": "Sumber tidak ditemukan.",
  "error.conversationNotFound": "Percakapan tidak ditemukan.",
  "error.uploadTypes": "Unggah file PDF, DOCX, TXT, atau Markdown.",
  "error.utf8": "Gunakan file teks dengan encoding UTF-8.",
  "error.archive": "Arsip .jude ini tidak dapat dibaca.",
  "error.busy":
    "Proses ini sedang berjalan. Tunggu hingga selesai, lalu coba lagi.",
  "error.hearingRunning": "Sebuah sidang sedang berjalan.",
  "error.alreadyLinked":
    "Pasangan ini sudah ditautkan. Tinjau keterkaitan yang sudah ada.",
  "error.reference": "Referensi: {reference}",

  // Halaman pengantar
  "landing.skip": "Langsung ke konten",
  "landing.home": "Beranda Jude",
  "landing.mainNav": "Navigasi utama",
  "landing.mobileNav": "Navigasi seluler",
  "landing.openNav": "Buka navigasi",
  "landing.closeNav": "Tutup navigasi",
  "landing.nav.howItWorks": "Cara kerja",
  "landing.nav.evidence": "Berbasis bukti",
  "landing.nav.approach": "Pendekatan kami",
  "landing.exploreDemo": "Coba demo",
  "landing.openWorkspace": "Buka ruang kerja",
  "landing.hero.title1": "Ikuti setiap keterangan.",
  "landing.hero.title2": "Lihat perkara secara utuh.",
  "landing.hero.lead1": "Pendamping AI ruang sidang yang menghubungkan ucapan",
  "landing.hero.lead2": "dengan apa yang ditunjukkan bukti.",
  "landing.hero.entry":
    "Masuk atau buat akun untuk memulai perkara pertama Anda.",
  "landing.hero.sample": "Contoh sintetis",
  "landing.hero.replay": "Putar ulang perbandingan",
  "landing.hero.testimony": "Keterangan di sidang",
  "landing.hero.quote1": "Saya tiba pukul",
  "landing.hero.time1": "21.30.",
  "landing.hero.check1": "Periksa apakah kedua keterangan",
  "landing.hero.check2": "merujuk pada peristiwa yang sama.",
  "landing.hero.earlier": "Keterangan sebelumnya",
  "landing.hero.quote2a": "Saya tiba tak lama",
  "landing.hero.quote2b": "setelah",
  "landing.hero.time2": "pukul 20.00.",
  "landing.hero.witnessStatement": "BAP saksi",
  "landing.source.title": "Setiap temuan punya sumber.",
  "landing.source.lead":
    "Jude menghubungkan keterangan di persidangan dengan berkas perkara, menandai kemungkinan perbedaan, dan menyerahkan penilaian hukum kepada Anda.",
  "landing.source.aside":
    "Lihat kutipan persisnya, bandingkan secara berdampingan, dan telusuri kembali ke dokumen aslinya, agar Anda dapat mengajukan pertanyaan yang lebih tepat dan menyusun argumen yang lebih kuat.",
  "landing.workflow.title1": "Jaga perhatian Anda",
  "landing.workflow.title2": "pada hal yang penting.",
  "landing.workflow.lead":
    "Dengarkan keterangan. Ikuti argumennya. Jude dirancang untuk menghubungkan detail yang relevan selagi Anda tetap fokus pada jalannya sidang.",
  "landing.step1.title": "Dengarkan dalam konteks.",
  "landing.step1.text":
    "Transkrip yang dapat dicari menghimpun apa yang dikatakan, kapan, dan oleh siapa. Identitas pembicara yang belum pasti tetap ditandai belum pasti.",
  "landing.step1.from": "Keterangan",
  "landing.step1.to": "Pernyataan penting",
  "landing.step2.title": "Hubungkan dengan bukti.",
  "landing.step2.text":
    "Pernyataan yang relevan dibandingkan dengan berkas perkara. Kutipan yang mendukung maupun yang berbeda tetap menyertakan rujukan dokumen dan halamannya.",
  "landing.step2.from": "Pernyataan",
  "landing.step2.to": "Kutipan sumber",
  "landing.step3.title": "Periksa dari dua sisi.",
  "landing.step3.text":
    "Penjelasan alternatif dan konteks yang kurang dipertimbangkan sebelum temuan ditampilkan. Anda memeriksa sumbernya dan menentukan apa yang perlu ditelaah lebih lanjut.",
  "landing.step3.from": "Temuan",
  "landing.step3.to": "Penilaian Anda",
  "landing.demo.title1": "Lihat lebih dekat.",
  "landing.demo.title2": "Telusuri sumbernya.",
  "landing.demo.disclosure1":
    "Ilustrasi interaktif dengan materi perkara sintetis.",
  "landing.demo.disclosure2":
    "Demo ini tidak merekam audio dan tidak menjalankan analisis AI.",
  "landing.demo.lead":
    "Perbedaan adalah titik awal sebuah pertanyaan. Lihat bagaimana bukti yang tersedia mengubah temuan.",
  "landing.demo.choose": "Pilih contoh bukti",
  "landing.demo.caseLabel": "Perkara sintetis / 001",
  "landing.demo.inHearing": "Di persidangan",
  "landing.demo.inCaseFile": "Dalam berkas perkara",
  "landing.demo.transcriptAt": "Transkrip · {time}",
  "landing.demo.statementPage": "BAP saksi · Halaman {page}",
  "landing.demo.marked": "Sudah ditinjau",
  "landing.demo.mark": "Tandai sudah ditinjau",
  "landing.demo.visitOnly": "Hanya untuk kunjungan ini",
  "landing.demo.excerpts": "Kutipan sumber asli",
  "landing.demo.synthetic": "Sintetis",
  "landing.demo.sourceDocument": "Dokumen sumber",
  "landing.demo.witnessStatement": "BAP saksi",
  "landing.demo.recordCaps": "BERITA ACARA SIDANG",
  "landing.demo.statementCaps": "BAP SAKSI",
  "landing.demo.pageCaps": "HALAMAN {page}",
  "landing.demo.examination": "Pemeriksaan saksi",
  "landing.demo.earlierAccount": "Keterangan awal tentang peristiwa",
  "landing.demo.footnote":
    "Contoh yang disiapkan untuk demonstrasi. Bukan catatan perkara nyata atau rujukan hukum.",
  "landing.demo.copyUnavailable":
    "Tidak dapat menyalin. Pilih pertanyaan di atas untuk menyalinnya secara manual.",
  "landing.demo.copiedStatus": "Pertanyaan disalin ke papan klip.",
  "landing.demo.footer":
    "Label ini menggambarkan hubungan antara sebuah pernyataan dan bukti yang tersedia. Label ini tidak menentukan kredibilitas, kesalahan, atau kesimpulan hukum.",
  "landing.approach.title1": "Penilaian Anda.",
  "landing.approach.title2": "Lebih berdasar.",
  "landing.approach.lead":
    "Dibangun di atas satu prinsip sederhana: orang yang memeriksa bukti harus selalu dapat mempertanyakan temuannya.",
  "landing.approach.faqLink": "Beberapa pertanyaan penting",
  "landing.principle1.title": "Dapat ditelusuri sejak awal.",
  "landing.principle1.text":
    "Temuan substantif harus tetap menyertakan sumber, kutipan, dan konteksnya. Jawaban tanpa sesuatu yang dapat diperiksa tidaklah cukup.",
  "landing.principle2.title": "Ketidakpastian tetap terlihat.",
  "landing.principle2.text":
    "Konteks yang kurang dan bukti yang belum cukup adalah hasil yang bermakna. Jude menunjukkan batasan itu, alih-alih memaksakan kesimpulan.",
  "landing.principle3.title": "Manusia yang memutuskan.",
  "landing.principle3.text":
    "Jude mendukung pemeriksaan dan persiapan. Penilaian hukum profesional dan independensi peradilan tetap berada pada manusia.",
  "landing.faq.title1": "Sebelum kita memasuki",
  "landing.faq.title2": "ruang sidang.",
  "landing.faq.q1": "Untuk siapa Jude dibangun?",
  "landing.faq.a1":
    "Kasus penggunaan pertama adalah advokat dalam perkara pidana di Indonesia. MVP saat ini mencakup perkara demo dari catatan pengadilan publik dan ruang kerja perkara. Alur kerja Penuntut Umum dan hakim memerlukan kemampuan serta pengaman tersendiri sesuai perannya.",
  "landing.faq.q2": "Apakah ini produk untuk sidang sungguhan?",
  "landing.faq.a2":
    "Jude ditujukan untuk evaluasi dengan materi fiktif atau yang sudah mendapat izin. Gunakan untuk menata dokumen, meninjau transkrip dan temuan, serta menyiapkan pertanyaan. Contoh sidang memungkinkan Anda mencoba dengan materi fiktif. Verifikasi sumber dan tinjau hasilnya sebelum mengandalkannya dalam persidangan sungguhan.",
  "landing.faq.q3": "Apakah perbedaan keterangan berarti saksi keliru?",
  "landing.faq.a3":
    "Tidak. Keterangan yang berbeda dapat mencerminkan peristiwa yang berbeda, pertanyaan yang ambigu, konteks yang tidak lengkap, atau penjelasan lain. Jude dimaksudkan untuk menunjukkan hal yang mungkin perlu diperiksa, bukan menilai kejujuran saksi atau menentukan kesalahan Terdakwa.",
  "landing.faq.q4": "Bagaimana rujukan hukum Indonesia digunakan?",
  "landing.faq.a4":
    "Produk ini akan mengambil peraturan perundang-undangan Indonesia yang relevan melalui Pasal.id, sesuai izin yang tersedia. Teks hukum yang terverifikasi harus dibedakan dari metadata dan rujukan yang belum terverifikasi. Demo ini tidak mengambil atau menyajikan nasihat hukum.",
  "landing.faq.q5": "Bisakah saya mengunggah dokumen perkara di sini?",
  "landing.faq.a5":
    "Ruang kerja yang memerlukan akun menerima dokumen PDF berbasis teks, DOCX, TXT, dan Markdown, lengkap dengan unduhan file asli dan kutipan yang dapat diperiksa. Gunakan materi sintetis atau yang sudah mendapat izin. PDF hasil pindaian perlu diproses OCR sebelum diunggah.",
  "landing.closing.title1": "Tetap hadir.",
  "landing.closing.title2": "Lihat apa yang terhubung.",
  "landing.closing.lead1": "Menelaah bukti lebih dekat dimulai",
  "landing.closing.lead2": "dari pertanyaan yang lebih baik.",
  "landing.closing.note": "Dirancang untuk praktisi hukum Indonesia.",
  "landing.footer.tagline": "Kecerdasan ruang sidang berbasis bukti.",
  "landing.footer.concept": "Konsep produk · 2026",
  "landing.footer.top": "Kembali ke atas",

  // Masuk dan pendaftaran
  "auth.title1": "Ikuti setiap keterangan.",
  "auth.title2": "Jaga bukti tetap dekat.",
  "auth.lead":
    "Ruang kerja untuk berkas perkara, catatan sidang, dan pertanyaan yang menghubungkan keduanya.",
  "auth.principle1": "Sumber yang dapat Anda periksa.",
  "auth.principle2": "Penilaian tetap di tangan Anda.",
  "auth.back": "Kembali ke halaman pengantar",
  "auth.createTitle": "Buat ruang kerja Anda.",
  "auth.welcomeTitle": "Selamat datang di ruang kerja Anda.",
  "auth.createLead": "Mulai dari satu perkara. Satukan buktinya.",
  "auth.signInLead": "Masuk untuk melanjutkan pemeriksaan perkara Anda.",
  "auth.name": "Nama Anda",
  "auth.email": "Alamat email",
  "auth.password": "Kata sandi",
  "auth.passwordHint": "Minimal 10 karakter.",
  "auth.hidePassword": "Sembunyikan kata sandi",
  "auth.showPassword": "Tampilkan kata sandi",
  "auth.opening": "Membuka ruang kerja…",
  "auth.createAccount": "Buat akun",
  "auth.haveAccount": "Sudah punya akun? Masuk",
  "auth.newAccount": "Baru di Jude? Buat akun",
  "auth.exploreFirst": "Jelajahi sebelum memulai",
  "auth.openSynthetic": "Buka perkara demo",
  "auth.demoNote":
    "Jelajahi catatan pengadilan publik, perkara Ferdy Sambo (796/Pid.B/2022/PN Jkt.Sel), lengkap dengan transkrip sidang dan temuannya. Tanpa mikrofon.",
  "auth.footnote":
    "Gunakan hanya materi perkara yang berwenang Anda bagikan dan proses.",

  // Kerangka ruang kerja
  "tab.evidence": "Bukti",
  "tab.hearing": "Sidang",
  "tab.documents": "Berkas perkara",
  "tab.assistant": "Asisten perkara",
  "tab.practice": "Latihan sidang",
  "tab.references": "Rujukan hukum",
  "tab.settings": "Pengaturan",
  "ws.skip": "Langsung ke ruang kerja",
  "ws.sidebar": "Perkara dan akun",
  "ws.closeNav": "Tutup navigasi perkara",
  "ws.openNav": "Buka navigasi perkara",
  "ws.yourWorkspace": "Ruang kerja Anda",
  "ws.newCase": "Perkara baru",
  "ws.findCase": "Cari perkara",
  "ws.findCasePlaceholder": "Cari perkara…",
  "ws.yourCases": "Perkara Anda",
  "ws.caseWorkspace": "Ruang kerja perkara",
  "ws.noMatchingCases": "Tidak ada perkara yang cocok.",
  "ws.clearSearch": "Hapus pencarian",
  "ws.demoSession": "Sesi demo",
  "ws.lawyerWorkspace": "Ruang kerja advokat",
  "ws.signOut": "Keluar",
  "ws.cases": "Perkara",
  "ws.workspace": "Ruang kerja",
  "ws.about": "Tentang Jude",
  "ws.dismissError": "Tutup pesan kesalahan",
  "ws.welcomeTitle": "Satu tempat untuk seluruh perkara.",
  "ws.welcomeText":
    "Buat perkara untuk menyatukan dokumen, keterangan, dan pertanyaan yang perlu ditelaah lebih lanjut.",
  "ws.createFirst": "Buat perkara pertama Anda",
  "ws.trySynthetic": "Buka perkara demo",
  "ws.loadingCase": "Memuat catatan perkara…",
  "ws.caseLoadFailed": "Catatan perkara tidak dapat dimuat.",
  "ws.syntheticMaterial": "Materi sintetis",
  "ws.privateCase": "Perkara privat",
  "ws.publicRecord": "Catatan publik",
  "ws.defaultDescription": "Satukan keterangan dan materi sumber.",
  "ws.exportJude": "Ekspor .jude",
  "ws.caseSections": "Bagian perkara",
  "ws.start.title": "Mulai dari materi perkara Anda.",
  "ws.start.text":
    "Dokumen adalah file sumber Anda. Sidang memuat keterangan. Bukti menghubungkan kutipan di antara keduanya.",
  "ws.start.docs": "Tambahkan berkas perkara",
  "ws.start.docsText":
    "Unggah laporan, BAP, kontrak, atau peraturan perundang-undangan.",
  "ws.start.hearing": "Tambahkan sidang",
  "ws.start.hearingText": "Unggah transkrip atau mulai catatan sidang baru.",
  "ws.start.then":
    "Lalu gunakan peta bukti untuk membandingkan sumber, atau ajukan pertanyaan kepada asisten perkara.",

  // Detail sidang
  "hearing.all": "Semua sidang",
  "hearing.export": "Ekspor sidang",
  "hearing.simComplete": "Simulasi selesai",
  "hearing.pause": "Jeda sidang",
  "hearing.startSim": "Mulai sidang simulasi",
  "hearing.analyze": "Analisis sidang",
  "hearing.state.simulation": "Sidang simulasi berjalan",
  "hearing.state.live": "Sesi audio langsung",
  "hearing.state.complete": "Sidang selesai",
  "hearing.state.ready": "Siap menerima keterangan",
  "hearing.autoUpdates": "Perubahan tampil otomatis",
  "hearing.checking": "Memeriksa keterangan baru…",
  "hearing.readyForAnalysis": "Transkrip tersimpan · siap dianalisis",
  "hearing.upToDate": "Semua keterangan tersimpan sudah diperiksa",
  "hearing.analysisUnavailable":
    "Analisis otomatis tidak tersedia. Anda tetap dapat membaca transkrip dan membandingkannya dengan dokumen Anda.",
  "hearing.simNotice":
    "Contoh ini memakai keterangan fiktif dan temuan yang sudah disiapkan. Mulai sidang untuk mencoba proses peninjauan.",
  "hearing.audioTools": "Rekam atau unggah audio",
  "hearing.transcript": "Transkrip",
  "hearing.findings": "Temuan",
  "hearing.toReview": "{count} perlu ditinjau",
  "hearing.reviewedOf": "{done} dari {total} sudah ditinjau",
  "hearing.nextUnreviewed": "Berikutnya yang belum ditinjau",
  "hearing.filter": "Saring temuan",
  "hearing.allFindings": "Semua temuan",
  "hearing.needsReview": "Perlu Anda tinjau",
  "hearing.examining": "Memeriksa keterangan untuk mencari temuan…",
  "hearing.mode.simulation": "Contoh berskrip",
  "hearing.mode.imported": "Temuan impor · verifikasi sumber",
  "hearing.mode.ai": "AI · divalidasi dengan sumber",
  "hearing.emptyTitle": "Telusuri buktinya.",
  "hearing.emptyFilterTitle": "Tidak ada temuan di tampilan ini.",
  "hearing.emptyText":
    "Temuan muncul di sini saat pernyataan final diperiksa. Mulai simulasi atau tambahkan pernyataan transkrip.",
  "hearing.emptyFilterText":
    "Pilih saringan lain untuk melihat bagian catatan lainnya.",
  "hearing.inspector": "Pemeriksa temuan dan sumber",
  "hearing.backToFindings": "Kembali ke temuan",
  "hearing.inspectorEmptyTitle": "Setiap temuan dapat diperiksa.",
  "hearing.inspectorEmptyText":
    "Pilih temuan untuk membandingkan keterangannya dengan kutipan asli, penjelasan alternatif, dan langkah verifikasi.",
  "hearing.bottomNote":
    "Temuan menggambarkan hubungan antarbukti. Temuan tidak menentukan kredibilitas, kesalahan, atau putusan hukum.",
  "hearingStatus.ready": "siap",
  "hearingStatus.live": "langsung",
  "hearingStatus.simulation": "berjalan",
  "hearingStatus.paused": "dijeda",
  "hearingStatus.complete": "selesai",

  // Formulir perkara baru
  "newCase.title": "Buat perkara",
  "newCase.cancel": "Batalkan perkara baru",
  "newCase.caseTitle": "Judul perkara",
  "newCase.titlePlaceholder": "mis. Perkara penggelapan gudang",
  "newCase.reference": "Nomor perkara (opsional)",
  "newCase.referencePlaceholder": "mis. 123/Pid.B/2026/PN Jkt.Sel",
  "newCase.description": "Deskripsi (opsional)",
  "newCase.descriptionPlaceholder": "Konteks perkara ini dan materinya",
  "newCase.creating": "Membuat…",
  "newCase.create": "Buat perkara",
  "newCase.skeleton": "Membuat perkara…",

  // Impor arsip .jude
  "archive.importing": "Mengimpor perkara…",
  "archive.import": "Impor .jude",
  "archive.tooLarge": "Gunakan arsip perkara .jude berukuran maksimal 64 MB.",

  // Input transkrip manual
  "manual.add": "Tambahkan teks transkrip",
  "manual.speaker": "Label pembicara",
  "manual.defaultSpeaker": "Tidak diketahui",
  "manual.statement": "Pernyataan final",
  "manual.placeholder": "Tuliskan kata-kata yang diucapkan apa adanya…",
  "manual.save": "Simpan & periksa",
  "manual.skeleton": "Menyimpan keterangan…",

  // Label pembicara
  "speakers.title": "Label pembicara",
  "speakers.text":
    "Beri setiap pembicara nama atau peran di persidangan, misalnya Hakim Ketua, Penuntut Umum, Penasihat Hukum, Saksi, atau Terdakwa. Pastikan siapa yang berbicara sebelum mengubah label.",
  "speakers.placeholder": "Nama atau peran yang sudah diverifikasi",
  "speakers.save": "Simpan label",
  "speakers.empty": "Pembicara muncul setelah Anda menambahkan transkrip.",
  "speakers.voices":
    "Suara yang berulang memakai satu label di seluruh rekaman dan sidang dalam perkara ini. Kecocokan suara hanyalah saran. Pastikan siapa yang berbicara.",
  "speakers.forget": "Hapus sidik suara",
  "speakers.skeleton": "Menyimpan label pembicara…",
  "speakers.voice": "Suara {n}",

  // Hasil rujukan hukum
  "legal.uncertain": " (belum pasti)",
  "legal.openOriginal":
    "Buka sumber aslinya untuk membaca peraturan secara lengkap.",
  "legal.article": "Pasal {article}",

  // Kartu sumber
  "source.docxSection": "Bagian teks DOCX · tanpa nomor halaman",

  // Berkas perkara
  "docs.added":
    "Dokumen ditambahkan. Pilih di bawah untuk membaca kutipannya, atau tanyakan kepada asisten perkara.",
  "docs.title": "Berkas perkara.",
  "docs.lead":
    "Dokumen asli, kutipan yang terjaga, dan jejak kembali ke sumbernya.",
  "docs.addTitle": "Tambahkan dokumen perkara yang sudah diizinkan",
  "docs.formats":
    "PDF, DOCX, TXT, atau Markdown · maks. 25 MB · hanya PDF berbasis teks",
  "docs.note":
    "File asli tetap tersimpan dan teksnya dapat dicari. Fitur AI dapat memproses cuplikan untuk membantu menemukan materi terkait.",
  "docs.processing": "Memproses…",
  "docs.choose": "Pilih file",
  "docs.searchLabel": "Cari bukti perkara",
  "docs.searchPlaceholder": "Cari hanya di bukti perkara ini…",
  "docs.search": "Cari",
  "docs.clear": "Hapus hasil pencarian",
  "docs.processingDoc": "Memproses dokumen…",
  "docs.textSection": "Bagian teks",
  "docs.ready": "Siap dicari",
  "docs.emptyTitle": "Mulai dari sumber.",
  "docs.emptyText":
    "Unggah dokumen perkara pertama Anda agar kutipannya dapat dicari dan dibandingkan.",
  "docs.searchingDocs": "Mencari di berkas perkara…",
  "docs.loadingPassages": "Memuat kutipan dokumen…",
  "docs.results": "Hasil pencarian",
  "docs.noMatchTitle": "Tidak ada kutipan yang cocok.",
  "docs.noMatchText":
    "Coba kata lain atau tambahkan dokumen yang memuat detail ini.",
  "docs.extracted": "Kutipan hasil ekstraksi",
  "docs.openTitle": "Buka berkasnya.",
  "docs.openText":
    "Pilih dokumen untuk membaca kutipannya, atau cari detail di seluruh perkara ini.",

  // Pemeriksa temuan
  "finding.title": "Periksa temuan",
  "finding.hearingAt": "Sidang · {time}",
  "finding.sourceTab": "Sumber {n} · {relation}",
  "finding.loadingPassage": "Memuat kutipan asli…",
  "finding.noCitation": "Tidak ada kutipan sumber yang mendukung temuan ini.",
  "finding.uncertainty": "Ketidakpastian",
  "finding.aboutScripted": "Tentang temuan berskrip ini",
  "finding.importedReview": "Tinjauan impor · tidak dijalankan ulang",
  "finding.independentReview": "Tinjauan independen",
  "finding.alternative": "Alternatif: {text}",
  "finding.missingContext": "Konteks yang kurang: {text}",
  "finding.analyst": "Analis: {text}",
  "finding.prepared": "Contoh yang disiapkan · bukan evaluasi AI",
  "finding.importedVerify": "Temuan impor · verifikasi dengan sumber aslinya",
  "finding.quoteMatches":
    "Teks kutipan cocok dengan sumber. Tinjau sendiri penafsirannya.",
  "finding.legal": "Rujukan hukum terkait",
  "finding.clipboardError":
    "Papan klip tidak tersedia. Pilih dan salin pertanyaan secara manual.",
  "finding.questionCopied": "Pertanyaan disalin",
  "finding.note": "Catatan tinjauan Anda",
  "finding.notePlaceholder": "Apa yang perlu ditindaklanjuti?",
  "finding.unsaved":
    "Catatan belum disimpan · Simpan perubahan sebelum keluar.",
  "finding.reopen": "Buka kembali untuk ditinjau",
  "finding.markReviewed": "Tandai sudah ditinjau",
  "finding.saveNote": "Simpan catatan",
  "finding.reviewedByYou": "Ditinjau oleh Anda · tersimpan di perkara",

  // Perekaman audio sidang
  "audio.title": "Rekam sidang ini",
  "audio.text":
    "Transkripsikan dari mikrofon atau file audio. Transkrip tersimpan bersama sidang ini.",
  "audio.recognitionLanguage": "Bahasa pengenalan suara",
  "audio.permission":
    "Majelis Hakim telah mengizinkan perekaman, dan saya berwenang mengirim audio ini untuk ditranskripsikan.",
  "audio.start": "Nyalakan mikrofon",
  "audio.prepared": "Pilih file audio",
  "audio.cancel": "Batalkan koneksi",
  "audio.finishing": "Menyelesaikan transkrip…",
  "audio.stop": "Hentikan rekaman",
  "audio.connectingAudio": "Menghubungkan audio…",
  "audio.savingFinal": "Menyimpan transkrip final…",
  "audio.unavailable":
    "Transkripsi audio tidak tersedia. Kembali ke Semua sidang untuk mengunggah transkrip.",
  "audio.idle":
    "Mikrofon mati. Audio langsung dikirim ke Amazon Transcribe. Jika perekaman aktif, salinan privat disimpan untuk diputar ulang.",
  "audio.keepRecording": "Simpan rekaman audio sesi ini",
  "audio.recordings": "Rekaman",
  "audio.recordingItem": "Rekaman {when} · {duration}",
  "audio.deleteRecording": "Hapus rekaman",
  "audio.recordingsNote":
    "Hanya untuk perkara ini. Merekam di ruang sidang memerlukan izin Hakim Ketua (Perma 5/2020) dan tidak boleh dilakukan pada sidang tertutup untuk umum.",
  "audio.recording": "Merekam dan mengalirkan · biarkan tab ini terbuka",
  "audio.waiting": "Menunggu transkrip final…",
  "audio.connecting": "Menghubungkan…",
  "audio.error.finalTimeout":
    "Transkripsi final melewati batas waktu. Periksa transkrip tersimpan untuk kata-kata terakhir yang mungkin hilang.",
  "audio.error.fileSize": "Gunakan file audio berukuran di bawah 30 MB.",
  "audio.error.duration": "File audio harus berdurasi kurang dari 30 menit.",
  "audio.error.reconnectSlow":
    "Penyambungan ulang audio terlalu lama. Rekaman dihentikan. Periksa kata-kata terakhir yang tersimpan sebelum memulai lagi.",
  "audio.error.backpressure":
    "Unggahan audio tertinggal. Rekaman dihentikan agar keterangan tidak hilang.",
  "audio.error.connectTimeout":
    "Koneksi audio melewati batas waktu. Periksa transkrip tersimpan sebelum menyambung ulang.",
  "audio.error.rotation":
    "Pergantian sesi audio melewati batas waktu. Periksa transkrip tersimpan sebelum memulai lagi.",
  "audio.error.reconnect":
    "Audio tidak dapat disambungkan ulang. Periksa transkrip tersimpan sebelum memulai lagi.",
  "audio.error.process":
    "Koneksi audio tidak dapat diproses. Silakan sambungkan ulang.",
  "audio.error.failed":
    "Koneksi audio gagal. Keterangan yang tersimpan tetap tersedia. Periksa kata-kata terakhir sebelum memulai lagi.",
  "audio.error.ended":
    "Koneksi audio terputus tiba-tiba. Periksa transkrip tersimpan sebelum memulai lagi.",
  "audio.error.permission":
    "Izin audio ditolak. Izinkan akses mikrofon, lalu coba lagi.",
  "audio.error.saveFinal":
    "Transkrip final tidak dapat disimpan. Rekaman dihentikan. Periksa kata-kata terakhir yang tersimpan sebelum memulai lagi.",
  "audio.error.finishSave":
    "Sesi audio ini tidak dapat diselesaikan dan disimpan. Periksa kata-kata terakhir yang tersimpan sebelum memulai lagi.",
  "audio.error.limit":
    "Batas transkripsi tercapai. Tunggu sebentar, lalu sambungkan ulang.",
  "audio.error.recordingUpload":
    "Transkrip tersimpan, tetapi rekaman audio gagal diunggah.",
  "audio.error.provider":
    "Layanan pengenalan suara melaporkan kesalahan. Periksa pengaturan koneksi dan kuota.",
  "audio.error.providerResponse":
    "Respons layanan pengenalan suara tidak dapat diproses.",

  // Transkrip
  "phase.pending": "Siap diperiksa",
  "phase.queued": "Menunggu pemeriksaan",
  "phase.extracting": "Membaca pernyataan…",
  "phase.retrieving": "Mencari sumber…",
  "phase.analyzing": "Memeriksa…",
  "phase.reviewing": "Mengecek temuan…",
  "phase.synthesizing": "Menyusun temuan…",
  "phase.complete": "Sudah diperiksa",
  "phase.saved": "Tersimpan",
  "transcript.search": "Cari di transkrip ini",
  "transcript.searchPlaceholder": "Cari kata dalam sidang ini…",
  "transcript.filterSpeaker": "Saring transkrip menurut pembicara",
  "transcript.allSpeakers": "Semua pembicara",
  "transcript.shownOf": "{shown} dari {total} pernyataan",
  "transcript.clear": "Hapus saringan transkrip",
  "transcript.followPaused": "Ikuti otomatis dijeda selama penyaringan",
  "transcript.follow": "Ikuti keterangan terbaru",
  "transcript.noTime": "Waktu tidak tersedia",
  "transcript.scripted": "Berskrip",
  "transcript.manual": "Dimasukkan manual",
  "transcript.noConfidence": "Tingkat keyakinan tidak tersedia",
  "transcript.confidence": "Keyakinan kata {value}%",
  "transcript.roleUnconfirmed": " · Peran belum dikonfirmasi",
  "transcript.viewFinding": "Lihat temuan",
  "transcript.retry": "Ulangi analisis",
  "transcript.noMatchTitle": "Tidak ada pernyataan yang cocok.",
  "transcript.readyTitle": "Siap dimulai.",
  "transcript.noMatchText":
    "Coba frasa lain atau hapus saringan pembicara. Saringan tidak mengubah catatan sidang.",
  "transcript.readyText":
    "Mulai sidang simulasi, rekam audio, atau tambahkan pernyataan di bawah.",
  "transcript.listening": "Mendengarkan · sementara",

  // Daftar sidang
  "library.converting": "Mengonversi transkrip…",
  "library.reading": "Membaca transkrip…",
  "library.creating": "Membuat sidang…",
  "library.importing": "Mengimpor sidang…",
  "library.title": "Sidang",
  "library.lead":
    "Catatan lengkap untuk setiap pemeriksaan. Tambahkan transkrip, lalu telusuri buktinya.",
  "library.new": "Sidang baru",
  "library.importTitle": "Masukkan seluruh sidang sekaligus.",
  "library.importText":
    "Unggah transkrip alih-alih memasukkan setiap pernyataan. Tinjau di sini sebelum menambahkannya ke perkara Anda.",
  "library.formats":
    ".jude, JSON, CSV, TXT, SRT, VTT, PDF, atau DOCX · maks. 6 MB",
  "library.upload": "Unggah transkrip",
  "library.uploadLabel": "Unggah transkrip sidang",
  "library.template": "Unduh templat sidang .jude",
  "library.convertHint":
    "File yang dapat dibaca tetapi formatnya tidak dikenal dapat dikonversi dengan AI.",
  "library.hearingTitle": "Judul sidang",
  "library.titlePlaceholder": "Pemeriksaan saksi · hari kedua",
  "library.date": "Tanggal",
  "library.create": "Buat sidang",
  "library.preview": "Pratinjau impor transkrip",
  "library.aiConversion": "Konversi AI · perlu ditinjau",
  "library.importPreview": "Pratinjau impor",
  "library.closePreview": "Tutup pratinjau impor",
  "library.chooseSupported":
    "Pilih file teks yang didukung atau gunakan templat sidang.",
  "library.importedTitle": "Judul sidang yang diimpor",
  "library.hearingDate": "Tanggal sidang",
  "library.speakerN": "Pembicara {n}",
  "library.speakerFor": "Pembicara untuk pernyataan {n}",
  "library.statementN": "Pernyataan {n}",
  "library.preserved": "{statements} · file unggahan asli tetap tersimpan",
  "library.confirm": "Konfirmasi & impor sidang",
  "library.converterNote":
    "Konverter mempertahankan kata-kata sumber dan mengosongkan waktu yang tidak pasti. Anda akan meninjau usulan giliran bicara sebelum impor.",
  "library.convert": "Konversi dengan AI",
  "library.convertUnavailable":
    "Konversi AI tidak tersedia. Unduh templat sidang, masukkan transkrip Anda, lalu unggah kembali.",
  "library.caseHearings": "Sidang dalam perkara ini",
  "library.shownOf": "{shown} dari {total} sidang",
  "library.search": "Cari sidang",
  "library.searchPlaceholder": "Cari sidang atau frasa transkrip…",
  "library.needsReview": "Perlu ditinjau",
  "library.dateNotSet": "Tanggal belum diisi",
  "library.record": "Catatan sidang",
  "library.allReviewed": "Semua sudah ditinjau",
  "library.noMatchTitle": "Tidak ada sidang yang cocok dengan tampilan ini.",
  "library.noMatchText": "Coba frasa lain atau tampilkan semua sidang.",
  "library.clear": "Hapus saringan sidang",
  "library.firstTitle": "Sidang pertama Anda dimulai di sini.",
  "library.firstText":
    "Unggah transkrip yang sudah ada, atau buat sidang untuk audio langsung dan catatan manual.",

  // Peta dan pencarian bukti
  "evidence.title": "Telusuri buktinya.",
  "evidence.lead":
    "Ajukan pertanyaan tentang perkara. Telusuri setiap jawaban kembali ke sumbernya dan keterkaitan di antaranya.",
  "evidence.finding": "Mencari keterkaitan…",
  "evidence.find": "Cari keterkaitan",
  "evidence.searching": "Mencari dalam perkara…",
  "evidence.ask": "Tanya tentang perkara ini",
  "evidence.askPlaceholder":
    "Apa keterangan para saksi tentang waktu kedatangan?",
  "evidence.searchEvidence": "Cari bukti",
  "evidence.groundedAnswer": "Jawaban berdasarkan sumber",
  "evidence.relevantPassages": "Kutipan yang relevan",
  "evidence.closeResults": "Tutup hasil pencarian",
  "evidence.loadingMap": "Memuat peta bukti…",
  "evidence.loading": "Memuat bukti…",
  "evidence.retry": "Muat ulang bukti",
  "evidence.map": "Peta bukti",
  "evidence.connections": "Keterkaitan",
  "evidence.summary": "{passages} kutipan · {connections} keterkaitan",
  "evidence.relationships": "Hubungan antarbukti",
  "evidence.zoomIn": "Perbesar",
  "evidence.zoomOut": "Perkecil",
  "evidence.reset": "Atur ulang",
  "evidence.graph": "Grafik bukti interaktif",
  "evidence.edgeLabel": "{relation}: {from} ke {to}",
  "evidence.hearingStatement": "Pernyataan di sidang",
  "evidence.mapCaption":
    "Pilih kutipan atau garis penghubung. Garis putus-putus menunggu peninjauan. Di layar kecil, geser peta atau gunakan tampilan Keterkaitan.",
  "evidence.emptyTitle": "Bangun gambaran perkara.",
  "evidence.emptyText":
    "Tambahkan berkas perkara atau impor perkara .jude. Kutipannya akan muncul di sini, siap dicari dan dihubungkan.",
  "evidence.suggested": "Disarankan",
  "evidence.reviewedLower": "sudah ditinjau",
  "evidence.suggestedLower": "disarankan",
  "evidence.noConnectionsTitle": "Belum ada keterkaitan.",
  "evidence.noConnectionsText":
    "Cari keterkaitan secara otomatis, atau pilih kutipan untuk membuat tautan sendiri.",
  "evidence.mapLimit":
    "Peta menampilkan 24 simpul. Seluruh {count} simpul tercantum di bawah. Pencarian mencakup seluruh perkara.",
  "evidence.inspector": "Pemeriksa bukti",
  "evidence.back": "Kembali ke bukti",
  "evidence.examine": "Periksa keterkaitan",
  "evidence.basis.ai": "Hubungan yang diusulkan AI",
  "evidence.basis.semantic": "Makna serupa",
  "evidence.basis.keywords": "Istilah yang sama",
  "evidence.basis.simulation": "Contoh sintetis yang disusun",
  "evidence.basis.imported": "Hubungan impor",
  "evidence.basis.recorded": "Hubungan tercatat",
  "evidence.similarity": "Kemiripan {value}%; bukan peluang kebenaran.",
  "evidence.savingReview": "Menyimpan tinjauan…",
  "evidence.reopen": "Buka kembali keterkaitan",
  "evidence.confirm": "Konfirmasi keterkaitan",
  "evidence.discuss": "Diskusikan dengan asisten",
  "evidence.connected": "Bukti yang terkait",
  "evidence.link": "Tautkan kutipan lain",
  "evidence.savingConnection": "Menyimpan keterkaitan…",
  "evidence.otherPassage": "Kutipan lain",
  "evidence.choosePassage": "Pilih kutipan",
  "evidence.relationship": "Hubungan",
  "evidence.why": "Mengapa keduanya terkait?",
  "evidence.saveLink": "Simpan tautan terkonfirmasi",
  "evidence.inspectorEmptyTitle": "Ada sumber di balik setiap keterkaitan.",
  "evidence.inspectorEmptyText":
    "Pilih kutipan untuk membaca teks aslinya, atau pilih tautan untuk melihat hubungan antara dua bukti.",
  "evidence.browse": "Telusuri kutipan dan pernyataan yang tersedia ({count})",

  // Asisten perkara dan latihan sidang
  "dialogue.default.trialType": "Perkara pidana",
  "dialogue.default.jurisdiction":
    "Indonesia (pastikan hukum acara yang berlaku)",
  "dialogue.default.language": "Bahasa Indonesia",
  "dialogue.default.goals":
    "Melatih pertanyaan yang tepat dan argumen berbasis sumber.",
  "dialogue.default.assumptions":
    "Detail hukum acara dan skenario adalah asumsi latihan, bukan fakta perkara yang sudah terbukti.",
  "role.defense": "Penasihat Hukum",
  "role.opposing": "Penuntut Umum",
  "role.judge": "Hakim Ketua",
  "role.witness": "Saksi",
  "stage.Opening statements": "Pembacaan dakwaan & eksepsi",
  "stage.Witness examination": "Pemeriksaan saksi",
  "stage.Cross-examination": "Pemeriksaan silang",
  "stage.Closing arguments": "Tuntutan & pleidoi",
  "stage.Procedural hearing": "Sidang prosedural",
  "difficulty.Supportive": "Ringan",
  "difficulty.Standard": "Standar",
  "difficulty.Challenging": "Menantang",
  "dialogue.busy.reading": "Membaca perkara…",
  "dialogue.busy.responding": "Ruang sidang sedang menanggapi…",
  "dialogue.busy.debrief": "Menyiapkan evaluasi Anda…",
  "dialogue.busy.opening": "Membuka percakapan…",
  "dialogue.busy.starting": "Memulai latihan…",
  "dialogue.busy.suggesting": "Menyusun usulan kondisi sidang…",
  "dialogue.finishMessage":
    "Akhiri latihan ini dan berikan evaluasi latihan untuk saya.",
  "dialogue.practiceTitle": "Bersiap memasuki ruang sidang.",
  "dialogue.assistantTitle": "Telaah perkara secara menyeluruh.",
  "dialogue.practiceLead":
    "Latih argumen, ajukan pertanyaan kepada saksi, atau berlatih memimpin sidang. Anda yang memilih peran dan kondisinya.",
  "dialogue.assistantLead":
    "Ajukan pertanyaan lanjutan tentang dokumen, sidang, temuan, dan keterkaitan bukti yang sudah dikonfirmasi. Setiap kutipan perkara tetap dapat diperiksa.",
  "dialogue.newRehearsal": "Latihan baru",
  "dialogue.newConversation": "Percakapan baru",
  "dialogue.savedRehearsals": "Latihan tersimpan",
  "dialogue.savedConversations": "Percakapan tersimpan",
  "dialogue.yourRehearsals": "Latihan Anda",
  "dialogue.conversations": "Percakapan",
  "dialogue.exportRehearsal": "Ekspor latihan",
  "dialogue.exportConversation": "Ekspor percakapan",
  "dialogue.loadingSaved": "Memuat percakapan tersimpan…",
  "dialogue.completed": "Selesai",
  "dialogue.guidedDrill": "Latihan terpandu",
  "dialogue.aiRehearsal": "Latihan dengan AI",
  "dialogue.caseConversation": "Percakapan perkara",
  "dialogue.emptyPractice": "Sesi latihan Anda akan muncul di sini.",
  "dialogue.emptyAssistant": "Percakapan Anda tersimpan bersama perkara ini.",
  "dialogue.boundaryPractice":
    "Dialog latihan terpisah dari bukti dan catatan sidang.",
  "dialogue.boundaryAssistant":
    "Hanya materi dari perkara ini yang digunakan. Percakapan latihan disimpan terpisah.",
  "dialogue.mainPractice": "Latihan sidang",
  "dialogue.mainAssistant": "Percakapan asisten perkara",
  "dialogue.openingConversations": "Membuka percakapan perkara ini…",
  "dialogue.setTitle": "Atur skenarionya.",
  "dialogue.setText":
    "Tinjau asumsi ini sebelum memulai. Ini adalah skenario latihan, bukan prediksi.",
  "dialogue.suggest": "Usulkan dari perkara",
  "dialogue.suggestedSetup": "Usulan pengaturan · tinjau dan ubah di bawah",
  "dialogue.field.trial_type": "Jenis perkara",
  "dialogue.field.jurisdiction": "Yurisdiksi / pengadilan",
  "dialogue.field.stage": "Tahap sidang",
  "dialogue.field.user_role": "Peran Anda",
  "dialogue.field.difficulty": "Tingkat kesulitan",
  "dialogue.field.language": "Bahasa",
  "dialogue.field.goals": "Tujuan latihan",
  "dialogue.field.assumptions": "Asumsi skenario dan aturan dasar",
  "dialogue.mode": "Mode latihan",
  "dialogue.aiRoleplay": "Bermain peran dengan AI",
  "dialogue.guidedOption": "Latihan terpandu · pertanyaan berskrip",
  "dialogue.start": "Mulai latihan",
  "dialogue.aiUnavailable":
    "Bermain peran dengan AI tidak tersedia. Anda tetap dapat berlatih dengan pertanyaan terpandu dan daftar periksa mandiri.",
  "dialogue.assistantEmptyTitle": "Pertanyaan, dengan perkara di baliknya.",
  "dialogue.practiceMeta": "Anda: {role} · {stage} · {mode}",
  "dialogue.scriptedDrill": "Latihan berskrip",
  "dialogue.assistantMeta":
    "Jawaban memakai cuplikan perkara yang relevan. Buka setiap kutipan untuk memeriksa konteks aslinya.",
  "dialogue.finish": "Selesai & evaluasi",
  "dialogue.conditions": "Kondisi sidang",
  "dialogue.editSetup": "Ubah pengaturan untuk latihan baru",
  "dialogue.logPractice": "Dialog latihan",
  "dialogue.logAssistant": "Percakapan perkara",
  "dialogue.welcomeTitle": "Mulai dari hal yang perlu Anda pahami.",
  "dialogue.welcomeText":
    "Bandingkan keterangan, temukan konteks yang kurang, atau siapkan pertanyaan. Pilih materi di bawah agar suatu sumber mendapat perhatian lebih.",
  "dialogue.suggestion1": "Ringkas perkara ini dan hal yang masih belum pasti.",
  "dialogue.suggestion2": "Di bagian mana keterangan para saksi berbeda?",
  "dialogue.suggestion3":
    "Pertanyaan apa yang perlu saya siapkan untuk sidang berikutnya?",
  "dialogue.you": "Anda",
  "dialogue.youRole": "Anda · {role}",
  "dialogue.openOriginal": "Buka file asli",
  "dialogue.legalDiscovery": "Rujukan hukum · verifikasi teks aslinya",
  "dialogue.complete":
    "Latihan selesai. Dialog dan evaluasi Anda sudah disimpan.",
  "dialogue.again": "Latihan lagi",
  "dialogue.reference": "Rujuk materi perkara",
  "dialogue.referenceHelp":
    "Pilih hingga enam catatan. Hanya cuplikan yang relevan yang dipakai. Rujukan tidak melampirkan setiap halaman.",
  "dialogue.selectedPassage": "Kutipan bukti yang dipilih",
  "dialogue.caseDocument": "Dokumen perkara",
  "dialogue.noReferences":
    "Tambahkan dokumen atau sidang agar dapat dirujuk di sini.",
  "dialogue.legalLookup": "Sertakan pencarian hukum",
  "dialogue.legalTerms": "Kata kunci hukum",
  "dialogue.legalPlaceholder": "mis. keterangan saksi, beban pembuktian",
  "dialogue.legalHelp":
    "Gunakan istilah hukum, bukan data pribadi. Periksa peraturan aslinya sebelum mengandalkannya.",
  "dialogue.legalUnavailable":
    "Pencarian hukum tidak tersedia. Anda dapat merujuk peraturan yang diunggah di Berkas perkara.",
  "dialogue.yourTurn": "Giliran Anda · {role}",
  "dialogue.askLabel": "Tanya tentang perkara ini",
  "dialogue.practicePlaceholder":
    "Sampaikan argumen, ajukan pertanyaan, atau pimpin sidang…",
  "dialogue.assistantPlaceholder":
    "Ajukan pertanyaan atau lanjutkan dari jawaban sebelumnya…",
  "dialogue.footerPractice":
    "Latihan hipotetis · tidak pernah ditambahkan ke bukti",
  "dialogue.footerAi":
    "Kutipan memverifikasi teks yang dikutip, bukan kebenaran hukumnya.",
  "dialogue.footerNoAi": "Hanya pencarian sumber · balasan AI tidak tersedia",
  "dialogue.takeTurn": "Ambil giliran",
  "dialogue.send": "Kirim pesan",

  // Halaman rujukan hukum
  "references.title": "Temukan sumber hukum yang relevan.",
  "references.lead":
    "Temukan peraturan perundang-undangan Indonesia melalui Pasal.id, lalu periksa teksnya di tautan aslinya.",
  "references.notice":
    "Buka sumber aslinya untuk memverifikasi bunyi pasal dan apakah pasal itu berlaku untuk perkara Anda.",
  "references.searchLabel": "Cari peraturan Indonesia",
  "references.placeholder": "Gunakan kata kunci hukum, mis. keterangan saksi",
  "references.search": "Cari peraturan",
  "references.skeleton": "Mencari rujukan hukum…",
  "references.unavailableTitle": "Pencarian hukum tidak tersedia.",
  "references.unavailableText":
    "Anda tetap dapat mengunggah peraturan di Berkas perkara dan merujuknya di asisten perkara.",
  "references.beginTitle": "Mulai dari isu hukum.",
  "references.beginText":
    "Cari istilah hukum umum, bukan nama atau detail pribadi perkara. Setiap hasil membuka sumbernya untuk Anda tinjau.",
  "references.noneTitle": "Rujukan tidak ditemukan.",
  "references.noneText": "Coba judul peraturan atau kata kunci hukum lain.",
  // Tur pertama kali
  "tour.next": "Lanjut",
  "tour.back": "Kembali",
  "tour.done": "Mulai bekerja",
  "tour.progress": "{{current}} dari {{total}}",
  "tour.replay": "Panduan",
  "tour.welcome.title": "Selamat datang di Jude",
  "tour.welcome.text":
    "Jude mendengarkan persidangan, membandingkan setiap keterangan dengan berkas perkara, dan menunjukkan bagian yang sesuai atau berbeda dari sumber, lengkap dengan kutipan aslinya. Kesimpulan tetap di tangan Anda.",
  "tour.newCase.title": "1. Buat perkara",
  "tour.newCase.text":
    "Mulai perkara kosong, impor arsip .jude dari rekan, atau buka contoh perkara. Setiap perkara menyimpan dokumen, sidang, temuan, dan catatannya sendiri.",
  "tour.import.title": "Atau buka contoh",
  "tour.import.text":
    "Impor arsip perkara .jude, misalnya contoh perkara publik Sambo, untuk langsung melihat perkara yang lengkap.",
  "tour.documents.title": "2. Unggah berkas perkara",
  "tour.documents.text":
    "Tambahkan BAP, laporan penyidikan, putusan, dan berkas PDF, DOCX, atau teks lainnya. Dokumen asli disimpan secara privat beserta rujukan halamannya.",
  "tour.hearing.title": "3. Rekam atau impor persidangan",
  "tour.hearing.text":
    "Di ruang sidang, pastikan Hakim Ketua mengizinkan perekaman, lalu nyalakan mikrofon: keterangan ditranskripsikan langsung beserta pembicaranya, dan rekaman privat dapat disimpan. Anda juga bisa mengimpor risalah atau file transkrip.",
  "tour.evidence.title": "4. Tinjau temuan",
  "tour.evidence.text":
    "Setiap keterangan dicek terhadap sumber: didukung sumber, berbeda dari sumber, perlu konteks, atau bukti belum cukup. Buka temuan untuk melihat kedua kutipan, lalu tandai sudah ditinjau dengan catatan Anda.",
  "tour.assistant.title": "5. Tanya tentang perkara",
  "tour.assistant.text":
    "Ajukan pertanyaan dengan bahasa sehari-hari. Jawaban mengutip bagian persis dari perkara ini saja.",
  "tour.practice.title": "6. Latihan sidang",
  "tour.practice.text":
    "Berlatih sebagai Penasihat Hukum, Penuntut Umum, atau Hakim dengan kondisi dari perkara. Latihan tidak pernah mengubah catatan bukti.",
  "tour.language.title": "Bahasa",
  "tour.language.text": "Ganti antara Bahasa Indonesia dan English kapan saja.",
  "tour.help.title": "Perlu lagi?",
  "tour.help.text": "Buka panduan ini dari sini kapan pun Anda mau.",
  "audio.idleShort":
    "Transkripsi langsung beserta pembicara. Pilih cara memulai.",
  "audio.modal.micTitle": "Rekam sidang ini",
  "audio.modal.fileTitle": "Transkripsikan file audio",
  "audio.modal.micText":
    "Jude mentranskripsikan mikrofon secara langsung dan mengecek setiap keterangan terhadap berkas perkara.",
  "audio.modal.fileText":
    "Gunakan rekaman sidang ini (maksimal 30 menit, 30 MB).",
  "audio.modal.chooseFile": "File audio",
  "audio.modal.begin": "Mulai merekam",
  "audio.modal.transcribe": "Mulai transkripsi",
  "settings.title": "Pengaturan perkara",
  "settings.details": "Detail perkara",
  "settings.save": "Simpan detail",
  "settings.saved": "Tersimpan.",
  "settings.speakers": "Label pembicara",
  "settings.speakersText":
    "Beri nama setiap suara sekali. Label mengikuti suara tersebut di semua rekaman dan sidang dalam perkara ini.",
  "settings.export": "Ekspor",
  "settings.exportText":
    "Unduh seluruh perkara (dokumen, sidang, temuan, catatan) sebagai arsip .jude.",
  "settings.exportButton": "Unduh .jude",
  "settings.danger": "Hapus perkara",
  "settings.dangerText":
    "Hapus permanen perkara ini beserta dokumen, sidang, rekaman, temuan, dan percakapannya.",
  "settings.deleteButton": "Hapus perkara ini",
  "settings.confirmTitle": "Hapus perkara ini?",
  "settings.confirmText":
    'Tindakan ini menghapus permanen "{title}" dan seluruh isinya. Tidak dapat dibatalkan.',
  "settings.confirmDelete": "Hapus permanen",
  "audio.empty.title": "Mulai catatan sidang",
  "audio.empty.text":
    "Jude mentranskripsikan secara langsung, membedakan pembicara, dan mengecek setiap keterangan terhadap berkas perkara selama sidang berjalan.",
  "audio.empty.alt":
    "Sudah punya transkrip atau risalah? Impor dari Semua sidang.",
  "transcript.renameSpeaker": "Beri nama pembicara",
  "transcript.renameTitle": "Siapa yang berbicara?",
  "transcript.renameText":
    "Nama ini berlaku untuk semua keterangan dari suara ini dalam perkara.",
  "transcript.renameLabel": "Nama atau peran",
  "transcript.renamePlaceholder": "mis. Hakim Ketua, Saksi Susi",
  "transcript.renameSave": "Simpan nama",
  "settings.voices": "Privasi suara",
  "settings.voicesText":
    "Voiceprint membuat suara yang sama tetap memakai satu label. Ini data biometrik, hanya untuk perkara ini, dan tidak pernah ikut diekspor.",
  "ws.pinSidebar": "Tahan sidebar terbuka",
  "ws.unpinSidebar": "Ciutkan sidebar",
  "newCase.chooseTitle": "Tambah perkara",
  "newCase.blank": "Mulai perkara kosong",
  "newCase.blankText": "Beri judul, lalu tambahkan berkas perkara dan sidang.",
  "newCase.import": "Impor arsip .jude",
  "newCase.importText": "Lanjutkan perkara dari rekan atau hasil ekspor Jude.",
  "newCase.demo": "Buka contoh perkara",
  "newCase.demoText":
    "Jelajahi perkara publik lengkap berisi dokumen, sidang, dan temuan.",
  "newCase.importTitle": "Impor arsip .jude",
  "newCase.importChoose": "Pilih file .jude",
  "newCase.importHint":
    "Maksimal 64 MB. Temuan hasil impor perlu ditinjau ulang.",
  "newCase.back": "Kembali",
  "account.menu": "Akun",
  "account.language": "Bahasa",
  "tour.account.title": "Akun Anda",
  "tour.account.text":
    "Ganti bahasa antara Bahasa Indonesia dan English, buka panduan ini lagi, atau keluar dari sini.",
  // Dialogue redesign
  "dialogue.speaker.assistant": "Asisten perkara",
  "dialogue.speaker.facilitator": "Pemandu latihan",
  "dialogue.speaker.coach": "Pelatih",
  "dialogue.sources": "Sumber",
  "dialogue.removeSource": "Lepas sumber: {label}",
  "dialogue.composerPlaceholder": "Tanyakan sesuatu tentang perkara ini…",
  "dialogue.enterHint": "Enter untuk kirim · Shift+Enter untuk baris baru",
  "dialogue.welcomeShort":
    "Tanyakan apa saja tentang perkara ini. Jawaban mengutip berkas perkara, jadi setiap poin dapat Anda periksa.",
  "dialogue.tryAsking": "Contoh pertanyaan",
  "dialogue.cited": "Sumber yang dikutip",
  "dialogue.step.role": "Pilih peran Anda",
  "dialogue.step.conditions": "Periksa kondisi sidang",
  "dialogue.roleHint.defense": "Periksa saksi dan uji dakwaan.",
  "dialogue.roleHint.opposing": "Buktikan dakwaan dan tanggapi pembelaan.",
  "dialogue.roleHint.judge": "Pimpin sidang dan jaga tertib hukum acara.",
  "dialogue.editConditions": "Ubah kondisi",
  "dialogue.summaryNote":
    "Ini asumsi latihan, bukan prediksi jalannya sidang sebenarnya.",
  "dialogue.modeAi": "Bermain peran dengan AI",
  "dialogue.modeAiHint": "AI memerankan pihak lain di ruang sidang.",
  "dialogue.modeGuided": "Latihan terpandu (tanpa AI)",
  "dialogue.modeGuidedHint": "Pertanyaan berskrip dan daftar periksa mandiri.",
  "dialogue.aiUnavailableShort": "Bermain peran dengan AI belum tersedia.",
  "dialogue.finishDebrief": "Selesai & lihat evaluasi",
  "dialogue.history": "Riwayat",
  // Case tabs redesign
  "tabs.evidence.askHint":
    "Jawaban mengutip berkas perkara. Buka sumbernya untuk membaca teks lengkap.",
  "tabs.evidence.loadFailed": "Peta bukti belum dapat dimuat.",
  "tabs.evidence.view": "Tampilan bukti",
  "tabs.evidence.linkHeading": "Tautan Anda sendiri",
  "tabs.library.import": "Impor transkrip",
  "tabs.library.drop": "Letakkan transkrip di sini atau pilih file",
  "tabs.library.newText":
    "Beri nama persidangan. Di dalamnya Anda dapat merekam, mentranskrip file audio, atau menambahkan keterangan secara manual.",
  "tabs.finding.testimony": "Keterangan",
  "tabs.finding.source": "Sumber",
  "tabs.docs.drop": "Letakkan dokumen di sini atau pilih file",
  "tabs.docs.all": "Semua dokumen",
  "tabs.docs.added": "Ditambahkan {date}",
  "tabs.references.count.one": "{count} peraturan",
  "tabs.references.count.other": "{count} peraturan",
  "tabs.settings.lead": "Detail, ekspor, dan penghapusan untuk perkara ini.",
  "tabs.settings.detailsText":
    "Judul dan nomor perkara tampil di daftar perkara dan di berkas ekspor.",
};
