"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  PlusCircle,
  FileText,
  Calendar,
  Tag,
  Download,
  Moon,
  Sun,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileSpreadsheet,
  FileCheck,
  FolderArchive,
  Sparkles,
  RefreshCw
} from "lucide-react";

interface DailyLog {
  id: number;
  created_at: string;
  date: string;
  description: string;
  keywords?: string;
  file_url?: string;
  file_name?: string;
  file_content?: string;
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"new" | "search">("new");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Logs State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Initialize theme from HTML class or localStorage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchLogs = async (query: string = "") => {
    setIsLoadingLogs(true);
    try {
      let supabaseQuery = supabase
        .from("daily_logs")
        .select("*")
        .order("date", { ascending: false });

      if (query.trim()) {
        const cleanQuery = query.trim();
        supabaseQuery = supabaseQuery.or(
          `description.ilike.%${cleanQuery}%,keywords.ilike.%${cleanQuery}%,file_content.ilike.%${cleanQuery}%,file_name.ilike.%${cleanQuery}%`
        );
      }

      const { data, error } = await supabaseQuery;
      if (error) {
        console.error("Error fetching logs:", error);
        showToast("Gagal memuat arsip data.", "error");
      } else {
        setLogs(data || []);
        if (!query.trim()) {
          setTotalCount(data?.length || 0);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast("Terjadi kendala jaringan.", "error");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch count on mount and logs when tab is 'search'
  useEffect(() => {
    fetchLogs(searchTerm);
  }, [activeTab]);

  // Extract all unique tags for quick filter chips
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    logs.forEach((log) => {
      if (log.keywords) {
        log.keywords
          .split(/[,#]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet).slice(0, 10);
  }, [logs]);

  // Filter logs by selected tag if set
  const displayedLogs = useMemo(() => {
    if (!selectedTag) return logs;
    return logs.filter((log) =>
      log.keywords?.toLowerCase().includes(selectedTag.toLowerCase())
    );
  }, [logs, selectedTag]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedTag(null);
    fetchLogs(searchTerm);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast("Deskripsi pekerjaan tidak boleh kosong.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileUrl = "";
      let fileName = "";
      let fileContent = "";

      if (file) {
        fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;

        // If it's a docx, extract content for deep search
        if (file.name.endsWith(".docx")) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/extract", {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              fileContent = data.text || "";
            }
          } catch (extractErr) {
            console.warn("Gagal mengekstrak teks docx:", extractErr);
          }
        }
      }

      // Insert to Supabase DB
      const { error: dbError } = await supabase.from("daily_logs").insert([
        {
          date,
          description: description.trim(),
          keywords: keywords.trim(),
          file_name: fileName,
          file_url: fileUrl,
          file_content: fileContent,
        },
      ]);

      if (dbError) throw dbError;

      showToast("Catatan harian berhasil disimpan ke arsip!", "success");

      // Reset form
      setDescription("");
      setKeywords("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTotalCount((prev) => prev + 1);
    } catch (error: any) {
      console.error(error);
      showToast(`Gagal menyimpan: ${error.message || "Terjadi kesalahan"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getCleanFileName = (fullName?: string) => {
    if (!fullName) return "Dokumen";
    return fullName.replace(/^\d+_/, "");
  };

  const getFileIcon = (name?: string) => {
    if (!name) return <FileText className="w-5 h-5 text-indigo-500" />;
    const lower = name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (lower.endsWith(".pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      return <FileCheck className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-indigo-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-200 selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-300">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-xl border border-white/20 dark:border-white/10 transition-all duration-300 bg-white/95 dark:bg-zinc-900/95">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header Bar */}
        <header className="flex items-center justify-between pb-8 mb-8 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Daily Work Repo
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                  Cloud Archive
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Log aktivitas harian & repositori arsip berkas kerja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all shadow-sm active:scale-95"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700" />
              )}
            </button>
          </div>
        </header>

        {/* Tab Navigation Segmented Control */}
        <div className="flex p-1.5 mb-8 rounded-2xl bg-slate-200/60 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 max-w-md mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "new"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Catat Log Baru
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === "search"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Search className="w-4 h-4" />
            Pencarian & Arsip
            {totalCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {totalCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: FORM INPUT LOG BARU */}
        {activeTab === "new" && (
          <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Formulir Log Harian
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Isi apa yang Anda selesaikan hari ini beserta file lampirannya.
                </p>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                <Sparkles className="w-3.5 h-3.5" /> Auto Deep Search
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Input with Quick Selectors */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Tanggal Pekerjaan
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full sm:w-64 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDate(new Date().toISOString().split("T")[0])}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setDate(yesterday.toISOString().split("T")[0]);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Deskripsi Pekerjaan
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-32 resize-none placeholder:text-slate-400"
                  placeholder="Contoh: Rapat koordinasi pembebasan lahan dengan tim teknis, menyelesaikan draf laporan progress minggu ke-3 jalan tol..."
                  required
                />
              </div>

              {/* Tags / Keywords Input */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  Kata Kunci / Tags (Opsional)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
                  placeholder="Contoh: Ganti Rugi, PPK Yasa, Laporan, Tol Probowangi (pisahkan dengan koma)"
                />
                {keywords.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {keywords
                      .split(/[,#]/)
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100/80 dark:border-indigo-900/40"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* File Attachment Drag & Drop Zone */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-500" />
                  Lampirkan File Dokumen (Opsional)
                </label>

                {!file ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/60 dark:hover:bg-slate-900/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                      className="hidden"
                      accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Klik atau seret file ke sini untuk mengunggah
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Mendukung .docx (isi teks otomatis dapat dicari), .pdf, .xlsx, .csv
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                        {getFileIcon(file.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB &bull; Siap diunggah
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan ke Cloud...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Simpan Log Pekerjaan
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: PENCARIAN & ARSIP */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Bar Box */}
            <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm backdrop-blur-xl">
              <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari kata kunci, topik, no surat, nama dokumen..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        fetchLogs("");
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-5 sm:px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4 hidden sm:inline" />
                  Cari
                </button>
              </form>

              {/* Tag Quick Filters */}
              {availableTags.length > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto pb-1">
                  <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1 font-medium">
                    <Tag className="w-3 h-3" /> Filter Tag:
                  </span>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 ${
                        selectedTag === tag
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                  {selectedTag && (
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="text-xs text-rose-500 hover:underline shrink-0 ml-1 font-medium"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Status Header */}
            <div className="flex items-center justify-between px-2">
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {isLoadingLogs ? (
                  "Mencari data arsip..."
                ) : (
                  <>
                    Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{displayedLogs.length}</span> log aktivitas
                    {searchTerm && (
                      <> untuk kata kunci <span className="font-semibold text-indigo-600 dark:text-indigo-400">&ldquo;{searchTerm}&rdquo;</span></>
                    )}
                    {selectedTag && (
                      <> dengan tag <span className="font-semibold text-indigo-600 dark:text-indigo-400">#{selectedTag}</span></>
                    )}
                  </>
                )}
              </p>
              <button
                onClick={() => fetchLogs(searchTerm)}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {isLoadingLogs ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Memuat arsip...</p>
                </div>
              ) : displayedLogs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Tidak ada catatan ditemukan
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                    {searchTerm || selectedTag
                      ? "Coba gunakan kata kunci pencarian yang lain atau hapus filter tag."
                      : "Belum ada catatan aktivitas yang tersimpan di repositori Anda."}
                  </p>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Buat Log Pertama
                  </button>
                </div>
              ) : (
                displayedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    {/* Log Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {formatDateIndo(log.date)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-normal leading-relaxed whitespace-pre-wrap mb-4">
                      {log.description}
                    </p>

                    {/* Keywords Tag Badges */}
                    {log.keywords && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {log.keywords
                          .split(/[,#]/)
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((kw, i) => (
                            <span
                              key={i}
                              onClick={() => handleTagClick(kw)}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                            >
                              #{kw}
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Attached File Download Button & Info */}
                    {log.file_url && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {getFileIcon(log.file_name)}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-xs sm:max-w-md">
                            {getCleanFileName(log.file_name)}
                          </span>
                        </div>
                        <a
                          href={log.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/50 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh Berkas
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
