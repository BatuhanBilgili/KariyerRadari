"""
KariyerRadarı — Boğaziçi Üniversitesi Kariyer Merkezi Scraper
"""

import uuid
import logging
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

ROOT_URL = "https://kariyermerkezi.bogazici.edu.tr"
SCRAPE_URL = "https://kariyermerkezi.bogazici.edu.tr/tr/is-ve-staj-ilanlari"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}


def scrape_bogazici(keywords: list[str] | None = None) -> list[dict]:
    """
    Boğaziçi Üniversitesi Kariyer Merkezi'nden ilanları çeker.
    
    Not: Resmi API olmadığından HTML scraping yapılır.
    Site yapısı değişirse bu fonksiyon güncellenmeli.
    """
    all_jobs = []

    try:
        logger.info("Boğaziçi Kariyer ilanları çekiliyor...")
        time.sleep(1)

        response = requests.get(SCRAPE_URL, headers=HEADERS, timeout=30)
        response.raise_for_status()
        response.encoding = "utf-8"

        soup = BeautifulSoup(response.text, "html.parser")

        # İlan kartlarını bul
        job_elements = (
            soup.select(".views-row")
            or soup.select(".job-listing")
            or soup.select(".ilan-card")
            or soup.select(".vacancy-item")
            or soup.select("article")
            or soup.select(".list-group-item")
        )

        if not job_elements:
            logger.warning(
                "Boğaziçi: Spesifik ilan kartları bulunamadı, link tabanlı arama yapılıyor..."
            )
            links = soup.find_all("a", href=True)
            for link in links:
                href = link.get("href", "")
                text = link.get_text(strip=True)
                # Sadece doğrudan iş ilanı olan /tr/is-ve-staj-ilanlari/... gibi sayfaları kabul et
                if "/is-ve-staj-ilanlari/" in href.lower() and len(href) > 25:
                    if text and len(text) > 5:
                        text_lower = text.lower()
                        invalid_keywords = [
                            "türkçe", "english", "hakkımızda", "iletişim", 
                            "kariyer seminer", "kariyer sohbet", "kariyer seçimi", 
                            "kariyer eylem", "akademik kariyer", "kariyer danışman",
                            "kariyer kapısı", "katılım başvuru", "sonraki", 
                            "@bogazici.edu.tr", "iş ve staj duyuruları"
                        ]
                        if any(kw in text_lower for kw in invalid_keywords):
                            continue
                        
                        url = href if href.startswith("http") else f"{ROOT_URL}{href}"
                        job = {
                            "id": str(uuid.uuid4()),
                            "platform": "bogazici",
                            "title": text,
                            "company": None,
                            "location": "Boğaziçi Üniversitesi",
                            "work_type": _detect_work_type(text),
                            "url": url,
                            "description": None,
                            "external_id": f"bogazici_{_hash_text(text)}",
                            "posted_at": None,
                            "scraped_at": datetime.now(timezone.utc).isoformat(),
                        }
                        all_jobs.append(job)
        else:
            for element in job_elements:
                try:
                    title_el = element.select_one(
                        "h2, h3, h4, .title, .job-title, td:first-child"
                    ) or element
                    title = title_el.get_text(strip=True)

                    if not title or len(title) < 3:
                        continue

                    title_lower = title.lower()
                    invalid_keywords = [
                        "türkçe", "english", "hakkımızda", "iletişim", 
                        "kariyer seminer", "kariyer sohbet", "kariyer seçimi", 
                        "kariyer eylem", "akademik kariyer", "kariyer danışman",
                        "kariyer kapısı", "katılım başvuru", "sonraki", 
                        "@bogazici.edu.tr", "iş ve staj duyuruları"
                    ]
                    if any(kw in title_lower for kw in invalid_keywords):
                        continue

                    link_el = (
                        element if element.name == "a" else element.select_one("a")
                    )
                    url = ""
                    if link_el and link_el.get("href"):
                        href = link_el["href"]
                        url = href if href.startswith("http") else f"{ROOT_URL}{href}"

                    company_el = element.select_one(
                        ".company, .firma, .company-name, td:nth-child(2)"
                    )
                    company = company_el.get_text(strip=True) if company_el else None

                    # Tarih filtresi (Son 24 saat)
                    date_el = element.select_one(".date-display-single")
                    posted_at = None
                    if date_el and date_el.has_attr("content"):
                        posted_at = date_el["content"]
                        try:
                            dt = datetime.fromisoformat(posted_at)
                            # 1 günden eskiyse atla
                            if (datetime.now(timezone.utc) - dt).days > 1:
                                continue
                        except Exception:
                            pass

                    job = {
                        "id": str(uuid.uuid4()),
                        "platform": "bogazici",
                        "title": title,
                        "company": company,
                        "location": "Boğaziçi Üniversitesi",
                        "work_type": _detect_work_type(title),
                        "url": url,
                        "description": None,
                        "external_id": f"bogazici_{_hash_text(title + (company or ''))}",
                        "posted_at": posted_at,
                        "scraped_at": datetime.now(timezone.utc).isoformat(),
                    }
                    all_jobs.append(job)

                except Exception as e:
                    logger.debug(f"Boğaziçi ilan parse hatası: {e}")
                    continue

        logger.info(f"Boğaziçi Kariyer: {len(all_jobs)} ilan bulundu.")

    except requests.RequestException as e:
        logger.error(f"Boğaziçi Kariyer sayfasına erişilemedi: {e}")
    except Exception as e:
        logger.error(f"Boğaziçi scraping hatası: {e}")

    # Keyword filtresi
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
    title_lower = title.lower()
    if "remote" in title_lower or "uzaktan" in title_lower:
        return "remote"
    elif "hybrid" in title_lower or "hibrit" in title_lower:
        return "hybrid"
    elif "onsite" in title_lower or "ofis" in title_lower:
        return "onsite"
    return "unknown"


def _hash_text(text: str) -> str:
    import hashlib
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:12]
