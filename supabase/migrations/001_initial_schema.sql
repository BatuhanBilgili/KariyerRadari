-- ============================================
-- KariyerRadarı — Veritabanı Şeması
-- Supabase PostgreSQL
-- ============================================

-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS tablosu
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    telegram_chat_id TEXT,
    notification_method TEXT NOT NULL DEFAULT 'telegram' 
        CHECK (notification_method IN ('telegram', 'email', 'both')),
    notification_time TEXT NOT NULL DEFAULT '09:00',
    timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    search_keywords TEXT[] NOT NULL DEFAULT '{}',
    locations TEXT[] NOT NULL DEFAULT '{}',
    fetch_all_univ BOOLEAN NOT NULL DEFAULT false,
    experience_levels TEXT[] NOT NULL DEFAULT '{}',
    remote_global BOOLEAN NOT NULL DEFAULT false,
    work_types TEXT[] NOT NULL DEFAULT '{remote, hybrid, onsite}',
    platforms TEXT[] NOT NULL DEFAULT '{linkedin}',
    -- Kullanıcı profil bilgileri (AI CV Builder için)
    github_url TEXT,
    kaggle_url TEXT,
    linkedin_url TEXT,
    old_cv_text TEXT,
    -- API key'ler (şifreli saklanır)
    gemini_api_key TEXT,
    -- Zaman damgaları
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. JOB_LISTINGS tablosu
-- ============================================
CREATE TABLE IF NOT EXISTS job_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL 
        CHECK (platform IN ('linkedin', 'indeed', 'itu', 'bogazici')),
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    work_type TEXT DEFAULT 'unknown'
        CHECK (work_type IN ('remote', 'hybrid', 'onsite', 'unknown')),
    url TEXT,
    description TEXT,
    ai_summary TEXT,
    external_id TEXT,
    posted_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Platform + external_id benzersiz olmalı (mükerrer ilanları önlemek için)
    UNIQUE(platform, external_id)
);

-- ============================================
-- 3. SENT_NOTIFICATIONS tablosu
-- Hangi ilanın hangi kullanıcıya gönderildiğini takip eder
-- Aynı ilanı tekrar göndermemek için kullanılır
-- ============================================
CREATE TABLE IF NOT EXISTS sent_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('telegram', 'email')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Aynı ilan aynı kullanıcıya aynı kanal üzerinden tekrar gönderilmesin
    UNIQUE(user_id, job_id, channel)
);

-- ============================================
-- 4. İNDEKSLER
-- ============================================
CREATE INDEX IF NOT EXISTS idx_job_listings_platform ON job_listings(platform);
CREATE INDEX IF NOT EXISTS idx_job_listings_scraped_at ON job_listings(scraped_at);
CREATE INDEX IF NOT EXISTS idx_job_listings_work_type ON job_listings(work_type);
CREATE INDEX IF NOT EXISTS idx_sent_notifications_user_id ON sent_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_notifications_job_id ON sent_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_sent_notifications_user_job ON sent_notifications(user_id, job_id);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Users tablosu için RLS (Tek kullanıcılı sistem olduğu için okuma/yazmaya izin veriyoruz)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all data" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update data" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Users can insert data" ON users
    FOR INSERT WITH CHECK (true);

-- Job listings herkes tarafından okunabilir
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job listings are viewable by everyone" ON job_listings
    FOR SELECT USING (true);

-- Service role ile insert/update (scraper için)
CREATE POLICY "Service role can manage job listings" ON job_listings
    FOR ALL USING (auth.role() = 'service_role');

-- Sent notifications
ALTER TABLE sent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON sent_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON sent_notifications
    FOR ALL USING (auth.role() = 'service_role');
