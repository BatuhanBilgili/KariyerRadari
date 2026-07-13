"""
TalentRadar — Ana Scraper Orchestrator
GitHub Actions cron ile çalışır.

Akış:
1. Supabase'den tüm kullanıcıları çek
2. Her kullanıcı için:
   a. Seçili platformlarda arama kelimelerine göre ilanları tara
   b. Work type filtresini uygula
   c. DB'de daha önce gönderilmiş mi kontrol et
   d. Yeni ilanlar varsa → Gemini ile özet oluştur
   e. Telegram/E-posta ile bildirim gönder
   f. sent_notifications tablosuna kaydet
3. Yeni ilan yoksa → platform için "ilan bulunamadı" mesajı
"""

import os
import sys
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

# .env dosyasını yükle (lokal geliştirme için)
load_dotenv()

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("KariyerRadarı")

# Import'lar
from db.supabase_client import (
    get_supabase_client,
    get_all_users,
    upsert_job_listing,
    get_sent_job_ids_for_user,
    record_sent_notification,
    cleanup_old_data,
)
from scrapers.linkedin_scraper import scrape_linkedin
from scrapers.indeed_scraper import scrape_indeed
from scrapers.itu_scraper import scrape_itu
from scrapers.bogazici_scraper import scrape_bogazici
from ai.summarizer import batch_summarize_jobs
from notifiers.telegram_notifier import send_telegram_message, format_job_notification
from notifiers.email_notifier import send_email_notification, format_email_html


# Platform → scraper fonksiyonu eşleştirmesi
PLATFORM_SCRAPERS = {
    "linkedin": scrape_linkedin,
    "indeed": scrape_indeed,
    "itu": scrape_itu,
    "bogazici": scrape_bogazici,
}

# Platform → görüntüleme adı
PLATFORM_DISPLAY = {
    "linkedin": "LinkedIn",
    "indeed": "Indeed",
    "itu": "İTÜ Arı Teknokent",
    "bogazici": "Boğaziçi Kariyer",
}


def main():
    """Ana çalışma fonksiyonu."""
    logger.info("=" * 60)
    logger.info("KariyerRadarı — Scraper başlatıldı")
    logger.info(f"Zaman: {datetime.now(timezone.utc).isoformat()}")
    logger.info("=" * 60)

    # Supabase bağlantısı
    try:
        client = get_supabase_client()
        logger.info("✅ Supabase bağlantısı başarılı")
    except Exception as e:
        logger.error(f"❌ Supabase bağlantı hatası: {e}")
        sys.exit(1)

    # Kullanıcıları çek
    users = get_all_users(client)
    if not users:
        logger.warning("⚠️ Hiç kullanıcı bulunamadı!")
        return
    logger.info(f"👥 {len(users)} kullanıcı bulundu.")

    # Her kullanıcı için işlem
    for user in users:
        try:
            process_user(client, user)
        except Exception as e:
            logger.error(
                f"❌ Kullanıcı işleme hatası (ID: {user.get('id', '?')}): {e}"
            )
            continue

    # Temizlik Aşaması: 30 günden eski ilanları hafızadan ve veritabanından sil
    logger.info("🧹 Temizlik aşaması başlatılıyor (30 günden eski ilanlar)...")
    try:
        cleanup_old_data(client, days_old=30)
    except Exception as e:
        logger.error(f"❌ Temizlik hatası: {e}")

    logger.info("=" * 60)
    logger.info("KariyerRadarı — Scraper tamamlandı")
    logger.info("=" * 60)


