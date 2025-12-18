# 🛠️ Firebase Manuel Temizlik Rehberi

## Adım 1: Firebase Konsoluna Git
1. [Firebase Console](https://console.firebase.google.com/) adresine git
2. **kopruler-basari-portali** projesini seç
3. Sol menüden **Firestore Database**'e tıkla

## Adım 2: Veri Analizi
### Exams Koleksiyonu:
- **exams** koleksiyonuna git
- Toplam **document sayısını** not al
- Document ID'lerini listele

### Results Koleksiyonu:
- **results** koleksiyonuna git  
- Toplam **document sayısını** not al
- Her document'ın **examId** alanını kontrol et

## Adım 3: Eksik Referansları Bul
1. Results tablosundaki her examId'yi al
2. Bu examId'lerin exams tablosunda olup olmadığını kontrol et
3. Exams tablosunda olmayan examId'leri listele

## Adım 4: Temizleme
### Seçenek A: Eksik Results'ları Sil
1. Results koleksiyonunda **where clause** kullan:
   ```javascript
   examId IN ['missingId1', 'missingId2']
   ```
2. Bulunan documentları **Delete** butonuyla sil

### Seçenek B: Eksik Exams'ları Oluştur
1. Exams koleksiyonuna **Add Document**
2. **Document ID**'yi eksik examId yap
3. **Fields**'ları doldur:
   ```
   title: "MUBA Deneme X"
   date: "2025-XX-XX"
   generalAverages: {}
   ```

## Adım 5: Doğrulama
1. Her iki koleksiyonda da işlem sonrası sayıları kontrol et
2. Student Dashboard'ı test et
3. "Eksik Deneme Kaydı" mesajının kaybolduğunu doğrula

## 🚨 Güvenlik Uyarısı
- **Yedek Al**: İşlemler öncesi veritabanının yedeğini al
- **Küçük Adımlarla**: Önce küçük bir grup ile test et
- **Dokümantasyon**: Yapılan değişiklikleri not al