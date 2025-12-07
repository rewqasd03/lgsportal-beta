const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function demonstrateRealCalculation() {
  try {
    console.log("🧮 Firebase Gerçek Verilerle Hesaplama Demo\n");
    
    // Get all results
    const resultsRef = collection(db, 'results');
    const resultsSnapshot = await getDocs(resultsRef);
    
    resultsSnapshot.forEach((doc) => {
      const data = doc.data();
      const scores = data.scores || {};
      
      console.log(`📋 Student: ${data.studentId} | Exam: ${data.examId}`);
      console.log("=".repeat(60));
      
      // Her ders için D/Y/B değerlerini göster
      const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
      let totalCorrect = 0;
      let totalWrong = 0;
      let totalEmpty = 0;
      
      subjects.forEach(subject => {
        const subjectScore = scores[subject];
        if (subjectScore) {
          const correct = parseInt(subjectScore.D || '0');
          const wrong = parseInt(subjectScore.Y || '0');
          const empty = parseInt(subjectScore.B || '0');
          
          totalCorrect += correct;
          totalWrong += wrong;
          totalEmpty += empty;
          
          console.log(`${subject.padEnd(12)}: Doğru=${correct.toString().padStart(2)}, Yanlış=${wrong.toString().padStart(2)}, Boş=${empty.toString().padStart(2)}`);
        }
      });
      
      console.log("-".repeat(40));
      console.log(`TOPLAM:    Doğru=${totalCorrect.toString().padStart(2)}, Yanlış=${totalWrong.toString().padStart(2)}, Boş=${totalEmpty.toString().padStart(2)}`);
      console.log(`Net: ${data.nets?.total?.toFixed(1) || 'N/A'}`);
      console.log(`Puan: ${scores.puan || 'N/A'}`);
      console.log("");
      
      // Eski hesaplama formülü ile karşılaştır
      if (data.nets?.total) {
        const oldCorrect = Math.round(data.nets.total * 3.33);
        const oldWrong = Math.round(oldCorrect * 0.2);
        const oldEmpty = Math.max(0, 90 - oldCorrect - oldWrong);
        
        console.log(`🔄 Eski Formül: Doğru=${oldCorrect}, Yanlış=${oldWrong}, Boş=${oldEmpty}`);
        console.log(`✅ Yeni Gerçek: Doğru=${totalCorrect}, Yanlış=${totalWrong}, Boş=${totalEmpty}`);
        console.log("");
      }
    });
    
  } catch (error) {
    console.error("❌ Hata:", error);
  }
}

demonstrateRealCalculation();