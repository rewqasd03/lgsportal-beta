"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStudents, getExams, getResults, addStudent, addExam, addResult, deleteStudent, deleteExam, deleteResult, updateStudent, updateResult, updateExam, saveStudentTargets, getAllTargets, getStudentScoreTarget, mapDashboardKeysToPanel, mapPanelKeysToDashboard, db, doc, getDoc, Student, Exam, Result } from "../../firebase";
// Ana Tab Interface
interface Tab {
  key: string;
  label: string;
}

const TABS: Tab[] = [
  { key: "home", label: "🏠 Ana Sayfa" },
  { key: "sinif", label: "🏛️ Sınıf Yönetimi" },
  { key: "deneme", label: "📋 Deneme Yönetimi" },
  { key: "bireysel", label: "👨‍🎓 Bireysel Veri" },
  { key: "toplu", label: "👥 Toplu Veri" },
  { key: "hedef", label: "🎯 Hedef Belirleme" },
  { key: "lgs-hesaplama", label: "🧮 LGS Puan Hesaplama" },
  { key: "van-taban-puan", label: "🎓 Lise Taban Puanları" }
];

// 📊 DERS RENK KODLAMASI - Görsel iyileştirme
const COURSE_COLORS = {
  turkce: "#10B981", // Yeşil
  matematik: "#F59E0B", // Turuncu  
  fen: "#3B82F6", // Mavi
  sosyal: "#8B5CF6", // Mor
  ingilizce: "#EF4444", // Kırmızı
  din: "#F97316", // Koyu Turuncu
  kimya: "#06B6D4", // Cyan
  biyoloji: "#84CC16", // Lime
  tarih: "#EC4899", // Pembe
  cografya: "#6366F1" // İndigo
};

