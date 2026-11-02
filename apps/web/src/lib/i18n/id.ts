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
  "error.tooManyTurns":
    "Transkrip ini berisi lebih dari 3.000 pernyataan. Pecah menjadi beberapa berkas dan impor masing-masing sebagai sidang tersendiri.",
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
    "Kutipan nyata dari catatan publik perkara Ferdy Sambo, perkara yang sama dengan demo di Jude.",
  "landing.demo.disclosure2":
    "Halaman ini tidak merekam audio dan tidak menjalankan analisis AI.",
  "landing.demo.lead":
    "Perbedaan adalah titik awal sebuah pertanyaan. Lihat bagaimana bukti yang tersedia mengubah temuan.",
  "landing.demo.choose": "Pilih contoh bukti",
  "landing.demo.caseLabel": "Catatan publik / 796/Pid.B/2022/PN Jkt.Sel",
  "landing.demo.inHearing": "Di persidangan",
  "landing.demo.inCaseFile": "Dalam putusan",
  "landing.demo.transcriptAt": "Transkrip · {time}",
  "landing.demo.statementPage": "Kutipan putusan · Halaman {page}",
  "landing.demo.marked": "Sudah ditinjau",
  "landing.demo.mark": "Tandai sudah ditinjau",
  "landing.demo.visitOnly": "Hanya untuk kunjungan ini",
  "landing.demo.excerpts": "Kutipan sumber asli",
  "landing.demo.publicRecord": "Catatan publik",
  "landing.demo.sourceDocument": "Dokumen sumber",
  "landing.demo.witnessStatement": "Putusan",
  "landing.demo.recordCaps": "TRANSKRIP OTOMATIS",
  "landing.demo.statementCaps": "PUTUSAN 796/PID.B/2022",
  "landing.demo.pageCaps": "HALAMAN {page}",
  "landing.demo.examination": "Sidang 8 November 2022",
  "landing.demo.earlierAccount": "Ringkasan keterangan saksi",
  "landing.demo.footnote":
    "Catatan publik. Baris persidangan berasal dari transkrip otomatis Amazon Transcribe atas siaran KOMPASTV, sehingga kata dan label pembicara bisa kurang tepat. BAP asli tidak publik, jadi pembandingnya adalah ringkasan keterangan dalam putusan.",
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
  "auth.or": "atau",
  "notice.sources":
    "Berdasarkan {count} kutipan sumber. Periksa konteks aslinya. Ini bukan tinjauan atas seluruh perkara.",
  "notice.legal":
    "Hasil hukum adalah metadata penelusuran. Periksa teks hukum aslinya.",
  "notice.legalOff":
    "Pencarian hukum tidak tersedia. Tidak ada teks hukum yang diambil.",
  "notice.rehearsal":
    "Latihan hipotetis, bukan keterangan atau prediksi sidang sebenarnya.",
  "notice.scene": "Latihan hipotetis, terpisah dari keterangan dan temuan.",
  "notice.droppedCitations":
    "Kutipan yang tidak cocok dengan teks perkara telah dihapus.",
  "notice.sourcesOnly":
    "Balasan AI tidak dapat dicocokkan dengan sumber perkara, jadi tidak disimpan. Berikut kutipan perkara yang relevan untuk diperiksa.",
  "notice.aiOff":
    "Balasan AI tidak tersedia. Berikut kutipan perkara yang relevan untuk diperiksa. Ini pencarian sumber, bukan jawaban atau tafsiran hukum.",
  "auth.demoCase": "Perkara Ferdy Sambo, catatan publik",
  "auth.openSynthetic": "Buka perkara demo",

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
  "hearing.analyze": "Analisis sidang",
  "hearing.state.live": "Sesi audio langsung",
  "hearing.state.complete": "Sidang selesai",
  "hearing.state.ready": "Siap menerima keterangan",
  "hearing.autoUpdates": "Perubahan tampil otomatis",
  "hearing.checking": "Memeriksa keterangan baru…",
  "hearing.readyForAnalysis": "Transkrip tersimpan · siap dianalisis",
  "hearing.upToDate": "Semua keterangan tersimpan sudah diperiksa",
  "hearing.analysisUnavailable":
    "Analisis otomatis tidak tersedia. Anda tetap dapat membaca transkrip dan membandingkannya dengan dokumen Anda.",
  "hearing.transcript": "Transkrip",
  "hearing.findings": "Temuan",
  "hearing.toReview": "{count} perlu ditinjau",
  "hearing.reviewedOf": "{done} dari {total} sudah ditinjau",
  "hearing.nextUnreviewed": "Berikutnya yang belum ditinjau",
  "hearing.filter": "Saring temuan",
  "hearing.allFindings": "Semua temuan",
  "hearing.needsReview": "Perlu Anda tinjau",
  "hearing.examining": "Memeriksa keterangan untuk mencari temuan…",
  "hearing.mode.imported": "Temuan impor · verifikasi sumber",
  "hearing.mode.ai": "AI · divalidasi dengan sumber",
  "hearing.emptyTitle": "Telusuri buktinya.",
  "hearing.emptyFilterTitle": "Tidak ada temuan di tampilan ini.",
  "hearing.emptyText":
    "Temuan muncul di sini saat pernyataan final diperiksa. Rekam audio atau tambahkan pernyataan transkrip.",
  "hearing.emptyFilterText":
    "Pilih saringan lain untuk melihat bagian catatan lainnya.",
  "hearing.inspector": "Pemeriksa temuan dan sumber",
  "hearing.backToFindings": "Kembali ke temuan",
  "hearing.bottomNote":
    "Temuan menggambarkan hubungan antarbukti. Temuan tidak menentukan kredibilitas, kesalahan, atau putusan hukum.",
  "hearingStatus.ready": "siap",
  "hearingStatus.live": "langsung",
  "hearingStatus.paused": "dijeda",
  "hearingStatus.complete": "selesai",

  // Formulir perkara baru
  "newCase.title": "Buat perkara",
  "newCase.caseTitle": "Judul perkara",
  "newCase.titlePlaceholder": "mis. Perkara penggelapan gudang",
  "newCase.reference": "Nomor perkara (opsional)",
  "newCase.referencePlaceholder": "mis. 123/Pid.B/2026/PN Jkt.Sel",
  "newCase.description": "Deskripsi (opsional)",
  "newCase.descriptionPlaceholder": "Konteks perkara ini dan materinya",
  "newCase.creating": "Membuat…",
  "newCase.create": "Buat perkara",

  // Impor arsip .jude
  "archive.importing": "Mengimpor perkara…",
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
  "speakers.numbered": "Pembicara {n}",

  // Hasil rujukan hukum
  "legal.uncertain": " (belum pasti)",
  "legal.openOriginal":
    "Buka sumber aslinya untuk membaca peraturan secara lengkap.",
  "legal.article": "Pasal {article}",
  "legal.bestPassage": "Paling relevan: Pasal {article}",
  "legal.type.label": "Jenis peraturan",
  "legal.type.UU": "Undang-Undang (UU)",
  "legal.type.PERPPU": "Perppu",
  "legal.type.PP": "Peraturan Pemerintah (PP)",
  "legal.type.PERPRES": "Peraturan Presiden",
  "legal.type.PERMEN": "Peraturan Menteri",
  "legal.type.PERMA": "Peraturan Mahkamah Agung",
  "legal.type.PUTUSAN_MK": "Putusan Mahkamah Konstitusi",
  "legal.type.all": "Semua jenis",

  // Kartu sumber
  "source.docxSection": "Bagian teks DOCX · tanpa nomor halaman",

  // Berkas perkara
  "docs.added":
    "Dokumen ditambahkan. Pilih di bawah untuk membaca kutipannya, atau tanyakan kepada asisten perkara.",
  "docs.title": "Berkas perkara.",
  "docs.lead":
    "Dokumen asli, kutipan yang terjaga, dan jejak kembali ke sumbernya.",
  "docs.formats":
    "PDF, DOCX, TXT, atau Markdown · maks. 25 MB · hanya PDF berbasis teks",
  "docs.note":
    "File asli tetap tersimpan dan teksnya dapat dicari. Fitur AI dapat memproses cuplikan untuk membantu menemukan materi terkait.",
  "docs.processing": "Memproses…",
  "docs.searchLabel": "Cari bukti perkara",
  "docs.searchPlaceholder": "Cari hanya di bukti perkara ini…",
  "docs.search": "Cari",
  "docs.clear": "Hapus hasil pencarian",
  "docs.processingDoc": "Memproses dokumen…",
  "docs.textSection": "Bagian teks",
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

  // Pemeriksa temuan
  "finding.hearingAt": "Sidang · {time}",
  "finding.sourceTab": "Sumber {n} · {relation}",
  "finding.loadingPassage": "Memuat kutipan asli…",
  "finding.noCitation": "Tidak ada kutipan sumber yang mendukung temuan ini.",
  "finding.uncertainty": "Ketidakpastian",
  "finding.importedReview": "Tinjauan impor · tidak dijalankan ulang",
  "finding.independentReview": "Tinjauan independen",
  "finding.alternative": "Alternatif: {text}",
  "finding.missingContext": "Konteks yang kurang: {text}",
  "finding.analyst": "Analis: {text}",
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
  "audio.recognitionLanguage": "Bahasa pengenalan suara",
  "audio.permission":
    "Majelis Hakim telah mengizinkan perekaman, dan saya berwenang mengirim audio ini untuk ditranskripsikan.",
  "audio.start": "Nyalakan mikrofon",
  "audio.prepared": "Pilih file audio",
  "audio.cancel": "Batalkan koneksi",
  "audio.finishing": "Menyelesaikan transkrip…",
  "audio.stop": "Hentikan rekaman",
  "audio.unavailable":
    "Transkripsi audio tidak tersedia. Kembali ke Semua sidang untuk mengunggah transkrip.",
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
  "transcript.readyText": "Rekam audio atau tambahkan pernyataan di bawah.",
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
  "evidence.graph": "Grafik bukti interaktif",
  "evidence.edgeLabel": "{relation}: {from} ke {to}",
  "evidence.hearingStatement": "Pernyataan di sidang",
  "evidence.column.statements": "Pernyataan sidang",
  "evidence.column.passages": "Kutipan berkas",
  "evidence.pageShort": "Hal. {page}",
  "evidence.mapUnlinked":
    "{count} kutipan tanpa keterkaitan tidak digambar. Semua kutipan tercantum di bawah.",
  "evidence.notice.similarity_advisory":
    "Kemiripan menandakan adanya hubungan, bukan dukungan atau pertentangan. Periksa kedua kutipan sebelum mengonfirmasi tautan.",
  "evidence.notice.links_ready": "Saran keterkaitan siap diperiksa.",
  "evidence.notice.embeddings_partial":
    "Sebagian kutipan terkait mungkin belum muncul. Tinjau saran ini atau coba lagi nanti.",
  "evidence.notice.ai_unverified":
    "Hubungan dari AI tidak dapat diverifikasi, jadi yang ditampilkan adalah saran berdasarkan kemiripan.",
  "evidence.answerNotice.no_passages":
    "Tidak ada bagian yang relevan. Coba kata lain atau tambahkan bukti.",
  "evidence.answerNotice.ai_off":
    "Jawaban AI tidak tersedia. Anda dapat memeriksa bagian yang relevan di bawah.",
  "evidence.answerNotice.answer_unverified":
    "Jawaban AI tidak dapat dicocokkan dengan bagian ini, jadi tidak ditampilkan. Periksa bagian yang relevan di bawah.",
  "evidence.answerNotice.ai_failed":
    "Jawaban AI belum dapat diselesaikan saat ini. Periksa bagian yang relevan di bawah atau coba lagi.",
  "evidence.mapCaption":
    "Arahkan atau pilih pernyataan maupun kutipan untuk menelusuri keterkaitannya, atau pilih garis untuk memeriksanya. Garis putus-putus menunggu peninjauan.",
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
    "{shown} dari {total} kutipan dimuat di sini. Pencarian mencakup seluruh perkara.",
  "evidence.inspector": "Pemeriksa bukti",
  "evidence.back": "Kembali ke bukti",
  "evidence.examine": "Periksa keterkaitan",
  "evidence.basis.ai": "Hubungan yang diusulkan AI",
  "evidence.basis.semantic": "Makna serupa",
  "evidence.basis.keywords": "Istilah yang sama",
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
    "Berlatih dengan AI yang memerankan pihak lain di ruang sidang: majelis hakim, pihak lawan, dan saksi dari berkas perkara ini. Jawaban mengutip berkas, sehingga setiap fakta dapat diperiksa.",
  "dialogue.assistantLead":
    "Ajukan pertanyaan lanjutan tentang dokumen, sidang, temuan, dan keterkaitan bukti yang sudah dikonfirmasi. Setiap kutipan perkara tetap dapat diperiksa.",
  "dialogue.newRehearsal": "Latihan baru",
  "dialogue.newConversation": "Percakapan baru",
  "dialogue.savedRehearsals": "Latihan tersimpan",
  "dialogue.savedConversations": "Percakapan tersimpan",
  "dialogue.exportRehearsal": "Ekspor latihan",
  "dialogue.exportConversation": "Ekspor percakapan",
  "dialogue.loadingSaved": "Memuat percakapan tersimpan…",
  "dialogue.completed": "Selesai",
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
  "dialogue.start": "Mulai latihan",
  "dialogue.assistantEmptyTitle": "Pertanyaan, dengan perkara di baliknya.",
  "dialogue.practiceMeta": "Anda: {role} · {stage} · {difficulty}",
  "dialogue.assistantMeta":
    "Jawaban memakai cuplikan perkara yang relevan. Buka setiap kutipan untuk memeriksa konteks aslinya.",
  "dialogue.conditions": "Kondisi sidang",
  "dialogue.editSetup": "Ubah pengaturan untuk latihan baru",
  "dialogue.logPractice": "Dialog latihan",
  "dialogue.logAssistant": "Percakapan perkara",
  "dialogue.welcomeTitle": "Mulai dari hal yang perlu Anda pahami.",
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
  "dialogue.roleHint.defense":
    "Periksa saksi dan uji dakwaan. AI memerankan majelis hakim, Penuntut Umum, dan saksi.",
  "dialogue.roleHint.opposing":
    "Buktikan dakwaan dan tanggapi pembelaan. AI memerankan majelis hakim, Penasihat Hukum, dan saksi.",
  "dialogue.roleHint.judge":
    "Pimpin sidang dan putuskan keberatan. AI memerankan Penuntut Umum, Penasihat Hukum, dan saksi.",
  "dialogue.editConditions": "Ubah kondisi",
  "dialogue.summaryNote":
    "Ini asumsi latihan, bukan prediksi jalannya sidang sebenarnya.",
  "dialogue.finishDebrief": "Selesai & lihat evaluasi",
  "dialogue.unavailableTitle": "Latihan sidang memerlukan AI.",
  "dialogue.unavailableText":
    "Dalam latihan, AI memerankan hakim, Penuntut Umum atau Penasihat Hukum, dan saksi berdasarkan dokumen dan sidang perkara ini. AI belum tersedia di workspace ini, sehingga latihan belum dapat dimulai. Asisten perkara tetap dapat menampilkan sumber yang relevan.",
  "dialogue.unavailableHistory":
    "Latihan yang tersimpan tetap dapat dibuka di Riwayat.",
  "dialogue.unavailablePaused":
    "AI belum tersedia, sehingga latihan ini belum dapat dilanjutkan. Latihan tetap tersimpan.",
  "dialogue.legacyReadOnly":
    "Latihan berskrip lama ini hanya dapat dibaca. Mulai latihan baru untuk berlatih dengan AI.",
  "dialogue.scene":
    "{stage} · Anda berperan sebagai {role}. {cast} diperankan AI berdasarkan berkas perkara ini. Mulailah dengan pertanyaan, argumen, atau arahan pertama Anda.",
  "dialogue.cast.defense": "Hakim Ketua, Penuntut Umum, dan saksi",
  "dialogue.cast.opposing": "Hakim Ketua, Penasihat Hukum, dan saksi",
  "dialogue.cast.judge": "Penuntut Umum, Penasihat Hukum, dan saksi",
  "dialogue.coachNote": "Catatan pelatih",
  "dialogue.coach.leading": "Pertanyaan mengarahkan.",
  "dialogue.coach.compound": "Pertanyaan ganda.",
  "dialogue.coach.contradiction": "Pertentangan untuk didalami.",
  "dialogue.coach.procedure": "Hukum acara.",
  "dialogue.coach.clarity": "Kejelasan.",
  "dialogue.coach.strength": "Sudah tepat.",
  "dialogue.coaching": "Catatan pelatih",
  "dialogue.coachingHint":
    "Tampilkan catatan singkat dari pelatih setelah setiap giliran Anda",
  "dialogue.debrief.title": "Evaluasi latihan",
  "dialogue.debrief.strength": "Yang sudah kuat",
  "dialogue.debrief.tighten": "Yang perlu dipertajam",
  "dialogue.debrief.revisit": "Bagian berkas untuk dibaca ulang",
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

  // Pricing page
  "meta.pricingTitle": "Harga | Jude",
  "meta.pricingDescription":
    "Mulai 14 hari gratis tanpa kartu kredit. Paket Advokat Lite, Advokat Pro, dan Kantor Hukum, serta harga khusus bantuan hukum. Harga dalam rupiah, belum termasuk PPN.",
  "landing.nav.pricing": "Harga",
  "landing.closing.pricing": "Lihat paket dan harga",
  "pricing.hero.title": "Jangan biarkan satu perbedaan keterangan terlewat.",
  "pricing.hero.lead":
    "Setiap jam sidang memuat keterangan yang perlu dicocokkan dengan berkas perkara. Jude mendengarkan bersama Anda, menandai yang berbeda, dan selalu menunjukkan sumbernya.",
  "pricing.hero.anchor": "Untuk tim, sekitar {price} per jam sidang.",
  "pricing.billing.label": "Periode penagihan",
  "pricing.billing.monthly": "Bulanan",
  "pricing.billing.yearly": "Tahunan",
  "pricing.billing.badge": "Gratis 2 bulan",
  "pricing.risk.trial": "14 hari gratis, tanpa kartu kredit",
  "pricing.risk.cancel": "Batal kapan saja",
  "pricing.risk.export": "Data Anda tetap bisa diekspor",
  "pricing.tax":
    "Harga belum termasuk PPN. Semua harga dalam rupiah per akun per bulan.",
  "pricing.plans.title": "Paket",
  "pricing.perAccountMonth": "/akun/bulan",
  "pricing.perHour": "≈ {price} per jam sidang",
  "pricing.billedYearly": "Ditagih {total} per akun per tahun, di muka",
  "pricing.billedMonthly": "Ditagih setiap bulan",
  "pricing.monthlyWas": "Harga bulanan {price}",
  "pricing.sessions.single": "≈ {count} sidang",
  "pricing.sessions.range": "≈ {min}–{max} sidang",
  "pricing.hours.one": "{count} jam sidang",
  "pricing.hours.other": "{count} jam sidang",
  "pricing.cta.trial": "Mulai 14 hari gratis",
  "pricing.cta.demo": "Buka perkara demo",
  "pricing.cta.book": "Jadwalkan demo",
  "pricing.cta.choose": "Pilih paket ini",
  "pricing.cta.current": "Paket Anda saat ini",
  "pricing.trial.name": "Coba Gratis",
  "pricing.trial.for":
    "Lihat cara kerja Jude dengan perkara publik nyata dan satu perkara Anda sendiri.",
  "pricing.trial.price": "Rp0",
  "pricing.trial.period": "selama 14 hari",
  "pricing.trial.noCard": "Tanpa kartu kredit",
  "pricing.trial.f1": "Buka perkara demo dari catatan publik",
  "pricing.trial.f2": "1 perkara Anda sendiri",
  "pricing.trial.f3": "2 jam sidang transkripsi dan analisis langsung",
  "pricing.trial.f4": "30 pertanyaan AI",
  "pricing.trial.f5": "Ekspor perkara ke berkas .jude",
  "pricing.lite.name": "Advokat Lite",
  "pricing.lite.for": "Untuk advokat yang sesekali menghadiri sidang.",
  "pricing.lite.f2": "150 pertanyaan AI per bulan",
  "pricing.lite.f3": "Perkara tanpa batas",
  "pricing.lite.f4": "Transkripsi langsung dengan label pembicara",
  "pricing.lite.f5": "Temuan terhadap berkas perkara dengan kutipan persis",
  "pricing.lite.f6":
    "Peta bukti, asisten perkara, dan latihan sidang dengan AI",
  "pricing.lite.f7": "Rujukan hukum dari Pasal.id dan ekspor .jude",
  "pricing.pro.name": "Advokat Pro",
  "pricing.pro.for": "Untuk advokat yang bersidang setiap pekan.",
  "pricing.pro.includes": "Semua fitur Lite, ditambah:",
  "pricing.pro.f2": "300 pertanyaan AI per bulan (pemakaian wajar)",
  "pricing.pro.f3":
    "Pengenalan suara lintas sidang, suara yang sama tetap dengan namanya",
  "pricing.pro.f4": "Jam tambahan {price}/jam, hanya jika Anda aktifkan",
  "pricing.kantor.name": "Kantor Hukum",
  "pricing.kantor.badge": "Direkomendasikan untuk tim",
  "pricing.kantor.for":
    "Untuk tim yang menangani perkara bersama. Minimal 3 akun.",
  "pricing.kantor.includes": "Semua fitur Pro, ditambah:",
  "pricing.kantor.f1": "{hours} jam sidang per akun, dipakai bersama satu tim",
  "pricing.kantor.f2": "600 pertanyaan AI per akun, dipakai bersama",
  "pricing.kantor.f3": "Perkara tim bersama dan peran tim",
  "pricing.kantor.f4": "Dukungan prioritas",
  "pricing.kantor.f5": "Invoice dan faktur pajak",
  "pricing.kantor.cta": "Mulai 14 hari gratis untuk tim",
  "pricing.lembaga.name": "Lembaga & LBH",
  "pricing.lembaga.title": "Bantuan hukum layak mendapat alat yang sama.",
  "pricing.lembaga.programme": "Program Bantuan Hukum",
  "pricing.lembaga.programmeText":
    "Untuk organisasi bantuan hukum terakreditasi BPHN. Fitur setara Pro dengan harga sekitar setengahnya, termasuk {hours} jam sidang per akun setiap bulan.",
  "pricing.lembaga.licence": "Lisensi seluruh kantor",
  "pricing.lembaga.licenceText":
    "Untuk kantor bantuan hukum yang lebih besar, pengadilan, dan instansi publik. Akun dan jam sidang disesuaikan dengan beban perkara Anda.",
  "pricing.lembaga.licencePrice": "mulai {price}/tahun",
  "pricing.lembaga.from": "{price}/akun/bulan",
  "pricing.lembaga.choose": "Pilih Program Bantuan Hukum",
  "pricing.packs.title": "Butuh jam lebih? Bayar di muka, tanpa kejutan.",
  "pricing.packs.lead":
    "Paket jam berlaku 12 bulan. Jam tambahan tetap mati kecuali Anda mengaktifkannya.",
  "pricing.packs.pack": "Paket {hours} jam",
  "pricing.packs.rate": "{price} per jam",
  "pricing.packs.extra": "Jam tambahan",
  "pricing.packs.extraNote": "Per jam, mati secara bawaan",
  "pricing.trust.title": "Yang berlaku di setiap paket",
  "pricing.trust.t1": "Sumber selalu dikutip",
  "pricing.trust.t1Text":
    "Setiap temuan menunjuk ke halaman atau menit asalnya.",
  "pricing.trust.t2": "Penilaian tetap di tangan Anda",
  "pricing.trust.t2Text":
    "Jude menandai yang perlu diperiksa. Jude tidak memutuskan siapa yang benar.",
  "pricing.trust.t3": "Disimpan di AWS Singapura",
  "pricing.trust.t3Text":
    "Data perkara tetap di region Singapura. Sidik suara disimpan per perkara dan bisa dihapus.",
  "pricing.calc.title": "Temukan paket yang paling hemat.",
  "pricing.calc.lead":
    "Atur pemakaian Anda. Kami membandingkan setiap paket beserta paket jam dan jam tambahan, lalu menampilkan yang termurah dan sesuai.",
  "pricing.calc.hours": "Jam sidang per akun per bulan",
  "pricing.calc.accounts": "Jumlah akun",
  "pricing.calc.fewer": "Kurangi akun",
  "pricing.calc.more": "Tambah akun",
  "pricing.calc.needs": "Yang Anda butuhkan",
  "pricing.calc.shared": "Tim menangani perkara yang sama",
  "pricing.calc.voice": "Mengenali suara yang sama lintas sidang",
  "pricing.calc.suggested": "Paket yang disarankan",
  "pricing.calc.total": "Perkiraan per bulan",
  "pricing.calc.subscription": "Langganan",
  "pricing.calc.included": "Termasuk {hours} per bulan",
  "pricing.calc.hoursLine": "Jam tambahan, dirata-ratakan per bulan",
  "pricing.calc.pack20": "{count} × paket 20 jam",
  "pricing.calc.pack5": "{count} × paket 5 jam",
  "pricing.calc.extra": "{count} × jam tambahan",
  "pricing.calc.perYear": "per tahun",
  "pricing.calc.noExtra": "Tidak perlu jam tambahan",
  "pricing.calc.minSeats": "Kantor Hukum ditagih minimal 3 akun.",
  "pricing.calc.cheaper":
    "Tanpa kebutuhan itu, {plan} sekitar {price} per bulan.",
  "pricing.calc.compare": "{plan}: {price} per bulan",
  "pricing.calc.trialFits":
    "Pemakaian sebesar ini juga muat dalam masa coba gratis 14 hari.",
  "pricing.calc.volume": "Untuk 10 akun atau lebih, tanyakan harga volume.",
  "pricing.calc.note":
    "Perkiraan sebelum PPN. Paket jam berlaku 12 bulan, jadi pembelian setahun dirata-ratakan per bulan.",
  "pricing.compare.title": "Bandingkan paket",
  "pricing.compare.show": "Tampilkan perbandingan lengkap",
  "pricing.compare.hide": "Sembunyikan perbandingan lengkap",
  "pricing.compare.feature": "Fitur",
  "pricing.compare.yes": "Termasuk",
  "pricing.compare.no": "Tidak termasuk",
  "pricing.compare.price": "Harga, ditagih tahunan",
  "pricing.compare.hours": "Jam sidang",
  "pricing.compare.questions": "Pertanyaan AI",
  "pricing.compare.cases": "Perkara",
  "pricing.compare.transcription":
    "Transkripsi langsung dengan label pembicara",
  "pricing.compare.findings": "Temuan dengan kutipan persis",
  "pricing.compare.map": "Peta bukti dan asisten perkara",
  "pricing.compare.practice": "Latihan sidang dengan AI",
  "pricing.compare.legal": "Rujukan hukum (Pasal.id)",
  "pricing.compare.export": "Ekspor .jude",
  "pricing.compare.voice": "Pengenalan suara lintas sidang",
  "pricing.compare.team": "Perkara tim bersama dan peran tim",
  "pricing.compare.support": "Dukungan prioritas",
  "pricing.compare.invoice": "Invoice dan faktur pajak",
  "pricing.compare.extraHours": "Jam tambahan",
  "pricing.compare.trialPrice": "Rp0 selama 14 hari",
  "pricing.compare.trialHours": "Total 2",
  "pricing.compare.perMonth": "{count} per bulan",
  "pricing.compare.pooled": "{count} per akun, dibagi tim",
  "pricing.compare.trialQuestions": "Total 30",
  "pricing.compare.oneCase": "1 ditambah demo",
  "pricing.compare.unlimited": "Tanpa batas",
  "pricing.compare.optional": "{price}/jam, opsional",
  "pricing.pay.title": "Cara membayar",
  "pricing.pay.qris": "QRIS",
  "pricing.pay.va": "Virtual account bank: BCA, Mandiri, BNI, BRI",
  "pricing.pay.ewallet": "Dompet digital: GoPay, OVO, DANA, ShopeePay",
  "pricing.pay.card": "Kartu kredit atau debit, diperpanjang otomatis",
  "pricing.pay.invoice":
    "Invoice dan faktur pajak untuk kantor hukum dan lembaga",
  "pricing.pay.yearly": "Paket tahunan dibayar di muka untuk 12 bulan.",
  "pricing.protect.title": "Tagihan yang bisa ditebak",
  "pricing.protect.p1":
    "Meteran pemakaian di aplikasi menunjukkan sisa jam sidang dan pertanyaan AI Anda.",
  "pricing.protect.p2":
    "Jam tambahan mati secara bawaan. Di batas kuota, transkripsi berhenti sampai Anda membeli paket atau mengaktifkan jam tambahan.",
  "pricing.protect.p3":
    "Batal kapan saja. Paket berjalan sampai akhir periode yang sudah dibayar.",
  "pricing.protect.p4":
    "Perkara Anda tetap bisa diekspor ke berkas .jude di setiap paket.",
  "pricing.faq.title": "Pertanyaan tentang harga",
  "pricing.faq.q1": "Apa yang dihitung sebagai satu jam sidang?",
  "pricing.faq.a1":
    "Menit audio yang ditranskripsi dan dianalisis Jude. Pemakaian dihitung per menit dan dibulatkan ke atas, jadi sesi 42 menit 10 detik tercatat 43 menit. Kami memperkirakan satu sidang pidana biasanya berlangsung 1 sampai 1,5 jam, jadi 5 jam setara sekitar 3 sampai 5 sidang.",
  "pricing.faq.q2": "Apa yang terjadi saat kuota habis?",
  "pricing.faq.a2":
    "Transkripsi langsung berhenti di batas kuota, jadi tidak ada tagihan kejutan. Anda bisa membeli paket jam atau mengaktifkan jam tambahan kapan saja. Perkara, transkrip, dan temuan yang tersimpan tetap bisa dibuka.",
  "pricing.faq.q3": "Bisakah saya berhenti berlangganan?",
  "pricing.faq.a3":
    "Bisa, kapan saja. Paket berjalan sampai akhir periode yang sudah dibayar. Paket tahunan dibayar di muka untuk 12 bulan.",
  "pricing.faq.q4": "Apakah ekspor data dikunci?",
  "pricing.faq.a4":
    "Tidak pernah. Ekspor perkara ke berkas .jude tersedia di setiap paket, termasuk masa coba gratis dan setelah Anda berhenti berlangganan. Sidik suara tidak pernah ikut diekspor.",
  "pricing.faq.q5":
    "Apakah harga sudah termasuk PPN? Bisakah meminta faktur pajak?",
  "pricing.faq.a5":
    "Harga belum termasuk PPN, yang ditambahkan saat penagihan. Kantor hukum dan lembaga bisa membayar dengan invoice dan menerima faktur pajak.",
  "pricing.faq.q6": "Bagaimana data perkara dan suara saya dijaga?",
  "pricing.faq.a6":
    "Data perkara disimpan di AWS region Singapura. Sidik suara disimpan per perkara, bisa dihapus, dan tidak ikut dalam ekspor .jude. Jude membantu Anda memverifikasi keterangan terhadap sumber. Jude tidak pernah memutuskan bersalah atau tidaknya seseorang.",
  "pricing.faq.q7": "Metode pembayaran apa yang tersedia?",
  "pricing.faq.a7":
    "QRIS, virtual account BCA, Mandiri, BNI, dan BRI, dompet digital GoPay, OVO, DANA, dan ShopeePay, serta kartu kredit atau debit yang diperpanjang otomatis. Kantor hukum dan lembaga juga bisa membayar dengan invoice.",
  "pricing.faq.q8": "Apakah ada harga khusus untuk LBH?",
  "pricing.faq.a8":
    "Ada. Organisasi bantuan hukum terakreditasi BPHN mendapat Program Bantuan Hukum seharga {price} per akun per bulan dengan 3 jam sidang. Kantor yang lebih besar dan instansi publik bisa memakai lisensi seluruh kantor. Jadwalkan demo untuk membicarakannya.",
  "pricing.closing.title1": "Sidang berikutnya,",
  "pricing.closing.title2": "dengan sumber di sisi Anda.",
  "pricing.closing.lead":
    "14 hari gratis, tanpa kartu kredit. Batal kapan saja.",
  "pricing.footer.home": "Beranda",
  "pricing.footer.pricing": "Harga",
  "pricing.modal.title": "Aktifkan {plan}",
  "pricing.modal.demo":
    "Mode demo: tidak ada pembayaran, paket langsung aktif.",
  "pricing.modal.plan": "Paket",
  "pricing.modal.billing": "Penagihan",
  "pricing.modal.accounts": "Jumlah akun",
  "pricing.modal.perMonth": "Per bulan",
  "pricing.modal.upfront": "Dibayar tahunan di muka",
  "pricing.modal.trialEnds": "Masa coba tetap berakhir pada tanggal semula.",
  "pricing.modal.activate": "Aktifkan paket",
  "pricing.modal.activating": "Mengaktifkan…",
  "pricing.modal.done": "{plan} kini aktif di akun Anda.",
  "pricing.modal.back": "Kembali ke ruang kerja",
  "pricing.modal.failed": "Paket belum bisa diubah. Coba lagi.",
  "pricing.signedIn":
    "Anda sudah masuk. Perubahan paket di sini disimulasikan dan gratis.",
  "plan.name.trial": "Coba Gratis",
  "plan.name.lite": "Advokat Lite",
  "plan.name.advokat": "Advokat Pro",
  "plan.name.kantor": "Kantor Hukum",
  "plan.name.lembaga": "Program Bantuan Hukum",
  "account.plan": "Paket",
  "account.simulated": "Tagihan simulasi",
  "account.hoursUsed": "Jam sidang bulan ini",
  "account.questionsUsed": "Pertanyaan AI bulan ini",
  "account.usageOf": "{used} dari {limit}",
  "account.overLimit": "Melebihi batas paket",
  "account.changePlan": "Ubah paket",
};
