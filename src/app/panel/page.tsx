"use client";

import React, { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useRouter } from "next/navigation";
import FoncsDataEntry from "./foncs-data-entry";

export default function PanelPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [targetTab, setTargetTab] = useState<string>("ogrenci");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUserEmail(user.email);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Çıkış hatası:", error);
      alert("Çıkış yaparken hata oluştu");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      <section className="mx-auto max-w-7xl px-4 py-6">
        {/* Başlık + Hoşgeldiniz + Çıkış butonu */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-lg">
              <img src="/projelogo.png" alt="Project Logo" className="w-8 h-8 rounded" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Başarı Portalı</h1>
              <p className="text-sm text-gray-500">Başarı Takip Sistemi</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {userEmail && (
              <div className="hidden sm:flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <span className="text-sm text-gray-600">Hoşgeldiniz,&nbsp;</span>
                <strong className="text-sm font-semibold text-blue-700">{userEmail}</strong>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 active:scale-95 transition-all duration-200 shadow-lg flex items-center gap-2"
            >
              <span>✖️</span>
              <span>Çıkış</span>
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <FoncsDataEntry />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 py-4 text-center text-xs text-gray-500 border-t bg-white/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          © {new Date().getFullYear()} Köprüler LGS | Developed by Murat UYSAL
        </div>
      </footer>
    </main>
  );
}