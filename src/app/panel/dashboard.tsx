"use client";

import React, { useEffect, useState } from "react";
import { Student, Exam } from "../../firebase";
import { getStudents, getExams } from "../../firebase";

interface DashboardProps {
  onShowMain: () => void;
  onGoToTab: (tab: string) => void;
}

export default function Dashboard({ onShowMain, onGoToTab }: DashboardProps) {
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
        console.error('Dashboard veri okuma hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // İstatistikler - Gelişmiş
  const totalStudents = students.length;
  const totalExams = exams.length;

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
    if (student.viewCount > 0) {
      acc[student.class].activeStudents++;
    }
    acc[student.class].totalViewCount += student.viewCount || 0;
    return acc;
  }, {} as Record<string, { studentCount: number; activeStudents: number; totalViewCount: number; totalExams: number }>);

  // Sınıf bazlı deneme sayılarını ekle
  Object.keys(detailedClassStats).forEach(className => {
    detailedClassStats[className].totalExams = exams.filter(exam => exam.classes.includes(className)).length;
  });

  // En aktif 10 öğrenci (en çok rapor görüntüleyen)
  const topActiveStudents = [...students]
    .filter(s => (s.viewCount || 0) > 0)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 10)
    .map(student => ({
      ...student,
      viewCount: student.viewCount || 0,
      lastViewDate: student.lastViewDate ? new Date(student.lastViewDate).toLocaleDateString('tr-TR') : 'Hiç görüntüleme yok'
    }));

  const totalClasses = Object.keys(detailedClassStats).length;

  // Genel sistem istatistikleri
  const totalViews = students.reduce((sum, s) => sum + (s.viewCount || 0), 0);
  const avgViewsPerStudent = totalStudents > 0 ? (totalViews / totalStudents).toFixed(1) : '0';
  const activeStudentsCount = students.filter(s => (s.viewCount || 0) > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hoşgeldin */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Başarı Takip Sistemi</h1>
        <p className="text-blue-100">Hoşgeldiniz! Sistem verilerinizin özeti aşağıda gösterilmektedir.</p>
      </div>

      {/* İstatistik Kartları - Genişletilmiş */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <span className="text-2xl">👨‍🎓</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{totalStudents}</div>
              <div className="text-gray-600">Toplam Öğrenci</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <span className="text-2xl">🏫</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{totalClasses}</div>
              <div className="text-gray-600">Toplam Sınıf</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{totalExams}</div>
              <div className="text-gray-600">Toplam Deneme</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <span className="text-2xl">👀</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{totalViews}</div>
              <div className="text-gray-600">Toplam Görüntüleme</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ek İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <span className="text-2xl">🔥</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{activeStudentsCount}</div>
              <div className="text-gray-600">Aktif Öğrenci</div>
              <div className="text-sm text-gray-500">Rapor Görüntüleyen</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-100 p-3 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{avgViewsPerStudent}</div>
              <div className="text-gray-600">Ortalama Görüntüleme</div>
              <div className="text-sm text-gray-500">Öğrenci Başına</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detaylı Sınıf İstatistikleri */}
      {Object.keys(detailedClassStats).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Sınıf Bazlı Detaylı İstatistikler</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {Object.entries(detailedClassStats)
                .sort()
                .map(([className, stats]) => (
                  <div
                    key={className}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xl font-bold text-gray-800">{className} Sınıfı</h4>
                      <div className="text-sm text-gray-600">
                        {stats.totalExams} Deneme • {stats.totalViewCount} Toplam Görüntüleme
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.studentCount}</div>
                        <div className="text-sm text-gray-600">Toplam Öğrenci</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.activeStudents}</div>
                        <div className="text-sm text-gray-600">Aktif Öğrenci</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.totalExams}</div>
                        <div className="text-sm text-gray-600">Deneme Sayısı</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{stats.totalViewCount}</div>
                        <div className="text-sm text-gray-600">Görüntüleme</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* En Aktif Öğrenciler */}
      {topActiveStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <h3 className="text-lg font-semibold text-gray-800">En Aktif 10 Öğrenci</h3>
              <span className="text-sm text-gray-600">(En Çok Rapor Görüntüleyen)</span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {topActiveStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full text-orange-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{student.name}</div>
                      <div className="text-sm text-gray-600">{student.class} Sınıfı • {student.number}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-600">{student.viewCount}</div>
                    <div className="text-sm text-gray-600">görüntüleme</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Erişim */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Hızlı Erişim</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => onGoToTab("ogrenci")}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <div className="text-4xl mb-3">👨‍🎓</div>
              <div className="text-xl font-bold">Öğrenci Ekleme</div>
              <div className="text-sm text-blue-100 mt-1">Sınıf Yönetimi</div>
            </button>

            <button
              onClick={() => onGoToTab("deneme")}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <div className="text-4xl mb-3">📋</div>
              <div className="text-xl font-bold">Deneme Ekleme</div>
              <div className="text-sm text-purple-100 mt-1">Deneme Yönetimi</div>
            </button>

            <button
              onClick={() => onGoToTab("bireysel")}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <div className="text-4xl mb-3">👤</div>
              <div className="text-xl font-bold">Bireysel Sonuç</div>
              <div className="text-sm text-indigo-100 mt-1">Kişisel Veri Girişi</div>
            </button>

            <button
              onClick={() => onGoToTab("toplu")}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <div className="text-4xl mb-3">👥</div>
              <div className="text-xl font-bold">Toplu Veri Girme</div>
              <div className="text-sm text-green-100 mt-1">Toplu Veri Girişi</div>
            </button>

            <button
              onClick={() => onGoToTab("rapor")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <div className="text-4xl mb-3">📊</div>
              <div className="text-xl font-bold">Raporlar</div>
              <div className="text-sm text-orange-100 mt-1">Analiz ve Raporlama</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}