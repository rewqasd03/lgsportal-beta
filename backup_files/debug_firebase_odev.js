// Firebase Ödev Takibi Debug Script
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function debugOdevData() {
  console.log('🔍 Firebase Ödev Verileri Debug Başlatılıyor...\n');
  
  try {
    // Ödevler collection'unu kontrol et
    const odevlerRef = collection(db, 'odevler');
    const odevlerSnapshot = await getDocs(odevlerRef);
    
    console.log(`📊 Toplam ödev kaydı: ${odevlerSnapshot.size}\n`);
    
    if (odevlerSnapshot.size > 0) {
      console.log('📋 Son 10 ödev kaydı:');
      let count = 0;
      odevlerSnapshot.forEach(doc => {
        if (count < 10) {
          const data = doc.data();
          console.log(`\n🔸 Doc ID: ${doc.id}`);
          console.log(`   Ogrenci ID: ${data.ogrenciId || 'YOK'}`);
          console.log(`   Deneme ID: ${data.denemeId || 'YOK'}`);
          console.log(`   Sinif: ${data.sinif || 'YOK'}`);
          console.log(`   Ders Durumu:`, data.dersDurumu || 'YOK');
          
          // Ders durumları kontrolü
          if (data.dersDurumu) {
            const dersler = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
            console.log(`   🔍 Ders Kontrolü:`);
            dersler.forEach(ders => {
              if (ders in data.dersDurumu) {
                console.log(`   ✅ ${ders}: ${data.dersDurumu[ders]}`);
              } else {
                console.log(`   ❌ ${ders}: EKSİK!`);
              }
            });
          }
          count++;
        }
      });
    }
    
    // 7. sınıf ödevlerini özel kontrol
    console.log('\n🎯 7. Sınıf Ödevleri Özel Kontrol:');
    const yedinciSinifQuery = query(
      odevlerRef, 
      where('sinif', '==', 7)
    );
    const yedinciSinifSnapshot = await getDocs(yedinciSinifQuery);
    
    console.log(`📊 7. Sınıf ödev kaydı: ${yedinciSinifSnapshot.size}`);
    
    if (yedinciSinifSnapshot.size > 0) {
      let sorunluKayit = 0;
      yedinciSinifSnapshot.forEach(doc => {
        const data = doc.data();
        if (!data.dersDurumu || !('turkce' in data.dersDurumu)) {
          sorunluKayit++;
          console.log(`\n🚨 SORUNLU KAYIT #${sorunluKayit}:`);
          console.log(`   Doc ID: ${doc.id}`);
          console.log(`   Ogrenci ID: ${data.ogrenciId || 'YOK'}`);
          console.log(`   Deneme ID: ${data.denemeId || 'YOK'}`);
          console.log(`   Ders Durumu:`, data.dersDurumu || 'YOK');
        }
      });
      
      if (sorunluKayit === 0) {
        console.log('✅ 7. Sınıf kayıtlarında sorun bulunamadı');
      }
    } else {
      console.log('❌ Hiç 7. sınıf ödev kaydı bulunamadı');
    }
    
    // Test denemesi kontrolü
    console.log('\n🎲 Test Denemesi Kontrol:');
    const denemelerRef = collection(db, 'denemeler');
    const denemelerSnapshot = await getDocs(denemelerRef);
    
    console.log(`📊 Toplam deneme: ${denemelerSnapshot.size}`);
    
    denemelerSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\n🔸 Deneme: ${doc.id}`);
      console.log(`   Ad: ${data.name || data.ad || 'YOK'}`);
      console.log(`   Hedef Sınıflar: ${data.sinifList || 'YOK'}`);
      console.log(`   Oluşturma Tarihi: ${data.createdAt?.toDate?.() || data.olusturmaTarihi || 'YOK'}`);
    });
    
  } catch (error) {
    console.error('❌ Firebase debug hatası:', error);
  }
}

debugOdevData();