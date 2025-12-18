// Firebase Debug Script - Eksik Deneme Kaydı Sorunu Analizi
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function debugExamDataInconsistency() {
  console.log('🔍 Firebase Debug: Eksik Deneme Kaydı Sorunu Analizi');
  console.log('=' .repeat(60));
  
  try {
    // 1. Exams tablosundaki tüm verileri al
    console.log('\n📊 1. Exams Tablosu Analizi:');
    const examsQuery = collection(db, 'exams');
    const examsSnapshot = await getDocs(examsQuery);
    const examsData = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`   Toplam Exam Kaydı: ${examsData.length}`);
    console.log('   Exam ID\'leri:');
    examsData.forEach((exam, index) => {
      console.log(`   ${index + 1}. ${exam.id} - ${exam.title || 'Başlık yok'} (${exam.date || 'Tarih yok'})`);
    });
    
    // 2. Results tablosundaki tüm verileri al
    console.log('\n📊 2. Results Tablosu Analizi:');
    const resultsQuery = collection(db, 'results');
    const resultsSnapshot = await getDocs(resultsQuery);
    const resultsData = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`   Toplam Result Kaydı: ${resultsData.length}`);
    
    // 3. Hangi examId'lerin results tablosunda bulunduğunu bul
    const resultExamIds = [...new Set(resultsData.map(r => r.examId))];
    console.log('\n📊 3. Results Tablosundaki ExamId\'ler:');
    console.log(`   Toplam Benzersiz ExamId: ${resultExamIds.length}`);
    resultExamIds.forEach((examId, index) => {
      const examResults = resultsData.filter(r => r.examId === examId);
      console.log(`   ${index + 1}. ${examId} (${examResults.length} sonuç)`);
    });
    
    // 4. Hangi examId'lerin eksik olduğunu bul
    const availableExamIds = examsData.map(e => e.id);
    const missingExamIds = resultExamIds.filter(id => !availableExamIds.includes(id));
    
    console.log('\n⚠️ 4. EKSİK EXAM KAYITLARI:');
    if (missingExamIds.length === 0) {
      console.log('   ✅ Tüm exam kayıtları mevcut - Sorun başka yerde olabilir');
    } else {
      console.log(`   ❌ ${missingExamIds.length} adet eksik exam kaydı bulundu:`);
      missingExamIds.forEach((missingId, index) => {
        const relatedResults = resultsData.filter(r => r.examId === missingId);
        console.log(`   ${index + 1}. ${missingId}`);
        console.log(`      - Results tablosunda ${relatedResults.length} kayıt bulunuyor`);
        console.log(`      - İlk birkaç studentId: ${relatedResults.slice(0, 5).map(r => r.studentId).join(', ')}`);
      });
    }
    
    // 5. Sınıf bazında analiz
    console.log('\n📊 5. Sınıf Bazında Analiz:');
    const studentsQuery = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsQuery);
    const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`   Toplam Öğrenci: ${studentsData.length}`);
    
    // 8-A sınıfını örnek alalım
    const sinif8A = studentsData.filter(s => s.class === '8-A');
    console.log(`   8-A Sınıfı Öğrenci Sayısı: ${sinif8A.length}`);
    
    if (sinif8A.length > 0) {
      const sinif8AResults = resultsData.filter(r => sinif8A.some(s => s.id === r.studentId));
      const sinif8AExamIds = [...new Set(sinif8AResults.map(r => r.examId))];
      
      console.log('\n   8-A Sınıfı Exam Durumu:');
      sinif8AExamIds.forEach(examId => {
        const examExists = availableExamIds.includes(examId);
        const exam = examsData.find(e => e.id === examId);
        const hasResults = sinif8AResults.filter(r => r.examId === examId);
        
        console.log(`   - ${examId}: ${examExists ? '✅ Mevcut' : '❌ Eksik'} (${hasResults.length} sonuç)`);
        if (exam) {
          console.log(`     Başlık: ${exam.title || 'Başlık yok'}`);
        }
      });
    }
    
    // 6. Eksik kayıtlar için detaylı analiz
    if (missingExamIds.length > 0) {
      console.log('\n🔍 6. Eksik Kayıtlar İçin Detaylı Analiz:');
      
      for (const missingId of missingExamIds) {
        console.log(`\n   ExamId: ${missingId}`);
        const relatedResults = resultsData.filter(r => r.examId === missingId);
        
        console.log(`   - Toplam Sonuç: ${relatedResults.length}`);
        console.log(`   - Öğrenci ID'leri: ${relatedResults.slice(0, 10).map(r => r.studentId).join(', ')}`);
        
        // İlk sonucun detaylarını göster
        if (relatedResults.length > 0) {
          const firstResult = relatedResults[0];
          console.log(`   - İlk Sonuç Detayı:`);
          console.log(`     * StudentId: ${firstResult.studentId}`);
          console.log(`     * ExamId: ${firstResult.examId}`);
          console.log(`     * Nets: ${JSON.stringify(firstResult.nets)}`);
          console.log(`     * Scores: ${JSON.stringify(firstResult.scores)}`);
          console.log(`     * CreatedAt: ${firstResult.createdAt}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 SONUÇ:');
    if (missingExamIds.length > 0) {
      console.log(`❌ ${missingExamIds.length} adet exam kaydı eksik. Bu "Eksik Deneme Kaydı" sorununun nedeni.`);
      console.log('🔧 ÇÖZÜM ÖNERİLERİ:');
      console.log('1. Bu examId\'ler için eksik exam kayıtları oluştur');
      console.log('2. Ya da results tablosundaki bu kayıtları sil');
      console.log('3. Ya da examId\'leri mevcut exam kayıtlarıyla eşleştir');
    } else {
      console.log('✅ Exams tablosunda sorun bulunamadı. Sorun başka yerde olabilir.');
    }
    
  } catch (error) {
    console.error('❌ Firebase bağlantı hatası:', error);
  }
}

// Debug script'i çalıştır
debugExamDataInconsistency();