// Firebase Deneme Kayıtları Analizi ve Düzeltme Script
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');

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

async function analyzeMissingExams() {
  console.log('🔍 EKSİK DENEME KAYITLARI ANALİZİ BAŞLATILIYOR...\n');
  
  try {
    // 1. Tüm denemeleri getir
    console.log('📋 1. Mevcut Denemeler Kontrol Ediliyor...');
    const denemelerRef = collection(db, 'denemeler');
    const denemelerSnapshot = await getDocs(denemelerRef);
    
    const mevcutDenemeler = [];
    denemelerSnapshot.forEach(doc => {
      const data = doc.data();
      mevcutDenemeler.push({
        id: doc.id,
        ad: data.name || data.ad || 'Bilinmeyen Deneme',
        siniflar: data.sinifList || data.sinifListesi || [],
        createdAt: data.createdAt || data.olusturmaTarihi || 'Tarih yok',
        eksikOgrenciler: []
      });
    });
    
    console.log(`✅ Toplam ${mevcutDenemeler.length} deneme bulundu:\n`);
    mevcutDenemeler.forEach(deneme => {
      console.log(`   📝 ${deneme.ad} (ID: ${deneme.id})`);
      console.log(`      Sınıflar: ${deneme.siniflar.join(', ') || 'Belirtilmemiş'}`);
      console.log(`      Tarih: ${deneme.createdAt}\n`);
    });
    
    // 2. Tüm öğrencileri getir
    console.log('👥 2. Öğrenciler Kontrol Ediliyor...');
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);
    
    const ogrenciler = [];
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      ogrenciler.push({
        id: doc.id,
        ad: data.name || 'Bilinmeyen Öğrenci',
        sinif: data.class || data.sinif || 'Sınıf belirtilmemiş'
      });
    });
    
    console.log(`✅ Toplam ${ogrenciler.length} öğrenci bulundu:\n`);
    const sinifGruplari = {};
    ogrenciler.forEach(ogrenci => {
      if (!sinifGruplari[ogrenci.sinif]) {
        sinifGruplari[ogrenci.sinif] = [];
      }
      sinifGruplari[ogrenci.sinif].push(ogrenci);
    });
    
    Object.entries(sinifGruplari).forEach(([sinif, ogrenciListesi]) => {
      console.log(`   🏛️ ${sinif}. Sınıf: ${ogrenciListesi.length} öğrenci`);
    });
    console.log('');
    
    // 3. Her deneme için eksik kayıtları kontrol et
    console.log('🔍 3. Eksik Kayıt Kontrolü Başlatılıyor...\n');
    
    let toplamEksikKayit = 0;
    let toplamOlasilikliEksik = 0;
    
    for (const deneme of mevcutDenemeler) {
      console.log(`📝 Analiz Ediliyor: ${deneme.ad}`);
      
      // Bu denemeye ait sonuçları getir
      const resultsRef = collection(db, 'results');
      const denemeSonuclariQuery = query(
        resultsRef,
        where('examId', '==', deneme.id)
      );
      const sonuclarSnapshot = await getDocs(denemeSonuclariQuery);
      
      const mevcutSonuclar = [];
      sonuclarSnapshot.forEach(doc => {
        const data = doc.data();
        mevcutSonuclar.push({
          ogrenciId: data.studentId || data.ogrenciId,
          ogrenciAd: data.studentName || 'Bilinmeyen',
          sinif: data.class || data.sinif || 'Belirtilmemiş'
        });
      });
      
      console.log(`   📊 Mevcut sonuç sayısı: ${mevcutSonuclar.length}`);
      
      // Hedef sınıflardaki öğrencileri kontrol et
      const hedefOgrenciler = [];
      for (const sinif of deneme.siniflar) {
        const sinifOgrencileri = sinifGruplari[sinif] || [];
        hedefOgrenciler.push(...sinifOgrencileri);
      }
      
      console.log(`   🎯 Hedef öğrenci sayısı: ${hedefOgrenciler.length}`);
      
      // Eksik kayıtları tespit et
      const mevcutOgrenciIds = new Set(mevcutSonuclar.map(s => s.ogrenciId));
      const eksikOgrenciler = hedefOgrenciler.filter(o => !mevcutOgrenciIds.has(o.id));
      
      if (eksikOgrenciler.length > 0) {
        console.log(`   ⚠️  EKSİK KAYITLAR BULUNDU!`);
        console.log(`   🚨 ${eksikOgrenciler.length} öğrencinin sonucu yok`);
        
        // Sınıf bazında detay
        const eksikSinifGruplari = {};
        eksikOgrenciler.forEach(ogrenci => {
          if (!eksikSinifGruplari[ogrenci.sinif]) {
            eksikSinifGruplari[ogrenci.sinif] = [];
          }
          eksikSinifGruplari[ogrenci.sinif].push(ogrenci);
        });
        
        Object.entries(eksikSinifGruplari).forEach(([sinif, eksikOgrenciler]) => {
          console.log(`      📚 ${sinif}. Sınıf: ${eksikOgrenciler.length} eksik`);
          eksikOgrenciler.slice(0, 5).forEach(ogr => {
            console.log(`         ❌ ${ogr.ad} (ID: ${ogr.id})`);
          });
          if (eksikOgrenciler.length > 5) {
            console.log(`         ... ve ${eksikOgrenciler.length - 5} öğrenci daha`);
          }
        });
        
        deneme.eksikOgrenciler = eksikOgrenciler;
        toplamEksikKayit += eksikOgrenciler.length;
        toplamOlasilikliEksik += Math.max(0, hedefOgrenciler.length - mevcutSonuclar.length);
      } else {
        console.log(`   ✅ Tüm hedef öğrencilerin sonuçları var`);
      }
      
      console.log('');
    }
    
    // 4. Özet
    console.log('📊 EKSİK KAYIT ANALİZ RAPORU');
    console.log('============================');
    console.log(`🔢 Toplam Deneme Sayısı: ${mevcutDenemeler.length}`);
    console.log(`👥 Toplam Öğrenci Sayısı: ${ogrenciler.length}`);
    console.log(`⚠️  Toplam Eksik Kayıt: ${toplamEksikKayit}`);
    console.log(`📈 Olasılık Eksik Kayıt: ${toplamOlasilikliEksik}`);
    
    if (toplamEksikKayit > 0) {
      console.log('\n🚨 SORUN TESPİT EDİLDİ!');
      console.log('Eksik deneme kayıtları var. Bu sorunu düzeltmek için:');
      console.log('1. Öğretmen panelinde manuel olarak eksik sonuçları girin');
      console.log('2. Excel/PDF import ile toplu sonuç ekleyin');
      console.log('3. Mevcut sonuçları kontrol edin ve eksikleri tamamlayın');
    } else {
      console.log('\n✅ MÜKEMMEL! Hiç eksik kayıt bulunamadı.');
    }
    
    return {
      denemeler: mevcutDenemeler,
      ogrenciler: ogrenciler,
      eksikKayitlar: mevcutDenemeler.filter(d => d.eksikOgrenciler.length > 0)
    };
    
  } catch (error) {
    console.error('❌ Analiz hatası:', error);
    return null;
  }
}

// Script'i çalıştır
analyzeMissingExams();