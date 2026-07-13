"""
KariyerRadarı — İTÜ Arı Teknokent Kariyer Scraper
https://kariyer.ariteknokent.com.tr/
"""

import uuid
import logging
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

ROOT_URL = "https://kariyer.ariteknokent.com.tr"
SCRAPE_URL = "https://kariyer.ariteknokent.com.tr/search"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}


def scrape_itu(keywords: list[str] | None = None) -> list[dict]:
    """
    İTÜ Arı Teknokent kariyer sayfasından ilanları çeker.
    
    Not: Bu site'nin ilanları garip başlıklara sahip olabilir,
    bu yüzden keywords filtresi geniş tutulur (case-insensitive, partial match).
    Eğer keywords boşsa tüm ilanlar döner.
    """
    all_jobs = []

    try:
        logger.info("İTÜ Arı Teknokent ilanları çekiliyor...")
        time.sleep(1)  # Rate limiting — sunucuyu yormamak için

        response = requests.get(SCRAPE_URL, params={"date": "0"}, headers=HEADERS, timeout=30)
        response.raise_for_status()
        response.encoding = "utf-8"

        soup = BeautifulSoup(response.text, "html.parser")

        # İlan kartlarını bul — yaygın CSS selektörler denenir
        # Not: Site yapısı değişebilir, bu selektörler güncellenebilir
        job_elements = (
            soup.select(".job-block-four")
            or soup.select(".job-listing")
            or soup.select(".ilan-card")
            or soup.select(".job-item")
            or soup.select("article")
            or soup.select(".card")
        )

        if not job_elements:
            # Fallback: Sadece '/ilan/' içeren linkleri tara (menü linklerini almamak için)
            logger.warning(
                "İTÜ: Spesifik ilan kartları bulunamadı, link tabanlı arama yapılıyor..."
            )
            all_links = soup.find_all("a", href=True)
            job_elements = [link for link in all_links if "/ilan/" in link.get("href", "").lower()]

        for element in job_elements:
            try:
                # Başlık çıkarma
                title_el = (
                    element.select_one("h2, h3, h4, .title, .job-title")
                    or element
                )
                title = title_el.get_text(strip=True)

                if not title or len(title) < 3:
                    continue

                title_lower = title.lower()
                invalid_keywords = [
                    "anasayfa", "hakkımızda", "iletişim", "sıkça sorulan",
                    "giriş yap", "kayıt ol", "kaydol", "başvur", "çerez",
                    "iş bul", "ariteknokent", "kariyer@", "+90"
                ]
                if any(kw in title_lower for kw in invalid_keywords):
                    continue

                # Link çıkarma
                link_el = element if element.name == "a" else element.select_one("a")
                url = ""
                if link_el and link_el.get("href"):
                    href = link_el["href"]
                    url = href if href.startswith("http") else f"{ROOT_URL}{href}"

                # Şirket adı
                company_el = element.select_one(
                    ".company, .firma, .company-name"
                )
                company = company_el.get_text(strip=True) if company_el else None

                # Konum
                location_el = element.select_one(
                    ".location, .konum, .city"
                )
                location = (
                    location_el.get_text(strip=True)
                    if location_el
                    else "İTÜ Arı Teknokent"
                )

                job = {
                    "id": str(uuid.uuid4()),
                    "platform": "itu",
                    "title": title,
                    "company": company,
                    "location": location,
                    "work_type": _detect_work_type(title),
                    "url": url,
                    "description": None,
                    "external_id": f"itu_{_hash_text(title + (company or ''))}",
                    "posted_at": None,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }

                all_jobs.append(job)

            except Exception as e:
                logger.debug(f"İTÜ ilan parse hatası: {e}")
                continue

        logger.info(f"İTÜ Arı Teknokent: {len(all_jobs)} ilan bulundu.")

    except requests.RequestException as e:
        logger.error(f"İTÜ Arı Teknokent sayfasına erişilemedi: {e}")
    except Exception as e:
        logger.error(f"İTÜ scraping hatası: {e}")

    # Keyword filtresi (opsiyonel — İTÜ ilanları garip başlıklı olabilir)
    if keywords:
        filtered = []
        for job in all_jobs:
            title_lower = (job.get("title") or "").lower()
            for kw in keywords:
                if kw.lower() in title_lower:
                    filtered.append(job)
                    break
        return filtered

    return all_jobs


def _detect_work_type(title: str) -> str:
    """Başlıktan çalışma tipini tespit eder."""
    title_lower = title.lower()
    if "remote" in title_lower or "uzaktan" in title_lower:
        return "remote"
    elif "hybrid" in title_lower or "hibrit" in title_lower:
        return "hybrid"
    elif "onsite" in title_lower or "ofis" in title_lower:
        return "onsite"
    return "unknown"


def _hash_text(text: str) -> str:
    """Metnin kısa hash'ini oluşturur (dedup için)."""
    import hashlib

    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12]
