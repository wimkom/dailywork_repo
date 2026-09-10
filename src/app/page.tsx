"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, PlusCircle, FileText, Calendar, Tag, Download } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("new");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (activeTab === "search") {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchLogs = async (query: string = "") => {
    setIsSearching(true);
    let supabaseQuery = supabase.from("daily_logs").select("*").order("date", { ascending: false });

    if (query) {
      // Basic search on description, keywords, or file_content
      supabaseQuery = supabaseQuery.or(`description.ilike.%${query}%,keywords.ilike.%${query}%,file_content.ilike.%${query}%`);
    }

    const { data, error } = await supabaseQuery;
    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(data || []);
    }
    setIsSearching(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(searchTerm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      alert("Deskripsi tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileUrl = "";
      let fileName = "";
      let fileContent = "";

      if (file) {
        // Upload to Supabase Storage
        fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;

        // Note: For deep search (.docx text extraction), we'd typically send it to an API route.
        // For simplicity in this demo, we'll extract text server-side or leave it blank if no API is set up.
        // Let's call our internal API to extract text if it's a docx
        if (file.name.endsWith(".docx")) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/extract", { method: "POST", body: formData });
          if (res.ok) {
            const data = await res.json();
            fileContent = data.text || "";
          }
        }
      }

      // Insert to DB
      const { error: dbError } = await supabase.from("daily_logs").insert([
        {
          date,
          description,
          keywords,
          file_name: fileName,
          file_url: fileUrl,
          file_content: fileContent,
        }
      ]);

      if (dbError) throw dbError;

      alert("Log berhasil disimpan!");
      // Reset form
      setDescription("");
      setKeywords("");
      setFile(null);
      
    } catch (error: any) {
      console.error(error);
      alert("Terjadi kesalahan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          📝 Daily Work Repo & Tracker
        </h1>
        <p className="text-gray-500 mb-8">Catat pekerjaan harian dan simpan dokumen terkait. Cari kembali dengan mudah!</p>
        
        <div className="flex gap-4 mb-8 border-b pb-2">
          <button 
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === "new" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <PlusCircle size={20} />
            Catat Pekerjaan Baru
          </button>
          <button 
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === "search" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
          >
            <Search size={20} />
            Cari Arsip
          </button>
        </div>

        {activeTab === "new" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Tambah Log Harian</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi Pekerjaan</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded-md h-24"
                  placeholder="Contoh: Rapat koordinasi, membuat laporan progress..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags / Kata Kunci</label>
                <input 
                  type="text" 
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Contoh: Ganti Rugi, PPK Yasa, Laporan (pisahkan dengan koma)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lampirkan File (Opsional)</label>
                <input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 border rounded-md bg-gray-50"
                  accept=".docx,.pdf,.xlsx,.csv,.txt"
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Log"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "search" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Pencarian Arsip & Log Harian</h2>
            <form onSubmit={handleSearch} className="flex gap-2 mb-8">
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik kata kunci (contoh: pembebasan lahan)"
                className="flex-1 p-2 border rounded-md"
              />
              <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 transition-colors">
                Cari
              </button>
            </form>

            <div className="space-y-4">
              {isSearching ? (
                <p className="text-gray-500 text-center py-8">Mencari data...</p>
              ) : logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Tidak ada data ditemukan.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <Calendar size={16} />
                        {log.date}
                      </div>
                    </div>
                    <p className="text-lg font-medium mb-3">{log.description}</p>
                    
                    {log.keywords && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 bg-gray-50 w-fit px-2 py-1 rounded">
                        <Tag size={14} />
                        {log.keywords}
                      </div>
                    )}

                    {log.file_url && (
                      <a 
                        href={log.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <FileText size={16} />
                        Download {log.file_name?.split('_').slice(1).join('_')}
                      </a>
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
