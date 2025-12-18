// 🔧 EKSİK DENEME KAYITLARI DÜZELTME TOOL'U
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYfBhkLIfjqpnL9MxBhxW6iJeC0VAEDLk",
  authDomain: "kopruler-basari-portali.firebaseapp.com",
  projectId: "kopruler-basari-portali",
  storageBucket: "kopruler-basari-portali.appspot.com",
  messagingSenderId: "1089453954778",
  appId: "1:1089453954778:web:5c4b8e6e2b5c6a3e4f5g6h"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class EksikDenemeDuzeltici {
  constructor() {
    this.sorunluDenemeler = [];
    this.duzeltilenSayisi = 0;
  }

  async analyzeAndFix() {
    console.log('🔍 EKSİK DENEME KAYITLARI ANALİZİ VE DÜZELTMESİ');
    console.log('================================================\n');

    try {
      // 1. Tüm sonuçları getir ve examId'leri analiz et
      console.log('📊 1. Sonuç Verileri Analiz Ediliyor...');
      const resultsRef = collection(db, 'results');
      const resultsSnapshot = await getDocs(resultsRef);
      
      const sonuclar = [];
      resultsSnapshot.forEach(doc => {
        const data = doc.data();
        sonuclar.push({
          id: doc.id,
          examId: data.examId,
          studentId: data.studentId || data.ogrenciId,
          sinif: data.class || data.sinif,
          createdAt: data.createdAt
        });
      });
      
      console.log(`   ✅ ${sonuclar.length} sonuç kaydı bulundu`);

      // 2. Tüm denemeleri getir
      console.log('\n📋 2. Deneme Kayıtları Kontrol Ediliyor...');
      const denemelerRef = collection(db, 'denemeler');
      const denemelerSnapshot = await getDocs(denemelerRef);
      
      const denemeler = new Map(); // examId -> deneme data
      denemelerSnapshot.forEach(doc => {
        const data = doc.data();
        denemeler.set(doc.id, {
          id: doc.id,
          ad: data.name || data.ad || 'Bilinmeyen Deneme',
          tarih: data.date || data.tarih || 'Tarih bilinmiyor',
          siniflar: data.sinifList || data.sinifListesi || [],
          mevcut: true
        });
      });
      
      console.log(`   ✅ ${denemeler.size} deneme kaydı bulundu`);

      // 3. Sonuçlardaki examId'leri analiz et
      console.log('\n🔍 3. ExamId Tutarlılık Kontrolü...');
      const sonucExamIds = new Set(sonuclar.map(s => s.examId).filter(id => id));
      const denemeExamIds = new Set(denemeler.keys());
      
      // Sonuçlarda olan ama deneme kaydında olmayan examId'ler
      const eksikDenemeIds = [...sonucExamIds].filter(id => !denemeExamIds.has(id));
      
      // Deneme kaydında olan ama sonuçta olmayan examId'ler
      const kullanilmamDenemeIds = [...denemeExamIds].filter(id => !sonucExamIds.has(id));
      
      console.log(`   📊 Sonuçlarda bulunan examId sayısı: ${sonucExamIds.size}`);
      console.log(`   📊 Deneme kayıtlarında bulunan examId sayısı: ${denemeExamIds.size}`);
      
      if (eksikDenemeIds.length > 0) {
        console.log(`\n   ⚠️  EKSİK DENEME KAYITLARI BULUNDU!`);
        console.log(`   🚨 ${eksikDenemeIds.length} deneme kaydı eksik\n`);
        
        // Her eksik deneme için detay
        for (const examId of eksikDenemeIds) {
          const buExamSonuclar = sonuclar.filter(s => s.examId === examId);
          const siniflar = [...new Set(buExamSonuclar.map(s => s.sinif).filter(s => s))];
          const ogrenciSayisi = new Set(buExamSonuclar.map(s => s.studentId)).size;
          
          console.log(`   📝 Eksik Deneme: ${examId}`);
          console.log(`      📚 Sınıflar: ${siniflar.join(', ') || 'Belirtilmemiş'}`);
          console.log(`      👥 Öğrenci sayısı: ${ogrenciSayisi}`);
          console.log(`      📊 Sonuç kayıtları: ${buExamSonuclar.length}\n`);
          
          this.sorunluDenemeler.push({
            id: examId,
            siniflar: siniflar,
            ogrenciSayisi: ogrenciSayisi,
            sonucSayisi: buExamSonuclar.length
          });
        }
      }
      
      if (kullanilmamDenemeIds.length > 0) {
        console.log(`\n   📝 Kullanılmayan Deneme Kayıtları: ${kullanilmamDenemeIds.length}`);
        kullanilmamDenemeIds.slice(0, 5).forEach(id => {
          const deneme = denemeler.get(id);
          console.log(`   📄 ${deneme.ad} (${id})`);
        });
        if (kullanilmamDenemeIds.length > 5) {
          console.log(`   ... ve ${kullanilmamDenemeIds.length - 5} tane daha`);
        }
      }

      // 4. Düzeltme önerilerini göster
      console.log('\n🛠️ 4. Düzeltme Önerileri:');
      if (eksikDenemeIds.length > 0) {
        console.log('\n   🔧 EKSİK DENEME KAYITLARINI DÜZELTME SEÇENEKLERİ:');
        console.log('\n   Option 1: Otomatik Eksik Deneme Kaydı Oluştur');
        console.log('   - Sonuç verilerine dayanarak deneme kayıtları otomatik oluşturulur');
        console.log('   - Sınıf bilgileri ve temel bilgiler eklenir');
        console.log('\n   Option 2: Manuel Düzeltme');
        console.log('   - Panel > Deneme Yönetimi > Yeni Deneme Ekle');
        console.log('   - Eksik examId ile aynı bilgileri girin');
        console.log('\n   Option 3: Sonuç Verilerini Düzelt');
        console.log('   - Yanlış examId\'lere sahip sonuçları düzelt');
        console.log('   - Doğru deneme kayıtlarıyla eşleştir');
        
        await this.offerAutoFix(eksikDenemeIds, sonuclar, denemeler);
      } else {
        console.log('\n   ✅ Hiç eksik deneme kaydı bulunamadı!');
      }

      // 5. Sonuç özeti
      console.log('\n📊 DÜZELTME RAPORU:');
      console.log('====================');
      console.log(`🔢 Toplam sonuç kaydı: ${sonuclar.length}`);
      console.log(`📋 Toplam deneme kaydı: ${denemeler.size}`);
      console.log(`⚠️  Eksik deneme kaydı: ${eksikDenemeIds.length}`);
      console.log(`🔧 Düzeltilen kayıt sayısı: ${this.duzeltilenSayisi}`);
      
      if (eksikDenemeIds.length > 0) {
        console.log('\n🚨 DİKKAT: Eksik deneme kayıtları tespit edildi!');
        console.log('Bu durum Student Dashboard\'ta "Eksik Deneme Kaydı" uyarısı gösterir.');
        console.log('Yukarıdaki düzeltme seçeneklerinden birini uygulamanızı öneriyorum.');
      }

    } catch (error) {
      console.error('❌ Analiz hatası:', error);
    }
  }

  async offerAutoFix(eksikDenemeIds, sonuclar, mevcutDenemeler) {
    console.log('\n🤖 Otomatik Düzeltme Seçeneği:');
    console.log('================================');
    console.log('Eksik deneme kayıtlarını otomatik oluşturmak için "OTOMATIK_DUZELT" yazın.');
    console.log('(Şu an için sadece örnek çıktı gösterilir, gerçek Firebase güncellemesi yapılmaz)');
    
    // Demo: İlk 3 eksik deneme için örnek kayıt oluştur
    console.log('\n📝 ÖRNEK DENEME KAYITLARI (Otomatik Oluşturulacak):');
    console.log('-----------------------------------------------------');
    
    for (let i = 0; i < Math.min(3, eksikDenemeIds.length); i++) {
      const examId = eksikDenemeIds[i];
      const buExamSonuclar = sonuclar.filter(s => s.examId === examId);
      const siniflar = [...new Set(buExamSonuclar.map(s => s.sinif).filter(s => s))];
      const tarih = buExamSonuclar[0]?.createdAt ? new Date(buExamSonuclar[0].createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      console.log(`\nDeneme #${i + 1}:`);
      console.log(`  ID: ${examId}`);
      console.log(`  Ad: "Eksik Deneme - ${tarih}"`);
      console.log(`  Tarih: ${tarih}`);
      console.log(`  Sınıflar: [${siniflar.join(', ')}]`);
      console.log(`  Açıklama: "Otomatik oluşturulan eksik deneme kaydı"`);
    }
    
    console.log('\n💡 NOT: Bu örnek kayıtlar gerçek Firebase\'e yazılmayacak.');
    console.log('Manuel olarak Panel > Deneme Yönetimi\'nden bu bilgileri girebilirsiniz.');
    
    // Bu kısmı etkinleştirerek gerçek otomatik düzeltme yapabilirsiniz:
    // await this.performAutoFix(eksikDenemeIds, sonuclar);
  }

  async performAutoFix(eksikDenemeIds, sonuclar) {
    console.log('\n⚡ OTOMATİK DÜZELTME BAŞLATILIYOR...');
    
    for (const examId of eksikDenemeIds) {
      try {
        const buExamSonuclar = sonuclar.filter(s => s.examId === examId);
        const siniflar = [...new Set(buExamSonuclar.map(s => s.sinif).filter(s => s))];
        const tarih = buExamSonuclar[0]?.createdAt || new Date().toISOString();
        
        // Yeni deneme kaydı oluştur
        const yeniDeneme = {
          id: examId,
          name: `Eksik Deneme - ${new Date(tarih).toLocaleDateString('tr-TR')}`,
          ad: `Eksik Deneme - ${new Date(tarih).toLocaleDateString('tr-TR')}`,
          date: tarih,
          tarih: tarih,
          sinifList: siniflar,
          sinifListesi: siniflar,
          createdAt: new Date().toISOString(),
          olusturmaTarihi: new Date().toISOString(),
          description: 'Otomatik oluşturulan eksik deneme kaydı',
          aciklama: 'Otomatik oluşturulan eksik deneme kaydı'
        };
        
        const denemeRef = doc(db, 'denemeler', examId);
        await setDoc(denemeRef, yeniDeneme);
        
        console.log(`✅ Düzeltildi: ${examId} - ${yeniDeneme.name}`);
        this.duzeltilenSayisi++;
        
      } catch (error) {
        console.error(`❌ Hata: ${examId} düzeltilemedi:`, error);
      }
    }
  }
}

// Script'i çalıştır
const duzeltici = new EksikDenemeDuzeltici();
duzeltici.analyzeAndFix();