import React, { useMemo, useRef, useState, useEffect } from "react";

import {
  ResponsiveContainer,
  LineChart as InflasiChart,
  Line as InflasiLine,
  XAxis,
  YAxis,
  Tooltip as InflasiTooltip,
} from "recharts";

/* =========================================================
   RUPACAYA — OPSI IPS-Ekonomi (FINAL • single-file • no deps)
   Fitur kunci (semua inline):
   - 5 Langkah: Intro → Profil → Instrumen → Angka → Hasil & Dampak
   - Profil (nama/usia/pekerjaan) + pesan usia personal
   - Info instrumen detail (definisi, korelasi, tips)
   - Input angka mulus (sanitizer onlyDigits) + preset
   - Hasil 3 skenario + indikator vs inflasi
   - What-If : Inflasi+1%, BI-0.25 pp, IHSG+5%
   - Dampak nasional realistis (tanpa cap kaku 10%), line chart korelasi (SVG)
   - FAQ ekonomi + Kamus mini (BI Rate, IHSG, LPS, OJK, Annualized, Inflasi)
   - Download TXT memuat profil + sumber resmi (BI, OJK, IDX, BPS)
   ========================================================= */

/* ============ Helpers ============ */
const fmtRp = (n) =>
  isNaN(n) ? "-" : "Rp " + Math.round(Number(n)).toLocaleString("id-ID");
const pct = (x, d = 2) =>
  isNaN(x) || x === Infinity || x === -Infinity ? "-" : x.toFixed(d) + " %";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const onlyDigits = (s) => (s ?? "").toString().replace(/[^\d]/g, "");
const niceYears = (months) => {
  const m = Number(months || 0);
  if (m < 12) return `${m} bulan`;
  const th = Math.floor(m / 12);
  const sisa = m % 12;
  return `${m} bulan (≈ ${th} tahun${sisa ? " " + sisa + " bulan" : ""})`;
};

