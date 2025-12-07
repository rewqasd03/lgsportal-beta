const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBYfBhkLIfjqpnL9MxBhxW6iJeC0VAEDLk",
  authDomain: "kopruler-basari-portali.firebaseapp.com",
  projectId: "kopruler-basari-portali",
  storageBucket: "kopruler-basari-portali.firebasestorage.app",
  messagingSenderId: "318334276429",
  appId: "1:318334276429:web:7caa5e5b9dccb564d71d04",
  measurementId: "G-EF6P77SMFP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanDatabase() {
  try {
    console.log('🗑️ Veritabanı temizleme işlemi başlıyor...');
    
    // 1. Belirtilen öğrencileri sil
    const studentsToDelete = [
      'Fatma Demir',
      'Test Öğrencisi', 
      'Ahmet Yılmaz'
    ];
    
    console.log('👥 Öğrenci silme işlemi başlıyor...');
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    let deletedStudents = 0;
    
    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentName = studentData.name;
      
      if (studentsToDelete.includes(studentName)) {
        console.log(`🗑️ Siliniyor: ${studentName} (ID: ${studentDoc.id})`);
        await deleteDoc(doc(db, 'students', studentDoc.id));
        
        // Bu öğrencinin sonuçlarını da sil
        const resultsSnapshot = await getDocs(query(
          collection(db, 'results'), 
          where('studentId', '==', studentDoc.id)
        ));
        
        let deletedResults = 0;
        for (const resultDoc of resultsSnapshot.docs) {
          console.log(`   📊 Sonuç siliniyor: ${resultDoc.id}`);
          await deleteDoc(doc(db, 'results', resultDoc.id));
          deletedResults++;
        }
        
        console.log(`   ✅ ${studentName} ve ${deletedResults} sonucu silindi`);
        deletedStudents++;
      }
    }
    
    // 2. Belirtilen sınıfları sil
    const classesToDelete = ['8-B', '8-C'];
    
    console.log('🏫 Sınıf silme işlemi başlıyor...');
    let deletedClassStudents = 0;
    
    const studentsSnapshot2 = await getDocs(collection(db, 'students'));
    for (const studentDoc of studentsSnapshot2.docs) {
      const studentData = studentDoc.data();
      const studentClass = studentData.class;
      
      if (classesToDelete.includes(studentClass)) {
        console.log(`🗑️ Siliniyor: ${studentData.name} (Sınıf: ${studentClass}, ID: ${studentDoc.id})`);
        await deleteDoc(doc(db, 'students', studentDoc.id));
        
        // Bu öğrencinin sonuçlarını da sil
        const resultsSnapshot = await getDocs(query(
          collection(db, 'results'), 
          where('studentId', '==', studentDoc.id)
        ));
        
        let deletedResults = 0;
        for (const resultDoc of resultsSnapshot.docs) {
          console.log(`   📊 Sonuç siliniyor: ${resultDoc.id}`);
          await deleteDoc(doc(db, 'results', resultDoc.id));
          deletedResults++;
        }
        
        console.log(`   ✅ ${studentData.name} (${studentClass}) ve ${deletedResults} sonucu silindi`);
        deletedClassStudents++;
      }
    }
    
    console.log('\n🎉 Veritabanı temizleme işlemi tamamlandı!');
    console.log(`📊 Silinen öğrenci sayısı: ${deletedStudents + deletedClassStudents}`);
    console.log(`📋 Toplam silinen öğrenci: ${deletedStudents} (isim bazlı)`);
    console.log(`🏫 Toplam silinen öğrenci: ${deletedClassStudents} (sınıf bazlı)`);
    console.log(`🗂️ Silinen sınıflar: ${classesToDelete.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  }
}

// Scripti çalıştır
cleanDatabase().then(() => {
  console.log('🏁 İşlem tamamlandı');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal hata:', error);
  process.exit(1);
});