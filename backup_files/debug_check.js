// Browser console'da çalıştırılacak debug kodu
// Bu kodu F12 > Console tab'ında çalıştırın

console.log("=== LGS PORTAL DEBUG ===");

// Öğrenci verilerini kontrol et
const studentResults = document.querySelectorAll('[data-student-id]');
console.log("Öğrenci elementi bulundu:", studentResults.length > 0);

// Network requests kontrol et
console.log("Son sayfa yükleme zamanı:", new Date().toLocaleString());

// Local Storage kontrol et
const storedData = localStorage.getItem('lgs-portal-data');
console.log("Local storage verisi:", storedData ? "VAR" : "YOK");

// Cache kontrolü
if ('serviceWorker' in navigator) {
  console.log("Service Worker var:", navigator.serviceWorker.controller);
}

console.log("=== DEBUG BİTTİ ===");