def process_user(client, user: dict):
    """Tek bir kullanıcı için tam scraping ve bildirim akışı."""
    user_id = user["id"]
    user_keywords = user.get("search_keywords", [])
    user_platforms = user.get("platforms", ["linkedin"])
    user_locations = user.get("locations", [])
    fetch_all_univ = user.get("fetch_all_univ", False)
    user_experience_levels = user.get("experience_levels", [])
    remote_global = user.get("remote_global", False)
    user_work_types = user.get("work_types", ["remote", "hybrid", "onsite"])
    notif_method = user.get("notification_method", "telegram")
    telegram_id = user.get("telegram_chat_id")
    email = user.get("email")

    logger.info(f"\n--- Kullanıcı: {user_id} ---")
    logger.info(f"  Keywords: {user_keywords}")
    logger.info(f"  Locations: {user_locations}")
    logger.info(f"  Platforms: {user_platforms}")
    logger.info(f"  Experience Levels: {user_experience_levels}")
    logger.info(f"  Remote Global: {remote_global}")
    logger.info(f"  Work Types: {user_work_types}")
    logger.info(f"  Fetch All Univ: {fetch_all_univ}")
    logger.info(f"  Notification: {notif_method}")

    if not user_keywords and not fetch_all_univ:
        logger.warning(f"  ⚠️ Kullanıcının arama kelimesi yok, atlanıyor.")
        return

    # Daha önce gönderilmiş ilanların ID'lerini al
    sent_job_ids = get_sent_job_ids_for_user(client, user_id)
    logger.info(f"  📦 Daha önce gönderilen ilan sayısı: {len(sent_job_ids)}")

    # Her platform için ilanları çek
    new_jobs_by_platform: dict[str, list[dict]] = {}
    no_results_platforms: list[str] = []

    for platform in user_platforms:
        scraper_fn = PLATFORM_SCRAPERS.get(platform)
        if not scraper_fn:
            logger.warning(f"  ⚠️ Bilinmeyen platform: {platform}")
            continue

        platform_display = PLATFORM_DISPLAY.get(platform, platform)

        try:
            # İlanları çek
            if platform == "linkedin":
                jobs = scrape_linkedin(
                    keywords=user_keywords,
                    locations=user_locations,
                    experience_levels=user_experience_levels,
                    work_types=user_work_types
                )
            elif platform == "indeed":
                jobs = scrape_indeed(keywords=user_keywords, locations=user_locations)
            elif platform == "itu":
                univ_keywords = [] if fetch_all_univ else user_keywords
                jobs = scrape_itu(keywords=univ_keywords)
            elif platform == "bogazici":
                univ_keywords = [] if fetch_all_univ else user_keywords
                jobs = scrape_bogazici(keywords=univ_keywords)
            else:
                jobs = []

            # Work type filtresi
            if user_work_types:
                jobs = [
                    j
                    for j in jobs
                    if j.get("work_type", "unknown") in user_work_types
                    or j.get("work_type") == "unknown"
                ]

            # Konum filtresi (LinkedIn ve Indeed için "diğer alanlardan ilanlar"ı temizlemek için)
            if platform in ("linkedin", "indeed") and user_locations:
                filtered_jobs = []
                for j in jobs:
                    job_loc = str(j.get("location", "")).lower()
                    match = False
                    for u_loc in user_locations:
                        u_loc_lower = u_loc.lower().strip()
                        if u_loc_lower in job_loc:
                            match = True
                            break
                        if u_loc_lower == "türkiye" and "turkey" in job_loc:
                            match = True
                            break
                        if u_loc_lower == "turkey" and "türkiye" in job_loc:
                            match = True
                            break
                    # Eğer kullanıcı remote_global seçmişse ve işin tipi remote ise konumdan bağımsız kabul et
                    if remote_global and j.get("work_type") == "remote":
                        match = True
                        
                    if match:
                        filtered_jobs.append(j)
                jobs = filtered_jobs

            # Kesin Kelime (Keyword) Filtresi (Arama kelimeleri dışındaki alakasız ilanları engellemek için)
            if user_keywords:
                strict_filtered = []
                for j in jobs:
                    # İTÜ ve Boğaziçi için 'fetch_all_univ' aktifse kelime filtresini es geç
                    if fetch_all_univ and j.get("platform") in ("itu", "bogazici"):
                        strict_filtered.append(j)
                        continue
                    
                    title_desc = f"{j.get('title', '')} {j.get('description', '')}".lower()
                    if any(kw.lower() in title_desc for kw in user_keywords):
                        strict_filtered.append(j)
                jobs = strict_filtered

            # Veritabanında zaten var olan ilanların ID'lerini jobs listesine eşle
            # Böylece DB'deki gerçek ID'ler üzerinden filtreleme yapabiliriz
            external_ids = [j["external_id"] for j in jobs if "external_id" in j]
            if external_ids:
                # PostgREST in_ filter has a limit, but typically jobs per platform < 100
                existing_res = client.table("job_listings").select("id, external_id").eq("platform", platform).in_("external_id", external_ids).execute()
                existing_map = {row["external_id"]: row["id"] for row in (existing_res.data or [])}

                for job in jobs:
                    if job["external_id"] in existing_map:
                        job["id"] = existing_map[job["external_id"]]

            # İlanları DB'ye kaydet
            for job in jobs:
                upsert_job_listing(client, job)

            # Daha önce gönderilmemiş ilanları filtrele
            new_jobs = [j for j in jobs if j.get("id") not in sent_job_ids]

            if new_jobs:
                logger.info(
                    f"  ✅ {platform_display}: {len(new_jobs)} yeni ilan"
                )
                new_jobs_by_platform[platform_display] = new_jobs
            else:
                logger.info(
                    f"  📭 {platform_display}: Yeni ilan bulunamadı"
                )
                no_results_platforms.append(platform_display)

        except Exception as e:
            logger.error(f"  ❌ {platform_display} scraping hatası: {e}")
            no_results_platforms.append(platform_display)

    # Hiç yeni ilan yoksa bile bildirim gönder
    all_new_jobs = [
        job for jobs in new_jobs_by_platform.values() for job in jobs
    ]

    if all_new_jobs:
        # AI özetleri oluştur (Opsiyonel)
        gemini_api_key = user.get("gemini_api_key")
        if gemini_api_key or os.environ.get("GEMINI_API_KEY"):
            logger.info(f"  🤖 {len(all_new_jobs)} ilan için AI özeti oluşturuluyor...")
            all_new_jobs = batch_summarize_jobs(all_new_jobs, api_key=gemini_api_key)
        else:
            logger.info(f"  🤖 Gemini API Key bulunamadı, AI özeti adımı atlanıyor.")

        # Özetleri platform dict'ine geri yaz
        idx = 0
        for platform_name in new_jobs_by_platform:
            for i in range(len(new_jobs_by_platform[platform_name])):
                if idx < len(all_new_jobs):
                    new_jobs_by_platform[platform_name][i] = all_new_jobs[idx]
                    idx += 1

    # Website/Dashboard URL'sini al ve ilanlara ekle
    website_url = os.environ.get("WEBSITE_URL", "https://kariyerradari.netlify.app/")
    for platform_name in new_jobs_by_platform:
        for job in new_jobs_by_platform[platform_name]:
            job['cv_builder_url'] = f"{website_url.rstrip('/')}/cv-builder/?jobId={job['id']}"

    # Bildirim gönder
    _send_notifications(
        user=user,
        jobs_by_platform=new_jobs_by_platform,
        no_results_platforms=no_results_platforms,
        notif_method=notif_method,
        telegram_id=telegram_id,
        email=email,
    )

    # Gönderilen ilanları kaydet
    for platform_name, jobs in new_jobs_by_platform.items():
        for job in jobs:
            if notif_method in ("telegram", "both") and telegram_id:
                record_sent_notification(client, user_id, job["id"], "telegram")
            if notif_method in ("email", "both") and email:
                record_sent_notification(client, user_id, job["id"], "email")





