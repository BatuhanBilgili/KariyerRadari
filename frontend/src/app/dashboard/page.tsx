"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import {
  PLATFORM_INFO,
  WORK_TYPE_INFO,
  POPULAR_KEYWORDS,
  TIMEZONES,
  type Platform,
  type WorkType,
  type NotificationMethod,
  type JobListing,
} from "@/lib/types";

// ---- Örnek ilanlar (demo data) ----
const DEMO_JOBS: JobListing[] = [
  {
    id: "1",
    platform: "linkedin",
    title: "Senior Software Engineer — Backend",
    company: "Trendyol",
    location: "Istanbul, Turkey",
    work_type: "hybrid",
    url: "https://linkedin.com/jobs/1",
    description: "Backend development with Go and Kubernetes...",
    ai_summary: "Trendyol, İstanbul merkezli backend pozisyonu. Go, Kubernetes ve mikroservis deneyimi arıyor. Minimum 5 yıl deneyim gerekli. Hybrid çalışma modeli.",
    external_id: "linkedin_1",
    posted_at: "2026-07-13T09:00:00Z",
    scraped_at: "2026-07-13T10:00:00Z",
  },
  {
    id: "2",
    platform: "indeed",
    title: "Data Scientist — ML Platform",
    company: "Getir",
    location: "Istanbul, Turkey",
    work_type: "remote",
    url: "https://indeed.com/jobs/2",
    description: "Machine learning platform development...",
    ai_summary: "Getir ML Platform ekibine katılacak Data Scientist arıyor. Python, TensorFlow, MLOps deneyimi isteniyor. Full remote çalışma imkanı. Rekabetçi maaş.",
    external_id: "indeed_1",
    posted_at: "2026-07-13T08:00:00Z",
    scraped_at: "2026-07-13T10:00:00Z",
  },
  {
    id: "3",
    platform: "itu",
    title: "Yazılım Geliştirici — Startup",
    company: "TechX Yazılım A.Ş.",
    location: "İTÜ Arı Teknokent",
    work_type: "onsite",
    url: "https://kariyer.ariteknokent.com.tr/ilan/3",
    description: "Full stack web development...",
    ai_summary: "İTÜ Arı Teknokent bünyesindeki startup, React ve Node.js bilen full stack geliştirici arıyor. Mezun veya son sınıf öğrencileri de başvurabilir.",
    external_id: "itu_3",
    posted_at: "2026-07-12T14:00:00Z",
    scraped_at: "2026-07-13T10:00:00Z",
  },
];

const EXPERIENCE_LEVEL_INFO = {
  internship: "Stajyer",
  entry: "Başlangıç Seviye",
  associate: "Uzman",
  mid_senior: "Orta-Üst Düzey Yönetici",
  director: "Direktör",
  executive: "Üst Düzey Yönetici",
};

