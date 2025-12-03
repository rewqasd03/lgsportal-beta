// Firebase Firestore'a test öğrencileri ekleme scripti (basit versiyon)
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test öğrenci verileri
const testStudents = [
  {
    name: "Test Öğrenci",
    class: "8-A",
    number: "12345",
    viewCount: 0,
    lastViewDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    name: "Ahmet Yılmaz",
    class: "8-B", 
    number: "12346",
    viewCount: 5,
    lastViewDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    name: "Fatma Demir",
    class: "8-A",
    number: "12347", 
    viewCount: 3,
    lastViewDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    name: "Mehmet Kaya",
    class: "8-C",
    number: "12348",
    viewCount: 8,
    lastViewDate: new Date().toISOString(), 
    createdAt: new Date().toISOString()
  }
];

// Simple ID generator
function generateId() {
  return 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function addTestStudents() {
  try {
    console.log('🚀 Firestore\'a test öğrencileri ekleniyor...');
    
    for (let i = 0; i < testStudents.length; i++) {
      const student = testStudents[i];
      const docRef = await addDoc(collection(db, 'students'), {
        ...student,
        id: generateId() // Simple ID oluştur
      });
      
      console.log(`✅ ${student.name} (${student.class}/${student.number}) eklendi:`, docRef.id);
    }
    
    console.log('🎉 Tüm test öğrencileri başarıyla eklendi!');
    console.log('\n📋 Test için kullanabileceğiniz bilgiler:');
    console.log('Sınıf: 8-A, Okul Numarası: 12345 (Test Öğrenci)');
    console.log('Sınıf: 8-B, Okul Numarası: 12346 (Ahmet Yılmaz)');
    console.log('Sınıf: 8-A, Okul Numarası: 12347 (Fatma Demir)');
    console.log('Sınıf: 8-C, Okul Numarası: 12348 (Mehmet Kaya)');
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
    console.error('Firebase bağlantı hatası olabilir. Firestore kurallarınızı kontrol edin.');
  }
}

// Script'i çalıştır
addTestStudents();