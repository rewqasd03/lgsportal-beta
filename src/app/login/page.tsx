"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auth state izleme
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/panel");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Lütfen tüm alanları doldurun");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state değişikliği otomatik olarak yönlendirme yapacak
    } catch (error: any) {
      alert("Giriş hatası: " + error.message);
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
          <h1 className="text-lg font-bold text-gray-800">Öğretmen Girişi</h1>
        </div>
      </header>

      {/* CONTENT - MODERNLEŞTIRILDI */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-gray-100">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Hoşgeldiniz</h2>
            <p className="text-sm text-gray-500">Lütfen giriş bilgilerinizi girin</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
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