const COURSES = {
  elementary: [ // İlkokul (2, 3, 4, 5. Sınıf)
    { key: "turkce", label: "Türkçe", grades: ["2", "3", "4", "5"], color: COURSE_COLORS.turkce },
    { key: "sosyal", label: "Sosyal Bilgiler", grades: ["4", "5"], color: COURSE_COLORS.sosyal },
    { key: "din", label: "Din Kültürü ve Ahlak Bilgisi", grades: ["4", "5"], color: COURSE_COLORS.din },
    { key: "ingilizce", label: "İngilizce", grades: ["3", "4", "5"], color: COURSE_COLORS.ingilizce },
    { key: "matematik", label: "Matematik", grades: ["2", "3", "4", "5"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fen Bilimleri", grades: ["3", "4", "5"], color: COURSE_COLORS.fen },
    { key: "hayat", label: "Hayat Bilgisi", grades: ["2", "3"], color: "#F59E0B" }
  ],
  middle: [ // Ortaokul (6,7,8. Sınıf)
    { key: "turkce", label: "Türkçe", grades: ["6", "7", "8"], color: COURSE_COLORS.turkce },
    { key: "sosyal", label: "Sosyal Bilgiler", grades: ["6", "7", "8"], color: COURSE_COLORS.sosyal },
    { key: "din", label: "Din Kültürü ve Ahlak Bilgisi", grades: ["6", "7", "8"], color: COURSE_COLORS.din },
    { key: "ingilizce", label: "İngilizce", grades: ["6", "7", "8"], color: COURSE_COLORS.ingilizce },
    { key: "matematik", label: "Matematik", grades: ["6", "7", "8"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fen Bilimleri", grades: ["6", "7", "8"], color: COURSE_COLORS.fen }
  ],
  high: [ // Lise (9,10,11,12. Sınıf)
    { key: "turkce", label: "Türk Dili ve Edebiyatı", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.turkce },
    { key: "matematik", label: "Matematik", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fizik", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.fen },
    { key: "kimya", label: "Kimya", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.kimya },
    { key: "biyoloji", label: "Biyoloji", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.biyoloji },
    { key: "sosyal", label: "Tarih", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.tarih },
    { key: "cografya", label: "Coğrafya", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.cografya },
    { key: "ingilizce", label: "İngilizce", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.ingilizce }
  ]
};

// CLASS_OPTIONS
const CLASS_OPTIONS = [
  "2-A", "3-A", "4-A", "5-A", "6-A", "7-A", "8-A"
];

// Yardımcı fonksiyonlar
const normalizeClassName = (className: string) => {
  const grade = className.split('-')[0];
  const letter = className.split('-')[1];
  return `${grade}-${letter}`;
};

const getCoursesByClass = (className: string) => {
  const grade = className.split('-')[0];
  const gradeNum = parseInt(grade);
  
  if (gradeNum <= 5) {
    return COURSES.elementary.filter(course => course.grades.includes(grade));
  } else if (gradeNum <= 8) {
    return COURSES.middle.filter(course => course.grades.includes(grade));
  } else {
    return COURSES.high.filter(course => course.grades.includes(grade));
  }
};

const calcNet = (dogru: number, yanlis: number) => {
  return dogru - (yanlis * 0.33);
};

const getLGSCourses = () => [
  { key: "turkce", label: "Türkçe", color: COURSE_COLORS.turkce },
  { key: "matematik", label: "Matematik", color: COURSE_COLORS.matematik },
  { key: "fen", label: "Fen", color: COURSE_COLORS.fen },
  { key: "sosyal", label: "Sosyal", color: COURSE_COLORS.sosyal },
  { key: "ingilizce", label: "İngilizce", color: COURSE_COLORS.ingilizce }
];

const getCourseEmoji = (courseKey: string) => {
  const emojiMap: Record<string, string> = {
    turkce: "📚",
    matematik: "🔢",
    fen: "🔬",
    sosyal: "🌍",
    ingilizce: "🇺🇸",
    din: "🕌",
    kimya: "⚗️",
    biyoloji: "🧬",
    tarih: "📜",
    cografya: "🗺️"
  };
  return emojiMap[courseKey] || "📖";
};

// Ana Component
export default function FoncsDataEntry() {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Hedef Belirleme için state'ler
  const [studentTargets, setStudentTargets] = useState<{[studentId: string]: {[subject: string]: number}}>({});
  const [studentScoreTargets, setStudentScoreTargets] = useState<{[studentId: string]: number}>({});
  const [selectedStudentForTarget, setSelectedStudentForTarget] = useState<string>('');

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, examsData, resultsData, targetsData] = await Promise.all([
        getStudents(),
        getExams(), 
        getResults(),
        getAllTargets()
      ]);
      
      // Puan hedeflerini de getir (tüm öğrenciler için)
      const scoreTargetsData: {[studentId: string]: number} = {};
      await Promise.all(
        studentsData.map(async (student) => {
          try {
            const scoreTarget = await getStudentScoreTarget(student.id);
            if (scoreTarget) {
              scoreTargetsData[student.id] = scoreTarget;
            }
          } catch (error) {
            console.error(`Puan hedefi çekilemedi (${student.id}):`, error);
            scoreTargetsData[student.id] = 450; // Varsayılan değer
          }
        })
      );
      
      setStudents(studentsData);
      setExams(examsData);
      setResults(resultsData);
      setStudentTargets(targetsData);
      setStudentScoreTargets(scoreTargetsData);
    } catch (error) {
      console.error('Data loading error:', error);
      showToast("Veriler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Firebase'den fresh veri yükle
  const loadDataFromFirebase = async () => {
    try {
      const [studentsData, examsData, resultsData] = await Promise.all([
        getStudents(),
        getExams(),
        getResults()
      ]);
      
      setStudents(studentsData);
      setExams(examsData);
      setResults(resultsData);
    } catch (error) {
      console.error('Firebase data load error:', error);
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // 📊 ANA HOME TAB - DASHBOARD
  const HomeTab = () => {
    // Her öğrencinin deneme performanslarını hesapla
    const studentPerformance = useMemo(() => {
      return students.map(student => {
        const studentResults = results
          .filter(r => r.studentId === student.id)
          .sort((a, b) => {
            const examA = exams.find(e => e.id === a.examId);
            const examB = exams.find(e => e.id === b.examId);
            if (!examA || !examB) return 0;
            return new Date(examB.date).getTime() - new Date(examA.date).getTime();
          });

        const totalExams = studentResults.length;
        
        // ✅ DÜZELTİLMİŞ ORTALAMA HESAPLAMA - Sadece ders netleri
        const avgNet = totalExams > 0 
          ? studentResults.reduce((sum: number, r) => {
              // Sadece ders netlerini al (total field'ını hariç tut)
              const subjectNets = Object.entries(r.nets || {}).filter(([key]) => key !== 'total');
              const totalNet = subjectNets.reduce((netSum: number, [, score]) => netSum + (Number(score) || 0), 0);
              return sum + totalNet;
            }, 0) / totalExams
          : 0;
        
        // Son hesaplama
        if (student.name === 'Şükrüye Akpınar') {
          console.log(`✅ ŞÜKRÜYE FINAL (Ders Bazında): avgNet = ${avgNet.toFixed(2)}`);
        }

        const lastResult = studentResults[0];
        const lastExam = lastResult ? exams.find(e => e.id === lastResult.examId) : null;

        return {
          ...student,
          totalExams,
          avgNet,
          avgPuan: totalExams > 0 
            ? studentResults.reduce((sum: number, r) => sum + (r.puan || 0), 0) / totalExams
            : 0,
          lastExam: lastExam?.title || 'Deneme yok',
          lastDate: lastExam ? new Date(lastExam.date).toLocaleDateString('tr-TR') : 'N/A',
          lastNet: lastResult ? Object.entries(lastResult.nets || {}).filter(([key]) => key !== 'total').reduce((sum: number, [, score]) => sum + (Number(score) || 0), 0) : 0
        };
      });
    }, [students, results, exams]);

    // En başarılı öğrenciler (Net)
    const topStudentsByNet = useMemo(() => {
      return [...studentPerformance]
        .sort((a, b) => b.avgNet - a.avgNet)
        .slice(0, 5);
    }, [studentPerformance]);

    // En başarılı öğrenciler (Puan)
    const topStudentsByScore = useMemo(() => {
      return [...studentPerformance]
        .sort((a, b) => b.avgPuan - a.avgPuan)
        .slice(0, 5);
    }, [studentPerformance]);

    // Son eklenen denemeler
    const recentExams = useMemo(() => {
      return [...exams]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    }, [exams]);

    // Genel istatistikler
    const stats = useMemo(() => {
      const totalStudents = students.length;
      const totalExams = exams.length;
      const totalResults = results.length;
      const avgStudentsPerExam = totalExams > 0 ? Math.round(totalResults / totalExams) : 0;
      
      return {
        totalStudents,
        totalExams,
        totalResults,
        avgStudentsPerExam
      };
    }, [students, exams, results]);

    return (
      <div className="space-y-8">
        {/* 🏆 Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">📊 Başarı Takip Sistemi</h1>
          <p className="text-blue-100 text-xs">
            Öğrencilerinizin akademik başarılarını takip edin ve analiz edin
          </p>
        </div>

        {/* 📈 Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Öğrenci</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Deneme</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalExams}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Sonuç</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalResults}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Ort. Öğrenci/Deneme</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgStudentsPerExam}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🏆 Top Students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-3">
              <span className="bg-yellow-100 p-2 rounded-lg">🏆</span>
              En Başarılı Öğrenciler (Ortalama Net)
            </h3>
          </div>
          <div className="p-6">
            {topStudentsByNet.length > 0 ? (
              <div className="space-y-4">
                {topStudentsByNet.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-green-600">{student.avgNet.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{student.totalExams} deneme</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz sonuç bulunmamaktadır.</p>
            )}
          </div>
        </div>

        {/* 🏅 En Başarılı Öğrenciler (Ortalama Puan) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-3">
              <span className="bg-purple-100 p-2 rounded-lg">🏅</span>
              En Başarılı Öğrenciler (Ortalama Puan)
            </h3>
          </div>
          <div className="p-6">
            {topStudentsByScore.length > 0 ? (
              <div className="space-y-4">
                {topStudentsByScore.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-purple-600">{student.avgPuan.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">{student.totalExams} deneme</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz sonuç bulunmamaktadır.</p>
            )}
          </div>
        </div>

        {/* 📋 Recent Exams */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-3">
              <span className="bg-blue-100 p-2 rounded-lg">📋</span>
              Son Eklenen Denemeler
            </h3>
          </div>
          <div className="p-6">
            {recentExams.length > 0 ? (
              <div className="space-y-4">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(exam.date).toLocaleDateString('tr-TR')} • {exam.classes?.join(', ') || 'Tüm sınıflar'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {results.filter(r => r.examId === exam.id).length} sonuç
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz deneme bulunmamaktadır.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 🎓 STUDENT MANAGEMENT TAB
  const StudentTab = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentForm, setStudentForm] = useState({
      name: '',
      class: '',
      number: '0',
      viewCount: 0,
      lastViewDate: new Date().toISOString()
    });
    const [loadingStudents, setLoadingStudents] = useState(false);

    const handleAddStudent = async () => {
      if (!studentForm.name.trim() || !studentForm.class) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingStudents(true);
        const newStudent: Omit<Student, 'id'> = {
          name: studentForm.name.trim(),
          class: studentForm.class,
          number: studentForm.number || "0",
          viewCount: 0,
          lastViewDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        await addStudent(newStudent);
        await loadData();
        
        // Formu temizle
        setStudentForm({
          name: '',
          class: '',
          number: '0',
          viewCount: 0,
          lastViewDate: new Date().toISOString()
        });
        setShowAddForm(false);
        
        showToast("Öğrenci başarıyla eklendi!", "success");
      } catch (error) {
        console.error('Add student error:', error);
        showToast("Öğrenci eklenirken hata oluştu", "error");
      } finally {
        setLoadingStudents(false);
      }
    };

    const handleUpdateStudent = async () => {
      if (!editingStudent || !studentForm.name.trim() || !studentForm.class) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingStudents(true);
        const updatedStudent: Partial<Student> = {
          name: studentForm.name.trim(),
          class: studentForm.class,
          number: studentForm.number || "0"
        };
        
        await updateStudent(editingStudent.id, updatedStudent);
        await loadData();
        
        setEditingStudent(null);
        setStudentForm({
          name: '',
          class: '',
          number: '0',
          viewCount: 0,
          lastViewDate: new Date().toISOString()
        });
        
        showToast("Öğrenci başarıyla güncellendi!", "success");
      } catch (error) {
        console.error('Update student error:', error);
        showToast("Öğrenci güncellenirken hata oluştu", "error");
      } finally {
        setLoadingStudents(false);
      }
    };

    const handleDeleteStudent = async (student: Student) => {
      if (!confirm(`${student.name} öğrencisini silmek istediğinizden emin misiniz?`)) {
        return;
      }

      try {
        await deleteStudent(student.id);
        await loadData();
        showToast("Öğrenci başarıyla silindi!", "success");
      } catch (error) {
        console.error('Delete student error:', error);
        showToast("Öğrenci silinirken hata oluştu", "error");
      }
    };

    const startEdit = (student: Student) => {
      setEditingStudent(student);
      setStudentForm({
        name: student.name,
        class: student.class,
        number: student.number || "0",
        viewCount: student.viewCount || 0,
        lastViewDate: student.lastViewDate || new Date().toISOString()
      });
      setShowAddForm(true);
    };

    const cancelEdit = () => {
      setEditingStudent(null);
      setShowAddForm(false);
      setStudentForm({
        name: '',
        class: '',
        number: '0',
        viewCount: 0,
        lastViewDate: new Date().toISOString()
      });
    };

    return (
      <div className="space-y-8">
        {/* 🎓 Student Management Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">🎓 Öğrenci Yönetimi</h1>
          <p className="text-indigo-100 text-xs">
            Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin
          </p>
        </div>

        {/* Add/Edit Student Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-semibold text-gray-800 mb-4">
              {editingStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Öğrenci Adı *
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Öğrenci adını girin"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Sınıf *
                </label>
                <select
                  value={studentForm.class}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, class: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Sınıf seçin</option>
                  {CLASS_OPTIONS.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Numara
                </label>
                <input
                  type="text"
                  value={studentForm.number}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Öğrenci numarası"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={editingStudent ? handleUpdateStudent : handleAddStudent}
                disabled={loadingStudents}
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {loadingStudents ? 'Kaydediliyor...' : (editingStudent ? 'Güncelle' : 'Kaydet')}
              </button>
              <button
                onClick={cancelEdit}
                disabled={loadingStudents}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add Student Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Öğrenci Listesi</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            + Yeni Öğrenci
          </button>
        </div>

        {/* 📚 Sınıf Bazında Kategorize Edilmiş Öğrenci Listesi */}
        <div className="space-y-6">
          {/* Sınıf İstatistikleri */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {CLASS_OPTIONS.map(cls => {
              const classStudentCount = students.filter(s => s.class === cls).length;
              return (
                <div key={cls} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{classStudentCount}</div>
                  <div className="text-xs text-gray-600">{cls} Sınıfı</div>
                </div>
              );
            })}
          </div>

          {/* Sınıf Bazında Öğrenci Grupları */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {CLASS_OPTIONS.map(className => {
              const classStudents = students.filter(s => s.class === className);
              const grade = className.split('-')[0];
              
              return (
                <div key={className} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className={`px-6 py-4 border-b border-gray-200 ${
                    grade === '8' ? 'bg-gradient-to-r from-red-50 to-red-100' :
                    grade === '7' ? 'bg-gradient-to-r from-orange-50 to-orange-100' :
                    grade === '6' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' :
                    'bg-gradient-to-r from-blue-50 to-blue-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          grade === '8' ? 'bg-red-500' :
                          grade === '7' ? 'bg-orange-500' :
                          grade === '6' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          {grade}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{className}</h3>
                          <p className="text-xs text-gray-600">{classStudents.length} öğrenci</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {classStudents.length > 0 ? '✅ Aktif' : '⏳ Boş'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {classStudents.length > 0 ? (
                      <div className="p-4 space-y-2">
                        {classStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-900">{student.name}</div>
                                <div className="text-xs text-gray-500">No: {student.number}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {student.createdAt ? new Date(student.createdAt).toLocaleDateString('tr-TR') : 'N/A'}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEdit(student)}
                                  className="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                >
                                  Düzenle
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student)}
                                  className="text-xs px-2 py-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                >
                                  Sil
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-xs">Bu sınıfta henüz öğrenci bulunmuyor</p>
                        <p className="text-xs text-gray-400 mt-1">Öğrenci eklemek için yukarıdaki formu kullanın</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toplam Özet */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">{students.length}</div>
                <div className="text-indigo-100">Toplam Öğrenci</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{new Set(students.map(s => s.class)).size}</div>
                <div className="text-indigo-100">Aktif Sınıf</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{Math.round(students.length / Math.max(new Set(students.map(s => s.class)).size, 1))}</div>
                <div className="text-indigo-100">Ortalama Sınıf Öğrenci</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 📋 EXAM MANAGEMENT TAB
  const ExamTab = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [examForm, setExamForm] = useState({
      title: '',
      date: new Date().toISOString().split('T')[0],
      classes: [] as string[]
    });
    const [generalAverages, setGeneralAverages] = useState<{ [className: string]: { [key: string]: any; generalScore?: number } }>({});
    const [loadingExams, setLoadingExams] = useState(false);

    const handleAddExam = async () => {
      if (!examForm.title.trim() || !examForm.date) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingExams(true);
        const newExam: Omit<Exam, 'id'> = {
          title: examForm.title.trim(),
          date: examForm.date,
          classes: examForm.classes.length > 0 ? examForm.classes : undefined,
          generalAverages: Object.keys(generalAverages).length > 0 ? generalAverages : undefined
        };
        
        await addExam(newExam);
        await loadData();
        
        setExamForm({
          title: '',
          date: new Date().toISOString().split('T')[0],
          classes: []
        });
        setShowAddForm(false);
        
        showToast("Deneme başarıyla eklendi!", "success");
      } catch (error) {
        console.error('Add exam error:', error);
        showToast("Deneme eklenirken hata oluştu", "error");
      } finally {
        setLoadingExams(false);
      }
    };

    const handleUpdateExam = async () => {
      if (!editingExam || !examForm.title.trim() || !examForm.date) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingExams(true);
        const updatedExam: Partial<Exam> = {
          title: examForm.title.trim(),
          date: examForm.date,
          classes: examForm.classes.length > 0 ? examForm.classes : undefined,
          generalAverages: Object.keys(generalAverages).length > 0 ? generalAverages : undefined
        };
        
        await updateExam(editingExam.id, updatedExam);
        await loadData();
        
        setEditingExam(null);
        setExamForm({
          title: '',
          date: new Date().toISOString().split('T')[0],
          classes: []
        });
        setShowAddForm(false);
        
        showToast("Deneme başarıyla güncellendi!", "success");
      } catch (error) {
        console.error('Update exam error:', error);
        showToast("Deneme güncellenirken hata oluştu", "error");
      } finally {
        setLoadingExams(false);
      }
    };

    const handleDeleteExam = async (exam: Exam) => {
      if (!confirm(`${exam.title} denemesini silmek istediğinizden emin misiniz?`)) {
        return;
      }

      try {
        await deleteExam(exam.id);
        await loadData();
        showToast("Deneme başarıyla silindi!", "success");
      } catch (error) {
        console.error('Delete exam error:', error);
        showToast("Deneme silinirken hata oluştu", "error");
      }
    };

    const startEdit = (exam: Exam) => {
      setEditingExam(exam);
      setExamForm({
        title: exam.title,
        date: exam.date,
        classes: exam.classes || []
      });
      // Genel ortalama bilgilerini yükle
      setGeneralAverages(exam.generalAverages || {});
      setShowAddForm(true);
    };

    const cancelEdit = () => {
      setEditingExam(null);
      setShowAddForm(false);
      setExamForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        classes: []
      });
      setGeneralAverages({});
    };

    const toggleClass = (className: string) => {
      setExamForm(prev => ({
        ...prev,
        classes: prev.classes.includes(className)
          ? prev.classes.filter(c => c !== className)
          : [...prev.classes, className]
      }));
    };

    const updateGeneralAverage = (className: string, courseKey: string, value: number) => {
      setGeneralAverages(prev => ({
        ...prev,
        [className]: {
          ...prev[className],
          [courseKey]: value
        }
      }));
    };

    const updateGeneralScore = (className: string, value: number) => {
      setGeneralAverages(prev => ({
        ...prev,
        [className]: {
          ...prev[className],
          generalScore: value
        }
      }));
    };

    return (
      <div className="space-y-8">
        {/* 📋 Exam Management Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">📋 Deneme Yönetimi</h1>
          <p className="text-emerald-100 text-xs">
            Deneme bilgilerini ekleyin, düzenleyin ve yönetin
          </p>
        </div>

        {/* Add/Edit Exam Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-semibold text-gray-800 mb-4">
              {editingExam ? 'Deneme Düzenle' : 'Yeni Deneme Ekle'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deneme Adı *
                </label>
                <input
                  type="text"
                  value={examForm.title}
                  onChange={(e) => setExamForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Deneme adını girin"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deneme Tarihi *
                </label>
                <input
                  type="date"
                  value={examForm.date}
                  onChange={(e) => setExamForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Hedef Sınıflar (İsteğe bağlı)
              </label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {CLASS_OPTIONS.map(cls => (
                  <label key={cls} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={examForm.classes.includes(cls)}
                      onChange={() => toggleClass(cls)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-700">{cls}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Boş bırakılırsa tüm sınıflar için geçerli olur
              </p>
            </div>
            {/* 🆕 GENEL ORTALAMA GİRİŞ BÖLÜMÜ */}
            {examForm.classes.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-blue-800">📊 Genel Ortalama Bilgileri</h4>
                </div>
                
                {examForm.classes.length > 0 && (
                  <div className="space-y-6">
                    <p className="text-xs text-blue-700">
                      📋 Her sınıf için genel ortalamaları girin. Bu bilgiler üçlü kıyaslama yorumlayıcısında kullanılacak.
                    </p>
                    
                    {examForm.classes.map(className => {
                      const classAverage = generalAverages[className] || { generalScore: 0 };
                      const courses = getCoursesByClass(className);
                      
                      return (
                        <div key={className} className="bg-white p-4 rounded border border-blue-200">
                          <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold mr-2">
                              {className}
                            </span>
                            {className} Sınıfı Genel Ortalamaları
                          </h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                            {courses
                              .sort((a, b) => {
                                // Türkçe, Sosyal Bilgiler, Din Kültürü, İngilizce, Matematik, Fen sıralaması
                                const order: { [key: string]: number } = { 
                                  "turkce": 1, 
                                  "sosyal": 2, 
                                  "din": 3, 
                                  "ingilizce": 4, 
                                  "matematik": 5, 
                                  "fen": 6 
                                };
                                return (order[a.key] || 999) - (order[b.key] || 999);
                              })
                              .map(course => (
                              <div key={course.key} className="space-y-1">
                                <label className="block text-xs font-medium text-gray-600">
                                  {course.label} Net
                                </label>
                                <input
                                  key={`avg-${className}-${course.key}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={classAverage[course.key] || ''}
                                  onChange={(e) => updateGeneralAverage(className, course.key, Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0,00"
                                />
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              🎆 {className} Genel Puan Ortalaması
                            </label>
                            <input
                              key={`gen-${className}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={classAverage.generalScore || ''}
                              onChange={(e) => updateGeneralScore(className, Number(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={editingExam ? handleUpdateExam : handleAddExam}
                disabled={loadingExams}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {loadingExams ? 'Kaydediliyor...' : (editingExam ? 'Güncelle' : 'Kaydet')}
              </button>
              <button
                onClick={cancelEdit}
                disabled={loadingExams}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add Exam Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Deneme Listesi</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            + Yeni Deneme
          </button>
        </div>

        {/* Exam List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deneme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sınıflar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sonuç Sayısı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{exam.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {new Date(exam.date).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500">
                        {exam.classes && exam.classes.length > 0 
                          ? exam.classes.join(', ')
                          : 'Tüm sınıflar'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {results.filter(r => r.examId === exam.id).length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(exam)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {exams.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Henüz deneme bulunmamaktadır.
            </div>
          )}
        </div>
      </div>
    );
  };

  // 👨‍🎓 BİREYSEL VERİ GİRİŞİ TAB'ı
  const IndividualTab = () => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [individualForm, setIndividualForm] = useState({
      studentId: '',
      examId: '',
      puan: '', // Ayrı Puan alanı
      scores: {} as { [courseKey: string]: { D: string, Y: string, B: string } }
    });
    const [availableStudentsIndividual, setAvailableStudentsIndividual] = useState<Student[]>([]);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(false);

    // Sınıf seçildiğinde öğrenci ve deneme listelerini güncelle
    useEffect(() => {
      if (selectedClass) {
        const filteredStudents = students.filter(student => student.class === selectedClass);
        setAvailableStudentsIndividual(filteredStudents);
        
        const filteredExams = exams.filter(exam => 
          !exam.classes || exam.classes.includes(selectedClass) || exam.classes.length === 0
        );
        setAvailableExams(filteredExams);
        
        // Form'u sıfırla
        setIndividualForm({
          studentId: '',
          examId: '',
          puan: '',
          scores: {}
        });
      } else {
        setAvailableStudentsIndividual([]);
        setAvailableExams([]);
      }
    }, [selectedClass, students, exams]);

    // Seçilen öğrenci ve denemeye göre mevcut verileri yükle
    useEffect(() => {
      if (individualForm.studentId && individualForm.examId && selectedClass) {
        const selectedStudent = availableStudentsIndividual.find(s => s.id === individualForm.studentId);
        if (selectedStudent) {
          const courses = getCoursesByClass(selectedClass);
          
          // Mevcut verileri bul
          const existingResult = results.find(result => 
            result.studentId === individualForm.studentId && 
            result.examId === individualForm.examId
          );
          
          // Her zaman önce form'u temizle, sonra veri varsa yükle
          const loadedScores = courses.reduce((acc, course) => {
            if (existingResult && existingResult.scores && existingResult.scores[course.key]) {
              acc[course.key] = {
                D: existingResult.scores[course.key].D || '',
                Y: existingResult.scores[course.key].Y || '',
                B: existingResult.scores[course.key].B || ''
              };
            } else {
              acc[course.key] = { D: '', Y: '', B: '' };
            }
            return acc;
          }, {});
          
          setIndividualForm(prev => ({ 
            ...prev, 
            puan: existingResult.scores.puan || '',
            scores: loadedScores
          }));
          // Toast kaldırıldı - kullanıcı zaten form dolu olduğunu görebilir
        }
      }
    }, [individualForm.studentId, individualForm.examId, selectedClass, availableStudentsIndividual, results]);

    const updateIndividualScore = useCallback((courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setIndividualForm(prev => ({
        ...prev,
        scores: {
          ...prev.scores,
          [courseKey]: {
            ...prev.scores[courseKey],
            [field]: value
          }
        }
      }));
    }, []);

    const calculateIndividualTotals = useCallback(() => {
      const scores = individualForm.scores;
      let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;
      
      Object.values(scores).forEach(score => {
        const d = parseInt(score.D) || 0;
        const y = parseInt(score.Y) || 0;
        const b = parseInt(score.B) || 0;
        const net = calcNet(d, y);
        
        totalD += d;
        totalY += y;
        totalB += b;
        totalNet += net;
      });
      
      // Puan alanını da dahil et
      const totalPuan = parseFloat(individualForm.puan) || 0;
      
      return { totalD, totalY, totalB, totalNet: Number(totalNet.toFixed(2)), totalP: totalPuan };
    }, [individualForm.scores, individualForm.puan]);

    const handleIndividualSubmit = async () => {
      if (!individualForm.studentId || !individualForm.examId) {
        showToast("Lütfen öğrenci ve deneme seçin", "error");
        return;
      }

      const totals = calculateIndividualTotals();
      
      try {
        setLoading(true);
        
        // Net hesaplama
        const nets: any = { total: totals.totalNet };
        Object.entries(individualForm.scores).forEach(([courseKey, score]) => {
          const d = parseInt(score.D) || 0;
          const y = parseInt(score.Y) || 0;
          nets[courseKey] = calcNet(d, y);
        });

        const resultData: Omit<Result, 'id' | 'createdAt'> = {
          studentId: individualForm.studentId,
          examId: individualForm.examId,
          nets,
          scores: {
            ...individualForm.scores,
            puan: individualForm.puan || '0' // Puan'ı ayrı kaydet
          }
        };

        // Aynı öğrenci ve deneme için mevcut kayıt var mı kontrol et
        const existingResult = results.find(r => 
          r.studentId === individualForm.studentId && 
          r.examId === individualForm.examId
        );

        if (existingResult) {
          // Mevcut kaydı güncelle
          await updateResult(existingResult.id, resultData);
        } else {
          // Yeni kayıt ekle
          await addResult(resultData);
        }
        await loadData();
        
        // Form'u sıfırla
        setIndividualForm({
          studentId: '',
          examId: '',
          puan: '',
          scores: {}
        });
        
        showToast("Bireysel sonuç başarıyla kaydedildi!", "success");
      } catch (error) {
        console.error('Individual result error:', error);
        showToast("Sonuç kaydedilirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    const totals = calculateIndividualTotals();

    return (
      <div className="space-y-8">
        {/* 📊 Bireysel Veri Girişi Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">👨‍🎓 Bireysel Veri Girişi</h1>
          <p className="text-blue-100 text-xs">
            Öğrencilerin tek tek deneme sonuçlarını girin ve analiz edin
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleIndividualSubmit(); }} className="space-y-6">
            {/* Sınıf Seçimi */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Sınıf Seçin *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sınıf seçin</option>
                {CLASS_OPTIONS.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Öğrenci ve Deneme Seçimi */}
            {selectedClass && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Öğrenci Seçin *
                  </label>
                  <select
                    value={individualForm.studentId}
                    onChange={(e) => setIndividualForm(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Öğrenci seçin</option>
                    {availableStudentsIndividual.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Deneme Seçin *
                  </label>
                  <select
                    value={individualForm.examId}
                    onChange={(e) => setIndividualForm(prev => ({ ...prev, examId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Deneme seçin</option>
                    {availableExams.map(exam => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} ({new Date(exam.date).toLocaleDateString('tr-TR')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Skor Girişi */}
            {individualForm.studentId && individualForm.examId && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-800">Net Hesaplama</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getCoursesByClass(selectedClass).map(course => (
                    <div key={course.key} className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-800 mb-3">{course.label}</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Doğru (D)</label>
                          <input
                            type="number"
                            min="0"
                            value={individualForm.scores[course.key]?.D || ''}
                            onChange={(e) => updateIndividualScore(course.key, 'D', e.target.value)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Yanlış (Y)</label>
                          <input
                            type="number"
                            min="0"
                            value={individualForm.scores[course.key]?.Y || ''}
                            onChange={(e) => updateIndividualScore(course.key, 'Y', e.target.value)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Boş (B)</label>
                          <input
                            type="number"
                            min="0"
                            value={individualForm.scores[course.key]?.B || ''}
                            onChange={(e) => updateIndividualScore(course.key, 'B', e.target.value)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="text-xs font-bold text-blue-600">
                            Net: {calcNet(
                              parseInt(individualForm.scores[course.key]?.D || '0'),
                              parseInt(individualForm.scores[course.key]?.Y || '0')
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Puan Girişi */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2">🎯 Toplam Puan (Puan Tabanında)</h4>
                  <div className="max-w-md">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Öğrencinin Toplam Puanı
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={individualForm.puan || ''}
                      onChange={(e) => setIndividualForm(prev => ({ ...prev, puan: e.target.value }))}
                      className="w-full px-3 py-2 text-lg border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Öğrencinin toplam puanını girin"
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      Puan alanını manuel giriniz
                    </p>
                  </div>
                </div>

                {/* Toplam İstatistikler */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Toplam İstatistikler</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{totals.totalD}</div>
                      <div className="text-xs text-blue-700">Toplam Doğru</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{totals.totalY}</div>
                      <div className="text-xs text-red-700">Toplam Yanlış</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">{totals.totalB}</div>
                      <div className="text-xs text-gray-700">Toplam Boş</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{totals.totalP}</div>
                      <div className="text-xs text-yellow-700">Toplam Puan</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{totals.totalNet}</div>
                      <div className="text-xs text-green-700">Toplam Net</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {individualForm.studentId && individualForm.examId && (
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {loading ? 'Kaydediliyor...' : '💾 Sonuçları Kaydet'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  };

  // 🎯 HEDEF BELİRLEME TAB'ı
  const TargetTab = () => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [studentTargetForm, setStudentTargetForm] = useState<{[subject: string]: number}>({});
    const [studentScoreTarget, setStudentScoreTarget] = useState<number>(450);
    const [loading, setLoading] = useState(false);

    // LGS Dersleri için varsayılan hedefler
    const lgsSubjects = [
      { key: 'turkce', label: 'Türkçe', target: 17 },
      { key: 'sosyal', label: 'Sosyal Bilgiler', target: 18 },
      { key: 'din', label: 'Din Kültürü', target: 19 },
      { key: 'ingilizce', label: 'İngilizce', target: 16 },
      { key: 'matematik', label: 'Matematik', target: 16 },
      { key: 'fen', label: 'Fen Bilimleri', target: 17 }
    ];

    // Öğrencinin mevcut ortalamalarını hesapla
    const getStudentCurrentAverages = () => {
      
      if (!selectedStudent || results.length === 0) {
        return lgsSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      // Seçili öğrencinin tüm deneme sonuçlarını al
      const studentResults = results.filter(r => r.studentId === selectedStudent);
      
      if (studentResults.length === 0) {
        return lgsSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      // İlk sonucun örnek yapısını göster
      if (studentResults.length > 0) {

      }

      // Her ders için ortalama hesapla
      const averages: {[key: string]: number} = {};
      
      lgsSubjects.forEach(subject => {

        const subjectScores: number[] = [];
        
        studentResults.forEach((result, index) => {

          
          // Scores objesinden D-Y değerlerini alıp net hesapla
          if (result.scores && result.scores[subject.key]) {
            const subjectData = result.scores[subject.key];

            
            const d = parseInt(subjectData.D) || 0;
            const y = parseInt(subjectData.Y) || 0;
            const net = calcNet(d, y);
            

            
            if (net > 0) {
              subjectScores.push(net);
            }
          } else {

          }
        });
        

        
        // Ortalama hesapla (eğer veri varsa)
        const average = subjectScores.length > 0 
          ? subjectScores.reduce((sum, net) => sum + net, 0) / subjectScores.length 
          : 0;
        

        averages[subject.key] = average;
      });
      

      return averages;
    };

    // Son deneme netlerini al
    const getStudentLastExamNets = () => {

      
      if (!selectedStudent || results.length === 0) {

        return lgsSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      const studentResults = results.filter(r => r.studentId === selectedStudent);

      
      if (studentResults.length === 0) {

        return lgsSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      // En son denemeyi al (sonuçlar tarih sırasına göre düzenlenmiş olmalı)
      const lastResult = studentResults[studentResults.length - 1];

      
      const lastNets: {[key: string]: number} = {};
      
      lgsSubjects.forEach(subject => {

        
        if (lastResult.scores && lastResult.scores[subject.key]) {
          const d = parseInt(lastResult.scores[subject.key].D) || 0;
          const y = parseInt(lastResult.scores[subject.key].Y) || 0;
          const net = calcNet(d, y);
          

          lastNets[subject.key] = net;
        } else {

          lastNets[subject.key] = 0;
        }
      });


      return lastNets;
    };

    // Öğrenci seçildiğinde hedefleri yükle (verimli versiyon)
    useEffect(() => {
      if (selectedStudent) {
        // Firebase'den fresh veri çek
        const loadFreshTargets = async () => {
          try {
            // Sadece seçili öğrencinin hedefini çek (daha verimli)
            const targetsRef = doc(db, 'targets', selectedStudent);
            const targetsSnapshot = await getDoc(targetsRef);
            
            if (targetsSnapshot.exists()) {
              const data = targetsSnapshot.data();
              const dashboardTargets = data.targets || {};
              const panelTargets = mapDashboardKeysToPanel(dashboardTargets);
              const scoreTarget = data.targetScore || 450;
              
              const formData: {[subject: string]: number} = {};
              
              lgsSubjects.forEach(subject => {
                formData[subject.key] = panelTargets[subject.key] || subject.target;
              });
              
              console.log('📊 Fresh hedefler yüklendi - Panel:', formData);
              console.log('🎯 Fresh puan hedefi:', scoreTarget);
              setStudentTargetForm(formData);
              setStudentScoreTarget(scoreTarget);
              
            } else {
              // Hedef bulunamadı, varsayılan değerlerle başla
              const formData: {[subject: string]: number} = {};
              lgsSubjects.forEach(subject => {
                formData[subject.key] = subject.target;
              });
              setStudentTargetForm(formData);
              setStudentScoreTarget(450);
              console.log('📋 Hedef bulunamadı, varsayılan değerler yüklendi');
            }
            
          } catch (error) {
            console.error('Fresh target load error:', error);
            // Hata durumunda varsayılan değerlerle devam et
            const formData: {[subject: string]: number} = {};
            lgsSubjects.forEach(subject => {
              formData[subject.key] = subject.target;
            });
            setStudentTargetForm(formData);
            setStudentScoreTarget(450);
          }
        };
        
        loadFreshTargets();
      } else {
        setStudentTargetForm({});
        setStudentScoreTarget(450);
      }
    }, [selectedStudent]);

    // Hedef güncelleme
    const updateTarget = (subject: string, target: number) => {
      setStudentTargetForm(prev => ({
        ...prev,
        [subject]: target
      }));
    };

    // Hedefleri kaydetme
    const handleSaveTargets = async () => {
      if (!selectedStudent) {
        showToast("Lütfen bir öğrenci seçin", "error");
        return;
      }

      try {
        setLoading(true);
        // Firebase'e hedefleri kaydet (net hedefleri + puan hedefi)
        await saveStudentTargets(selectedStudent, studentTargetForm, studentScoreTarget);
        
        // Local state'i de güncelle (dashboard formatında)
        const dashboardTargets = mapPanelKeysToDashboard(studentTargetForm);
        setStudentTargets(prev => ({
          ...prev,
          [selectedStudent]: dashboardTargets
        }));
        
        // Puan hedeflerini güncelle
        setStudentScoreTargets(prev => ({
          ...prev,
          [selectedStudent]: studentScoreTarget
        }));

        showToast("Hedefler başarıyla kaydedildi!", "success");
      } catch (error) {
        console.error('Target save error:', error);
        showToast("Hedefler kaydedilirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    // Hesaplamalar
    const currentAverages = getStudentCurrentAverages();
    const lastExamNets = getStudentLastExamNets();
    const currentTotal = Object.values(currentAverages).reduce((sum, current) => sum + current, 0);
    const targetTotal = Object.values(studentTargetForm).reduce((sum, target) => sum + target, 0);
    const totalImprovement = targetTotal - currentTotal;

    return (
      <div className="space-y-8">
        {/* 🎯 Hedef Belirleme Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">🎯 Hedef Belirleme</h1>
          <p className="text-purple-100 text-xs">
            Öğrenciler için ders bazında hedef net belirleyin ve takip edin
          </p>
        </div>

        {/* Sınıf ve Öğrenci Seçimi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-semibold text-gray-800 mb-4">Seçim Yapın</h3>
          
          {/* Sınıf Seçimi */}
          <div className="mb-4">
            <label className="block text-xs text-gray-600 mb-2">Sınıf Seçin</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent(''); // Sınıf değişince öğrenci seçimini temizle
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sınıf seçin</option>
              {Array.from(new Set(students.map(s => s.class))).map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
          
          {/* Öğrenci Seçimi */}
          {selectedClass && (
            <div>
              <label className="block text-xs text-gray-600 mb-2">Öğrenci Seçin</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Öğrenci seçin</option>
                {students.filter(student => student.class === selectedClass).map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Hedef Belirleme Formu - Sadece öğrenci seçildiğinde görünür */}
        {!selectedStudent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Hedef Belirleme</h3>
            <p className="text-gray-600 mb-4">Bir öğrenci seçerek ders hedeflerini belirleyebilir ve mevcut durumunu görüntüleyebilirsiniz.</p>
            <p className="text-sm text-gray-500">Yukarıdan bir sınıf ve öğrenci seçin</p>
          </div>
        )}

        {selectedStudent && (
          <div className="space-y-6">
            {/* Hedef Puan Belirleme */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                🎯 {students.find(s => s.id === selectedStudent)?.name} - LGS Puan Hedefi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Hedef Puan</label>
                  <input
                    type="number"
                    min="100"
                    max="500"
                    value={studentScoreTarget}
                    onChange={(e) => {
                      const newValue = Number(e.target.value) || 450;
                      setStudentScoreTarget(newValue);
                    }}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                    placeholder="Hedef puanınızı girin (100-500)"
                  />

                </div>
              </div>
            </div>

            {/* Ders Bazında Hedef Netler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                📚 {students.find(s => s.id === selectedStudent)?.name} - LGS Ders Hedefleri
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {lgsSubjects.map((subject) => (
                  <div key={subject.key} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 min-h-[280px] flex flex-col">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center text-sm">
                      <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold mr-2">
                        {subject.label.charAt(0)}
                      </span>
                      {subject.label}
                    </h4>
                    
                    <div className="space-y-3 flex-grow">
                      {/* Mevcut Durum */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mevcut Durum</label>
                        <div className="bg-gray-100 p-2 rounded-lg space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Ortalama:</span>
                            <span className="text-xs font-bold text-gray-700">
                              {currentAverages[subject.key]?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Son Deneme:</span>
                            <span className="text-xs font-bold text-gray-700">
                              {lastExamNets[subject.key]?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mevcut Hedef */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mevcut Hedef</label>
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-xs text-purple-600">Belirlenen:</span>
                            <span className="text-xs font-bold text-purple-700">
                              {studentTargetForm[subject.key]?.toFixed(1) || subject.target}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-purple-600">Fark:</span>
                            <span className={`text-xs font-bold ${
                              (studentTargetForm[subject.key] || subject.target) - (currentAverages[subject.key] || 0) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {((studentTargetForm[subject.key] || subject.target) - (currentAverages[subject.key] || 0)) >= 0 ? '+' : ''}
                              {((studentTargetForm[subject.key] || subject.target) - (currentAverages[subject.key] || 0)).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hedef Net */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Yeni Hedef Net
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.5"
                          value={studentTargetForm[subject.key] || subject.target}
                          onChange={(e) => updateTarget(subject.key, Number(e.target.value))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                          placeholder={`Varsayılan: ${subject.target}`}
                        />
                      </div>
                      
                      {/* Gelişim */}
                      <div className="text-center">
                        <span className="text-xs text-gray-500">Artış:</span>
                        <span className={`ml-1 font-bold text-xs ${(studentTargetForm[subject.key] || subject.target) - (currentAverages[subject.key] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {((studentTargetForm[subject.key] || subject.target) - (currentAverages[subject.key] || 0)) >= 0 ? '+' : ''}
                          {((studentTargetForm[subject.key] || subject.target) - (currentAverages[subject.key] || 0)).toFixed(1)} net
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, ((studentTargetForm[subject.key] || subject.target) / 20) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Toplam Hedef Özeti */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-8">
              <h4 className="text-2xl font-bold mb-6 text-center">🏆 Toplam Hedef Özeti</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-6">
                  <div className="text-3xl font-bold mb-2">{currentTotal}</div>
                  <div className="text-purple-100 text-lg">Mevcut Toplam Net</div>
                </div>
                <div className="bg-white bg-opacity-30 rounded-lg p-6 border-2 border-white">
                  <div className="text-4xl font-bold mb-2">{targetTotal}</div>
                  <div className="text-white text-xl">Hedef Toplam Net</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-6">
                  <div className="text-3xl font-bold mb-2 text-yellow-300">
                    {totalImprovement >= 0 ? '+' : ''}{totalImprovement.toFixed(1)}
                  </div>
                  <div className="text-purple-100 text-lg">Toplam Artış</div>
                </div>
              </div>
              
              {/* İlerleme Çubuğu */}
              <div className="mt-8">
                <div className="flex justify-between text-xs mb-2">
                  <span>Mevcut Durum</span>
                  <span>Hedef</span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-green-400 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (currentTotal / targetTotal) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Öğrenci Listesi - Hızlı Hedef Belirleme */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-semibold text-gray-800 mb-4">Tüm Öğrenciler İçin Toplu Hedef Belirleme</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => {
                  const studentTarget = studentTargets[student.id];
                  const totalTarget = studentTarget ? Object.values(studentTarget).reduce((sum, target) => sum + target, 0) : 0;
                  
                  return (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{student.name}</h4>
                        <span className="text-xs text-gray-500">{student.class}</span>
                      </div>
                      
                      {studentTarget ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">
                            Toplam Hedef: <span className="font-bold text-purple-600">{totalTarget.toFixed(1)}</span> net
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(totalTarget / 120) * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedStudent(student.id)}
                              className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Düzenle
                            </button>
                            <button 
                              onClick={() => {
                                const updatedTargets = { ...studentTargets };
                                delete updatedTargets[student.id];
                                setStudentTargets(updatedTargets);
                              }}
                              className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setSelectedStudent(student.id)}
                          className="text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          + Hedef Belirle
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="text-center">
              <button
                onClick={handleSaveTargets}
                disabled={loading || !selectedStudent}
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
                  loading || !selectedStudent
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {loading ? 'Kaydediliyor...' : '💾 Hedefleri Kaydet'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 👥 TOPLU VERİ GİRİŞİ TAB'ı
  const BulkTab = () => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [bulkScores, setBulkScores] = useState<{[studentId: string]: {[courseKey: string]: {D: string, Y: string, B: string}}}>({});
    const [studentPuan, setStudentPuan] = useState<{[studentId: string]: string}>({});
    const [loading, setLoading] = useState(false);
    const [availableStudentsBatch, setAvailableStudentsBatch] = useState<Student[]>([]);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);

    // Sınıf seçildiğinde öğrenci ve deneme listelerini güncelle
    useEffect(() => {
      if (selectedClass) {
        const filteredStudents = students.filter(student => student.class === selectedClass);
        setAvailableStudentsBatch(filteredStudents);
        
        const filteredExams = exams.filter(exam => 
          !exam.classes || exam.classes.includes(selectedClass) || exam.classes.length === 0
        );
        setAvailableExams(filteredExams);
        
        // Öğrenci skorlarını sıfırla
        const initialScores: {[studentId: string]: {[courseKey: string]: {D: string, Y: string, B: string}}} = {};
        filteredStudents.forEach(student => {
          const courses = getCoursesByClass(student.class);
          initialScores[student.id] = courses.reduce((acc, course) => {
            acc[course.key] = { D: "", Y: "", B: "" };
            return acc;
          }, {});
        });
        setBulkScores(initialScores);
        setSelectedExamId(''); // Sınıf değiştiğinde deneme seçimini temizle
      } else {
        setAvailableStudentsBatch([]);
        setAvailableExams([]);
        setBulkScores({});
        setSelectedExamId('');
      }
    }, [selectedClass, students, exams]);

    // Deneme seçildiğinde mevcut verileri yükle (deneme değişikliğinde yeniden yükle)
    useEffect(() => {
      if (selectedExamId && selectedClass && availableStudentsBatch.length > 0) {
        loadExistingExamData();
      }
    }, [selectedExamId, selectedClass, availableStudentsBatch.length]);

    // Mevcut deneme verilerini yükle (güvenli versiyon)
    const loadExistingExamData = useCallback(() => {
      try {
        // Sadece deneme ID'si varsa devam et
        if (!selectedExamId) return;
        
        // State'den verileri oku (re-render tetiklemeden)
        const classStudentIds = availableStudentsBatch.map(s => s.id);
        const existingResults = results.filter(result => 
          result.examId === selectedExamId && classStudentIds.includes(result.studentId)
        );

        // Sadece mevcut veri varsa yükle
        if (existingResults.length > 0) {
          const loadedScores: {[studentId: string]: {[courseKey: string]: {D: string, Y: string, B: string}}} = {};
          const loadedPuanScores: {[studentId: string]: string} = {};
          
          availableStudentsBatch.forEach(student => {
            const studentResult = existingResults.find(r => r.studentId === student.id);
            const courses = getCoursesByClass(student.class);
            
            loadedScores[student.id] = courses.reduce((acc, course) => {
              if (studentResult && studentResult.scores && studentResult.scores[course.key]) {
                acc[course.key] = {
                  D: studentResult.scores[course.key].D || "",
                  Y: studentResult.scores[course.key].Y || "",
                  B: studentResult.scores[course.key].B || ""
                };
              } else {
                acc[course.key] = { D: "", Y: "", B: "" };
              }
              return acc;
            }, {});
            
            // Puan değerini ayrı olarak yükle
            if (studentResult && studentResult.scores && studentResult.scores.puan) {
              loadedPuanScores[student.id] = studentResult.scores.puan;
            }
          });
          
          setBulkScores(loadedScores);
          setStudentPuan(loadedPuanScores);
          
          // Toast kaldırıldı - kullanıcı zaten form dolu olduğunu görebilir
        }
        // Sonuç yoksa formu bozmuyoruz - mevcut durum korunuyor
      } catch (error) {
        console.error('Load existing exam data error:', error);
        setTimeout(() => {
          showToast("Mevcut veriler yüklenirken hata oluştu", "error");
        }, 100);
      }
    }, [selectedExamId, availableStudentsBatch, results, setBulkScores, setStudentPuan]);

    const updateBulkScore = useCallback((studentId: string, courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setBulkScores(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [courseKey]: {
            ...prev[studentId][courseKey],
            [field]: value
          }
        }
      }));
    }, []);

    const calculateStudentTotal = useCallback((studentScores: {[courseKey: string]: {D: string, Y: string, B: string}}) => {
      let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;
      
      Object.values(studentScores).forEach(score => {
        const d = parseInt(score.D) || 0;
        const y = parseInt(score.Y) || 0;
        const b = parseInt(score.B) || 0;
        const net = calcNet(d, y);
        
        totalD += d;
        totalY += y;
        totalB += b;
        totalNet += net;
      });
      
      return { totalD, totalY, totalB, totalNet: Number(totalNet.toFixed(2)) };
    }, []);

    const calculateClassTotals = useCallback(() => {
      let classTotals = { totalD: 0, totalY: 0, totalB: 0, totalNet: 0 };
      const studentCount = Object.keys(bulkScores).length;
      
      Object.values(bulkScores).forEach(studentScores => {
        const totals = calculateStudentTotal(studentScores);
        classTotals.totalD += totals.totalD;
        classTotals.totalY += totals.totalY;
        classTotals.totalB += totals.totalB;
        classTotals.totalNet += totals.totalNet;
      });
      
      // Puan ortalamasını ayrı hesapla
      const puanValues = Object.values(studentPuan).map(p => parseFloat(p) || 0);
      const totalPuan = puanValues.reduce((sum, p) => sum + p, 0);
      const averagePuan = studentCount > 0 ? totalPuan / studentCount : 0;
      
      // Ortalamaları hesapla
      return {
        totalD: studentCount > 0 ? Number((classTotals.totalD / studentCount).toFixed(2)) : 0,
        totalY: studentCount > 0 ? Number((classTotals.totalY / studentCount).toFixed(2)) : 0,
        totalB: studentCount > 0 ? Number((classTotals.totalB / studentCount).toFixed(2)) : 0,
        totalNet: studentCount > 0 ? Number((classTotals.totalNet / studentCount).toFixed(2)) : 0,
        averagePuan: Number(averagePuan.toFixed(2))
      };
    }, [bulkScores, calculateStudentTotal, studentPuan]);

    const handleBulkSubmit = async () => {
      if (!selectedClass || !selectedExamId) {
        showToast("Lütfen sınıf ve deneme seçin", "error");
        return;
      }

      const studentCount = Object.keys(bulkScores).length;

      try {
        setLoading(true);
        
        // Önce mevcut sonuçları sil
        const existingResults = results.filter(r => r.examId === selectedExamId);
        if (existingResults.length > 0) {
          const deletePromises = existingResults.map(result => deleteResult(result.id));
          await Promise.all(deletePromises);
        }
        
        // Yeni sonuçları ekle
        const promises = Object.entries(bulkScores).map(async ([studentId, scores]) => {
          const totals = calculateStudentTotal(scores);
          
          // Net hesaplama
          const nets: any = { total: totals.totalNet };
          Object.entries(scores).forEach(([courseKey, score]) => {
            const d = parseInt(score.D) || 0;
            const y = parseInt(score.Y) || 0;
            nets[courseKey] = calcNet(d, y);
          });

          const resultData: Omit<Result, 'id' | 'createdAt'> = {
            studentId,
            examId: selectedExamId,
            nets,
            scores: {
              ...scores,
              puan: studentPuan[studentId] || '0' // Puan'ı ayrı kaydet
            }
          };

          return addResult(resultData);
        });

        await Promise.all(promises);
        
        // Verileri güncelle
        await loadData();
        
        showToast(`${studentCount} öğrenci için sonuçlar başarıyla kaydedildi!`, "success");
      } catch (error) {
        console.error('Bulk results error:', error);
        showToast("Sonuçlar kaydedilirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    const classTotals = calculateClassTotals();

    return (
      <div className="space-y-6">
        {/* 📊 Toplu Veri Girişi Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">👥 Toplu Veri Girişi</h1>
          <p className="text-cyan-100 text-xs">
            Birden fazla öğrencinin deneme sonuçlarını aynı anda girin
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="space-y-4">
            {/* Sınıf ve Deneme Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Sınıf Seçin *
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                >
                  <option value="">Sınıf seçin</option>
                  {CLASS_OPTIONS.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deneme Seçin *
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                  disabled={!selectedClass}
                >
                  <option value="">Deneme seçin</option>
                  {availableExams.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({new Date(exam.date).toLocaleDateString('tr-TR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Öğrenci Listesi ve Skor Girişi */}
            {selectedClass && selectedExamId && availableStudentsBatch.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-800">
                  Öğrenci Sonuç Girişi ({availableStudentsBatch.length} öğrenci)
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg" style={{ fontSize: '11px' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-700 border-b">
                          Öğrenci
                        </th>
                        {getCoursesByClass(selectedClass).map(course => (
                          <th key={course.key} className="px-1 py-1 text-center text-[10px] font-medium text-gray-700 border-b min-w-[100px]">
                            {course.label}
                            <div className="text-[8px] text-gray-600 mt-0.5 font-semibold">
                              <span className="inline-block w-4 text-center">D</span>
                              <span className="inline-block w-4 text-center">Y</span>
                              <span className="inline-block w-4 text-center">B</span>
                              <span className="inline-block w-4 text-center">N</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-2 py-1 text-center text-[10px] font-medium text-gray-700 border-b">
                          Puan
                        </th>
                        <th className="px-2 py-1 text-center text-[10px] font-medium text-gray-700 border-b">
                          D/Y/B/N
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {availableStudentsBatch.map((student, index) => (
                        <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1 text-[10px] font-medium text-gray-900 border-b">
                            <div>
                              <div>{student.name}</div>
                              <div className="text-[8px] text-gray-500">No: {student.number}</div>
                            </div>
                          </td>
                          {getCoursesByClass(selectedClass).map(course => (
                            <td key={course.key} className="px-1 py-1 border-b text-center">
                              <div className="flex flex-col items-center space-y-0.5">
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">D</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bulkScores[student.id]?.[course.key]?.D || ''}
                                    onChange={(e) => updateBulkScore(student.id, course.key, 'D', e.target.value)}
                                    className="w-8 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center font-semibold"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">Y</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bulkScores[student.id]?.[course.key]?.Y || ''}
                                    onChange={(e) => updateBulkScore(student.id, course.key, 'Y', e.target.value)}
                                    className="w-8 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center font-semibold"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">B</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bulkScores[student.id]?.[course.key]?.B || ''}
                                    onChange={(e) => updateBulkScore(student.id, course.key, 'B', e.target.value)}
                                    className="w-8 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center font-semibold"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">N</label>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={calcNet(
                                      parseInt(bulkScores[student.id]?.[course.key]?.D || '0'),
                                      parseInt(bulkScores[student.id]?.[course.key]?.Y || '0')
                                    ).toFixed(2)}
                                    readOnly
                                    className="w-9 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-center font-bold"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </td>
                          ))}
                          <td className="px-2 py-1 text-center border-b">
                            <div className="grid grid-cols-2 gap-0.5 text-[8px]">
                              <div className="bg-blue-100 px-0.5 py-0.5 rounded text-blue-800 font-medium">
                                D: {calculateStudentTotal(bulkScores[student.id] || {}).totalD}
                              </div>
                              <div className="bg-red-100 px-0.5 py-0.5 rounded text-red-800 font-medium">
                                Y: {calculateStudentTotal(bulkScores[student.id] || {}).totalY}
                              </div>
                              <div className="bg-gray-100 px-0.5 py-0.5 rounded text-gray-800 font-medium">
                                B: {calculateStudentTotal(bulkScores[student.id] || {}).totalB}
                              </div>
                              <div className="bg-green-100 px-0.5 py-0.5 rounded text-green-800 font-bold col-span-2">
                                N: {calculateStudentTotal(bulkScores[student.id] || {}).totalNet.toFixed(2)}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center border-b">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={studentPuan[student.id] || ''}
                              onChange={(e) => setStudentPuan(prev => ({
                                ...prev,
                                [student.id]: e.target.value
                              }))}
                              className="w-full px-1 py-0.5 text-[9px] border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-center font-semibold"
                              placeholder="Puan"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sınıf Ortalamaları */}
                <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                  <h4 className="font-semibold text-cyan-800 mb-2 text-sm">Sınıf Ortalama İstatistikleri</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    <div>
                      <div className="text-xl font-bold text-blue-600">{classTotals.totalD}</div>
                      <div className="text-[10px] text-blue-700">Ortalama Doğru</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-red-600">{classTotals.totalY}</div>
                      <div className="text-[10px] text-red-700">Ortalama Yanlış</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-600">{classTotals.totalB}</div>
                      <div className="text-[10px] text-gray-700">Ortalama Boş</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-yellow-600">{classTotals.averagePuan.toFixed(2)}</div>
                      <div className="text-[10px] text-yellow-700">Ortalama Puan</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">{classTotals.totalNet.toFixed(2)}</div>
                      <div className="text-[10px] text-green-700">Ortalama Net</div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleBulkSubmit}
                    disabled={loading}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    }`}
                  >
                    {loading ? 'Kaydediliyor...' : `💾 ${availableStudentsBatch.length} Öğrenci Sonucunu Kaydet`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render current tab
  const renderTab = () => {
    switch (activeTab) {
      case "home": return <HomeTab />;
      case "sinif": return <StudentTab />;
      case "deneme": return <ExamTab />;
      case "bireysel": return <IndividualTab />;
      case "toplu": return <BulkTab />;
      case "hedef": return <TargetTab />;
      case "lgs-hesaplama": return <LGSCalculatorTab />;
      case "van-taban-puan": return <VanTabanPuanTab />;
      default: return <HomeTab />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Toast Notification - Modern Design */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 transform transition-all duration-300 ease-in-out animate-slideIn`}>
          <div className={`
            relative min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl text-white overflow-hidden
            ${toast.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400' 
              : toast.type === 'error' 
                ? 'bg-gradient-to-r from-red-500 to-pink-600 border border-red-400'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400'
            }
          `}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}></div>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 h-1 bg-white bg-opacity-30 animate-progressBar"></div>
            
            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && (
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-relaxed">
                  {toast.message}
                </p>
              </div>
              
              {/* Close Button */}
              <button 
                onClick={() => setToast(null)} 
                className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200 group"
              >
                <svg className="w-3 h-3 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Başarı Takip Sistemi</h1>
          <p className="text-gray-600">Öğrencilerinizin akademik başarılarını yönetin</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-8">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

// LGS Puan Hesaplama Tab Component
const LGSCalculatorTab = () => {
  const [scores, setScores] = useState({
    turkce: { dogru: 0, yanlis: 0 },
    matematik: { dogru: 0, yanlis: 0 },
    fen: { dogru: 0, yanlis: 0 },
    sosyal: { dogru: 0, yanlis: 0 },
    din: { dogru: 0, yanlis: 0 },
    ingilizce: { dogru: 0, yanlis: 0 }
  });

  const [result, setResult] = useState(null);

  // MEB LGS Taban Puanı
  const basePoints = 193.492;

  // LGS Puan Katsayıları (MEB 2025 - 1 net'in getirdiği puan)
  const coefficients = {
    turkce: 3.671,
    matematik: 4.953,
    fen: 4.072,
    sosyal: 1.685,
    din: 1.941,
    ingilizce: 1.632
  };

  // Ders Soru Sayıları
  const questionCounts = {
    turkce: 20,
    matematik: 20,
    fen: 20,
    sosyal: 10,
    din: 10,
    ingilizce: 10
  };

  const subjectNames = {
    turkce: 'Türkçe',
    matematik: 'Matematik',
    fen: 'Fen Bilimleri',
    sosyal: 'Sosyal Bilgiler',
    din: 'Din Kültürü ve Ahlak Bilgisi',
    ingilizce: 'İngilizce'
  };

  const handleScoreChange = (subject, field, value) => {
    const numValue = parseInt(value) || 0;
    setScores(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: Math.max(0, numValue)
      }
    }));
  };

  const calculateLGSPoints = () => {
    let totalPoints = basePoints; // Taban puanı ekle
    const subjectResults = {};

    Object.keys(scores).forEach(subject => {
      const { dogru, yanlis } = scores[subject];
      // MEB Formülü: Net = Doğru - (Yanlış ÷ 3) - 3 yanlış 1 doğruyu götürüyor
      const net = dogru - (yanlis / 3);
      const points = net * coefficients[subject];
      
      subjectResults[subject] = {
        dogru,
        yanlis,
        net: Math.round(net * 100) / 100,
        points: Math.round(points * 100) / 100
      };
      
      totalPoints += points;
    });

    const finalResult = {
      totalPoints: Math.round(totalPoints * 100) / 100,
      subjects: subjectResults
    };

    setResult(finalResult);
  };

  const resetForm = () => {
    setScores({
      turkce: { dogru: 0, yanlis: 0 },
      matematik: { dogru: 0, yanlis: 0 },
      fen: { dogru: 0, yanlis: 0 },
      sosyal: { dogru: 0, yanlis: 0 },
      din: { dogru: 0, yanlis: 0 },
      ingilizce: { dogru: 0, yanlis: 0 }
    });
    setResult(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">🧮 LGS Puan Hesaplama</h2>
        <p className="text-gray-600 mb-8">LGS puanınızı hesaplamak için doğru ve yanlış sayılarınızı girin.</p>
        
        {/* Hesaplama Formu */}
        <div className="space-y-6">
          {/* İstenen ders sıralaması: Türkçe, Sosyal, Din, İngilizce, Matematik, Fen */}
          {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => (
            <div key={subject} className="border rounded-lg p-6 bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-3 text-2xl">
                    {subject === 'turkce' && '📝'}
                    {subject === 'matematik' && '🔢'}
                    {subject === 'fen' && '🧪'}
                    {subject === 'sosyal' && '🌍'}
                    {subject === 'din' && '🕌'}
                    {subject === 'ingilizce' && '🇺🇸'}
                  </span>
                  {subjectNames[subject]}
                </div>
                <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded">
                  {questionCounts[subject]} soru
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doğru Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores[subject].dogru}
                    onChange={(e) => handleScoreChange(subject, 'dogru', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yanlış Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores[subject].yanlis}
                    onChange={(e) => handleScoreChange(subject, 'yanlis', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Hesapla Butonları */}
          <div className="flex gap-4">
            <button
              onClick={calculateLGSPoints}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              🧮 Puanı Hesapla
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            >
              🔄 Temizle
            </button>
          </div>
        </div>

        {/* Sonuçlar */}
        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-8">
              <h4 className="text-2xl font-bold mb-3">🎯 LGS Puanınız</h4>
              <div className="text-4xl font-bold">{result.totalPoints}</div>
              <p className="text-blue-100 text-sm mt-3">
                Maksimum puan: 500 • Minimum puan: 0
              </p>
            </div>

            {/* Ders Bazında Detaylar */}
            <div className="border rounded-lg p-6">
              <h5 className="font-semibold text-gray-800 mb-4">📊 Ders Bazında Detaylar</h5>
              <div className="space-y-4">
                {/* İstenen ders sıralaması: Türkçe, Sosyal, Din, İngilizce, Matematik, Fen */}
                {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => {
                  const name = subjectNames[subject];
                  const subjectData = result.subjects[subject] || { dogru: 0, yanlis: 0, net: 0, points: 0 };
                  return (
                  <div key={subject} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-3 text-xl">
                        {subject === 'turkce' && '📝'}
                        {subject === 'matematik' && '🔢'}
                        {subject === 'fen' && '🧪'}
                        {subject === 'sosyal' && '🌍'}
                        {subject === 'din' && '🕌'}
                        {subject === 'ingilizce' && '🇺🇸'}
                      </span>
                      <span className="font-medium text-lg">{name}</span>
                      <span className="text-xs text-gray-500 ml-2">({questionCounts[subject]} soru)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">
                        Doğru: {subjectData.dogru} | Yanlış: {subjectData.yanlis} | Net: {subjectData.net}
                      </div>
                      <div className="font-semibold text-blue-600 text-lg">
                        Puan: {subjectData.points}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>

            {/* Bilgilendirme */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800">
                <strong>💡 Bilgi:</strong> Bu hesaplama MEB'in resmi LGS puan hesaplama sistemine uygun olarak yapılmıştır. 
                Net sayıları = Doğru sayısı - (Yanlış sayısı ÷ 3) formülü ile hesaplanır. 
                <strong>Taban puan: 193.492</strong> otomatik olarak eklenir.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Lise Taban Puanları Tab Component
const VanTabanPuanTab = () => {
  const [selectedType, setSelectedType] = useState<'merkezi' | 'yerel' | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">🎓 Lise Taban Puanları</h2>
        
        {!selectedType ? (
          <>
            {/* LGS ve OBP Yerleştirme Bilgilendirme */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">📚 Lise Yerleştirme Sistemi</h3>
              
              <div className="bg-white rounded-lg p-6 border mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-purple-600 mr-3 text-2xl">🎓</span>
                  Lise Yerleştirme Türleri
                </h4>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="text-blue-600 mr-2 text-xl">🎯</span>
                      Merkezi Yerleştirme
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>Tanım:</strong> LGS sınav puanına göre Türkiye genelinde sıralama yapılarak öğrenci alan okullara yerleşme.
                      </p>
                      <p className="text-gray-700">
                        <strong>Okul Türleri:</strong> Fen Liseleri, Sosyal Bilimler Liseleri, Anadolu Liseleri, proje okulları, bazı teknik programlar
                      </p>
                      <p className="text-gray-700">
                        <strong>Belirleyici Faktör:</strong> LGS puanı ve tercih sırası; adres dikkate alınmaz.
                      </p>
                      <p className="text-gray-700">
                        <strong>Tercih:</strong> Öğrenciler sınavla alan okullar için ayrı tercih listesinden seçim yapar.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-3 flex items-center">
                      <span className="text-green-600 mr-2 text-xl">🏠</span>
                      Yerel Yerleştirme (Adrese Dayalı)
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>Tanım:</strong> Öğrencinin ikamet adresi, okul türü ve kontenjan dikkate alınarak kendi kayıt alanındaki okullara yerleşme.
                      </p>
                      <p className="text-gray-700">
                        <strong>Okul Türleri:</strong> Anadolu Liseleri, Meslek Liseleri, İmam Hatip Liseleri
                      </p>
                      <p className="text-gray-700">
                        <strong>Belirleyici Faktör:</strong> Kayıt alanı, okul türü ve kontenjan; tercih sırası önemlidir.
                      </p>
                      <p className="text-gray-700">
                        <strong>Tercih:</strong> Kayıt alanı önceliklidir; farklı alanlardan (komşu/diğer) okul seçimi sınırlıdır.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-purple-800 text-sm">
                    <strong>💡 Bilgi:</strong> LGS puanınız ile merkezi yerleştirme kapsamındaki okullara (Fen, Sosyal Bilimler), 
                    adres bilginiz ile yerel yerleştirme kapsamındaki okullara (Anadolu, Meslek, İmam Hatip) başvurabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Seçim Kartları */}
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => setSelectedType('merkezi')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-8 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3 mr-4">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Merkezi Yerleştirme</h4>
                    <p className="text-blue-100 text-sm">Fen & Sosyal Bilimler Liseleri</p>
                  </div>
                </div>
                <p className="text-blue-100 text-sm">
                  LGS puanına göre merkezi yerleştirme kapsamındaki okulların taban puanlarını görüntüleyin.
                </p>
              </button>

              <button
                onClick={() => setSelectedType('yerel')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg p-8 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3 mr-4">
                    <span className="text-3xl">🏠</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Yerel Yerleştirme</h4>
                    <p className="text-green-100 text-sm">İmam Hatip & Meslek Liseleri</p>
                  </div>
                </div>
                <p className="text-green-100 text-sm">
                  Adres bilginize göre yerel yerleştirme kapsamındaki okulların taban puanlarını görüntüleyin.
                </p>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Geri Dönüş Butonu */}
            <div className="mb-6">
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Geri Dön
              </button>
            </div>

            {/* Seçilen İçerik */}
            {selectedType === 'merkezi' ? (
              <MerkeziYerlestirmePuanlariPanel />
            ) : (
              <YerelYerlestirmePuanlariPanel />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Merkezi Yerleştirme Taban Puanları Component (Panel)
const MerkeziYerlestirmePuanlariPanel = () => {
  const lgsSchools = [
    {
      name: "Van Türk Telekom Fen Lisesi",
      type: "Fen Lisesi", 
      score: "460.91",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İpekyolu Borsa İstanbul Fen Lisesi",
      type: "Fen Lisesi",
      score: "441.61",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Tuşba TOBB Fen Lisesi",
      type: "Fen Lisesi",
      score: "422.90",
      capacity: "150",
      district: "Tuşba"
    },
    {
      name: "Niyazi Türkmenoğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "416.75",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Erciş Fen Lisesi",
      type: "Fen Lisesi",
      score: "402.18",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Kazım Karabekir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "400.23",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Türkiye Yardımsevenler Derneği Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "387.01",
      capacity: "120",
      district: "Edremit"
    },
    {
      name: "Van Atatürk Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "379.46",
      capacity: "180",
      district: "İpekyolu"
    },
    {
      name: "Abdurrahman Gazi Borsa İstanbul Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "367.20",
      capacity: "150",
      district: "Tuşba"
    },
    {
      name: "Muradiye Alpaslan Fen Lisesi",
      type: "Fen Lisesi",
      score: "366.59",
      capacity: "120",
      district: "Muradiye"
    },
    {
      name: "Erciş Sosyal Bilimler Lisesi",
      type: "Sosyal Bilimler Lisesi",
      score: "366.09",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "Van Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "360.29",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "349.74",
      capacity: "180",
      district: "Edremit"
    },
    {
      name: "Sevim Kürüm Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "349.08",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "İskele Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "325.31",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Edremit Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "312.80",
      capacity: "120",
      district: "Edremit"
    },
    {
      name: "Mehmet Erdemoğlu Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "305.71",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Şehit Polis Halil Hamuryen Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "308.52",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "Tevfik İleri Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "294.42",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "Erciş Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "293.47",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Mizancı Murat Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "293.21",
      capacity: "120",
      district: "Edremit"
    },
    {
      name: "Gevaş Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "267.96",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Hüseyin Çelik Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "263.42",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Özalp Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "255.88",
      capacity: "120",
      district: "Özalp"
    },
    {
      name: "Tuşba Şehit Ferhat Arslan Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "251.82",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Şehit Haluk Varlı Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "221.47",
      capacity: "120",
      district: "Gürpınar"
    },
    {
      name: "Muradiye Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "208.61",
      capacity: "120",
      district: "Muradiye"
    },
    {
      name: "Başkale Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "199.41",
      capacity: "120",
      district: "Başkale"
    },
    {
      name: "Çaldıran Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "197.30",
      capacity: "120",
      district: "Çaldıran"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-blue-600 mr-3">🎯</span>
          Van İli Merkezi Yerleştirme Taban Puanları (2025)
        </h3>
        <p className="text-gray-600 mb-6">
          2025 LGS sonuçlarına göre Van ilindeki merkezi yerleştirme kapsamındaki okulların taban puanları:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-800">Lise Adı</th>
                <th className="text-left p-4 font-semibold text-gray-800">Tür</th>
                <th className="text-center p-4 font-semibold text-gray-800">Taban Puan</th>
                <th className="text-center p-4 font-semibold text-gray-800">Kontenjan</th>
                <th className="text-left p-4 font-semibold text-gray-800">İlçe</th>
              </tr>
            </thead>
            <tbody>
              {lgsSchools.map((school, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{school.name}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      school.type === 'Fen Lisesi' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {school.type}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600 text-lg">{school.score}</td>
                  <td className="p-4 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-4 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Not:</strong> Bu puanlar 2024 LGS sonuçlarıdır. 2025 puanları MEB tarafından açıklandığında güncellenecektir.
          </p>
        </div>
      </div>
    </div>
  );
};

// Van OBP Taban Puanları Component (Panel)
const YerelYerlestirmePuanlariPanel = () => {
  const obpSchools = [
    {
      name: "Mesut Özata Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "91.09",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Özen Adalı Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.66",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Mehmet Akif Ersoy Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "88.96",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Arif Nihat Asya Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.39",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Faki Teyran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "85.96",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İki Nisan Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.93",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Çaldıran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.30",
      capacity: "120",
      district: "Çaldıran"
    },
    {
      name: "İzzeddin Şir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "83.69",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "84.09",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "Said Nursi Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "65.83",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Evliya Çelebi Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "45.72",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "Kalecik Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "43.85",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Tuşba Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "42.18",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Başkale Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "41.65",
      capacity: "120",
      district: "Başkale"
    },
    {
      name: "Muradiye Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "39.24",
      capacity: "120",
      district: "Muradiye"
    },
    {
      name: "Gürpınar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "38.97",
      capacity: "120",
      district: "Gürpınar"
    },
    {
      name: "Özalp Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "35.82",
      capacity: "120",
      district: "Özalp"
    },
    {
      name: "Saray Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "34.15",
      capacity: "120",
      district: "Saray"
    },
    {
      name: "Bahçesaray Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "32.48",
      capacity: "120",
      district: "Bahçesaray"
    },
    {
      name: "Gevaş Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "30.76",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Akdamar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "29.31",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Çatak Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "27.84",
      capacity: "120",
      district: "Çatak"
    },
    {
      name: "Gevaş Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "26.45",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Başkale Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "24.89",
      capacity: "120",
      district: "Başkale"
    },
    {
      name: "Çatak Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "23.68",
      capacity: "120",
      district: "Çatak"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-green-600 mr-3">📖</span>
          Van İli Yerel Yerleştirme Taban Puanları (2025)
        </h3>
        <p className="text-gray-600 mb-6">
          2025 OBP sonuçlarına göre Van ilindeki yerel yerleştirme kapsamındaki okulların taban puanları:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-800">Okul Adı</th>
                <th className="text-left p-4 font-semibold text-gray-800">Tür</th>
                <th className="text-center p-4 font-semibold text-gray-800">Taban Puan</th>
                <th className="text-center p-4 font-semibold text-gray-800">Kontenjan</th>
                <th className="text-left p-4 font-semibold text-gray-800">İlçe</th>
              </tr>
            </thead>
            <tbody>
              {obpSchools.map((school, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{school.name}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      school.type.includes('İmam Hatip') 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {school.type}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-green-600 text-lg">{school.score}</td>
                  <td className="p-4 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-4 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Not:</strong> Bu puanlar 2025 OBP sonuçlarına göre yerel yerleştirme taban puanlarıdır ve MEB verilerine dayanmaktadır.
          </p>
        </div>
      </div>
    </div>
  );
};
