# Başarı Takip Sistemi

Modern bir öğrenci başarı takip sistemi uygulaması. Bu uygulama öğrencilerin sınav sonuçlarını takip etmesine, hedefler belirlemesine ve performans analizini gerçekleştirmesine olanak sağlar.

## 🚀 Özellikler

- 📊 **Sınav Sonucu Takibi**: Tüm sınav sonuçlarını görselleştirme ve takip
- 🎯 **Hedef Belirleme**: Net skorları ve performans hedefleri belirleme
- 📈 **İstatistiksel Analiz**: Detaylı performans grafikleri ve analizi
- 🎨 **Modern UI/UX**: Kullanıcı dostu ve responsive tasarım
- 🔥 **Firebase Entegrasyonu**: Gerçek zamanlı veri senkronizasyonu
- 📱 **Responsive Design**: Tüm cihazlarda mükemmel görünüm

## 🛠️ Teknolojiler

- **Frontend**: Next.js 14.2.5 + React 18.3.1
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Firebase Firestore
- **TypeScript**: Type safety için
- **Package Manager**: pnpm

## 📦 Kurulum

1. **Repository'yi klonlayın**:
```bash
git clone https://github.com/[kullanıcı-adı]/basari-takip-sistemi.git
cd basari-takip-sistemi
```

2. **Dependencies'leri yükleyin**:
```bash
npm install
# veya
pnpm install
```

3. **Environment variables'ları ayarlayın**:
```bash
# .env.local dosyası oluşturun ve Firebase konfigürasyonunuzu ekleyin
cp .env.example .env.local
```

4. **Development server'ı başlatın**:
```bash
npm run dev
```

5. **Tarayıcıda açın**: http://localhost:3000

## 🔧 Konfigürasyon

### Firebase Setup

1. [Firebase Console](https://console.firebase.google.com)'a gidin
2. Yeni bir proje oluşturun
3. Firestore Database'i etkinleştirin
4. Web app oluşturun ve konfigürasyonu alın
5. `.env.local` dosyasına Firebase ayarlarınızı ekleyin:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 📊 Veri Yapısı

### Öğrenci Verileri
```typescript
interface Student {
  id: string;
  name: string;
  class: string;
  targets: StudentTargets;
}
```

### Sınav Verileri
```typescript
interface Exam {
  id: string;
  name: string;
  date: string;
  results: Result[];
}
```

### Sonuç Verileri
```typescript
interface Result {
  subject: string;
  score: number;
  correct: number;
  wrong: number;
  net: number;
}
```

## 🎨 UI Bileşenleri

- **Dashboard**: Ana sayfa özet istatistikleri
- **ScoreChart**: Sınav sonuçlarının zaman serisi grafiği
- **TargetAnalysis**: Hedef analiz tablosu
- **SubjectGraphs**: Branş bazlı performans grafikleri
- **GoalDistance**: Hedef net uzaklığı gösterimi

## 🚀 Deployment

### Vercel ile Deployment (Önerilen)

1. Bu repository'yi GitHub'a yükleyin
2. [Vercel](https://vercel.com)'da hesap oluşturun
3. "New Project" > "Import Git Repository" seçin
4. Bu repository'yi seçin
5. Deploy butonuna tıklayın

### Manual Build ve Deploy

```bash
# Production build
npm run build

# Build kontrol
ls -la .next

# Production server başlat
npm start
```

## 📁 Proje Yapısı

```
basari-takip-sistemi/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── student-dashboard/  # Ana dashboard sayfası
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Yeniden kullanılabilir bileşenler
│   ├── lib/                    # Utility fonksiyonları
│   └── firebase.ts            # Firebase konfigürasyonu
├── public/                     # Static assets
├── .env.local                  # Environment variables
├── next.config.js              # Next.js konfigürasyonu
├── tsconfig.json               # TypeScript konfigürasyonu
├── tailwind.config.js          # Tailwind CSS konfigürasyonu
└── package.json                # Dependencies ve scripts
```

## 🧪 Test

```bash
# Lint kontrolü
npm run lint

# TypeScript kontrolü
npx tsc --noEmit
```

## 🤝 Katkıda Bulunma

1. Repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 Destek

Herhangi bir sorun veya öneri için GitHub Issues kullanabilirsiniz.

## 🙏 Teşekkürler

- Next.js ekibine güçlü framework için
- Firebase ekibine backend servisleri için
- Recharts ekibine grafik bileşenleri için
- Tailwind CSS ekibine styling framework için