"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { initSupabaseClient } from "@/lib/supabase";

export default function SetupPage() {
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSupabaseUrl(localStorage.getItem("talentRadar_supabaseUrl") || "");
      setSupabaseAnonKey(localStorage.getItem("talentRadar_supabaseAnonKey") || "");
    }
  }, []);

  const handleSaveDb = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      alert("Lütfen URL ve Anon Key giriniz.");
      return;
    }
    initSupabaseClient(supabaseUrl, supabaseAnonKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
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
        <div className="container container-narrow">
          <h1 className="page-title">Sistemi Bağla & Kurulum (BYOD)</h1>
          <p className="page-subtitle">
            KariyerRadarı tamamen merkeziyetsizdir. Kendi Supabase veritabanınızı bağlayın ve 
            otomasyon için GitHub hesabınızı kullanın. Sunucu masrafı sıfır!
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="container container-narrow">
          
          {/* Adım 0: DB Bağlantısı */}
          <div className="card" style={{ marginBottom: "var(--space-3xl)", border: "2px solid var(--accent-primary)", padding: "var(--space-xl)" }}>
            <h2 style={{ marginBottom: "var(--space-md)", color: "var(--accent-primary)" }}>1. Veritabanınızı Bağlayın</h2>
            <p style={{ marginBottom: "var(--space-lg)", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              Kendi Supabase projenizi açtıktan (aşağıdaki rehbere bakın) sonra URL ve Anon Key değerlerini buraya girin. 
              Bu bilgiler sadece sizin tarayıcınızda (localStorage) şifrelenmeden tutulur, hiçbir sunucuya gitmez.
            </p>
            
            <div className="form-group">
              <label className="form-label" htmlFor="supabase-url">Supabase Project URL</label>
              <input
                id="supabase-url"
                type="url"
                className="form-input"
                placeholder="https://[PROJE-ID].supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="supabase-anon-key">Supabase Anon (Public) Key</label>
              <input
                id="supabase-anon-key"
                type="password"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>

            <button onClick={handleSaveDb} className="btn btn-primary">
              {isSaved ? "✓ Bağlandı ve Kaydedildi" : "Bağla ve Kaydet"}
            </button>
            
            <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Bağladıktan sonra doğrudan <Link href="/dashboard/" style={{ color: "var(--accent-primary)" }}>Dashboard</Link>'a gidebilirsiniz.
            </div>
          </div>

          <div className="setup-steps">
            
            {/* Adım 1: Supabase */}
            <div className="setup-step">
              <h3 className="setup-step-title">Adım 1: Supabase Veritabanı Kurulumu</h3>
              <div className="setup-step-content">
                <ol>
                  <li>
                    <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a> adresine gidin ve ücretsiz hesap açın.
                  </li>
                  <li><strong>"New Project"</strong> butonuna tıklayın. Proje adı: <code>KariyerRadari</code>, bölge: <strong>EU (Frankfurt)</strong> seçin.</li>
                  <li>Sol menüden <strong>SQL Editor</strong>'e gidin.</li>
                  <li>
                    GitHub reposundaki <code>supabase/migrations/001_initial_schema.sql</code> dosyasının içeriğini kopyalayıp çalıştırın.
                    *(Veya repodaki yeni eklenen SQL güncellemelerini de çalıştırın)*
                  </li>
                  <li>
                    Sol menüden <strong>Project Settings → API</strong> bölümüne gidin.
                  </li>
                  <li>
                    <strong>Project URL</strong> ve <strong>anon (public) key</strong> değerlerini not edip yukarıdaki forma girin!
                  </li>
                  <li>
                    Ayrıca <strong>service_role key</strong>'i de not edin (bu key bir sonraki adımda GitHub Actions'a eklenecek).
                  </li>
                </ol>
              </div>
            </div>

            {/* Adım 2: GitHub Fork */}
            <div className="setup-step">
              <h3 className="setup-step-title">Adım 2: Arka Plan Görevi İçin GitHub Fork</h3>
              <div className="setup-step-content">
                <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                  Bu sitenin ilanları çekebilmesi için Python tabanlı Scraper'ın otomatik çalışması gerekir. Bunun için GitHub Actions kullanıyoruz.
                </p>
                <ol>
                  <li>
                    <a href="https://github.com/BatuhanBilgili/KariyerRadar-" target="_blank" rel="noopener noreferrer">
                      KariyerRadarı GitHub
                    </a> sayfasına gidin ve sağ üstteki <strong>"Fork"</strong> butonuna tıklayın.
                  </li>
                  <li>
                    Fork'ladığınız kendi reponuzda <strong>Settings → Secrets and variables → Actions</strong> bölümüne gidin.
                  </li>
                  <li>
                    <strong>"New repository secret"</strong> diyerek aşağıdaki key'leri ekleyin:
                    <ul>
                      <li><code>SUPABASE_URL</code>: Supabase Project URL'iniz</li>
                      <li><code>SUPABASE_SERVICE_ROLE_KEY</code>: Supabase service_role key (ASLA ARAYÜZE GİRMEYİN)</li>
                      <li><code>TELEGRAM_BOT_TOKEN</code>: BotFather'dan aldığınız token (Aşağıdaki adıma bakın)</li>
                      <li><code>GEMINI_API_KEY</code>: Google AI Studio API key (Aşağıdaki adıma bakın)</li>
                    </ul>
                  </li>
                  <li>
                    Repo ana sayfanızdaki <strong>Actions</strong> sekmesine tıklayın ve "I understand my workflows, go ahead and enable them" butonuna basarak otomasyonu aktifleştirin.
                  </li>
                </ol>
              </div>
            </div>

            {/* Adım 3: Telegram */}
            <div className="setup-step">
              <h3 className="setup-step-title">Adım 3: Telegram Bot Kurulumu</h3>
              <div className="setup-step-content">
                <ol>
                  <li>Telegram'da <code>@BotFather</code> yazın ve <strong>/newbot</strong> komutuyla yeni bir bot oluşturun.</li>
                  <li>BotFather'ın verdiği <strong>HTTP API Token</strong>'ı kopyalayın (GitHub Secrets'a eklenecek).</li>
                  <li>
                    Chat ID'nizi öğrenmek için Telegram'da <code>@userinfobot</code> adlı bota <strong>/start</strong> yazın.
                    Bu Chat ID'yi daha sonra <strong>Dashboard</strong>'daki ayarlara gireceksiniz.
                  </li>
                  <li>Kendi oluşturduğunuz bota gidip <strong>/start</strong> yazarak aktif edin.</li>
                </ol>
              </div>
            </div>

            {/* Adım 4: Gemini */}
            <div className="setup-step">
              <h3 className="setup-step-title">Adım 4: Gemini API Key (AI Özellikleri - Opsiyonel)</h3>
              <div className="setup-step-content">
                <ol>
                  <li><a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">Google AI Studio</a> adresine gidin.</li>
                  <li><strong>"Get API Key"</strong> butonuna tıklayıp yeni bir API Key oluşturun.</li>
                  <li>Bu key'i hem GitHub Secrets'a (<code>GEMINI_API_KEY</code>) hem de <strong>Dashboard</strong>'daki Profil Bilgileri kısmına ekleyin.</li>
                </ol>
              </div>
            </div>

          </div>

          {/* Dashboard'a yönlendirme */}
          <div style={{ textAlign: "center", marginTop: "var(--space-3xl)" }}>
            <Link href="/dashboard/" className="btn btn-primary btn-lg">
              Kurulumu Tamamla ve Dashboard'a Git
            </Link>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <p>KariyerRadarı — Açık Kaynak İş İlanı Takip Platformu</p>
        </div>
      </footer>
    </>
  );
}
