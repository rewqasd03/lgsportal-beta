# 📄 PDF Export Kütüphaneleri Kurulum Talimatı

## 🎯 PDF Export Özelliği Eklendi!

Student-dashboard'a tam PDF export fonksiyonu eklendi. Özelliği kullanabilmek için kütüphaneleri yüklemeniz gerekiyor.

## 📦 Gerekli Kütüphaneler

### 1. Kütüphaneleri Yükleyin

Terminal'de proje klasöründe şu komutu çalıştırın:

```bash
npm install jspdf html2canvas
```

**veya**

```bash
yarn add jspdf html2canvas
```

### 2. TypeScript Tipleri (Opsiyonel)

```bash
npm install --save-dev @types/jspdf
```

## ✅ Kurulum Sonrası

1. **Kütüphaneler yüklendikten sonra** development sunucusunu yeniden başlatın:
   ```bash
   npm run dev
   ```

2. **Student-dashboard'a gidin** (`/student-dashboard?studentId=...`)

3. **"📄 PDF İndir" butonuna tıklayın** - Tüm 5 sayfa tek PDF'te indirilecek

## 📋 PDF İçeriği

PDF şu sayfaları içerir:
- **Sayfa 1:** Genel Görünüm (İstatistikler + Trend Grafiği)
- **Sayfa 2:** Net Gelişim (Çizgi Grafik + Analiz)
- **Sayfa 3:** Puan Gelişim (YENİ! Puan bazlı analiz + Grafik)
- **Sayfa 4:** Denemeler (Karşılaştırma Tablosu + Bar Grafik)
- **Sayfa 5:** Ders Bazında (Konu Analizi + Öneriler)

## 🔧 Sorun Giderme

### Kütüphane Yükleme Sorunu
```bash
# NPM cache'ini temizleyin
npm cache clean --force

# Node modules'ü silip yeniden yükleyin
rm -rf node_modules package-lock.json
npm install
npm install jspdf html2canvas
```

### PDF Oluşmama Sorunu
- Kütüphanelerin yüklendiğini kontrol edin
- Tarayıcı konsolunda hata var mı bakın
- Sayfa yenilemeyi deneyin

## 📱 Destek

Sorun yaşarsanız:
- **Geliştirici:** Murat UYSAL
- **E-posta:** uysal.mu07@gmail.com

---
**📌 Not:** Bu özellik sadece kütüphaneler yüklendikten sonra çalışacaktır.