export default function DashboardPage() {
  // Settings state
  const [email, setEmail] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [notifMethod, setNotifMethod] = useState<NotificationMethod>("telegram");
  const [notifTime, setNotifTime] = useState("09:00");
  const [timezone, setTimezone] = useState("Europe/Istanbul");
  const [keywords, setKeywords] = useState<string[]>(["Software Engineer"]);
  const [keywordInput, setKeywordInput] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [fetchAllUniv, setFetchAllUniv] = useState(false);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);
  const [remoteGlobal, setRemoteGlobal] = useState(false);
  const [workTypes, setWorkTypes] = useState<WorkType[]>(["remote", "hybrid", "onsite"]);
  const [platforms, setPlatforms] = useState<Platform[]>(["linkedin"]);
  const [githubUrl, setGithubUrl] = useState("");
  const [kaggleUrl, setKaggleUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [oldCvText, setOldCvText] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [testStatus, setTestStatus] = useState("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"settings" | "jobs">("settings");

  // Load from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmail(localStorage.getItem("tr_email") || "");
      setTelegramChatId(localStorage.getItem("tr_telegram_chat_id") || "");
      setNotifMethod((localStorage.getItem("tr_notif_method") as NotificationMethod) || "telegram");
      setNotifTime(localStorage.getItem("tr_notif_time") || "09:00");
      setTimezone(localStorage.getItem("tr_timezone") || "Europe/Istanbul");
      
      const savedKeywords = localStorage.getItem("tr_keywords");
      if (savedKeywords) setKeywords(JSON.parse(savedKeywords));

      const savedLocations = localStorage.getItem("tr_locations");
      if (savedLocations) setLocations(JSON.parse(savedLocations));

      setFetchAllUniv(localStorage.getItem("tr_fetch_all_univ") === "true");

      const savedWorkTypes = localStorage.getItem("tr_work_types");
      if (savedWorkTypes) setWorkTypes(JSON.parse(savedWorkTypes));

      const savedPlatforms = localStorage.getItem("tr_platforms");
      if (savedPlatforms) setPlatforms(JSON.parse(savedPlatforms));

      const savedExpLevels = localStorage.getItem("tr_experience_levels");
      if (savedExpLevels) setExperienceLevels(JSON.parse(savedExpLevels));

      setRemoteGlobal(localStorage.getItem("tr_remote_global") === "true");

      setGithubUrl(localStorage.getItem("tr_github_url") || "");
      setKaggleUrl(localStorage.getItem("tr_kaggle_url") || "");
      setLinkedinUrl(localStorage.getItem("tr_linkedin_url") || "");
      setGeminiApiKey(localStorage.getItem("tr_gemini_api_key") || "");
      setOldCvText(localStorage.getItem("tr_old_cv_text") || "");
    }
  }, []);

  // Keyword handlers
  const addKeyword = useCallback(
    (kw: string) => {
      const trimmed = kw.trim();
      if (trimmed && !keywords.includes(trimmed)) {
        setKeywords((prev) => [...prev, trimmed]);
      }
      setKeywordInput("");
    },
    [keywords]
  );

  const removeKeyword = useCallback((kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }, []);

  const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(keywordInput);
    }
    if (e.key === "Backspace" && !keywordInput && keywords.length > 0) {
      setKeywords((prev) => prev.slice(0, -1));
    }
  };

  // Location handlers
  const addLocation = useCallback(
    (loc: string) => {
      const trimmed = loc.trim();
      if (trimmed && !locations.includes(trimmed)) {
        setLocations((prev) => [...prev, trimmed]);
      }
      setLocationInput("");
    },
    [locations]
  );

  const removeLocation = useCallback((loc: string) => {
    setLocations((prev) => prev.filter((l) => l !== loc));
  }, []);

  const handleLocationKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLocation(locationInput);
    }
    if (e.key === "Backspace" && !locationInput && locations.length > 0) {
      setLocations((prev) => prev.slice(0, -1));
    }
  };

  // Work type toggle
  const toggleWorkType = (wt: WorkType) => {
    setWorkTypes((prev) => {
      if (prev.includes(wt)) {
        if (prev.length <= 1) return prev; // minimum 1
        return prev.filter((w) => w !== wt);
      }
      return [...prev, wt];
    });
  };

  // Platform toggle
  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 1) return prev;
        return prev.filter((pl) => pl !== p);
      }
      return [...prev, p];
    });
  };

  // Experience level toggle
  const toggleExperienceLevel = (level: string) => {
    setExperienceLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((l) => l !== level);
      }
      return [...prev, level];
    });
  };

  // Dynamic PDF.js Loader
  const loadPdfJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject();
      if ((window as any).pdfjsLib) return resolve((window as any).pdfjsLib);

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // File Change Handler
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setOldCvText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const pdfjsLib = await loadPdfJS();
        const reader = new FileReader();
        reader.onload = async (event) => {
          const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
          try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(" ");
              fullText += pageText + "\n";
            }
            setOldCvText(fullText.trim());
          } catch (err) {
            alert("PDF metni ayrıştırılamadı. Lütfen CV içeriğinizi kopyalayıp kutuya yapıştırın.");
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        alert("PDF okuyucu yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
      }
    } else {
      alert("Şimdilik sadece .txt, .md ve .pdf uzantılı dosyalar doğrudan okunabilir. Diğer formatlar için lütfen CV içeriğinizi kopyalayıp aşağıdaki kutuya yapıştırın.");
    }
  };

  // Save Supabase Sync
  const saveToSupabase = async () => {
    try {
      const { getSupabaseClient } = await import("@/lib/supabase");
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // Tek kullanıcılı (kendi veritabanınız) sistem olduğu için tarayıcıda bir ID oluşturup onu kullanıyoruz
      let userId = localStorage.getItem("tr_user_id");
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem("tr_user_id", userId);
      }

      const { error } = await supabase.from("users").upsert({
        id: userId,
        email: email || null,
        telegram_chat_id: telegramChatId || null,
        notification_method: notifMethod,
        notification_time: notifTime,
        timezone: timezone,
        search_keywords: keywords,
        locations: locations,
        fetch_all_univ: fetchAllUniv,
        experience_levels: experienceLevels,
        remote_global: remoteGlobal,
        work_types: workTypes,
        platforms: platforms,
        github_url: githubUrl || null,
        kaggle_url: kaggleUrl || null,
        linkedin_url: linkedinUrl || null,
        gemini_api_key: geminiApiKey || null,
        old_cv_text: oldCvText || null
      });

      if (error) {
        console.error("Supabase kaydetme hatası:", error);
        alert("Veritabanına kaydedilirken bir hata oluştu: " + error.message + "\n\n(Lütfen Supabase'den RLS ayarlarını kapattığınızdan emin olun)");
      }
    } catch (e: any) {
      console.error("Supabase sync hatası:", e);
      alert("Bağlantı hatası: " + e.message);
    }
  };

  // Save settings
  const saveSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tr_email", email);
      localStorage.setItem("tr_telegram_chat_id", telegramChatId);
      localStorage.setItem("tr_notif_method", notifMethod);
      localStorage.setItem("tr_notif_time", notifTime);
      localStorage.setItem("tr_timezone", timezone);
      localStorage.setItem("tr_keywords", JSON.stringify(keywords));
      localStorage.setItem("tr_locations", JSON.stringify(locations));
      localStorage.setItem("tr_fetch_all_univ", String(fetchAllUniv));
      localStorage.setItem("tr_experience_levels", JSON.stringify(experienceLevels));
      localStorage.setItem("tr_remote_global", String(remoteGlobal));
      localStorage.setItem("tr_work_types", JSON.stringify(workTypes));
      localStorage.setItem("tr_platforms", JSON.stringify(platforms));
      localStorage.setItem("tr_github_url", githubUrl);
      localStorage.setItem("tr_kaggle_url", kaggleUrl);
      localStorage.setItem("tr_linkedin_url", linkedinUrl);
      localStorage.setItem("tr_gemini_api_key", geminiApiKey);
      localStorage.setItem("tr_old_cv_text", oldCvText);
    }

    saveToSupabase();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  // Telegram test notification helper
  const sendTestTelegram = async () => {
    if (!telegramChatId) {
      alert("Lütfen önce Telegram Chat ID girin.");
      return;
    }
    const token = prompt("Lütfen Telegram Bot Token girin:");
    if (!token) return;

    setTestStatus("Gönderiliyor...");
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: "<b>KariyerRadarı</b>\n\nTebrikler! Telegram bildirim entegrasyonunuz başarıyla çalışıyor. İş arama serüveninizde başarılar dileriz! 🚀",
          parse_mode: "HTML"
        })
      });
      const data = await response.json();
      if (data.ok) {
        setTestStatus("Başarıyla Gönderildi!");
        setTimeout(() => setTestStatus(""), 3000);
      } else {
        throw new Error(data.description || "Bilinmeyen hata");
      }
    } catch (err: any) {
      alert(`Gönderim hatası: ${err.message}`);
      setTestStatus("Hata!");
      setTimeout(() => setTestStatus(""), 3000);
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="navbar-logo">
            KariyerRadarı
          </Link>
          <ul className="navbar-links">
            <li><Link href="/setup/">Kurulum</Link></li>
            <li><Link href="/dashboard/">Dashboard</Link></li>
            <li><Link href="/cv-builder/">CV Builder</Link></li>
          </ul>
        </div>
      </nav>

      <div className="page-header">
        <div className="container">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            İş ilanı takip ayarlarınızı yönetin ve son ilanları görüntüleyin.
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="container">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
              type="button"
            >
              Ayarlar
            </button>
            <button
              className={`tab ${activeTab === "jobs" ? "active" : ""}`}
              onClick={() => setActiveTab("jobs")}
              type="button"
            >
              Son İlanlar
            </button>
          </div>

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="grid-2">
              {/* Sol: Bildirim Ayarları */}
              <div>
                <div className="card" style={{ marginBottom: "var(--space-xl)" }}>
                  <h3 style={{ marginBottom: "var(--space-lg)", fontWeight: 700 }}>
                    Bildirim Ayarları
                  </h3>

                  {/* Bildirim yöntemi */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="notif-method">Bildirim Yöntemi</label>
                    <div className="checkbox-group">
                      {(["telegram", "email", "both"] as NotificationMethod[]).map(
                        (method) => (
                          <div className="checkbox-item" key={method}>
                            <input
                              type="radio"
                              id={`notif-${method}`}
                              name="notif-method"
                              checked={notifMethod === method}
                              onChange={() => setNotifMethod(method)}
                            />
                            <label className="checkbox-label" htmlFor={`notif-${method}`}>
                              {method === "telegram" ? "📱 Telegram" : method === "email" ? "📧 E-posta" : "📱📧 Her İkisi"}
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Telegram Chat ID */}
                  {(notifMethod === "telegram" || notifMethod === "both") && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="telegram-id">Telegram Chat ID</label>
                      <input
                        id="telegram-id"
                        type="text"
                        className="form-input"
                        placeholder="123456789"
                        value={telegramChatId}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTelegramChatId(e.target.value)}
                      />
                      <div style={{ marginTop: "8px", display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={sendTestTelegram}
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                        >
                          Test Bildirimi Gönder
                        </button>
                        {testStatus && <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{testStatus}</span>}
                      </div>
                    </div>
                  )}

                  {/* E-posta */}
                  {(notifMethod === "email" || notifMethod === "both") && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="email-input">E-posta Adresi</label>
                      <input
                        id="email-input"
                        type="email"
                        className="form-input"
                        placeholder="adiniz@email.com"
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Saat */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="notif-time">Bildirim Saati</label>
                    <input
                      id="notif-time"
                      type="time"
                      className="form-input"
                      value={notifTime}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNotifTime(e.target.value)}
                    />
                  </div>

                  {/* Timezone */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="timezone-select">Zaman Dilimi</label>
                    <select
                      id="timezone-select"
                      className="form-select"
                      value={timezone}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setTimezone(e.target.value)}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Profil Bilgileri */}
                <div className="card">
                  <h3 style={{ marginBottom: "var(--space-lg)", fontWeight: 700 }}>
                    Profil Bilgileri (AI CV için)
                  </h3>
                  <div className="form-group">
                    <label className="form-label" htmlFor="gemini-key-input">Gemini API Key</label>
                    <input
                      id="gemini-key-input"
                      type="password"
                      className="form-input"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setGeminiApiKey(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="github-url">GitHub URL</label>
                    <input
                      id="github-url"
                      type="url"
                      className="form-input"
                      placeholder="https://github.com/username"
                      value={githubUrl}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setGithubUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="kaggle-url">Kaggle URL</label>
                    <input
                      id="kaggle-url"
                      type="url"
                      className="form-input"
                      placeholder="https://kaggle.com/username"
                      value={kaggleUrl}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setKaggleUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="linkedin-url">LinkedIn URL</label>
                    <input
                      id="linkedin-url"
                      type="url"
                      className="form-input"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrl}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setLinkedinUrl(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cv-file">Mevcut CV Yükle (.pdf, .txt, .md)</label>
                    <input
                      id="cv-file"
                      type="file"
                      className="form-input"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cv-text">Mevcut CV İçeriği</label>
                    <textarea
                      id="cv-text"
                      className="form-textarea"
                      placeholder="Dosya yükleyin veya buraya yapıştırın..."
                      value={oldCvText}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setOldCvText(e.target.value)}
                      style={{ minHeight: "120px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Sağ: Arama Tercihleri */}
              <div>
                <div className="card" style={{ marginBottom: "var(--space-xl)" }}>
                  <h3 style={{ marginBottom: "var(--space-lg)", fontWeight: 700 }}>
                    Arama Tercihleri
                  </h3>

                  {/* Platformlar */}
                  <div className="form-group">
                    <label className="form-label">Platformlar (min. 1)</label>
                    <div className="checkbox-group">
                      {(Object.keys(PLATFORM_INFO) as Platform[]).map((p) => (
                        <div className="checkbox-item" key={p}>
                          <input
                            type="checkbox"
                            id={`platform-${p}`}
                            checked={platforms.includes(p)}
                            onChange={() => togglePlatform(p)}
                          />
                          <label className="checkbox-label" htmlFor={`platform-${p}`}>
                            {PLATFORM_INFO[p].name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LinkedIn Deneyim Düzeyi */}
                  {platforms.includes("linkedin") && (
                    <div className="form-group" style={{ marginTop: "1rem" }}>
                      <label className="form-label">Deneyim Düzeyi (Sadece LinkedIn)</label>
                      <div className="checkbox-group">
                        {Object.entries(EXPERIENCE_LEVEL_INFO).map(([level, label]) => (
                          <div className="checkbox-item" key={level}>
                            <input
                              type="checkbox"
                              id={`exp-${level}`}
                              checked={experienceLevels.includes(level)}
                              onChange={() => toggleExperienceLevel(level)}
                            />
                            <label className="checkbox-label" htmlFor={`exp-${level}`}>
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tüm Üniversite İlanları */}
                  {(platforms.includes("itu") || platforms.includes("bogazici")) && (
                    <div className="form-group" style={{ marginTop: "1rem" }}>
                      <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", background: "var(--bg-glass)", padding: "16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-light)", cursor: "pointer", transition: "all 0.2s" }}>
                        <input
                          type="checkbox"
                          checked={fetchAllUniv}
                          onChange={(e) => setFetchAllUniv(e.target.checked)}
                          style={{ marginTop: "2px", width: "20px", height: "20px", cursor: "pointer", accentColor: "var(--accent-primary)", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: "block", color: "var(--text-primary)", marginBottom: "6px", fontSize: "0.95rem" }}>Üniversite Portallarındaki (İTÜ, Boğaziçi) Tüm Yeni İlanları Getir</strong>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5", display: "block" }}>Bu seçenek aktifken, İTÜ ve Boğaziçi'ndeki tüm taze fırsatlar arama kelimenize bakılmaksızın (filtresiz) getirilir. LinkedIn ve Indeed için arama kelimeleriniz geçerli olmaya devam eder.</span>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Çalışma Tipi */}
                  <div className="form-group">
                    <label className="form-label">Çalışma Tipi (min. 1)</label>
                    <div className="checkbox-group">
                      {(Object.keys(WORK_TYPE_INFO) as WorkType[]).map((wt) => (
                        <div className="checkbox-item" key={wt}>
                          <input
                            type="checkbox"
                            id={`wt-${wt}`}
                            checked={workTypes.includes(wt)}
                            onChange={() => toggleWorkType(wt)}
                          />
                          <label className="checkbox-label" htmlFor={`wt-${wt}`}>
                            {WORK_TYPE_INFO[wt].label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Yurtdışı Remote Seçeneği */}
                  {workTypes.includes("remote") && (
                    <div className="form-group" style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}>
                      <label style={{ display: "flex", gap: "10px", alignItems: "center", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={remoteGlobal}
                          onChange={(e) => setRemoteGlobal(e.target.checked)}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--accent-primary)" }}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Uzaktan (Remote) ilanlarda konum filtresini devre dışı bırak (Yurtdışı/Global dahil)
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Şehir / Ülke Seçimi */}
                  <div className="form-group">
                    <label className="form-label">Konumlar (Örn: Türkiye, İstanbul, Remote)</label>
                    <div className="tags-container">
                      {locations.map((loc) => (
                        <span key={loc} className="tag">
                          {loc}
                          <button
                            className="tag-remove"
                            onClick={() => removeLocation(loc)}
                            type="button"
                            aria-label={`${loc} kaldır`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="tags-input"
                        placeholder={locations.length === 0 ? "Bir konum yazın ve Enter'a basın..." : ""}
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={handleLocationKeyDown}
                        list="location-suggestions"
                      />
                      <datalist id="location-suggestions">
                        <option value="Türkiye" />
                        <option value="İstanbul" />
                        <option value="Ankara" />
                        <option value="İzmir" />
                        <option value="Remote" />
                        <option value="Hybrid" />
                        <option value="Europe" />
                        <option value="United States" />
                        <option value="United Kingdom" />
                        <option value="Germany" />
                      </datalist>
                    </div>
                  </div>

                  {/* Arama Kelimeleri */}
                  <div className="form-group">
                    <label className="form-label">Arama Kelimeleri</label>
                    <div className="tags-container">
                      {keywords.map((kw) => (
                        <span key={kw} className="tag">
                          {kw}
                          <button
                            className="tag-remove"
                            onClick={() => removeKeyword(kw)}
                            type="button"
                            aria-label={`${kw} kaldır`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        className="tags-input"
                        placeholder="Yazın ve Enter'a basın..."
                        value={keywordInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                      />
                    </div>
                  </div>

                  {/* Popüler öneriler */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>
                      Popüler Aramalar
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {POPULAR_KEYWORDS.filter((k) => !keywords.includes(k))
                        .slice(0, 8)
                        .map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => addKeyword(kw)}
                            style={{ fontSize: "0.75rem" }}
                          >
                            + {kw}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Kaydet butonu */}
                <button
                  className="btn btn-primary btn-lg"
                  onClick={saveSettings}
                  type="button"
                  style={{ width: "100%" }}
                >
                  Ayarları Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                {DEMO_JOBS.map((job) => (
                  <div key={job.id} className="card job-card">
                    <div className="job-card-header">
                      <div>
                        <span className="job-card-platform">
                          {PLATFORM_INFO[job.platform].name}
                        </span>
                        <h3 className="job-card-title" style={{ marginTop: "var(--space-sm)" }}>
                          {job.title}
                        </h3>
                        <p className="job-card-company">{job.company}</p>
                      </div>
                    </div>

                    <div className="job-card-meta">
                      <span className={`job-card-work-type ${job.work_type}`}>
                        {WORK_TYPE_INFO[job.work_type as WorkType]?.label || job.work_type}
                      </span>
                      {job.location && (
                        <span className="job-card-meta-item">{job.location}</span>
                      )}
                      {job.posted_at && (
                        <span className="job-card-meta-item">
                          {new Date(job.posted_at).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>

                    {job.ai_summary && (
                      <div className="job-card-summary">
                        <strong>AI Özet:</strong> {job.ai_summary}
                      </div>
                    )}

                    <div className="job-card-actions">
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          İlan İçin Tıklayınız
                        </a>
                      )}
                      <Link
                        href={`/cv-builder/?jobId=${job.id}`}
                        className="btn btn-outline btn-sm"
                      >
                        Bu İlan İçin CV Oluştur
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {showSaved && (
        <div className="toast toast-success">
          Ayarlar başarıyla kaydedildi!
        </div>
      )}

      <footer className="footer">
        <div className="container">
          <p>KariyerRadarı — Açık Kaynak İş İlanı Takip Platformu</p>
        </div>
      </footer>
    </>
  );
}
