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
  RefreshCw,
  HardDrive,
  Cloud,
  Copy,
  FolderOpen,
  HelpCircle,
  Check,
  Edit3,
  Trash2,
  BarChart3,
  Layers,
  ListTodo,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  FileCode,
  Share2
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
  project?: string;
  status?: "done" | "in_progress" | "todo" | string;
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"new" | "search" | "stats">("new");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Attachment Mode: 'local' | 'cloud' | 'none'
  const [attachmentMode, setAttachmentMode] = useState<"local" | "cloud" | "none">("local");

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [project, setProject] = useState("Umum");
  const [customProject, setCustomProject] = useState("");
  const [isCustomProject, setIsCustomProject] = useState(false);
  const [status, setStatus] = useState<"done" | "in_progress" | "todo">("done");

  // Local File State
  const [localPath, setLocalPath] = useState("");
  const [defaultFolder, setDefaultFolder] = useState("D:\\Kerjaan\\");
  const [showDefaultFolderInput, setShowDefaultFolderInput] = useState(false);
  const [localHelperFile, setLocalHelperFile] = useState<File | null>(null);

  // Cloud File State
  const [cloudFile, setCloudFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const cloudFileInputRef = useRef<HTMLInputElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals & Popups State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showHelperModal, setShowHelperModal] = useState(false);
  
  // Edit State
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI Summarizer State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiScope, setAiScope] = useState<"all" | "month" | "week" | "today">("all");
  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Initialize theme and settings from localStorage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    const savedFolder = localStorage.getItem("default_local_folder");
    if (savedFolder) {
      setDefaultFolder(savedFolder);
    }
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

  const handleSaveDefaultFolder = (folder: string) => {
    setDefaultFolder(folder);
    localStorage.setItem("default_local_folder", folder);
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
          `description.ilike.%${cleanQuery}%,keywords.ilike.%${cleanQuery}%,file_content.ilike.%${cleanQuery}%,file_name.ilike.%${cleanQuery}%,file_url.ilike.%${cleanQuery}%,project.ilike.%${cleanQuery}%`
        );
      }

      const { data, error } = await supabaseQuery;
      if (error) {
        // Fallback without project column if not created yet
        const retry = await supabase
          .from("daily_logs")
          .select("id, created_at, date, description, keywords, file_url, file_name, file_content")
          .order("date", { ascending: false });
        if (retry.data) {
          setLogs(retry.data);
          if (!query.trim()) setTotalCount(retry.data.length);
        } else {
          console.error("Error fetching logs:", error);
          showToast("Gagal memuat arsip data.", "error");
        }
      } else {
        setLogs(data || []);
        if (!query.trim()) {
          setTotalCount(data?.length || 0);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast("Terjadi kendala koneksi.", "error");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs(searchTerm);
  }, [activeTab]);

  // Extract unique projects
  const availableProjects = useMemo(() => {
    const projectsSet = new Set<string>(["Umum", "Tol Probowangi", "Pembebasan Lahan", "PPK Yasa"]);
    logs.forEach((log) => {
      if (log.project) {
        projectsSet.add(log.project);
      }
    });
    return Array.from(projectsSet);
  }, [logs]);

  // Extract unique tags
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

  // Filter logs by selected tag, project, status, and date
  const displayedLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedTag && !log.keywords?.toLowerCase().includes(selectedTag.toLowerCase())) {
        return false;
      }
      if (selectedProject && (log.project || "Umum") !== selectedProject) {
        return false;
      }
      if (selectedStatus && (log.status || "done") !== selectedStatus) {
        return false;
      }
      if (selectedDateFilter && log.date !== selectedDateFilter) {
        return false;
      }
      return true;
    });
  }, [logs, selectedTag, selectedProject, selectedStatus, selectedDateFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const completed = logs.filter((l) => (l.status || "done") === "done").length;
    const inProgress = logs.filter((l) => l.status === "in_progress").length;
    const todo = logs.filter((l) => l.status === "todo").length;
    const withFiles = logs.filter((l) => !!l.file_url).length;

    // Project breakdown
    const projectCounts: { [key: string]: number } = {};
    logs.forEach((l) => {
      const p = l.project || "Umum";
      projectCounts[p] = (projectCounts[p] || 0) + 1;
    });

    // Activity heatmap map (date -> count) for last 60 days
    const activityMap: { [dateStr: string]: number } = {};
    logs.forEach((l) => {
      activityMap[l.date] = (activityMap[l.date] || 0) + 1;
    });

    return { total, completed, inProgress, todo, withFiles, projectCounts, activityMap };
  }, [logs]);

  // Heatmap days generation (last 42 days / 6 weeks)
  const heatmapDays = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = [];
    const today = new Date();
    for (let i = 41; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = stats.activityMap[dateStr] || 0;
      days.push({
        dateStr,
        label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        count,
      });
    }
    return days;
  }, [stats.activityMap]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(searchTerm);
  };

  const handleLocalFileSelect = async (selectedFile: File) => {
    setLocalHelperFile(selectedFile);
    const separator = defaultFolder.endsWith("\\") || defaultFolder.endsWith("/") ? "" : "\\";
    const suggestedPath = `${defaultFolder}${separator}${selectedFile.name}`;
    if (!localPath.trim()) {
      setLocalPath(suggestedPath);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast("Deskripsi pekerjaan tidak boleh kosong.", "error");
      return;
    }

    if (attachmentMode === "local" && !localPath.trim()) {
      showToast("Harap masukkan path lokasi file/folder lokal.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileUrl = "";
      let fileName = "";
      let fileContent = "";

      if (attachmentMode === "cloud" && cloudFile) {
        fileName = `${Date.now()}_${cloudFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, cloudFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;

        if (cloudFile.name.endsWith(".docx")) {
          try {
            const formData = new FormData();
            formData.append("file", cloudFile);
            const res = await fetch("/api/extract", {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              fileContent = data.text || "";
            }
          } catch (err) {
            console.warn("Gagal mengekstrak teks:", err);
          }
        }
      } else if (attachmentMode === "local" && localPath.trim()) {
        fileUrl = localPath.trim();
        const cleanBase = localPath.replace(/\\/g, "/").split("/").pop() || "Berkas Lokal";
        fileName = localHelperFile ? localHelperFile.name : cleanBase;

        if (localHelperFile && localHelperFile.name.endsWith(".docx")) {
          try {
            const formData = new FormData();
            formData.append("file", localHelperFile);
            const res = await fetch("/api/extract", {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              fileContent = data.text || "";
            }
          } catch (err) {
            console.warn("Gagal mengekstrak teks docx lokal:", err);
          }
        }
      }

      const activeProject = isCustomProject && customProject.trim() ? customProject.trim() : project;

      // Insert into Supabase with automatic fallback if columns are still pending in SQL
      const insertPayload: any = {
        date,
        description: description.trim(),
        keywords: keywords.trim(),
        file_name: fileName,
        file_url: fileUrl,
        file_content: fileContent,
        project: activeProject,
        status: status,
      };

      const { error: dbError } = await supabase.from("daily_logs").insert([insertPayload]);

      if (dbError) {
        // Fallback: retry without project and status if columns don't exist in Supabase yet
        delete insertPayload.project;
        delete insertPayload.status;
        const retry = await supabase.from("daily_logs").insert([insertPayload]);
        if (retry.error) throw retry.error;
      }

      showToast("Catatan harian berhasil disimpan!", "success");

      // Reset form
      setDescription("");
      setKeywords("");
      setLocalPath("");
      setLocalHelperFile(null);
      setCloudFile(null);
      if (cloudFileInputRef.current) cloudFileInputRef.current.value = "";
      if (localFileInputRef.current) localFileInputRef.current.value = "";
      setTotalCount((prev) => prev + 1);
      fetchLogs(searchTerm);
    } catch (error: any) {
      console.error(error);
      showToast(`Gagal menyimpan: ${error.message || "Terjadi kesalahan"}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Toggle on Card
  const toggleLogStatus = async (log: DailyLog) => {
    const nextStatus = (log.status || "done") === "done" ? "in_progress" : "done";
    try {
      const { error } = await supabase
        .from("daily_logs")
        .update({ status: nextStatus })
        .eq("id", log.id);

      if (error) throw error;

      setLogs((prev) =>
        prev.map((l) => (l.id === log.id ? { ...l, status: nextStatus } : l))
      );
      showToast(
        nextStatus === "done" ? "Tugas ditandai Selesai! 🎉" : "Tugas diubah ke Sedang Berjalan ⏳",
        "success"
      );
    } catch (err: any) {
      console.error(err);
      showToast("Gagal memperbarui status tugas.", "error");
    }
  };

  // Edit Log Execution
  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setIsUpdating(true);

    try {
      const updateData: any = {
        date: editingLog.date,
        description: editingLog.description.trim(),
        keywords: editingLog.keywords?.trim() || "",
        project: editingLog.project || "Umum",
        status: editingLog.status || "done",
        file_url: editingLog.file_url || "",
        file_name: editingLog.file_name || "",
      };

      const { error } = await supabase
        .from("daily_logs")
        .update(updateData)
        .eq("id", editingLog.id);

      if (error) {
        delete updateData.project;
        delete updateData.status;
        const retry = await supabase
          .from("daily_logs")
          .update(updateData)
          .eq("id", editingLog.id);
        if (retry.error) throw retry.error;
      }

      showToast("Catatan berhasil diperbarui!", "success");
      setEditingLog(null);
      fetchLogs(searchTerm);
    } catch (err: any) {
      console.error(err);
      showToast("Gagal memperbarui catatan.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Log Execution
  const handleDeleteLog = async () => {
    if (!deletingLogId) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", deletingLogId);

      if (error) throw error;

      showToast("Catatan berhasil dihapus dari arsip.", "success");
      setLogs((prev) => prev.filter((l) => l.id !== deletingLogId));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setDeletingLogId(null);
    } catch (err: any) {
      console.error(err);
      showToast("Gagal menghapus catatan.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // AI Summarizer Trigger
  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    setAiSummary("");
    try {
      let targetLogs = logs;
      const now = new Date();

      if (aiScope === "today") {
        const todayStr = now.toISOString().split("T")[0];
        targetLogs = logs.filter((l) => l.date === todayStr);
      } else if (aiScope === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        targetLogs = logs.filter((l) => new Date(l.date) >= weekAgo);
      } else if (aiScope === "month") {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        targetLogs = logs.filter((l) => new Date(l.date) >= monthAgo);
      }

      if (targetLogs.length === 0) {
        setAiSummary("Tidak ada log aktivitas pada periode yang dipilih.");
        setIsGeneratingAi(false);
        return;
      }

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: targetLogs,
          title: `Laporan Aktivitas (${aiScope.toUpperCase()})`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiSummary(data.summary);
      } else {
        setAiSummary(data.error || "Terjadi kendala saat merangkum.");
      }
    } catch (err: any) {
      console.error(err);
      setAiSummary("Gagal terhubung ke layanan rangkuman.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copySummaryToClipboard = () => {
    if (!aiSummary) return;
    navigator.clipboard.writeText(aiSummary);
    setCopiedSummary(true);
    showToast("Rangkuman disalin ke clipboard!", "success");
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const isLocalFile = (url?: string) => {
    if (!url) return false;
    return !url.startsWith("http://") && !url.startsWith("https://");
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Path file berhasil disalin ke clipboard!", "success");
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const openInExplorer = (path: string, id: number) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    const uri = `dailywork://open?path=${encodeURIComponent(path)}`;
    window.location.href = uri;
    showToast("Membuka di Windows Explorer... (Path disalin)", "success");
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

      {/* MODAL: AI SUMMARIZER */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    AI Smart Work Summarizer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rangkum catatan harian menjadi format laporan eksekutif formal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-500">Pilih Periode:</span>
              {(["all", "month", "week", "today"] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => setAiScope(sc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    aiScope === sc
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {sc === "all"
                    ? "Semua Catatan"
                    : sc === "month"
                    ? "30 Hari Terakhir"
                    : sc === "week"
                    ? "Minggu Ini"
                    : "Hari Ini"}
                </button>
              ))}

              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingAi}
                className="ml-auto px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Merangkum...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Buat Rangkuman
                  </>
                )}
              </button>
            </div>

            {/* AI Summary Output Area */}
            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap">
              {isGeneratingAi ? (
                <div className="py-12 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                  <p>Menganalisis log harian dan menyusun ringkasan eksekutif...</p>
                </div>
              ) : aiSummary ? (
                aiSummary
              ) : (
                <p className="text-slate-400 text-center py-8">
                  Pilih periode di atas lalu klik tombol <strong>&ldquo;Buat Rangkuman&rdquo;</strong> untuk menghasilkan laporan pekerjaan.
                </p>
              )}
            </div>

            {aiSummary && (
              <div className="flex items-center justify-between shrink-0 pt-2">
                <button
                  onClick={copySummaryToClipboard}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Salin Laporan ke Clipboard
                </button>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT LOG */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Catatan Pekerjaan</h3>
              </div>
              <button
                onClick={() => setEditingLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={editingLog.date}
                    onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Proyek
                  </label>
                  <input
                    type="text"
                    value={editingLog.project || "Umum"}
                    onChange={(e) => setEditingLog({ ...editingLog, project: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Status Pekerjaan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "done", label: "Selesai", icon: CheckCircle, color: "text-emerald-500" },
                    { id: "in_progress", label: "Berjalan", icon: Clock, color: "text-amber-500" },
                    { id: "todo", label: "Pending", icon: AlertTriangle, color: "text-blue-500" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setEditingLog({ ...editingLog, status: st.id })}
                      className={`p-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                        editingLog.status === st.id
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600"
                      }`}
                    >
                      <st.icon className={`w-3.5 h-3.5 ${st.color}`} />
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Deskripsi
                </label>
                <textarea
                  value={editingLog.description}
                  onChange={(e) => setEditingLog({ ...editingLog, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs h-24 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Tags (Pisahkan Koma)
                </label>
                <input
                  type="text"
                  value={editingLog.keywords || ""}
                  onChange={(e) => setEditingLog({ ...editingLog, keywords: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Path Berkas / URL
                </label>
                <input
                  type="text"
                  value={editingLog.file_url || ""}
                  onChange={(e) => setEditingLog({ ...editingLog, file_url: e.target.value })}
                  placeholder="D:\Path\ke\file atau https://..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Catatan Ini?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Catatan ini akan dihapus permanen dari repositori arsip Anda.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingLogId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteLog}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INFO BUKA FOLDER */}
      {showHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Fitur Buka Folder di Komputer
                </h3>
              </div>
              <button
                onClick={() => setShowHelperModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Karena website ini berjalan di cloud, ada dua cara mudah untuk langsung membuka folder/file lokal di PC Anda:
            </p>

            <div className="space-y-3.5 text-sm">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Cara Otomatis (Sekali Klik):
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                  Klik tombol <strong>&ldquo;Buka di Explorer&rdquo;</strong>. Jika Windows memunculkan pop-up izin protokol <em>dailywork</em>, klik <strong>Open / Izinkan</strong>. Folder dan file akan langsung terbuka otomatis!
                </p>
                <a
                  href="/install-dailywork-protocol.bat"
                  download="install-dailywork-protocol.bat"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Pengaktif Protokol Windows (.bat) jika belum aktif
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Cara Manual Kilat (Tanpa Instal):
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Klik tombol <strong>&ldquo;Salin Path&rdquo;</strong>, lalu di keyboard Anda tekan tombol{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">Win + R</kbd>,{" "}
                  tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">Ctrl + V</kbd>,{" "}
                  lalu tekan <strong>Enter</strong>. File/folder langsung terbuka seketika!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelperModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-all"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header Bar */}
        <header className="flex items-center justify-between pb-8 mb-8 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/20 shrink-0 border border-slate-200/50 dark:border-white/10">
              <img src="/logo.svg" alt="Daily Work Repo Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Daily Work Repo
                </h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  Pro Edition
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Log pekerjaan harian, arsip file hybrid, manajemen proyek & rangkuman AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="p-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 hover:opacity-95 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rangkum AI</span>
            </button>

            <button
              onClick={() => setShowHelperModal(true)}
              title="Panduan Buka Folder Lokal"
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all shadow-sm flex items-center gap-1.5 text-xs font-medium"
            >
              <HelpCircle className="w-4 h-4 text-indigo-500" />
            </button>

            {/* Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all shadow-sm active:scale-95"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </header>

        {/* Tab Navigation Segmented Control */}
        <div className="flex p-1.5 mb-8 rounded-2xl bg-slate-200/60 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800 max-w-lg mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === "new"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Input Log
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === "search"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Search className="w-4 h-4" />
            Cari & Arsip
            {totalCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === "stats"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistik & Heatmap
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
                  Catat pekerjaan, pilih status, dan kaitkan dengan berkas proyek.
                </p>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/30">
                <Sparkles className="w-3.5 h-3.5" /> Auto Deep Search
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Date & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Input */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Tanggal Pekerjaan
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="flex-1 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setDate(new Date().toISOString().split("T")[0])}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      Hari Ini
                    </button>
                  </div>
                </div>

                {/* Project / Category Input */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      Nama Proyek / Kategori
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomProject(!isCustomProject)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-normal"
                    >
                      {isCustomProject ? "Pilih dari Daftar" : "+ Proyek Baru"}
                    </button>
                  </label>

                  {isCustomProject ? (
                    <input
                      type="text"
                      value={customProject}
                      onChange={(e) => setCustomProject(e.target.value)}
                      placeholder="Ketik nama proyek baru (misal: Tol Kediri-Tulungagung)"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  ) : (
                    <select
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {availableProjects.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Status Pekerjaan Selector */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-indigo-500" />
                  Status Pekerjaan
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    {
                      id: "done",
                      label: "Selesai",
                      desc: "Tuntas dikerjakan",
                      icon: CheckCircle,
                      activeColor: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
                    },
                    {
                      id: "in_progress",
                      label: "Sedang Berjalan",
                      desc: "Masih dalam proses",
                      icon: Clock,
                      activeColor: "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
                    },
                    {
                      id: "todo",
                      label: "Pending",
                      desc: "Perlu tindak lanjut",
                      icon: AlertTriangle,
                      activeColor: "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
                    },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatus(st.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        status === st.id
                          ? `${st.activeColor} shadow-xs font-semibold`
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <st.icon className="w-4 h-4" />
                        <span className="text-xs font-bold">{st.label}</span>
                      </div>
                      <p className="text-[11px] opacity-75 hidden sm:block">{st.desc}</p>
                    </button>
                  ))}
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
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-28 resize-none placeholder:text-slate-400"
                  placeholder="Contoh: Rapat koordinasi dengan PPK Yasa mengenai peta pembebasan lahan Tol Probowangi Seksi 2..."
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
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Contoh: Ganti Rugi, PPK Yasa, Laporan, Validasi (pisahkan dengan koma)"
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

              {/* HYBRID STORAGE MODE SELECTOR */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-indigo-500" />
                    Penyimpanan Dokumen Terkait
                  </label>
                  <span className="text-xs text-slate-400">Pilih metode yang Anda sukai</span>
                </div>

                {/* Segmented Mode Button */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 mb-4">
                  <button
                    type="button"
                    onClick={() => setAttachmentMode("local")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      attachmentMode === "local"
                        ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <HardDrive className="w-4 h-4" />
                    File Lokal PC
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentMode("cloud")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      attachmentMode === "cloud"
                        ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    <Cloud className="w-4 h-4" />
                    Upload Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentMode("none")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      attachmentMode === "none"
                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Tanpa File
                  </button>
                </div>

                {/* OPTION 1: FILE LOKAL */}
                {attachmentMode === "local" && (
                  <div className="space-y-4 p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          💻 Mode File Lokal (File Tetap di Komputer Anda)
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Ketikkan path lokasi file/folder di Windows Anda, atau pilih file untuk deteksi otomatis.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDefaultFolderInput(!showDefaultFolderInput)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline shrink-0"
                      >
                        {showDefaultFolderInput ? "Tutup Pengaturan" : "Atur Folder Default"}
                      </button>
                    </div>

                    {showDefaultFolderInput && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Folder Kerja Default di Komputer:
                        </label>
                        <input
                          type="text"
                          value={defaultFolder}
                          onChange={(e) => handleSaveDefaultFolder(e.target.value)}
                          placeholder="Contoh: D:\Kerjaan\ atau C:\Users\Dokumen\"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Path File atau Folder Lokal:
                      </label>
                      <input
                        type="text"
                        value={localPath}
                        onChange={(e) => setLocalPath(e.target.value)}
                        placeholder="Contoh: D:\Kerjaan\PPK_Yasa\Laporan_Progress.docx atau D:\Kerjaan\Probowangi\"
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required={attachmentMode === "local"}
                      />
                    </div>

                    <div className="pt-1 flex items-center gap-3">
                      <input
                        ref={localFileInputRef}
                        type="file"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleLocalFileSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                      />
                      <button
                        type="button"
                        onClick={() => localFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                        Pilih File dari Komputer (Deteksi Cepat)
                      </button>

                      {localHelperFile && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Terdeteksi: {localHelperFile.name}
                          {localHelperFile.name.endsWith(".docx") && " (Teks diindeks)"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* OPTION 2: CLOUD UPLOAD */}
                {attachmentMode === "cloud" && (
                  <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                    <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
                      ☁️ Mode Unggah ke Cloud (Bisa Diunduh dari HP / Perangkat Lain)
                    </p>

                    {!cloudFile ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            setCloudFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => cloudFileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <input
                          ref={cloudFileInputRef}
                          type="file"
                          onChange={(e) => setCloudFile(e.target.files ? e.target.files[0] : null)}
                          className="hidden"
                          accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Klik atau seret file ke sini untuk mengunggah ke Cloud
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Mendukung .docx (otomatis diindeks untuk pencarian isi), .pdf, .xlsx
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                            {getFileIcon(cloudFile.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {cloudFile.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(cloudFile.size / 1024).toFixed(1)} KB &bull; Siap diunggah ke Cloud
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCloudFile(null);
                            if (cloudFileInputRef.current) cloudFileInputRef.current.value = "";
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
                    Menyimpan Log...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Simpan Catatan Harian
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: PENCARIAN & ARSIP */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search & Filter Box */}
            <div className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm backdrop-blur-xl space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari kata kunci, topik rapat, nama file, proyek, atau path..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
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
                  className="px-5 sm:px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <Search className="w-4 h-4 hidden sm:inline" />
                  Cari
                </button>
              </form>

              {/* Filters Bar: Project, Status & Tag */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {/* Project Filter */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <select
                    value={selectedProject || ""}
                    onChange={(e) => setSelectedProject(e.target.value || null)}
                    className="bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="">Semua Proyek</option>
                    {availableProjects.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                  <select
                    value={selectedStatus || ""}
                    onChange={(e) => setSelectedStatus(e.target.value || null)}
                    className="bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="">Semua Status</option>
                    <option value="done">✅ Selesai</option>
                    <option value="in_progress">⏳ Sedang Berjalan</option>
                    <option value="todo">📌 Pending</option>
                  </select>
                </div>

                {selectedDateFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <Calendar className="w-3 h-3" /> {selectedDateFilter}
                    <button onClick={() => setSelectedDateFilter(null)}>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  </span>
                )}

                {(selectedTag || selectedProject || selectedStatus || selectedDateFilter) && (
                  <button
                    onClick={() => {
                      setSelectedTag(null);
                      setSelectedProject(null);
                      setSelectedStatus(null);
                      setSelectedDateFilter(null);
                    }}
                    className="text-xs text-rose-500 hover:underline font-semibold ml-auto"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Tag Quick Filters */}
              {availableTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">Tag:</span>
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`text-xs px-2.5 py-0.5 rounded-lg font-medium transition-all shrink-0 ${
                        selectedTag === tag
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Header with AI Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2">
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {isLoadingLogs ? (
                  "Mencari data arsip..."
                ) : (
                  <>
                    Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{displayedLogs.length}</span> log aktivitas
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiModal(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Rangkum Arsip Ini
                </button>
                <button
                  onClick={() => fetchLogs(searchTerm)}
                  className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium ml-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
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
                    Sesuaikan kata kunci atau filter pencarian untuk menemukan arsip yang dicari.
                  </p>
                  <button
                    onClick={() => setActiveTab("new")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Buat Log Baru
                  </button>
                </div>
              ) : (
                displayedLogs.map((log) => {
                  const isLocal = isLocalFile(log.file_url);
                  const isDone = (log.status || "done") === "done";
                  const isInProgress = log.status === "in_progress";

                  return (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Log Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {formatDateIndo(log.date)}
                          </span>

                          {/* Project Badge */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
                            <Layers className="w-3 h-3" />
                            {log.project || "Umum"}
                          </span>

                          {/* Interactive Status Badge Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleLogStatus(log)}
                            title="Klik untuk mengubah status"
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-transform active:scale-95 ${
                              isDone
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40"
                                : isInProgress
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40"
                            }`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle className="w-3 h-3" /> Selesai
                              </>
                            ) : isInProgress ? (
                              <>
                                <Clock className="w-3 h-3" /> Berjalan
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" /> Pending
                              </>
                            )}
                          </button>
                        </div>

                        {/* Card Top Right: Action Buttons (Edit & Delete) */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => setEditingLog(log)}
                            title="Edit Catatan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingLogId(log.id)}
                            title="Hapus Catatan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description Text */}
                      <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-normal leading-relaxed whitespace-pre-wrap mb-4">
                        {log.description}
                      </p>

                      {/* Keywords Badges */}
                      {log.keywords && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {log.keywords
                            .split(/[,#]/)
                            .map((t) => t.trim())
                            .filter(Boolean)
                            .map((kw, i) => (
                              <span
                                key={i}
                                onClick={() => setSelectedTag(kw)}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                              >
                                #{kw}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Attached File Bar: LOCAL vs CLOUD */}
                      {log.file_url && (
                        <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
                          {isLocal ? (
                            /* Local File Card */
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs">
                                  {getFileIcon(log.file_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {log.file_name || "File Lokal"}
                                  </p>
                                  <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 truncate max-w-xs sm:max-w-md">
                                    {log.file_url}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openInExplorer(log.file_url!, log.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  Buka di Explorer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(log.file_url!, log.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-colors"
                                >
                                  {copiedId === log.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                  Salin Path
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Cloud File Card */
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-xs">
                                  {getFileIcon(log.file_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {getCleanFileName(log.file_name)}
                                  </p>
                                  <p className="text-[11px] text-slate-400">Tersimpan di Cloud Storage</p>
                                </div>
                              </div>

                              <a
                                href={log.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Unduh Berkas
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STATISTIK & KALENDER HEATMAP */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Log Tercatat</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">Semua Aktivitas</p>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pekerjaan Selesai</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% Tingkat Selesai
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sedang Berjalan</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">{stats.inProgress}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">{stats.todo} Menunggu / Pending</p>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dokumen Tersambung</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.withFiles}</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Lokal PC & Cloud</p>
              </div>
            </div>

            {/* GitHub-style Activity Heatmap */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    Heatmap Aktivitas Kerja (6 Minggu Terakhir)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Klik pada kotak tanggal untuk langsung melihat catatan di hari tersebut.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Jarang</span>
                  <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/80" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                  <span>Sering</span>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-2">
                {heatmapDays.map((day) => {
                  let bgClass = "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60";
                  if (day.count === 1) bgClass = "bg-emerald-200 dark:bg-emerald-900/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100";
                  else if (day.count === 2) bgClass = "bg-emerald-400 dark:bg-emerald-600 border-emerald-500 text-white";
                  else if (day.count >= 3) bgClass = "bg-emerald-600 dark:bg-emerald-400 border-emerald-700 text-white dark:text-slate-900";

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => {
                        setSelectedDateFilter(day.dateStr);
                        setActiveTab("search");
                      }}
                      title={`${day.dateStr}: ${day.count} catatan`}
                      className={`h-12 rounded-xl border flex flex-col items-center justify-center transition-transform hover:scale-105 ${bgClass}`}
                    >
                      <span className="text-[10px] font-semibold leading-none">{day.label.split(" ")[0]}</span>
                      <span className="text-[9px] opacity-75">{day.label.split(" ")[1]}</span>
                      {day.count > 0 && (
                        <span className="text-[9px] font-bold mt-0.5">&bull; {day.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project Distribution Breakdown */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                Distribusi Catatan Berdasarkan Proyek
              </h3>

              <div className="space-y-3">
                {Object.entries(stats.projectCounts).map(([proj, count]) => {
                  const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div
                      key={proj}
                      onClick={() => {
                        setSelectedProject(proj);
                        setActiveTab("search");
                      }}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                        <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          {proj}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {count} catatan ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
