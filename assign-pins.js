#!/usr/bin/env node

// PIN atama script'i - mevcut öğrencilere otomatik PIN atar
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase config (firebase.ts'den kopyalandı)
const firebaseConfig = {
  apiKey: "AIzaSyBYfBhkLIfjqpnL9MxBhxW6iJeC0VAEDLk",
  authDomain: "kopruler-basari-portali.firebaseapp.com",
  projectId: "kopruler-basari-portali",
  storageBucket: "kopruler-basari-portali.firebasestorage.app",
  messagingSenderId: "318334276429",
  appId: "1:318334276429:web:7caa5e5b9dccb564d71d04",
  measurementId: "G-EF6P77SMFP"
};

// 4 haneli PIN oluşturma fonksiyonu
const generateStudentPin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Ana fonksiyon
async function assignPinsToStudents() {
  try {
    // Firebase'i başlat
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔄 Firebase bağlantısı kuruldu');
    
    // Tüm öğrencileri al
    const studentsQuery = await getDocs(collection(db, 'students'));
    const students = [];
    studentsQuery.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Toplam ${students.length} öğrenci bulundu`);
    
    // PIN'i olmayan öğrencileri filtrele
    const studentsWithoutPin = students.filter(student => !student.pin);
    console.log(`⚠️ ${studentsWithoutPin.length} öğrencinin PIN'i yok`);
    
    if (studentsWithoutPin.length === 0) {
      console.log('✅ Tüm öğrencilerin PIN\\'i mevcut!');
      return;
    }
    
    // Mevcut PIN'leri topla (benzersizlik için)
    const existingPins = students.map(s => s.pin).filter(Boolean);
    
    let updated = 0;
    let errors = [];
    
    // Her öğrenciye PIN ata
    for (const student of studentsWithoutPin) {
      try {
        // Benzersiz PIN oluştur
        let pin;
        let isUnique = false;
        let attempts = 0;
        
        do {
          pin = generateStudentPin();
          isUnique = !existingPins.includes(pin);
          attempts++;
          
          if (attempts > 100) {
            throw new Error('Benzersiz PIN oluşturulamadı');
          }
        } while (!isUnique);
        
        // Firestore'da güncelle
        const studentRef = doc(db, 'students', student.id);
        await updateDoc(studentRef, { pin: pin });
        
        // Mevcut PIN listesine ekle
        existingPins.push(pin);
        
        updated++;
        console.log(`✅ ${student.name} - PIN atandı: ${pin}`);
        
      } catch (error) {
        const errorMsg = `${student.name} için PIN atanırken hata: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }
    
    console.log('\n📋 İşlem Özeti:');
    console.log(`✅ Başarıyla güncellenen: ${updated} öğrenci`);
    console.log(`❌ Hata alan: ${errors.length} öğrenci`);
    
    if (errors.length > 0) {
      console.log('\n⚠️ Hatalar:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 PIN atama işlemi tamamlandı!');
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
assignPinsToStudents();