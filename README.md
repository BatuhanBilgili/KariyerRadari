# KariyerRadarı

KariyerRadarı, belirlediğiniz anahtar kelimelere ve kriterlere göre birden fazla platformdan (LinkedIn, Indeed, İTÜ Arı Teknokent, Boğaziçi Kariyer) iş ilanlarını toplayıp, yapay zeka destekli özetlerle size Telegram veya E-posta üzerinden bildirim gönderen akıllı bir iş arama asistanıdır.

## Özellikler

- **Çoklu Platform:** LinkedIn, Indeed, İTÜ Arı Teknokent, Boğaziçi Kariyer.
- **Kesin Kelime Filtreleme:** Belirlediğiniz arama kelimeleri dışındaki ilanları almaz, alakasız işlerin bildirim olarak gelmesini engeller.
- **Üniversite İlanları:** İTÜ Arı Teknokent ve Boğaziçi Kariyer gibi sitelerde sadece **son 24 saat** içerisinde yayınlanmış, tamamen yeni ilanları çeker. Dilerseniz sadece kelimelere bağlı kalmadan tüm yeni yayınlanan üniversite ilanlarını görebilirsiniz.
- **Konum ve Uzaktan Çalışma (Remote):** Şehir bazlı arama yapabilir, Türkiye genelindeki remote ilanları ayrıca filtreleyebilirsiniz. İsterseniz **Global Remote** (Tüm Dünyadan Remote) seçeneğiyle yurtdışındaki remote fırsatlarını da yakalayabilirsiniz.
- **CV ve Kapak Mektubu Oluşturucu:** Telegram'a gelen iş ilanlarının altındaki linke tıkladığınızda, o ilanın özelliklerine ve gerekliliklerine uygun şekilde otomatik CV / Cover Letter oluşturabileceğiniz bir web sayfasına yönlendirilirsiniz.

## 🚀 Nasıl Kullanılır? (Bring Your Own Database)

KariyerRadarı tamamen **merkeziyetsiz ve ücretsiz** çalışır. Kendi veritabanınızı bağlayarak veri gizliliğinizi korurken hiçbir sunucu masrafı ödemezsiniz.

### 1. Siteye Giriş ve Veritabanı Bağlantısı
KariyerRadarı tek bir merkezden yayınlanır, kurulum (frontend) ile uğraşmazsınız.
1. Yayınlanan siteye (örn: `kariyerradari.com` veya Vercel/Netlify linkinize) girin.
2. Sizi karşılayan **Kurulum (Setup)** ekranına kendi Supabase URL'inizi ve Anon Key'inizi girin (Şifreleriniz sadece sizin tarayıcınızda kalır).
3. Artık **Dashboard** tamamen sizin veritabanınız üzerinden çalışır! Ayarlarınızı, arama kelimelerinizi ve çalışma tiplerinizi buradan kaydedebilirsiniz.

### 2. Arka Plan Otomasyonu (Scraper) İçin GitHub Fork
İlanları tarayan sistemin her gün otomatik çalışması için:
1. Bu repoyu kendi GitHub hesabınıza **Fork** edin.
2. Fork'ladığınız reponun **Settings > Secrets and variables > Actions** sayfasına gidin.
3. Aşağıdaki değişkenleri `New repository secret` olarak ekleyin:
   - `SUPABASE_URL`: Supabase projenizin URL adresi.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service_role key'i (ASLA ARAYÜZE GİRMEYİN).
   - `TELEGRAM_BOT_TOKEN`: Bildirim gönderecek botun token'ı (BotFather).
   - `GEMINI_API_KEY`: İlanların AI özelliklerini özetlemesi için Gemini API anahtarı (Opsiyonel).
4. Repo ana sayfasındaki **Actions** sekmesine tıklayıp "Enable workflows" diyerek otomatik görevleri aktif hale getirin.

*Dashboard Ayar Görünümü:*
![Dashboard Ayarları](dashboard_settings_1783941561840.png)

*Dashboard İlan Listesi:*
![Dashboard İlanlar](dashboard_jobs_1783941578637.png)

## Geliştiriciler İçin Lokal Kurulum
Sistemi kod düzeyinde geliştirmek isterseniz:

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend (Scraper)
```bash
cd scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
