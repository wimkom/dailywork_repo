import { NextRequest, NextResponse } from "next/server";

interface LogEntry {
  date: string;
  project?: string;
  description: string;
  status?: string;
  keywords?: string;
  file_name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { logs, title = "Laporan Aktivitas Harian" } = await req.json();

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data log untuk dirangkum." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Prepare log data text
    const logsText = logs
      .map(
        (l: LogEntry, i: number) =>
          `${i + 1}. [Tanggal: ${l.date}] [Proyek: ${l.project || "Umum"}] [Status: ${
            l.status === "done"
              ? "Selesai"
              : l.status === "in_progress"
              ? "Sedang Berjalan"
              : "Perlu Tindak Lanjut"
          }]\n   - Deskripsi: ${l.description}\n   - Tags: ${
            l.keywords || "-"
          }\n   - Dokumen: ${l.file_name || "-"}`
      )
      .join("\n\n");

    // If Gemini API Key is configured, use Gemini to generate an executive report
    if (apiKey) {
      const prompt = `Anda adalah asisten manajemen proyek profesional. Buatkan ringkasan eksekutif (Executive Work Summary) yang formal, rapi, dan mudah dibaca oleh atasan/manajemen berdasarkan daftar log aktivitas kerja berikut:\n\n${logsText}\n\nFormat output harus dalam Bahasa Indonesia yang profesional dengan struktur berikut:\n1. 📋 RINGKASAN EKSEKUTIF (1-2 paragraf singkat)\n2. 🏆 PENCAPAIAN UTAMA & PEKERJAAN SELESAI (poin-poin berbasis proyek)\n3. ⏳ PEKERJAAN BERJALAN & TINDAK LANJUT (hal yang masih butuh monitoring/tindak lanjut)\n4. 📁 DOKUMEN ARSIP PENTING (daftar dokumen yang terlampir dan relevansinya)\n5. 💡 CATATAN / REKOMENDASI (jika ada)`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
            },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const aiText =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText) {
          return NextResponse.json({ summary: aiText, isAi: true });
        }
      }
    }

    // Fallback: Smart Programmatic Structured Summary if no API key is provided
    const totalLogs = logs.length;
    const completedCount = logs.filter((l: LogEntry) => l.status === "done").length;
    const inProgressCount = logs.filter(
      (l: LogEntry) => l.status === "in_progress"
    ).length;
    const todoCount = logs.filter((l: LogEntry) => l.status === "todo").length;

    // Group by project
    const projectsMap: { [key: string]: LogEntry[] } = {};
    logs.forEach((l: LogEntry) => {
      const p = l.project || "Umum";
      if (!projectsMap[p]) projectsMap[p] = [];
      projectsMap[p].push(l);
    });

    let autoSummary = `📋 RINGKASAN EKSEKUTIF: ${title}\n`;
    autoSummary += `Tercatat total ${totalLogs} aktivitas kerja (${completedCount} tuntas, ${inProgressCount} sedang berjalan, ${todoCount} pending).\n\n`;

    autoSummary += `🏆 RINCIAN AKTIVITAS PER PROYEK:\n`;
    for (const [proj, pLogs] of Object.entries(projectsMap)) {
      autoSummary += `\n📌 [Proyek: ${proj}] (${pLogs.length} aktivitas)\n`;
      pLogs.forEach((pl) => {
        const statusBadge =
          pl.status === "done"
            ? "[SELESAI]"
            : pl.status === "in_progress"
            ? "[BERJALAN]"
            : "[TODO]";
        autoSummary += `  • (${pl.date}) ${statusBadge} ${pl.description}\n`;
        if (pl.file_name) {
          autoSummary += `    ↳ Lampiran: ${pl.file_name}\n`;
        }
      });
    }

    if (inProgressCount > 0 || todoCount > 0) {
      autoSummary += `\n⏳ AGENDA TINDAK LANJUT:\n`;
      logs
        .filter((l: LogEntry) => l.status !== "done")
        .forEach((l: LogEntry) => {
          autoSummary += `  • [${l.project || "Umum"}] ${l.description} (${l.date})\n`;
        });
    }

    return NextResponse.json({
      summary: autoSummary,
      isAi: false,
      note: !apiKey
        ? "Tips: Tambahkan GEMINI_API_KEY di Vercel/Environment Variables untuk ringkasan bertenaga AI penuh."
        : undefined,
    });
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Gagal membuat ringkasan log." },
      { status: 500 }
    );
  }
}