/* ============ UI primitives (inline style supaya aman) ============ */
const Wrap = ({ children }) => (
  <div
    style={{
      padding: 20,
      fontFamily:
        "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      maxWidth: 1100,
      margin: "0 auto",
      color: "#0f172a",
      background: "#f8fafc",
    }}
  >
    {children}
  </div>
);
const Row = ({ children, gap = 12, wrap = true, align = "stretch" }) => (
  <div
    style={{
      display: "flex",
      gap,
      flexWrap: wrap ? "wrap" : "nowrap",
      alignItems: align,
    }}
  >
    {children}
  </div>
);
const Box = ({ children, style }) => (
  <div
    style={{
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 16,
      padding: 16,
      marginTop: 14,
      boxShadow: "0 1px 0 rgba(15,23,42,.03)",
      ...style,
    }}
  >
    {children}
  </div>
);
const Card = ({ children, style }) => (
  <div
    style={{
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 14,
      ...style,
    }}
  >
    {children}
  </div>
);
const Tips = ({ children }) => (
  <div
    style={{
      background: "#fef3c7",
      color: "#78350f",
      border: "1px solid #fde68a",
      borderRadius: 10,
      padding: "8px 12px",
    }}
  >
    {children}
  </div>
);
const Badge = ({ children, bg = "#e5e7eb", color = "#111827" }) => (
  <span
    style={{
      background: bg,
      color,
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 12,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);
const BtnPrimary = ({ children, style, ...props }) => (
  <button
    {...props}
    style={{
      background: "linear-gradient(135deg,#2563eb,#7c3aed)",
      color: "#fff",
      border: "none",
      padding: "12px 18px",
      borderRadius: 12,
      cursor: "pointer",
      boxShadow: "0 6px 20px rgba(37,99,235,.25)",
      ...style,
    }}
  >
    {children}
  </button>
);
const Btn = ({ children, style, ...props }) => (
  <button
    {...props}
    style={{
      background: "#e5e7eb",
      color: "#111827",
      border: "none",
      padding: "10px 14px",
      borderRadius: 10,
      cursor: "pointer",
      ...style,
    }}
  >
    {children}
  </button>
);
const Pill = ({ children, active = false, style, ...props }) => (
  <button
    {...props}
    style={{
      background: active ? "#0ea5e9" : "#e5e7eb",
      color: active ? "#fff" : "#111827",
      border: "none",
      borderRadius: 999,
      padding: "8px 12px",
      cursor: "pointer",
      ...style,
    }}
  >
    {children}
  </button>
);

/* Accordion sederhana (FAQ/Kamus) */
const Accordion = ({ items }) => {
  const [open, setOpen] = useState(null);
  return (
    <div>
      {items.map((it, i) => (
        <Card key={i} style={{ marginTop: 10 }}>
          <div
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
              alignItems: "center",
            }}
          >
            <h4 style={{ margin: 0 }}>{it.title}</h4>
            <span style={{ fontSize: 18, color: "#475569" }}>
              {open === i ? "−" : "+"}
            </span>
          </div>
          {open === i && (
            <div style={{ marginTop: 10, color: "#374151", lineHeight: 1.6 }}>
              {it.content}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

/* ============ SVG Line Chart (korelasi) ============ */
/* kita gambar garis sederhana: x=jumlah investor (skala), y=estimasi dampak IHSG (%) */
function LineChart({
  width = 520,
  height = 160,
  points = [],
  color = "#2563eb",
}) {
  const pad = 24;
  const W = width - pad * 2;
  const H = height - pad * 2;

  if (!points.length) {
    return (
      <div style={{ fontSize: 12, color: "#64748b", padding: 8 }}>
        (Grafik akan muncul setelah input terisi)
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0; // mulai dari 0 biar mudah dibaca
  const maxY = Math.max(...ys, 1);

  const sx = (x) => pad + ((x - minX) / (maxX - minX || 1)) * W;
  const sy = (y) => height - pad - ((y - minY) / (maxY - minY || 1)) * H;

  let d = "";
  points.forEach((p, i) => {
    const X = sx(p.x);
    const Y = sy(p.y);
    d += i === 0 ? `M ${X} ${Y}` : ` L ${X} ${Y}`;
  });

  // grid horizontal sederhana (3 garis)
  const grid = [0, 0.5, 1].map((t) => {
    const Y = sy(minY + t * (maxY - minY));
    return (
      <line
        key={t}
        x1={pad}
        x2={width - pad}
        y1={Y}
        y2={Y}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  });

  return (
    <svg width={width} height={height}>
      {/* axes */}
      <line x1={pad} x2={pad} y1={pad} y2={height - pad} stroke="#94a3b8" />
      <line
        x1={pad}
        x2={width - pad}
        y1={height - pad}
        y2={height - pad}
        stroke="#94a3b8"
      />
      {grid}
      {/* path */}
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" />
      {/* last dot */}
      {points.length ? (
        <circle
          cx={sx(points[points.length - 1].x)}
          cy={sy(points[points.length - 1].y)}
          r="3.5"
          fill={color}
        />
      ) : null}
      {/* labels (min/max Y) */}
      <text
        x={pad - 8}
        y={sy(minY)}
        textAnchor="end"
        fontSize="10"
        fill="#64748b"
      >
        {pct(minY, 0)}
      </text>
      <text
        x={pad - 8}
        y={sy(maxY)}
        textAnchor="end"
        fontSize="10"
        fill="#64748b"
      >
        {pct(maxY, 0)}
      </text>
    </svg>
  );
}

/* ============ App ============ */
export default function App() {
  const [showInfo, setShowInfo] = useState(false); // <-- Tambah ini di DALAM App()

  /* -------- NAV -------- */
  const [step, setStep] = useState(1);

  /* -------- Profil -------- */
  const [nama, setNama] = useState("");
  const [usia, setUsia] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");

  const pesanUsia = useMemo(() => {
    const u = Number(usia || 0);
    if (!u) return "";
    if (u < 18) return "🚀 Start paling awal—biasakan nabung & belajar dasar.";
    if (u < 25)
      return "🌱 Waktu ada di pihakmu Investor Muda! Mulai dengan DCA kecil & kuncinya adalah konsisten.";
    if (u < 35)
      return "⚖️ Gabungkan pertumbuhan & stabilitas. Asah Pengalamanmu!";
    if (u < 50)
      return "🏡 Seimbangkan growth & proteksi keluarga! dan Review secara berkala.";
    if (u < 60)
      return "🛡️ Prioritaskan kelestarian modal! Naikkan porsi stabil.";
    return "🌳 Pengalamanmu adalah kekuatan! fokus pada strategi dan kenyamanan.";
  }, [usia]);

  /* -------- Data makro (Sept 2025) -------- */
  const macro = {
    IHSG: 8080.75,
    hargaDolar: 16656,
    inflasiTahunan: 2.65, // %
    biRate: 4.75, // %
    hargaEmas: 2142000, // Rp/gram (ilustratif)
    trxHarianBEI: 25_020_000_000_000, // Rp
    sumber: [
      "BI (BI-Rate & inflasi)",
      "OJK/IDX (IHSG & statistik investor)",
      "BPS (indikator makro)",
    ],
  };

  /* -------- Instrumen -------- */
  const infoJenis = {
    saham: {
      icon: "📈",
      title: "Saham",
      risk: "Tinggi",
      definisi:
        "Bukti kepemilikan perusahaan. Keuntungan dari kenaikan harga (capital gain) dan dividen (jika dibagikan).",
      bagaimana:
        "Beli di harga P₀, jual di Pₜ → selisihnya jadi cuan/rugi. Harga dipengaruhi kinerja emiten, suku bunga, sentimen global, dan kurs.",
      pengaruh: [
        "BI Rate turun → discount rate turun → valuasi relatif naik",
        "Inflasi stabil → daya beli & laba emiten lebih terjaga",
        "Sentimen global & aliran dana asing",
      ],
      plus: [
        "Potensi return jangka panjang tertinggi",
        "Likuiditas tinggi (emiten besar/blue chip)",
      ],
      minus: [
        "Volatilitas tinggi (naik-turun tajam)",
        "Butuh disiplin & literasi",
      ],
      tips: "Mulai dari indeks/blue chip; hindari FOMO; pakai DCA.",
      contoh:
        "Indeks Harga Saham Gabungan (IHSG) menguat ke 8.080,75 poin, naik sekitar 1,06% dibanding penutupan sebelumnya.",
    },
    obligasi: {
      icon: "💵",
      title: "Obligasi",
      risk: "Menengah",
      definisi:
        "Surat utang pemerintah/perusahaan. Investor menerima kupon berkala hingga jatuh tempo; harga bisa naik-turun.",
      bagaimana:
        "Nilai wajar sangat dipengaruhi suku bunga. Saat bunga turun, harga obligasi cenderung naik.",
      pengaruh: [
        "BI Rate turun → kupon relatif menarik → harga naik",
        "Inflasi terlalu tinggi → bunga naik → harga turun",
      ],
      plus: ["Arus kas stabil", "Risiko moderat (terutama SBN)"],
      minus: ["Harga sensitif terhadap kenaikan suku bunga"],
      tips: "SBN ritel (ORI/SBR) cocok pemula, pahami tenor & kupon.",
      contoh:
        "Yield obligasi pemerintah tenor 10 tahun Indonesia sekitar 6,75% per tahun.",
    },
    deposito: {
      icon: "🏦",
      title: "Deposito",
      risk: "Rendah",
      definisi:
        "Tabungan berjangka dengan bunga tetap; cair saat jatuh tempo. Dijamin LPS (hingga batas tertentu).",
      bagaimana:
        "Cocok untuk dana darurat. Return biasanya di bawah aset berisiko.",
      pengaruh: [
        "BI Rate naik → bunga deposito naik",
        "Inflasi tinggi → return riil bisa tergerus",
      ],
      plus: ["Sangat aman", "Mudah dipahami"],
      minus: ["Return kecil; sering kalah inflasi"],
      tips: "Bandingkan bunga antar bank; perhatikan penalti pencairan.",
      contoh:
        "Suku bunga deposito berjangka di Indonesia berkisar 2,25% – 4,75% per tahun, tergantung bank, tenor, dan jumlah setoran.",
    },
    emas: {
      icon: "🥇",
      title: "Emas",
      risk: "Menengah",
      definisi:
        "Aset lindung nilai (safe haven). Harga terpengaruh emas dunia & kurs rupiah.",
      bagaimana:
        "Tidak memberi arus kas; lebih ke penyimpan nilai dan diversifikasi.",

      pengaruh: [
        "Inflasi & ketidakpastian naik → emas menarik",
        "Penguatan rupiah → harga emas rupiah bisa turun",
      ],
      plus: ["Tahan inflasi & krisis", "Diversifikasi portofolio"],
      minus: ["Bisa sideways lama; spread beli-jual"],
      tips: "Porsi 10–20% portofolio; beli berkala; simpan bersertifikat.",
      contoh:
        "Informasi harga emas hari ini (per gram) di Indonesia: Rp 2.142.000/gram (Emas batangan Logam Mulia – Antam)",
    },
    reksadana: {
      icon: "📊",
      title: "Reksadana",
      risk: "Tinggi",
      definisi:
        "Wadah kolektif yang dikelola Manajer Investasi; aset bisa saham/obligasi/pasar uang. Diversifikasi otomatis.",
      bagaimana:
        "Cocok pemula; pahami prospektus dan jenis RD (pasar uang, pendapatan tetap, campuran, saham).",
      pengaruh: [
        "Dipengaruhi aset dasar (saham/obligasi) & biaya",
        "Kondisi pasar & performa Manajer Investasi",
      ],
      plus: ["Praktis untuk pemula", "Minimum kecil, auto-diversifikasi"],
      minus: ["Ada biaya; tergantung kinerja MI"],
      tips: "Pilih indeks/biaya rendah untuk jangka panjang.",
      contoh:
        "Nilai Aktiva Bersih (NAB) rata-rata reksa dana pasar uang di Indonesia per 23 September 2025 tercatat sekitar Rp 1.450 – 1.600 per unit (tergantung produk dan manajer investasi).",
    },
  };

  /* -------- Input utama -------- */
  const [investment, setInvestment] = useState("");
  const [modalStr, setModalStr] = useState(""); // pakai string biar sanitizer mulus
  const [monthsStr, setMonthsStr] = useState("");
  const [investorsStr, setInvestorsStr] = useState("18000000"); // default 18 juta SID (OJK/IDX 2025)

  const modal = Number(onlyDigits(modalStr) || 0);
  const months = Number(onlyDigits(monthsStr) || 0);
  const investors = Number(onlyDigits(investorsStr) || 0);
  const gramEmas = modal / macro.hargaEmas;
  const rateDolar = modal / macro.hargaDolar;

  /* -------- Base rates (per bulan, edukatif realistis) -------- */
  const base = {
    saham: { opt: 0.015, mod: 0.008, pes: -0.01 },
    obligasi: { opt: 0.007, mod: 0.004, pes: -0.003 },
    deposito: { opt: 0.004, mod: 0.003, pes: 0.002 },
    emas: { opt: 0.006, mod: 0.004, pes: 0.0002 },
    reksadana: { opt: 0.012, mod: 0.006, pes: -0.007 },
  };

  /* -------- What-If (HARUS di bawah hasil) -------- */
  const [adj, setAdj] = useState({
    inflasiUp: false,
    biDown: false,
    ihsgUp: false,
  });

  function adjustedRatesFor(type) {
    const b = base[type];
    if (!b) return null;
    let d = 0;
    if (adj.inflasiUp) {
      if (type === "saham") d -= 0.002;
      if (type === "obligasi") d -= 0.001;
      if (type === "deposito") d += 0.0005;
      if (type === "emas") d += 0.001;
      if (type === "reksadana") d -= 0.001;
    }
    if (adj.biDown) {
      if (type === "saham") d += 0.0015;
      if (type === "obligasi") d += 0.001;
      if (type === "deposito") d -= 0.0004;
      if (type === "emas") d += 0.0002;
      if (type === "reksadana") d += 0.001;
    }
    if (adj.ihsgUp) {
      if (type === "saham") d += 0.002;
      if (type === "reksadana") d += 0.0015;
      if (type === "emas") d -= 0.0005;
    }
    return {
      opt: b.opt + d,
      mod: b.mod + d,
      pes: b.pes + d * 0.5, // pesimis tidak naik sebanyak optimis
    };
  }

  /* -------- Hitung hasil -------- */
  const [result, setResult] = useState(null);
  const [impact, setImpact] = useState(null);

  function calcAll() {
    const r = adjustedRatesFor(investment);
    if (!r || !modal || !months) return;

    const grow = (rate) => modal * Math.pow(1 + rate, months);
    const optV = grow(r.opt);
    const modV = grow(r.mod);
    const pesV = grow(r.pes);

    const monthlyModeratePct = (Math.pow(modV / modal, 1 / months) - 1) * 100;
    const annualModerate = (Math.pow(1 + r.mod, 12) - 1) * 100;

    setResult({
      optV,
      modV,
      pesV,
      monthlyModeratePct,
      annualModerate,
    });

    // Dampak nasional — lebih realistis (bukan cap kaku 10%)
    const totalDana = investors * modal;
    // Rasionalisasi: misal “elastisitas likuiditas terhadap pergerakan harian” ~ 8% * (rasio total dana / transaksi harian)
    // menghasilkan persentase harian indikatif (bukan jaminan pergerakan literal indeks).
    const impactPct = 8 * (totalDana / macro.trxHarianBEI); // hasil dalam 0,0%
    setImpact({
      totalDana,
      impactPct, // bisa > 20% jika input ekstrem; akan dijelaskan sebagai ilustrasi, bukan prediksi literal
    });
  }

  /* -------- Progress bar -------- */
  const progress = (step / 5) * 100;

  /* -------- Validasi ringan -------- */
  const [errors, setErrors] = useState({});
  useEffect(() => {
    const e = {};
    if (step >= 2 && (nama.trim().length < 2 || nama.trim().length > 30)) {
      e.nama = "Nama 2–30 karakter.";
    }
    if (step >= 2 && usia && (Number(usia) < 10 || Number(usia) > 100)) {
      e.usia = "Usia 10–100.";
    }
    if (step >= 3 && !investment) e.investment = "Pilih instrumen dulu.";
    if (step >= 4) {
      if (!modal) e.modal = "Modal harus angka > 0";
      if (!months || months < 1 || months > 600)
        e.months = "Durasi 1–600 bulan";
      if (investorsStr && !investors) e.investors = "Investor harus angka > 0";
    }
    setErrors(e);
  }, [step, nama, usia, investment, modal, months, investors, investorsStr]);

  /* -------- Download TXT -------- */
  const aRef = useRef(null);
  function downloadTXT() {
    if (!result) return;
    const lines = [];
    lines.push("RUPACAYA — Ringkasan Simulasi");
    lines.push("====================================");
    lines.push(`Nama       : ${nama || "-"}`);
    lines.push(`Usia       : ${usia || "-"} tahun`);
    lines.push(`Pekerjaan  : ${pekerjaan || "-"}`);
    lines.push(`Pesan Usia : ${pesanUsia || "-"}`);
    lines.push("");
    lines.push(
      `Instrumen  : ${investment ? infoJenis[investment].title : "-"}`
    );
    lines.push(`Modal      : ${fmtRp(modal)}`);
    lines.push(`Durasi     : ${niceYears(months)}`);
    lines.push("");
    lines.push("Hasil 3 Skenario:");
    lines.push(`  Optimis  : ${fmtRp(result.optV)}`);
    lines.push(`  Moderat  : ${fmtRp(result.modV)}`);
    lines.push(`  Pesimis  : ${fmtRp(result.pesV)}`);
    lines.push(
      `  Moderat rata-rata/bulan: ${pct(
        result.monthlyModeratePct
      )} | Annualized: ${pct(result.annualModerate)} | Inflasi: ${pct(
        macro.inflasiTahunan
      )}`
    );
    lines.push("");
    lines.push("What-If:");
    lines.push(
      `  Inflasi +1%: ${adj.inflasiUp ? "ON" : "OFF"} | BI Rate −0,25%: ${
        adj.biDown ? "ON" : "OFF"
      } | IHSG +5%: ${adj.ihsgUp ? "ON" : "OFF"}`
    );
    lines.push("");
    lines.push("Dampak Nasional (ilustratif):");
    lines.push(
      `  Investor nasional: ${Number(investors).toLocaleString("id-ID")} orang`
    );
    lines.push(`  Total dana kolektif: ${fmtRp(impact?.totalDana || 0)}`);
    lines.push(
      `  Estimasi dorongan IHSG (indikatif harian): ${pct(
        impact?.impactPct || 0
      )}`
    );
    lines.push(
      "  Catatan: Ini ilustrasi likuiditas → bukan prediksi literal indeks."
    );
    lines.push("");
    lines.push("Strategi Praktis:");
    lines.push(
      "  - Profit: ambil 20–30%, sisanya dibiarkan tumbuh; diversifikasi."
    );
    lines.push(
      "  - Rugi: evaluasi fundamental; DCA jika prospek jangka panjang baik."
    );
    lines.push(
      "  - Selalu siapkan dana darurat; hindari utang konsumtif untuk investasi."
    );
    lines.push("");
    lines.push("Sumber data (rujukan resmi):");
    lines.push("  • Bank Indonesia (BI-Rate, Inflasi) — bi.go.id");
    lines.push(
      "  • OJK / IDX (IHSG, Statistik Investor) — ojk.go.id / idx.co.id"
    );
    lines.push("  • BPS (indikator makro) — bps.go.id");
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = aRef.current;
    a.href = url;
    a.download = "RUPACAYA_Ringkasan.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* -------- Grafik korelasi (points) -------- */
  // Kita buat 10 titik dari 10% sampai 100% jumlah investor yg diinput user, y = estimasi % dorongan (pakai formula sama, tapi skala investor)
  const corrPoints = useMemo(() => {
    if (!modal || !investors) return [];
    const n = 10;
    const pts = [];
    for (let i = 1; i <= n; i++) {
      const frac = i / n;
      const inv = investors * frac;
      const totalDana = inv * modal;
      const yPct = 8 * (totalDana / macro.trxHarianBEI); // % indikatif
      pts.push({ x: inv, y: Math.max(0, yPct) });
    }
    return pts;
  }, [modal, investors]);

  const modalValue = Number(modal); // langsung pakai Number
  const valOpt = Number(result?.optV ?? 0);
  const valMod = Number(result?.modV ?? 0);
  const valPes = Number(result?.pesV ?? 0);

  const pctOptimis =
    modalValue > 0 ? ((valOpt - modalValue) / modalValue) * 100 : 0;
  const pctModerat =
    modalValue > 0 ? ((valMod - modalValue) / modalValue) * 100 : 0;
  const pctPesimis =
    modalValue > 0 ? ((valPes - modalValue) / modalValue) * 100 : 0;

  // === Inflasi Impact Feature ===
  // Data dasar (edukasi)
  const [pdb, setPdb] = useState(20000); // PDB Indonesia (triliun rupiah) → contoh 20.000 (BPS 2025)
  const [porsiProduktif, setPorsiProduktif] = useState(0.7); // porsi dana masuk sektor produktif (default 70%)
  const k = 0.05; // koefisien sensitivitas (edukatif)
  const inflasiAwal = 2.65; // inflasi tahunan (%) → asumsi BPS 2025

  // ----- Hitung total dana investasi user -----
  // Ambil nilai modal dan jumlah investor yang sudah ada di aplikasi
  const modalNumber = Number(modalValue || 0); // modal user (rupiah)
  const investorCount = Number(investors || 0); // jumlah investor
  const totalDana = modalValue * investorCount; // total dana seluruh investor (rupiah)

  // ----- Konversi & rasio terhadap PDB -----
  const totalDanaTriliun = totalDana / 1_000_000_000_000; // ubah ke triliun
  const ratioDanaPdb = pdb > 0 ? totalDanaTriliun / pdb : 0;

  // ----- Hitung tambahan inflasi & simulasi -----
  const tambahanInflasi = k * (1 - porsiProduktif) * ratioDanaPdb * 100; // % tambahan
  const inflasiSimulasi = inflasiAwal + tambahanInflasi;

  /* -------- NAV handlers -------- */
  function next() {
    if (step === 1) return setStep(2);
    if (step === 2) {
      if (errors.nama || errors.usia)
        return alert("Periksa nama/usia kamu ya.");
      return setStep(3);
    }
    if (step === 3) {
      if (errors.investment) return alert("Pilih instrumen dulu.");
      return setStep(4);
    }
    if (step === 4) {
      if (errors.modal || errors.months || errors.investors) {
        return alert("Periksa input angka di langkah ini.");
      }
      calcAll();
      return setStep(5);
    }
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }
  function resetAll() {
    setStep(1);
    setNama("");
    setUsia("");
    setPekerjaan("");
    setInvestment("");
    setModalStr("");
    setMonthsStr("");
    setInvestorsStr("18000000");
    setAdj({ inflasiUp: false, biDown: false, ihsgUp: false });
    setResult(null);
    setImpact(null);
  }

  /* -------- Input styles -------- */
  const input = {
    marginLeft: 8,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    width: 260,
  };
  const col = { flex: 1, minWidth: 280 };

  /* ---------------- RENDER ---------------- */
  return (
    <Wrap>
      {/* Header + Progress */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          <span>Progress {step} / 5</span>
          <span>RUPACAYA — Rupiah & Kepercayaan Generasi Muda</span>
        </div>
        <div
          style={{
            height: 8,
            background: "#e5e7eb",
            borderRadius: 999,
            marginTop: 6,
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg,#2563eb,#06b6d4)",
              borderRadius: 999,
              transition: "width .3s ease",
            }}
          />
        </div>
      </div>

      {/* STEP 1 — Intro */}
      {step === 1 && (
        <>
          <Box
            style={{
              background: "linear-gradient(135deg,#eef2ff 0%,#ecfeff 100%)",
              borderColor: "#e5e7eb",
            }}
          >
            <h1 style={{ marginTop: 0 }}>🤔 Kenapasih Perlu Investasi?</h1>

            <div
              style={{
                marginTop: "12px",
                marginBottom: "20px",
                padding: "14px 18px",
                border: "1.5px solid #d0e3ff", // border biru muda
                borderRadius: "10px",
                background: "#f8fbff", // latar lembut
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                lineHeight: "1.3",

                maxWidth: "650px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px 0",
                  color: "#1a4b8c",
                  fontSize: "1.15em",
                }}
              >
                💡 KENAPA INVESTASI ITU PENTING?
              </h3>
              <p style={{ margin: 0, color: "#333" }}>
                Sebelum melihat angka-angka ekonomi, mari pahami konteksnya.
                Data berikut menunjukkan kondisi seperti inflasi, suku bunga,
                dan harga emas yang memengaruhi nilai uang.
              </p>
            </div>

            <Row>
              <Card style={col}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  📊 Data Ekonomi Indonesia (Sept 2025)
                </p>
                <ul style={{ margin: "8px 0 0 18px" }}>
                  <li>
                    IHSG: <b>{macro.IHSG.toLocaleString("id-ID")} poin</b>
                  </li>
                  <li>
                    Inflasi: <b>{macro.inflasiTahunan}%/tahun</b>
                  </li>
                  <li>
                    BI Rate: <b>{macro.biRate}%</b>
                  </li>
                  <li>
                    Rate USD: <b>{fmtRp(macro.hargaDolar)}/USD</b>
                  </li>
                  <li>
                    Transaksi Harian BEI: <b>{fmtRp(macro.trxHarianBEI)}</b>
                  </li>
                  <li>
                    Harga Emas: <b>{fmtRp(macro.hargaEmas)}/gram</b>
                  </li>
                </ul>
              </Card>
              <Card style={col}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  🧮 Perbandingan 1 Tahun (Rp1 juta)
                </p>
                <p style={{ marginTop: 8 }}>
                  Tabungan 0,5% → <b>Rp1.005.000</b>
                  <br />
                  Inflasi 2,8% → daya beli ± <b>Rp974.000</b>
                  <br />
                  Investasi moderat 8% → <b>Rp1.080.000</b> (menang inflasi)
                </p>
                <Tips>
                  🚀Target? RETURN INVESTASI KAMU &gt; INFLASI. menyebabkan
                  ekonomi negara membaik!
                </Tips>
              </Card>

              <div
                style={{
                  marginTop: "20px",
                  padding: "16px 20px",
                  border: "1.5px solid #bbdefb", // biru lembut
                  borderRadius: "10px",
                  background: "#e3f2fd", // latar biru muda
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  lineHeight: "1.4",
                  maxWidth: "650px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 10px 0",
                    color: "#1565c0",
                    fontSize: "1.2em",
                  }}
                >
                  📈 APA ARTINYA DATA DIATAS?
                </h3>
                <p style={{ marginBottom: "10px", color: "#333" }}>
                  Angka IHSG, inflasi, dan BI Rate menunjukkan bahwa
                  <b> inflasi terus menggerus daya beli</b>. Tabungan biasa
                  sering kalah cepat dengan kenaikan harga barang. Dengan
                  berinvestasi, kamu memberi uangmu kesempatan tumbuh lebih
                  cepat daripada inflasi dan 
                  <b>melindungi nilai</b> dan memperbesar aset masa depan.
                </p>
                <p style={{ margin: 0, color: "#333" }}>
                  Setiap rupiah yang diinvestasikan juga bukan cuma bikin uangmu
                  tumbuh, tapi juga jadi
                  <b> bahan bakar ekonomi Indonesia</b>. Dana investor dipakai
                  perusahaan untuk ekspansi, membuka lapangan kerja, dan
                  meningkatkan produksi. Saat modal dalam negeri makin besar,
                  ketergantungan pada investor asing berkurang, nilai rupiah
                  lebih kuat, dan pertumbuhan PDB bisa jadi lebih stabil.{" "}
                  <b>
                    Jadi, langkah investasimu, menentukan masa depan negaramu!.
                  </b>
                </p>

                <card>
                  {" "}
                  <p style={{ fontSize: "16px", lineHeight: "1.3" }}>
                    <b>RUPACAYA</b> adalah aplikasi simulasi investasi yang
                    dirancang supaya kamu bisa paham gimana keputusan
                    investasimu bisa berpengaruh ke ekonomi Indonesia secara
                    nyata dan logis. kamu bisa lihat secara langsung gimana uang
                    yang kamu tanam bisa ikut muter di sistem ekonomi negara,
                    nambah likuiditas, dan bantu stabilin nilai rupiah. Intinya,{" "}
                    <b>RUPACAYA</b> ngajarin kamu buat ngeliat investasi bukan
                    cuma soal cuan pribadi, tapi juga kontribusi buat ekonomi
                    bangsa. 🌍💸
                  </p>
                </card>
              </div>
            </Row>

            <div style={{ marginTop: 12 }}>
              <BtnPrimary onClick={next}>Yuk Investasi! ✈️ </BtnPrimary>
            </div>
          </Box>
        </>
      )}

      {/* STEP 2 — Profil */}
      {step === 2 && (
        <>
          <h1>👤 Profil Investor</h1>
          <Box>
            <Row>
              <label style={col}>
                Nama:<span style={{ visibility: "hidden" }}>opsional</span>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="contoh: Arfa"
                  style={input}
                  aria-invalid={!!errors.nama}
                />
                {errors.nama && (
                  <div style={{ color: "crimson", marginTop: 6 }}>
                    {errors.nama}
                  </div>
                )}
              </label>
              <label style={col}>
                Usia: <span style={{ visibility: "hidden" }}>opsional</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={usia}
                  onChange={(e) => setUsia(onlyDigits(e.target.value))}
                  placeholder="contoh: 17"
                  style={input}
                  aria-invalid={!!errors.usia}
                />
                {errors.usia && (
                  <div style={{ color: "crimson", marginTop: 6 }}>
                    {errors.usia}
                  </div>
                )}
              </label>
            </Row>
            <Row>
              <label style={col}>
                <br /> {/* baris kosong */}
                Status/Pekerjaan:
                <input
                  type="text"
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  placeholder="Pelajar / Karyawan / Wiraswasta / etc."
                  style={input}
                />
              </label>
              {usia ? (
                <div style={{ ...col }}>
                  <Tips>
                    <b>Investor Muda!</b> {pesanUsia}
                  </Tips>
                </div>
              ) : (
                <div style={{ ...col }}>
                  <Tips>
                    <em>
                      “Someone is sitting in the shade today because someone
                      planted a tree a long time ago.” – Warren Buffett”{" "}
                    </em>
                    <code>&lt;&gt;</code>
                  </Tips>
                </div>
              )}
            </Row>
          </Box>
          <div style={{ marginTop: 16 }}>
            <Btn onClick={back}>⬅️ Back</Btn>{" "}
            <BtnPrimary
              onClick={next}
              disabled={!!errors.nama || !!errors.usia || !nama}
            >
              Lanjut → Pilih Instrumen
            </BtnPrimary>
          </div>
        </>
      )}

      {/* STEP 3 — Instrumen */}
      {step === 3 && (
        <>
          <h1>📦 Pilih Jenis Investasi</h1>
          <Box>
            <Row align="center">
              <select
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                style={{ ...input, width: 320 }}
              >
                <option value="">-- pilih jenis --</option>
                {Object.keys(infoJenis).map((k) => (
                  <option key={k} value={k}>
                    {infoJenis[k].icon} {infoJenis[k].title.toUpperCase()}
                  </option>
                ))}
              </select>
              {investment && (
                <Badge
                  bg={
                    infoJenis[investment].risk === "Tinggi"
                      ? "#fee2e2"
                      : infoJenis[investment].risk === "Menengah"
                      ? "#e0e7ff"
                      : "#dcfce7"
                  }
                >
                  Risiko: {infoJenis[investment].risk}
                </Badge>
              )}
            </Row>

            {investment && (
              <Card style={{ marginTop: 12 }}>
                <h3 style={{ marginTop: 0 }}>
                  {infoJenis[investment].icon} {infoJenis[investment].title}
                </h3>
                <p style={{ marginTop: 6 }}>{infoJenis[investment].definisi}</p>
                <p style={{ marginTop: 6 }}>
                  {infoJenis[investment].bagaimana}
                </p>
                <Row>
                  <div style={col}>
                    <p style={{ margin: "6px 0 4px", fontWeight: 700 }}>
                      🔗 Faktor Pengaruh
                    </p>
                    <ul style={{ margin: "0 0 0 18px" }}>
                      {infoJenis[investment].pengaruh.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={col}>
                    <p style={{ margin: "6px 0 4px", fontWeight: 700 }}>
                      ⚖️ Plus/Minus & Tips
                    </p>
                    <ul style={{ margin: "0 0 0 18px" }}>
                      {infoJenis[investment].plus.map((t, i) => (
                        <li key={`p${i}`}>➕ {t}</li>
                      ))}
                      {infoJenis[investment].minus.map((t, i) => (
                        <li key={`m${i}`}>➖ {t}</li>
                      ))}
                    </ul>
                    <Tips style={{ marginTop: 8 }}>
                      💡 {infoJenis[investment].tips}
                    </Tips>
                  </div>
                </Row>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 10 }}>
                  Contoh: {infoJenis[investment].contoh}
                </p>
              </Card>
            )}
          </Box>

          <div style={{ marginTop: 16 }}>
            <Btn onClick={back}>⬅️ Back</Btn>{" "}
            <BtnPrimary onClick={next} disabled={!investment}>
              Lanjut → Masukkan Angka
            </BtnPrimary>
          </div>
        </>
      )}

      {/* STEP 4 — Angka */}
      {step === 4 && (
        <>
          <h1>🔢 Masukkan Data Investasi</h1>
          <Box>
            <Row>
              <label style={col}>
                Modal Awal (Rp):
                <input
                  type="text"
                  inputMode="numeric"
                  value={modalStr}
                  onChange={(e) => setModalStr(onlyDigits(e.target.value))}
                  placeholder="misal: 1000000"
                  style={input}
                  aria-invalid={!!errors.modal}
                />
                {errors.modal && (
                  <div style={{ color: "crimson", marginTop: 6 }}>
                    {errors.modal}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Btn
                    onClick={() =>
                      setModalStr((modal ? modal : 0 + 500000).toString())
                    }
                  >
                    + 500 rb
                  </Btn>{" "}
                  <Btn
                    onClick={() => setModalStr((modal + 1000000).toString())}
                  >
                    + 1 jt
                  </Btn>{" "}
                  <Btn
                    onClick={() => setModalStr((modal + 5000000).toString())}
                  >
                    + 5 jt
                  </Btn>
                </div>
              </label>
              <label style={col}>
                Durasi (bulan):
                <input
                  type="text"
                  inputMode="numeric"
                  value={monthsStr}
                  onChange={(e) =>
                    setMonthsStr(
                      onlyDigits(
                        clamp(Number(onlyDigits(e.target.value) || 0), 0, 600)
                      )
                    )
                  }
                  placeholder="misal: 24"
                  style={input}
                  aria-invalid={!!errors.months}
                />
                {errors.months && (
                  <div style={{ color: "crimson", marginTop: 6 }}>
                    {errors.months}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Btn onClick={() => setMonthsStr("6")}>6 bln</Btn>{" "}
                  <Btn onClick={() => setMonthsStr("12")}>12 bln</Btn>{" "}
                  <Btn onClick={() => setMonthsStr("36")}>36 bln</Btn>
                </div>
                <div style={{ marginTop: 8, fontSize: 14, color: "#475569" }}>
                  {months ? (
                    <>⏱️ {niceYears(months)}</>
                  ) : (
                    <>⏱️ Durasi akan dikonversi ke tahun.</>
                  )}
                </div>
              </label>
            </Row>

            <Row>
              <label style={col}>
                <br /> {/* baris kosong */}
                Jumlah Investor Nasional:
                <input
                  type="text"
                  inputMode="numeric"
                  value={investorsStr}
                  onChange={(e) => setInvestorsStr(onlyDigits(e.target.value))}
                  placeholder="default: 18000000"
                  style={input}
                  aria-invalid={!!errors.investors}
                />
                {errors.investors && (
                  <div style={{ color: "crimson", marginTop: 6 }}>
                    {errors.investors}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                  Default <b>18 juta SID</b> — rujukan OJK/IDX (± 2025). Biarkan
                  default bila belum yakin. 💡 Untuk update, cari:{" "}
                  <i>“jumlah investor pasar modal Indonesia OJK/IDX”</i>.
                </p>
              </label>
            </Row>
          </Box>

          <div style={{ marginTop: 16 }}>
            <Btn onClick={back}>⬅️ Back</Btn>{" "}
            <BtnPrimary
              onClick={() => {
                if (errors.modal || errors.months || errors.investors) return;
                calcAll();
                setStep(5);
              }}
              disabled={!modal || !months}
            >
              Lihat Hasil →
            </BtnPrimary>
          </div>
        </>
      )}

      {/* STEP 5 — Hasil & Dampak */}
      {step === 5 && result && impact && (
        <>
          <h1>📊 Simulasi Investasi Kamu!</h1>

          {/* Ringkasan Personal */}
          <Box>
            <Row>
              <div style={col}>
                <p style={{ margin: 0, fontSize: 23 }}>
                  👤 <b>{nama || "(tanpa nama)"}</b>
                </p>
                <p style={{ margin: "6px 0 12" }}>
                  Usia: <b>{usia || "-"}</b> • Status/Pekerjaan:{" "}
                  <b>{pekerjaan || "-"}</b>
                  <br />
                </p>
                {pesanUsia && (
                  <Tips style={{ marginTop: 15 }}>
                    <b>Investor Muda!</b> {pesanUsia}
                  </Tips>
                )}
              </div>
              <div style={col}>
                <p style={{ margin: 0, fontSize: 18 }}>
                  Instrumen:{" "}
                  <b>{investment ? infoJenis[investment].title : "-"}</b>
                </p>
                <p style={{ margin: "6px 0 12", fontSize: 18 }}>
                  Modal: <b>{fmtRp(modal)}</b>{" "}
                  <Badge bg="#eef2ff" color="#1e3a8a">
                    📈 IHSG {macro.IHSG.toLocaleString("id-ID")}
                  </Badge>
                </p>

                <Badge
                  bg="#f0f0f0" // warna kotak abu netral
                  color="#333" // teks lebih gelap biar kontras
                  style={{
                    padding: "px 8px",
                    borderRadius: "8px",
                    fontSize: "13px", // lebih kecil dari Modal
                    display: "inline-block",
                    marginTop: "4px",
                  }}
                >
                  💰 Emas ≈ <b>{gramEmas.toFixed(2)}</b> gram
                </Badge>

                <Badge
                  bg="#f0f0f0" // warna kotak abu netral
                  color="#123899" // teks lebih gelap biar kontras
                  style={{
                    padding: "13px 12px 12px",
                    borderRadius: "12px",
                    fontSize: "13px", // lebih kecil dari Modal
                    display: "inline-block",
                    marginTop: "4px",
                    gap: "5px",
                  }}
                >
                  💵 USD ≈ <b>{rateDolar.toFixed(2)}</b>
                </Badge>

                <p style={{ margin: "6px 0 0" }}>
                  Durasi: <b>{niceYears(months)}</b>
                </p>
                <p style={{ margin: "6px 0 0" }}>
                  Inflasi{" "}
                  <Badge bg="#fff7ed" color="#78350f">
                    {macro.inflasiTahunan}%/th
                  </Badge>{" "}
                  BI Rate{" "}
                  <Badge bg="#f0f9ff" color="#075985">
                    {macro.biRate}%
                  </Badge>
                </p>
              </div>
            </Row>
          </Box>

          {/* Hasil 3 Skenario */}
          <Card style={{ marginTop: 12 }}>
            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: 12,
                marginTop: 2,
              }}
            >
              🎯 Proyeksi Investasi{" "}
            </h3>

            <div
              style={{
                marginTop: "5px",
                padding: "14px 18px",
                border: "1.5px solid #e0e0e0",
                borderRadius: "10px",
                background: "#fafafa",
                lineHeight: "1.3",
                maxWidth: "720px",
                fontSize: "0.9em",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 1px 0",
                  fontSize: "0.9em",
                  color: "#333",
                  width: "100%",
                }}
              ></h3>
              <p style={{ margin: "0 0 6px 0", color: "#444" }}>
                ℹ️ Angka di bawah menunjukkan{" "}
                <b>perkiraan hasil investasi kamu </b>
                berdasarkan tiga skenario ekonomi:
                <b style={{ color: "#16a34a" }}> Optimis</b>,
                <b style={{ color: "#1e40af" }}> Moderat</b>, dan
                <b style={{ color: "#b91c1c" }}> Pesimis</b>.
              </p>
              <p style={{ margin: 0, color: "#444" }}>
                Nilai persentase menunjukkan{" "}
                <b>kenaikan atau penurunan modal awal</b>. Dengan memahami
                ketiga skenario, kamu bisa menilai{" "}
                <b>risiko dan potensi keuntungan </b>
                sebelum memutuskan berinvestasi.
              </p>
            </div>
            <ul style={{ lineHeight: 1.6 }}>
              <li style={{ color: "green" }}>
                <b>Optimis:</b> {fmtRp(result.optV)}{" "}
                <Badge bg="#dcfce7">Sentimen kuat</Badge>
              </li>
              <li style={{ color: "#1d4ed8" }}>
                <b>Moderat:</b> {fmtRp(result.modV)}{" "}
                <Badge bg="#e0e7ff">Ekonomi stabil</Badge>
              </li>
              <li style={{ color: "crimson" }}>
                <b>Pesimis:</b> {fmtRp(result.pesV)}{" "}
                <Badge bg="#fee2e2">Tekanan pasar</Badge>
              </li>
            </ul>
            <p>
              Moderat rata-rata/bulan: <b>{pct(result.monthlyModeratePct)}</b> •
              Annualized: <b>{pct(result.annualModerate)}</b> • Inflasi:{" "}
              <b>{pct(macro.inflasiTahunan)}</b>{" "}
              {result.annualModerate > macro.inflasiTahunan ? (
                <span style={{ color: "green" }}>→ menang inflasi ✅</span>
              ) : (
                <span style={{ color: "crimson" }}>→ di bawah inflasi ❌</span>
              )}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #86efac",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <h4 style={{ margin: 0, color: "green" }}>Optimis ✅</h4>
                <p style={{ margin: "6px 0 0" }}>
                  <b>{fmtRp(result.optV)}</b>
                </p>

                {modalValue > 0 && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.8em",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: pctOptimis >= 0 ? "#e8f8ee" : "#fff1f2",
                      color: pctOptimis >= 0 ? "#16a34a" : "#dc2626",
                      display: "inline-block",
                    }}
                  >
                    {pctOptimis >= 0 ? "+" : ""}
                    {pctOptimis.toFixed(2)}%
                  </span>
                )}

                <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                  Biasanya saat BI Rate turun / IHSG reli / sentimen global
                  positif.
                </p>
              </div>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #93c5fd",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <h4 style={{ margin: 0, color: "#1d4ed8" }}>Moderat 🔵</h4>
                <p style={{ margin: "6px 0 0" }}>
                  <b>{fmtRp(result.modV)}</b>
                </p>

                <span
                  style={{
                    marginLeft: "4px",
                    color: "#1e40af", // biru
                    fontSize: "0.8em", // lebih kecil dari Rp
                    fontWeight: 500,
                    background: "#e0f2fe", // latar biru muda
                    padding: "2px 4px",
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  {pctModerat >= 0 ? "+" : ""}
                  {pctModerat.toFixed(2)}%
                </span>

                <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                  Kondisi normal: inflasi terjaga & ekonomi tumbuh stabil.
                </p>
              </div>
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <h4 style={{ margin: 0, color: "crimson" }}>Pesimis ❌</h4>
                <p style={{ margin: "6px 0 0" }}>
                  <b>{fmtRp(result.pesV)}</b>
                </p>

                <span
                  style={{
                    marginLeft: "4px",
                    color: "#b91c1c", // merah
                    fontSize: "0.8em", // sedikit lebih kecil
                    fontWeight: 500,
                    background: "#fee2e2", // merah muda
                    padding: "2px 6px",
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  {pctPesimis >= 0 ? "+" : ""}
                  {pctPesimis.toFixed(2)}%
                </span>

                <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                  Capital outflow / gejolak global / pelemahan rupiah tajam.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                padding: "18px 22px",
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "#fafafa",
                fontSize: "0.80rem", // ukuran isi
                lineHeight: 1.6,
                width: "100%",
                boxSizing: "border-box",
                textAlign: "justify",
              }}
            >
              <div
                style={{
                  fontSize: "1.18rem",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                🔎 KETERANGAN & PENJELASAN
              </div>
              • <b>Moderat rata-rata/bulan</b>
              <br />
              Estimasi kenaikan nilai investasi <i>per bulan</i> berdasarkan
              skenario ekonomi normal (inflasi terjaga dan pertumbuhan stabil).
              <br />• <b>Annualized</b>
              <br />
              Proyeksi return tahunan jika pola kenaikan bulanan berlangsung
              konsisten selama 12 bulan.
              <br />• <b>Inflasi</b>
              <br />
              Menunjukkan tingkat kenaikan harga barang/jasa di Indonesia. Jika{" "}
              <i>return investasi</i> lebih tinggi daripada inflasi → disebut{" "}
              <i>menang inflasi</i> (daya beli tetap naik). Jika lebih rendah →{" "}
              <i>kalah inflasi</i> (nilai nominal naik tapi daya beli turun).
              <br />
              <br />
              💡 <i> Tips Membaca Data </i>
              <br />
              Bandingkan angka moderat/optimis/pesimis dengan inflasi untuk
              menilai apakah investasi cukup melawan kenaikan harga.
              <br />
              <p>
                (Semua angka disini dihitung dengan rumus yang berdasarkan
                dengan model, historis, dan spekulasi ekonomi global. Angka
                diatas tidak dapat dipastikan 100% akurat karena setiap
                karakteristik investasi berbeda-beda dan kondisi elemen, unsur,
                dan data yang bersifat dinamis)
              </p>
            </div>
          </Card>

          {/* WHAT-IF — *** di bawah hasil *** */}
          <Box style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>🧪 What-If!?</h3>
            <Row wrap>
              <Pill
                active={adj.inflasiUp}
                onClick={() =>
                  setAdj((a) => ({ ...a, inflasiUp: !a.inflasiUp }))
                }
              >
                {adj.inflasiUp ? "✓ Inflasi +1% (ON)" : "Inflasi +1%"}
              </Pill>
              <Pill
                active={adj.biDown}
                onClick={() => setAdj((a) => ({ ...a, biDown: !a.biDown }))}
              >
                {adj.biDown ? "✓ BI Rate −0,25% (ON)" : "BI Rate −0,25%"}
              </Pill>
              <Pill
                active={adj.ihsgUp}
                onClick={() => setAdj((a) => ({ ...a, ihsgUp: !a.ihsgUp }))}
              >
                {adj.ihsgUp ? "✓ IHSG +5% (ON)" : "IHSG +5%"}
              </Pill>
              <Pill
                style={{ background: "#ef4444", color: "#fff" }}
                onClick={() =>
                  setAdj({ inflasiUp: false, biDown: false, ihsgUp: false })
                }
              >
                Reset
              </Pill>
              <BtnPrimary style={{ marginLeft: 8 }} onClick={calcAll}>
                Terapkan ke hasil
              </BtnPrimary>
            </Row>
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}></p>
          </Box>

          {/* Strategi Praktis */}
          <Box style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>💡 STRATEGI BIAR KAMU CUAN! </h3>
            <ul style={{ lineHeight: 1.6, marginBottom: 0 }}>
              <li>
                <b>Kalau Profit:</b> realisasikan 20–30%, sisanya biarkan
                tumbuh; pertimbangkan diversifikasi ke obligasi/deposito.
              </li>
              <li>
                <b>Kalau Rugi:</b> jangan panik; cek fundamental. Lakukan DCA
                (beli bertahap), jika prospek jangka panjang masih masuk akal.
              </li>
              <li>
                <b>Kamu Harus Apa?</b> Utamakan dana darurat dulu, hindari utang
                konsumtif untuk investasi, konsisten top-up untuk memaksimalkan
                compounding.
              </li>
              <li>
                <b>Kenali Profil Risiko!</b> Jangan cuma ikut trend. Ukur
                seberapa siap kamu lihat portofolio kamu. Kalau mental belum
                siap, pilih instrumen aman (emas, deposito).
              </li>
              <li>
                <b>Perluas Ilmu Ekonomi!</b> Ikuti tren ekonomi, kebijakan BI,
                atau kebijakan pemerintah. Analisis dan pikirkan secara kritis
                akan dampaknya pada investasi kamu.
              </li>
            </ul>
          </Box>

          {/* ================= Rekomendasi Investasi ================= */}
          <Card
            style={{
              border: "1px solid #ccc",
              borderRadius: "16px",
              padding: "24px",
              background: "#ffffff",
              marginTop: "32px",
              marginBottom: "32px",
            }}
          >
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: "700",
                marginBottom: "19px",
                marginTop: 2,
              }}
            >
              🫵 REKOMENDASI BUAT KAMU!
            </h2>

            {/* Grid untuk 5 instrumen */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "20px",
              }}
            >
              {/* ===== 1. Emas ===== */}
              <Card
                style={{
                  border: "1px solid #f4c542", // kuning pastel
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#fffbea",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "20px",
                    marginTop: 2,
                  }}
                >
                  🏆 Emas
                </h3>
                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "8px",
                    marginTop: 2,
                  }}
                >
                  COCOK BUAT KAMU YANG:
                </h4>
                <ul
                  style={{
                    paddingLeft: "20px",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                    marginTop: 2,
                  }}
                >
                  <li>Tipe main aman, suka stabilitas, anti drama grafik.</li>
                  <li>
                    Punya tujuan jangka panjang (nikah, rumah, dana darurat).
                  </li>
                  <li>
                    {" "}
                    Pendapatan apa pun, modal kecil pun bisa mulai investasi
                    emas.
                  </li>
                </ul>

                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 2,
                  }}
                >
                  KAPAN HARUS?
                </h4>
                <p>
                  🟢 <b>Beli:</b> saat harga emas turun / rupiah lagi kuat.
                  <br />
                  🔴 <b>Jual:</b> pas inflasi tinggi atau harga emas dunia
                  rekor.
                </p>
              </Card>

              {/* ===== 2. Saham ===== */}
              <Card
                style={{
                  border: "1px solid #5ac75a", // hijau
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f3fff3",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "20px",
                    marginTop: 2,
                  }}
                >
                  🚀 Saham
                </h3>
                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "8px",
                    marginTop: 20,
                  }}
                >
                  COCOK BUAT KAMU YANG:
                </h4>
                <ul
                  style={{
                    paddingLeft: "20px",
                    lineHeight: 1.6,
                    marginBottom: "8px",
                    marginTop: 2,
                  }}
                >
                  <li>Suka tantangan & rajin update berita ekonomi.</li>
                  <li>Punya dana nganggur & siap jangka panjang.</li>
                  <li> Mental kuat lihat harga naik turun.</li>
                </ul>

                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 2,
                  }}
                >
                  KAPAN HARUS?
                </h4>
                <p>
                  🟢 <b>Beli:</b> pas IHSG koreksi besar & emiten fundamental
                  oke.
                  <br />
                  🔴 <b>Jual:</b> target cuan tercapai atau kinerja perusahaan
                  drop.
                </p>
              </Card>

              {/* ===== 3. Obligasi ===== */}
              <Card
                style={{
                  border: "1px solid #5ba6f0", // biru
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f2f8ff",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "20px",
                    marginTop: 2,
                  }}
                >
                  💵 Obligasi
                </h3>
                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 24,
                  }}
                >
                  COCOK BUAT KAMU YANG:
                </h4>
                <ul
                  style={{
                    paddingLeft: "20px",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                    marginTop: 6,
                  }}
                >
                  <li>Cari pendapatan rutin (kupon) dan stabil.</li>
                  <li> Cocok buat yang butuh cash-flow bulanan.</li>
                </ul>

                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 2,
                  }}
                >
                  KAPAN HARUS?
                </h4>
                <p>
                  🟢 <b>Beli:</b> ketika suku bunga tinggi (kupon menarik).
                  <br />
                  🔴 <b>Jual:</b> sebelum jatuh tempo jika butuh dana cepat.
                </p>
              </Card>

              {/* ===== 4. Deposito ===== */}
              <Card
                style={{
                  border: "1px solid #bfbfbf", // abu netral
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f9f9f9",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "8px",
                    marginTop: 2,
                  }}
                >
                  🏦 Deposito
                </h3>
                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 22,
                  }}
                >
                  COCOK BUAT KAMU YANG:
                </h4>
                <ul
                  style={{
                    paddingLeft: "20px",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                    marginTop: 6,
                  }}
                >
                  <li> Super konservatif, dana aman dijamin LPS.</li>
                  <li>
                    {" "}
                    Cocok buat parkir dana jangka pendek sambil dapat bunga
                    lebih dari tabungan.
                  </li>
                </ul>

                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 2,
                  }}
                >
                  KAPAN HARUS?
                </h4>
                <p>
                  🟢 <b>Perpanjang:</b> saat tren suku bunga tinggi.
                  <br />
                  🔴 <b>Tarik:</b> ketika butuh dana atau bunga terus menurun.
                </p>
              </Card>

              {/* ===== 5. Reksadana ===== */}
              <Card
                style={{
                  border: "1px solid #a478f5", // ungu
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f7f3ff",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.5rem",
                    marginBottom: "8px",
                    marginTop: 2,
                  }}
                >
                  📊 Reksadana
                </h3>
                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "8px",
                    marginTop: 22,
                  }}
                >
                  COCOK BUAT KAMU YANG:
                </h4>
                <ul
                  style={{
                    paddingLeft: "20px",
                    lineHeight: 1.6,
                    marginBottom: "12px",
                    marginTop: 6,
                  }}
                >
                  <li>
                    {" "}
                    Pemula yang pengen portofolio beragam tanpa ribet analisis.
                  </li>
                  <li> Punya jadwal sibuk & mau auto-diversifikasi.</li>
                </ul>

                <h4
                  style={{
                    fontSize: "1.9",
                    marginBottom: "2px",
                    marginTop: 2,
                  }}
                >
                  KAPAN HARUS?
                </h4>
                <p>
                  🟢 <b>Beli:</b> rutin tiap bulan (DCA) biar harga rata.
                  <br />
                  🔴 <b>Jual:</b> saat target return tercapai atau butuh dana.
                </p>
              </Card>
            </div>
          </Card>

          <div style={{ height: "40px" }} />

          {/* Dampak Nasional — diperluas + line chart */}
          <Card style={{ marginTop: 12 }}>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "1.5rem", // **lebih besar** dari sebelumnya
                fontWeight: "700",
              }}
            >
              🌏 Dampak Nasional
              <button
                onClick={() => setShowInfo(!showInfo)}
                style={{
                  marginLeft: "2px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "#2563EB", // biru info
                }}
                aria-label="Ringkasan cepat"
              >
                ℹ️
              </button>
            </h2>
            {showInfo && (
              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "12px",
                  padding: "12px 16px",
                  background: "#f9f9f9", // abu-abu muda lembut
                  borderRadius: "6px",
                  lineHeight: "1.1", // jarak antarbaris
                  fontSize: "0.8rem",
                  maxWidth: "600px", // batasi lebar supaya nyaman dibaca
                }}
              >
                🔥 <b>Fitur Unggulan!:</b> Bagian ini menampilkan{" "}
                <b>skala nasional</b>, jika semua investor menanam modal
                bersama. Angka di sini dipakai sebagai
                <b> ilustrasi potensi likuiditas</b>, bukan prediksi harga.
              </div>
            )}
            <p>
              Jika <b>{Number(investors).toLocaleString("id-ID")}</b> orang
              menanam <b>{fmtRp(modal)}</b> per orang, total dana ≈{" "}
              <b>{fmtRp(impact.totalDana)} </b>.
            </p>
            {/* Penjelasan singkat dampak dana ke pasar */}
            <div
              style={{
                border: "1px dashed #E5E7EB",
                background: "#FAFAFB",
                padding: "12px",
                borderRadius: "12px",
                margin: "8px 0 12px",
              }}
            >
              <div
                style={{
                  fontWeight: "800",
                  marginBottom: "6px",
                  color: "#0F172A",
                }}
              >
                🤔APA ARTINYA?
              </div>

              <p
                style={{
                  margin: "0 0 8px 0",
                  color: "#374151",
                  lineHeight: 1.4,
                }}
              >
                dana sebesar <b>{fmtRp(impact.totalDana)}</b> berarti ada uang
                baru yang siap <b>diperdagangkan</b> di bursa.
              </p>

              <Card
                style={{
                  backgroundColor: "#e3f2fd",
                  padding: "16px",
                  borderRadius: "12px",
                  marginTop: "8px",
                }}
              >
                🔎 <strong>PENJELASAN:</strong> <br />
                <i>{fmtRp(impact.totalDana)}</i> bisa dianggap sebagai{" "}
                <em>“tenaga baru”</em> yang masuk ke sistem keuangan nasional.
                Uang sebesar itu tidak diam, tapi berputar melalui berbagai
                instrumen seperti{" "}
                <strong>
                  saham, reksa dana, obligasi, dana deposito, maupun emas
                  digital
                </strong>{" "}
                yang tercatat dan diawasi lewat{" "}
                <strong>Bursa Efek Indonesia (BEI)</strong> atau lembaga
                keuangan resmi lainnya. Ketika masyarakat menanamkan uangnya,
                dana itu digunakan kembali oleh perusahaan atau pemerintah untuk
                proyek, ekspansi, atau pembiayaan, dan investor bisa memindahkan
                atau menariknya kapan saja. Karena terus berputar dan bekerja di
                pasar, dana <b>{fmtRp(impact.totalDana)}</b> itu disebut{" "}
                <em>“diperdagangkan.”</em>
              </Card>

              <br />

              <p
                style={{
                  margin: "0 0 8px 0",
                  color: "#374151",
                  lineHeight: 1.4,
                  marginBottom: 0.2,
                }}
              >
                Dampaknya:
              </p>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "#1F2937",
                  lineHeight: 1.55,
                }}
              >
                <li>
                  <b>Likuiditas naik</b> → <b>order beli</b> dan <b>jual</b>{" "}
                  jadi <b>lebih banyak</b>.
                </li>
                <li>
                  <b>Bid–ask spread</b> (selisih harga beli–jual) makin{" "}
                  <b>tipis</b> → harga makin wajar.
                </li>
                <li>
                  Transaksi <b>lebih cepat</b> dan biaya implisit{" "}
                  <b>lebih rendah</b>.
                </li>
              </ul>

              <div style={{ marginTop: 8, color: "#4B5563", lineHeight: 1.55 }}>
                <i>Analogi:</i> pasar seperti <b>bazar</b>. Makin banyak pembeli
                & penjual bawa uang, barang jadi <b>lebih mudah laku</b> dengan{" "}
                <b>harga wajar</b> → itulah <b>likuiditas</b>.
              </div>
            </div>

            <ul>
              <li>
                Estimasi dorongan likuiditas ke IHSG (indikatif harian):{" "}
                <b>{pct(impact.impactPct)}</b>. likuiditas bertambah → transaksi
                makin ramai.
              </li>
              <li>
                Likuiditas naik → biaya modal emiten turun → ekspansi &{" "}
                <b>lapangan kerja</b> berpotensi tumbuh.
              </li>
              <li>
                <b>Pajak</b> dari aktivitas pasar meningkat → ruang fiskal
                negara bertambah untuk{" "}
                <b>pendidikan, kesehatan, dan infrastruktur</b>.
              </li>
              <li>
                Dana domestik yang kuat mengurangi ketergantungan pada modal
                asing → <b>rupiah lebih stabil</b>.
              </li>
            </ul>

            {/* Line chart korelasi: jumlah investor (x) vs estimasi % dorongan (y) */}
            <div style={{ marginTop: 10 }}>
              <h4 style={{ margin: "0 0 6px" }}>Grafik korelasi:</h4>
              <p style={{ marginTop: 0, fontSize: 12, color: "#64748b" }}>
                X: jumlah investor (skala 10–100% dari input) • Y: estimasi
                dorongan IHSG (%).
              </p>
              <LineChart width={560} height={180} points={corrPoints} />
              <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Catatan: Perhitungan ini bukan proyeksi kenaikan indeks. Angka
                hanya menunjukkan perbandingan dana hipotetis. Kenaikan indeks
                IHSG bergantung pada banyak faktor (laba emiten, kebijakan suku
                bunga, arus modal asing, dll), sehingga tidak bisa dihitung
                langsung dari jumlah dana masuk.
              </p>
            </div>
          </Card>

          <div style={{ height: "40px" }} />

          <div
            style={{
              border: "1px solid #f0ad4e",
              background: "#fff",
              borderRadius: 9,
              padding: 20,
              marginTop: 24,
            }}
          >
            <h2 style={{ marginTop: 5 }}>
              💹 Dampak Investasi terhadap Inflasi
            </h2>

            {/* Input Data */}
            <label>
              📊 <b>PDB Indonesia (Triliun Rp)</b>
              <input
                type="number"
                value={pdb}
                onChange={(e) => setPdb(Number(e.target.value))}
                style={{
                  mmarginTop: 5,
                  arginLeft: 10,
                  padding: "4px 6px",
                  width: 90,
                }}
              />
            </label>
            <div style={{ fontSize: "0.65em", color: "#666", marginTop: 4 }}>
              💡Data PDB diambil dari <b>BPS</b>. Cari “PDB Indonesia BPS” di
              Google untuk update terbaru.
            </div>

            <div style={{ marginTop: 12 }}>
              ⚙️ <b>Porsi Dana Produktif (%)</b>
              <input
                type="number"
                value={porsiProduktif}
                onChange={(e) => setPorsiProduktif(Number(e.target.value))}
                style={{ marginLeft: 10, padding: "4px 6px", width: 60 }}
              />
              <div style={{ fontSize: "0.65em", color: "#666", marginTop: 4 }}>
                💡Semakin besar porsi produktif (misal untuk pabrik, riset,
                infrastruktur) → inflasi lebih terkendali.
              </div>
            </div>

            {/* Hasil Perhitungan */}
            {/* Box Inflasi Awal */}
            <div
              style={{
                border: "1px solid #cccc",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                marginTop: 18,
                background: "#fff",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              📊 Inflasi Awal (BPS): {inflasiAwal.toFixed(2)} %
            </div>

            {/* Box Tambahan + Simulasi */}
            <div
              style={{
                border: "2px solid #f0ad4e",
                borderRadius: 12,
                padding: "16px 20px",
                background: "#fff8f0",

                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#d9534f",
                  marginBottom: 8,
                }}
              >
                🔺 Tambahan Inflasi (Estimasi):{" "}
                {tambahanInflasi >= 0 ? "+" : ""}
                {tambahanInflasi.toFixed(2)} %
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.6rem",
                  color: "#5cb85c",
                }}
              >
                💥INFLASI: ≈ {inflasiSimulasi.toFixed(2)} %
              </div>
            </div>

            {/* Edukasi & Analogi */}
            <div style={{ fontSize: 16, marginTop: 20, lineHeight: 1.6 }}>
              <p>
                Perhitungan ini menghubungkan <b>total dana investasi</b> user
                dengan <b>PDB nasional</b>. Koefisien <b>k</b> (0.05) adalah
                angka sensitivitas yang menggambarkan seberapa besar tambahan
                inflasi jika porsi dana produktif lebih kecil.
              </p>

              <p
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                💡 <strong>RUMUS INFLASI SIMULATIF</strong>
                <br />
                Inflasi simulasi dihitung dengan cara{" "}
                <strong>inflasi awal</strong> dikurangi
                <strong> dampak investasi produktif</strong>, rumusnya adalah:{" "}
                <i>
                  Inflasi Simulasi = Inflasi Awal – <em>k</em> × (Dana Investasi
                  Produktif ÷ PDB).
                </i>
                <br />
                <br />• <strong>Inflasi Awal</strong>: misalnya 2,8% per tahun,
                data resmi bisa dilihat di <strong>BPS</strong>.<br />•{" "}
                <strong>k (koefisien sensitivitas)</strong>: contoh 0,05,
                menunjukkan seberapa besar dana produktif dapat menekan inflasi;
                angkanya biasanya diambil dari studi makro atau publikasi
                BPS/Bank Indonesia.
                <br />• <strong>Dana Investasi Produktif</strong>: bagian dari
                dana investasi user yang benar-benar masuk ke sektor riil.
                <br />• <strong>PDB Indonesia</strong>: nilai produk domestik
                bruto nasional, datanya juga tersedia di <strong>BPS</strong>.
                <br />
                <br />→ Semakin besar dana produktif dibanding PDB, semakin
                besar potensi inflasi turun karena produksi barang dan jasa
                meningkat.
              </p>

              <p>
                <b>📊 Logika sederhana:</b> semakin besar total investasi
                terhadap PDB, potensi tekanan inflasi bertambah. Tapi bila dana
                banyak disalurkan ke sektor produktif, peningkatan kapasitas
                produksi bisa menahan kenaikan harga.
              </p>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "#1F2937",
                  lineHeight: 1.55,
                }}
              >
                <li>
                  <b>Koefisien (k)</b> → Angka asumsi edukatif yang menunjukkan
                  sensitivitas tambahan inflasi jika porsi dana produktif kecil.
                  Nilai 0,05 dipilih agar simulasi terasa realistis (tambahan
                  inflasi biasanya ±0,1–0,3 % dari PDB) tetapi tetap aman untuk
                  edukasi.{" "}
                  <i>
                    k = 0,05 → parameter buatan yang diambil dari kisaran dampak
                    historis (berdasarkan PDB & inflasi BPS) agar simulasi
                    inflasi tambahan terasa masuk akal.
                  </i>{" "}
                  Ini bukan angka resmi, tapi contoh koefisien sensitivitas yang
                  bisa diubah jika ada data riset yang lebih spesifik.{" "}
                </li>
                <li>
                  <b>PDB (Produk Domestik Bruto)</b> → nilai semua barang & jasa
                  yang dihasilkan Indonesia dalam satu tahun. Bayangkan PDB
                  seperti <i>pasar raksasa</i>: semakin besar nilai
                  transaksinya, semakin besar pula kapasitas ekonomi.
                </li>
                <li>
                  <b>Porsi Dana Produktif (%) </b> → Persentase dana investasi
                  yang dialokasikan ke kegiatan 
                  <i>produktif</i> seperti pabrik, riset, infrastruktur, atau
                  usaha yang menciptakan lapangan kerja. Semakin besar porsinya,
                  inflasi cenderung lebih terkendali karena uang masuk ke sektor
                  riil, bukan hanya diparkir di aset pasif. Angka dapat
                  diestimasi dari data realisasi investasi BKPM (misal proporsi
                  Penanaman Modal Asing & Dalam Negeri yang masuk ke sektor
                  manufaktur/infrastruktur). Dapat dicari dengan kata kunci 
                  <i>“laporan realisasi investasi BKPM sektor”</i> di
                  Internet/BPS untuk referensi terkini.
                </li>
                <li>
                  <b>Korelasi Investasi & Inflasi</b> → semakin besar dana yang
                  masuk ke ekonomi domestik, uang beredar makin banyak. Jika
                  dana dipakai produktif, hasilnya adalah pertumbuhan ekonomi
                  sehat. Tetapi jika dana hanya memicu konsumsi cepat (misal
                  beli barang mewah), inflasi bisa naik.
                </li>
              </ul>
              <p>
                <i> Analogi:</i> Jika 10 juta orang masing-masing berinvestasi
                Rp20 juta, maka total dana ≈ Rp200 triliun. Jika 70% digunakan
                untuk pembangunan pabrik, efeknya lebih ke lapangan kerja →
                inflasi tetap terkendali. Jika hanya 20% yang produktif, dana
                besar berputar di pasar konsumsi → harga barang bisa melonjak.
              </p>
            </div>
          </div>

          <div style={{ height: "40px" }} />

          {/* FAQ Ekonomi */}
          <div style={{ marginTop: 16 }}>
            <h2>❓ FAQ </h2>
            <Accordion
              items={[
                {
                  title: "Kenapa inflasi mempengaruhi IHSG dan suku bunga?",
                  content:
                    "Inflasi naik → BI cenderung menaikkan suku bunga untuk menahan lonjakan harga. Suku bunga lebih tinggi meningkatkan biaya modal emiten (menekan valuasi), sementara deposito jadi relatif menarik. Jika inflasi terkendali, IHSG lebih mudah tumbuh.",
                },
                {
                  title: "Bagaimana BI Rate memengaruhi deposito & obligasi?",
                  content:
                    "BI Rate turun → bunga simpanan turun (deposito kurang menarik), harga obligasi cenderung naik karena kupon menjadi relatif lebih baik. Sebaliknya, BI Rate naik menekan harga obligasi.",
                },
                {
                  title: "Kenapa jumlah investor domestik penting bagi rupiah?",
                  content:
                    "Semakin banyak investor domestik, semakin stabil arus dana internal. Ketika sentimen global negatif, pasar tidak terlalu bergantung pada modal asing. Ini membantu stabilitas IHSG dan rupiah.",
                },
                {
                  title: "Apa kaitan likuiditas pasar dengan lapangan kerja?",
                  content:
                    "Likuiditas tinggi memudahkan perusahaan menerbitkan saham/obligasi dengan biaya lebih rendah. Dana ini dipakai untuk ekspansi bisnis dan merekrut tenaga kerja baru.",
                },
                {
                  title:
                    "Apa yang terjadi kepada ekonomi negara apabila problematika politik terus berlangsung?",
                  content:
                    "Bila terus terjadi problematika politik (kerusuhan, demo anarkis, korupsi, dsb.) maka ketidakpastian politik yang berkepanjangan membuat investor ragu, modal asing keluar (capital outflow), nilai mata uang melemah dan pertumbuhan ekonomi melambat karena dunia usaha menunda ekspansi dan perekrutan .",
                },
              ]}
            />
          </div>

          <div style={{ height: "40px" }} />

          {/* Kamus Mini */}
          <div style={{ marginTop: 16 }}>
            <h2>📚 Glosarium Ekonomi</h2>
            <Row>
              {[
                {
                  t: "Investasi",
                  c: "Adalah kegiatan menanamkan modal atau menempatkan sejumlah dana pada suatu aset, proyek, atau instrumen keuangan dengan tujuan memperoleh keuntungan (return) di masa depan",
                },
                {
                  t: "BI Rate",
                  c: "Suku bunga acuan Bank Indonesia. Mempengaruhi bunga pinjaman & simpanan, juga valuasi aset finansial.",
                },
                {
                  t: "IHSG",
                  c: "Indeks Harga Saham Gabungan (semua saham BEI). Indikator kesehatan pasar modal Indonesia.",
                },
                {
                  t: "LPS",
                  c: "Lembaga Penjamin Simpanan. Menjamin simpanan bank sampai batas tertentu per nasabah per bank.",
                },
                {
                  t: "OJK",
                  c: "Otoritas Jasa Keuangan. Mengatur dan mengawasi industri keuangan (bank, pasar modal, non-bank).",
                },
                {
                  t: "BPS",
                  c: "Badan Pusat Statistik. Lembaga pemerintah resmi di Indonesia yang bertugas mengumpulkan, mengolah, dan mempublikasikan data statistik nasional.",
                },
                {
                  t: "Annualized",
                  c: "Konversi return periodik (mis. bulanan) menjadi setara tahunan dengan efek majemuk.",
                },
                {
                  t: "Inflasi",
                  c: "Kenaikan harga barang/jasa secara umum. Jika return < inflasi, daya beli uang turun.",
                },
                {
                  t: "  Bursa/BEI",
                  c: "Bursa Efek Indonesia. Lembaga resmi tempat jual beli efek seperti saham, obligasi, dan reksadana terjadi, BEI berfungsi sebagai pasar besar tempat investor dan perusahaan bertemu untuk memperdagangkan surat berharga secara transparan dan diawasi pemerintah",
                },
                {
                  t: "Likuiditas",
                  c: "Kemudahan suatu aset untuk segera dicairkan menjadi uang tunai tanpa memengaruhi harganya secara signifikan. Semakin tinggi likuiditas, semakin cepat investor dapat menjual asetnya di pasar",
                },
                {
                  t: "DCA",
                  c: "Dolar Cost Averaging. Strategi Investasi dengan cara membeli secara rutin dalam jumlah tetap, tanpa peduli harga naik atau turun. Tujuannya meratakan harga beli sehingga risiko fluktuasi pasar menjadi lebih kecil.",
                },
                {
                  t: "Yield",
                  c: "Imbal hasil (return) yang diperoleh dari instrumen investasi obligasi atau instrumen pendapatan tetap, biasanya dalam bentuk persentase tahunan dari harga beli. Semakin tinggi yield, semakin besar pendapatan yang diterima investor.",
                },
                {
                  t: "PDB",
                  c: "Produk Domestik Bruto. Nilai seluruh barang dan jasa yang dihasilkan Indonesia dalam 1 tahun. Data resmi PDB bisa dilihat di BPS",
                },
                {
                  t: "Porsi Dana Produktif",
                  c: "Persentase dana yang dialokasikan ke sektor produktif (pabrik, riset, infrastruktur). Semakin besar porsi ini, inflasi tambahan semakin kecil karena dana digunakan untuk produksi barang/jasa",
                },
                {
                  t: "BKPM",
                  c: "Badan Koordinasi Penanaman Modal. Lembaga pemerintah yang mengelola dan melaporkan data resmi investasi di Indonesia (misalnya porsi Penanaman Modal Dalam Negeri/PMDN dan Penanaman Modal Asing/PMA)",
                },
              ].map((k, i) => (
                <Card key={i} style={{ flex: 1, minWidth: 220, marginTop: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>{k.t}</p>
                  <p style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                    {k.c}
                  </p>
                </Card>
              ))}
            </Row>
          </div>

          <div style={{ height: "40px" }} />

          {/* CTA Download + Navigasi */}
          <Card
            style={{
              marginTop: 16,
              background: "linear-gradient(135deg,#f0f9ff,#faf5ff)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>📥 AMANKAN RINGKASAN INVESTASIMU!</h3>
            <p style={{ marginTop: 0 }}>
              <i>
                {" "}
                An investment in knowledge pays the best interest.” – Benjamin
                Franklin{" "}
              </i>
            </p>
            <Row align="center" wrap={false}>
              <BtnPrimary onClick={downloadTXT}>⬇️ Download TXT</BtnPrimary>
              <a ref={aRef} style={{ display: "none" }} href="/" aria-hidden />
              <Btn style={{ marginLeft: 8 }} onClick={() => setStep(4)}>
                ⬅️ Kembali (ubah angka)
              </Btn>
              <Btn onClick={resetAll} style={{ marginLeft: 8 }}>
                🔄 Mulai Lagi
              </Btn>
            </Row>
            <p style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
              Sumber rujukan: Bank Indonesia (BI-Rate & Inflasi), OJK/IDX (IHSG
              & Statistik Investor), BPS (indikator makro).
            </p>
          </Card>
        </>
      )}

      {/* Footer */}
      <p
        style={{
          marginTop: 28,
          fontSize: 12,
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        RUPACAYA © 2025 • Olimpiade Penelitian Siswa Indonesia (OPSI 2025) oleh
        Arfa Altamis Darutomo dan Hanif Aulia Ramadhan
      </p>
    </Wrap>
  );
}
