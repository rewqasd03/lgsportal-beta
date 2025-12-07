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

async function checkResultsStructure() {
  try {
    console.log("🔍 Firebase Results Collection Yapısı Analizi\n");
    
    // Get all results
    const resultsRef = collection(db, 'results');
    const resultsSnapshot = await getDocs(resultsRef);
    
    console.log(`📊 Toplam Results Kayıt Sayısı: ${resultsSnapshot.size}\n`);
    
    let sampleCount = 0;
    const fieldAnalysis = {};
    
    resultsSnapshot.forEach((doc) => {
      if (sampleCount < 5) { // Show first 5 records as samples
        console.log(`--- Örnek Kayıt ${sampleCount + 1} ---`);
        console.log(`Document ID: ${doc.id}`);
        const data = doc.data();
        
        Object.keys(data).forEach(key => {
          if (!fieldAnalysis[key]) {
            fieldAnalysis[key] = {
              count: 0,
              types: new Set(),
              sampleValues: []
            };
          }
          fieldAnalysis[key].count++;
          fieldAnalysis[key].types.add(typeof data[key]);
          if (fieldAnalysis[key].sampleValues.length < 3) {
            fieldAnalysis[key].sampleValues.push(data[key]);
          }
        });
        
        console.log("Data:", JSON.stringify(data, null, 2));
        console.log("");
        sampleCount++;
      }
    });
    
    console.log("📋 Field Analizi:");
    console.log("================");
    Object.keys(fieldAnalysis).forEach(field => {
      const info = fieldAnalysis[field];
      console.log(`\n🏷️  ${field}:`);
      console.log(`   - Toplam Kullanım: ${info.count}`);
      console.log(`   - Veri Tipleri: ${Array.from(info.types).join(', ')}`);
      console.log(`   - Örnek Değerler: ${JSON.stringify(info.sampleValues)}`);
    });
    
    // Check for doğru/yanlış/boş fields specifically
    console.log("\n🎯 Doğru/Yanlış/Boş Alanları Kontrolü:");
    console.log("=====================================");
    
    const possibleFields = ['dogru', 'yanlis', 'bos', 'dogruSayisi', 'yanlisSayisi', 'bosSayisi', 
                           'correct', 'wrong', 'empty', 'correctCount', 'wrongCount', 'emptyCount',
                           'true', 'false', 'null', 'dogru_sayisi', 'yanlis_sayisi', 'bos_sayisi'];
    
    let foundRelevantFields = false;
    Object.keys(fieldAnalysis).forEach(field => {
      const lowerField = field.toLowerCase();
      if (possibleFields.some(p => lowerField.includes(p.toLowerCase()))) {
        console.log(`✅ Bulunan İlgili Alan: ${field}`);
        foundRelevantFields = true;
      }
    });
    
    if (!foundRelevantFields) {
      console.log("❌ Doğrudan doğru/yanlış/boş alanları bulunamadı");
      console.log("Mevcut alanları yukarıda inceleyiniz.");
    }
    
    // Look for nets and see if we can infer
    console.log("\n🧮 Net Verileri İnceleme:");
    console.log("=========================");
    if (fieldAnalysis.nets) {
      console.log("✅ nets alanı mevcut");
      console.log(`Örnek net değerleri: ${JSON.stringify(fieldAnalysis.nets.sampleValues)}`);
      
      // Check if there's any pattern to calculate individual scores
      console.log("\n💡 Hesaplama Önerileri:");
      console.log("Eğer nets mevcut ve doğru/yanlış/boş ayrı alanlar yoksa:");
      console.log("- Doğru = net × 3.33 (tahmini)");
      console.log("- Yanlış = Doğru × 0.25 (tahmini)");
      console.log("- Boş = 90 - Doğru - Yanlış (tahmini)");
    }
    
  } catch (error) {
    console.error("❌ Hata:", error);
  }
}

checkResultsStructure();