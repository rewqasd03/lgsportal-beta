// Firebase Firestore'a test öğrencileri ekleme scripti
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');

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

async function addTestStudents() {
  try {
    console.log('🚀 Firestore\'a test öğrencileri ekleniyor...');
    
    for (let i = 0; i < testStudents.length; i++) {
      const student = testStudents[i];
      const docRef = await addDoc(collection(db, 'students'), {
        ...student,
        id: uuidv4() // Unique ID oluştur
      });
      
      console.log(`✅ ${student.name} (${student.class}/${student.number}) eklendi:`, docRef.id);
    }
    
    console.log('🎉 Tüm test öğrencileri başarıyla eklendi!');
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  }
}

// Script'i çalıştır
addTestStudents();