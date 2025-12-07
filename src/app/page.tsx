"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Student, Exam, getStudents, getExams } from "../firebase";

export default function HomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase'den veri oku
    const loadData = async () => {
      try {
        const [studentsData, examsData] = await Promise.all([
          getStudents(),
          getExams()
        ]);

        setStudents(studentsData);
        setExams(examsData);
      } catch (error) {
        console.error('Ana sayfa veri okuma hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // İstatistikler
  const totalStudents = students.length;
  const totalExams = exams.length;
  const totalViews = students.reduce((sum, student) => sum + (student.viewCount || 0), 0);
  const activeStudents = students.filter(student => (student.viewCount || 0) > 0).length;
  const averageViews = totalStudents > 0 ? Math.round(totalViews / totalStudents) : 0;

  // Sınıf bazlı detaylı istatistikler
  const detailedClassStats = students.reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = {
        studentCount: 0,
        activeStudents: 0,
        totalViewCount: 0,
        totalExams: 0
      };
    }
    acc[student.class].studentCount++;
    acc[student.class].totalViewCount += student.viewCount || 0;
    if ((student.viewCount || 0) > 0) {
      acc[student.class].activeStudents++;
    }

    // Her sınıf için toplam deneme sayısı (basitleştirilmiş)
    acc[student.class].totalExams = Math.max(acc[student.class].totalExams, totalExams);

    return acc;
  }, {} as Record<string, {
    studentCount: number;
    activeStudents: number;
    totalViewCount: number;
    totalExams: number;
  }>);

  const totalClasses = Object.keys(detailedClassStats).length;

  // En aktif 10 öğrenci
  const topActiveStudents = students
    .filter(student => (student.viewCount || 0) > 0)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 10);

  // Renk paleti
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600'
  ];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 font-sans relative overflow-hidden">
      {/* Dekoratif arka plan elemanları */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-7xl mx-auto py-8">
        {/* Başlık ve Logo */}
        <div className="text-center mb-8">
          <img
            src="/projelogo.png"
            alt="LGS Portalı"
            className="w-24 h-24 mx-auto mb-4 hover:scale-110 transition-transform duration-300 drop-shadow-xl"
          />
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-center mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            LGS Portalı
          </h1>
          <p className="text-center text-xs text-gray-600 leading-relaxed max-w-lg mx-auto mb-6">
            Öğrenciler başarılarını takip edebilir, öğretmenler sınıf performanslarını anlık olarak görebilir.
          </p>


        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
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

        {/* Sınıf Bazlı Detaylı İstatistikler */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-800 mb-4 text-center">Sınıf Bazlı Detaylı İstatistikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(detailedClassStats).map(([className, stats], index) => (
              <div key={className} className={`bg-gradient-to-br ${colors[index % colors.length]} rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
                <div className="text-center">
                  <h3 className="text-xs font-bold mb-4">{className}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Öğrenci:</span>
                      <span className="font-bold">{stats.studentCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Aktif:</span>
                      <span className="font-bold">{stats.activeStudents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Deneme:</span>
                      <span className="font-bold">{stats.totalExams}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Toplam Görüntülenme:</span>
                      <span className="font-bold">{stats.totalViewCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* En Aktif 10 Öğrenci */}
        {topActiveStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-800 mb-4 text-center">En Aktif 10 Öğrenci</h2>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold">Sıra</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Ad Soyad</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Sınıf</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Numara</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Görüntülenme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topActiveStudents.map((student, index) => (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-xs ${index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-orange-500' :
                                  'bg-blue-500'
                            }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{student.name}</td>
                        <td className="px-3 py-2 text-gray-600">{student.class}</td>
                        <td className="px-3 py-2 text-gray-600">{student.number}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.viewCount} görüntülenme
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



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

          <a href="mailto:uysal.mu07@gmail.com">
            <button className="px-8 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl bg-gradient-to-r from-purple-500 via-pink-600 to-rose-600 hover:from-purple-600 hover:to-pink-700 hover:scale-105 hover:shadow-pink-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2">
              <span className="text-xs">📧</span>
              <span>İletişim</span>
            </button>
          </a>

        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} LGS Portalı | Developed by Murat UYSAL
        </footer>
      </div>
    </main>
  );
}
