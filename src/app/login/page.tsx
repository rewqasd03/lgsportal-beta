"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const router = useRouter();

  // Auth state izleme ve Firebase durum kontrolü
  useEffect(() => {
    console.log('Login sayfası yüklendi, Firebase Auth:', auth);
    
    // Firebase bağlantısını test et
    setFirebaseReady(!!auth);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state değişikliği:', user);
      if (user) {
        router.push("/panel");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Test kullanıcısı oluştur
  const createTestUser = async () => {
    setCreatingUser(true);
    try {
      await signInWithEmailAndPassword(auth, "test@ogretmen.com", "123456");
      alert("Test kullanıcısı zaten mevcut!");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        try {
          // Manuel kullanıcı oluşturma - Firebase Console'da yapılmalı
          alert("Test kullanıcısı oluşturmak için:\n1. Firebase Console > Authentication > Users > Add User\n2. Email: test@ogretmen.com\n3. Password: 123456");
        } catch (createError) {
          console.error('Test kullanıcısı oluşturma hatası:', createError);
          alert("Firebase Authentication'ı console'da enable edin.");
        }
      } else {
        alert(`Hata: ${error.message}`);
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Lütfen tüm alanları doldurun");
      return;
    }
    setLoading(true);
    
    try {
      console.log('Firebase Auth durumu:', auth);
      console.log('Giriş yapılıyor... Email:', email);
      
      await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Giriş başarılı!');
      alert("Giriş başarılı! Yönlendiriliyor...");
      // Auth state değişikliği otomatik olarak yönlendirme yapacak
    } catch (error: any) {
      console.error('Firebase Auth Hatası:', error);
      console.error('Hata kodu:', error.code);
      console.error('Hata mesajı:', error.message);
      
      let errorMessage = 'Giriş hatası: ' + error.message;
      
      // Specific error handling
      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'İnternet bağlantısını kontrol edin. Firebase bağlantısı kurulamadı.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Yanlış şifre girdiniz.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* HEADER - LOGO KÜÇÜLTÜLDÜ */}
      <header className="border-b bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <img src="/logo.png" alt="Okul Logosu" className="h-10 w-10 rounded-full shadow-md" />
          <h1 className="text-xs font-bold text-gray-800">Öğretmen Girişi</h1>
        </div>
      </header>

      {/* CONTENT - MODERNLEŞTIRILDI */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-gray-100">
          <div className="mb-6 text-center">
            <h2 className="text-xs font-bold text-gray-800 mb-2">Hoşgeldiniz</h2>
            <p className="text-xs text-gray-500">Lütfen giriş bilgilerinizi girin</p>
            
            {/* Firebase Durumu */}
            <div className="mt-3 p-2 rounded-lg text-xs">
              <div className={`inline-flex items-center px-2 py-1 rounded-full ${
                firebaseReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  firebaseReady ? 'bg-green-400' : 'bg-red-400'
                }`}></span>
                {firebaseReady ? 'Firebase Bağlantısı: OK' : 'Firebase Bağlantısı: HATA'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white font-semibold hover:from-emerald-600 hover:to-teal-700 active:scale-95 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
            
            {/* Test butonları */}
            <div className="mt-4 space-y-2">
              <button
                onClick={() => {
                  setEmail("test@ogretmen.com");
                  setPassword("123456");
                }}
                className="w-full px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                Test Öğretmen Bilgileri
              </button>
              <button
                onClick={() => {
                  setEmail("admin@test.com");
                  setPassword("admin123");
                }}
                className="w-full px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                Test Admin Bilgileri
              </button>
            </div>
            
            {/* Debug bilgisi */}
            {!firebaseReady && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <p><strong>❌ Firebase Bağlantı Sorunu</strong></p>
                <p>Firebase Authentication'ı enable etmek için:</p>
                <ol className="list-decimal ml-4 mt-1">
                  <li><a href="https://console.firebase.google.com" target="_blank" className="underline hover:text-red-900">Firebase Console</a>'a git</li>
                  <li>Project: kopruler-basari-portali seç</li>
                  <li>Authentication {'>'} Get started {'>'} Email/Password enable et</li>
                </ol>
                <button
                  onClick={createTestUser}
                  disabled={creatingUser}
                  className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  {creatingUser ? 'Test ediliyor...' : 'Test Kullanıcısı Dene'}
                </button>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p><strong>🔧 Test Credentials:</strong></p>
              <p>Email: test@ogretmen.com</p>
              <p>Password: 123456</p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t bg-white/70 backdrop-blur py-3">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Köprüler LGS | Developed by Murat UYSAL
        </div>
      </footer>
    </main>
  );
}