def _send_notifications(
    user: dict,
    jobs_by_platform: dict[str, list[dict]],
    no_results_platforms: list[str],
    notif_method: str,
    telegram_id: str | None,
    email: str | None,
):
    """Kullanıcıya bildirim gönderir."""

    # Telegram
    if notif_method in ("telegram", "both") and telegram_id:
        message = format_job_notification(jobs_by_platform, no_results_platforms)
        success = send_telegram_message(chat_id=telegram_id, message=message)
        if success:
            logger.info("  📱 Telegram bildirimi gönderildi")
        else:
            logger.error("  ❌ Telegram bildirimi gönderilemedi")

    # E-posta
    if notif_method in ("email", "both") and email:
        total = sum(len(jobs) for jobs in jobs_by_platform.values())
        subject = f"KariyerRadarı — {total} Yeni İş İlanı" if total > 0 else "KariyerRadarı — Günlük Rapor"
        html_body = format_email_html(jobs_by_platform, no_results_platforms)
        success = send_email_notification(
            to_email=email,
            subject=subject,
            html_body=html_body,
        )
        if success:
            logger.info("  📧 E-posta bildirimi gönderildi")
        else:
            logger.error("  ❌ E-posta bildirimi gönderilemedi")


if __name__ == "__main__":
    main()
