"use client";

import Link from "next/link";
import React from "react";

export default function HomePage() {
  // Statik veriler - loading yok!
  const totalStudents = 125;
  const totalClasses = 12;
  const totalExams = 8;
  const totalViews = 3400;
  const activeStudents = 89;
  const averageViews = 27;

  const topStudents = [
    { id: 1, name: "Ahmet Yılmaz", class: "8-A", number: "001", views: 45 },
    { id: 2, name: "Ayşe Kaya", class: "8-B", number: "002", views: 42 },
    { id: 3, name: "Mehmet Demir", class: "8-A", number: "003", views: 38 },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 font-sans relative overflow-hidden">
      {/* Dekoratif arka plan elemanları */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto py-8">
        {/* Başlık ve Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="Köprüler Ortaokulu"
            className="w-12 h-12 mx-auto mb-4 hover:scale-110 transition-transform duration-300 drop-shadow-xl"
          />
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-center mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Köprüler LGS Portalı
          </h1>
          <p className="text-center text-xs text-gray-600 leading-relaxed max-w-lg mx-auto mb-6">
            Öğrenciler başarılarını takip edebilir, öğretmenler sınıf performanslarını anlık olarak görebilir.
          </p>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-6 gap-3 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Toplam Öğrenci</p>
                <p className="text-xs font-bold">{totalStudents}</p>
              </div>
              <div className="text-xs">👥</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium">Toplam Sınıf</p>
                <p className="text-xs font-bold">{totalClasses}</p>
              </div>
              <div className="text-xs">🏫</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs font-medium">Toplam Deneme</p>
                <p className="text-xs font-bold">{totalExams}</p>
              </div>
              <div className="text-xs">📝</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs font-medium">Toplam Görüntülenme</p>
                <p className="text-xs font-bold">{totalViews.toLocaleString()}</p>
              </div>
              <div className="text-xs">👁️</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-xs font-medium">Aktif Öğrenci</p>
                <p className="text-xs font-bold">{activeStudents}</p>
              </div>
              <div className="text-xs">⚡</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-xs font-medium">Ort. Görüntülenme</p>
                <p className="text-xs font-bold">{averageViews}</p>
              </div>
              <div className="text-xs">📊</div>
            </div>
          </div>
        </div>

        {/* Giriş Butonları */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <Link href="/ogrenci">
            <button className="px-8 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-blue-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2">
              <span className="text-xs">🎓</span>
              <span>Öğrenci Girişi</span>
            </button>
          </Link>
          <Link href="/panel">
            <button className="px-8 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:scale-105 hover:shadow-emerald-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2">
              <span className="text-xs">📚</span>
              <span>Öğretmen Paneli</span>
            </button>
          </Link>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} Köprüler LGS | Developed by MiniMax Agent | ✅ Güncellenmiş versiyon
        </footer>
      </div>
    </main>
  );
}