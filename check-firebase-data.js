const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase configuration
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

async function checkFirebaseData() {
  try {
    console.log('🔍 Firebase verileri kontrol ediliyor...\n');
    
    // 1. Tüm examları listele
    console.log('📋 TÜM DENEMELER:');
    const examsQuery = query(collection(db, 'exams'));
    const examsSnapshot = await getDocs(examsQuery);
    const exams = [];
    
    examsSnapshot.forEach((doc) => {
      const exam = { id: doc.id, ...doc.data() };
      exams.push(exam);
      console.log(`  ${exam.id}: ${exam.title} (${exam.date})`);
    });
    
    console.log(`\n📊 Toplam deneme sayısı: ${exams.length}\n`);
    
    // 2. Muba TG-1 ve İntro TG-1'i bul
    const mubaExam = exams.find(e => e.title && e.title.includes('Muba'));
    const introExam = exams.find(e => e.title && e.title.includes('İntro'));
    
    console.log('🔍 MUBA TG-1:');
    if (mubaExam) {
      console.log(`  ✅ Bulundu: ${mubaExam.id} - ${mubaExam.title}`);
    } else {
      console.log('  ❌ Bulunamadı');
    }
    
    console.log('\n🔍 INTRO TG-1:');
    if (introExam) {
      console.log(`  ✅ Bulundu: ${introExam.id} - ${introExam.title}`);
    } else {
      console.log('  ❌ Bulunamadı');
    }
    
    console.log('\n📊 8-A SINIFI SONuÇLARI:');
    
    // 3. 8-A sınıfının tüm sonuçlarını bul
    const resultsQuery = query(collection(db, 'results'));
    const resultsSnapshot = await getDocs(resultsQuery);
    const allResults = [];
    
    resultsSnapshot.forEach((doc) => {
      const result = { id: doc.id, ...doc.data() };
      allResults.push(result);
    });
    
    // 8-A öğrencilerini bul
    const studentsQuery = query(collection(db, 'students'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const students = [];
    
    studentsSnapshot.forEach((doc) => {
      const student = { id: doc.id, ...doc.data() };
      students.push(student);
    });
    
    const class8AStudents = students.filter(s => s.class === '8-A');
    const class8AStudentIds = class8AStudents.map(s => s.id);
    
    console.log(`  📚 8-A öğrenci sayısı: ${class8AStudents.length}`);
    
    // 8-A sınıfının sonuçlarını filtrele
    const class8AResults = allResults.filter(r => class8AStudentIds.includes(r.studentId));
    
    // Denemeye göre grupla
    const resultsByExam = {};
    class8AResults.forEach(result => {
      if (!resultsByExam[result.examId]) {
        resultsByExam[result.examId] = [];
      }
      resultsByExam[result.examId].push(result);
    });
    
    console.log(`  📊 8-A sınıfının toplam sonuç sayısı: ${class8AResults.length}`);
    
    // Her deneme için sonuç sayısı
    console.log('\n  📋 DENEMELERE GÖRE SONUÇ SAYILARI:');
    exams.forEach(exam => {
      const examResults = resultsByExam[exam.id] || [];
      console.log(`    ${exam.title}: ${examResults.length} sonuç`);
      
      if (exam.title.includes('Muba') || exam.title.includes('İntro')) {
        if (examResults.length === 0) {
          console.log(`      ⚠️  BU DENEME BOŞ! (8-A için)`);
        } else {
          console.log(`      ✅ Veri var! (${examResults.length} öğrenci)`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

checkFirebaseData();