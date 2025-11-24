"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getStudents, getExams, getResults, addStudent, addExam, addResult, deleteStudent, deleteExam, deleteResult, updateStudent, updateResult, updateExam, Student, Exam, Result } from "../../firebase";
import ReportSelector from "./report-selector";

// Ana Tab Interface
interface Tab {
  key: string;
  label: string;
}

const TABS: Tab[] = [
  { key: "home", label: "🏠 Ana Sayfa" },
  { key: "ogrenci", label: "👨‍🎓 Sınıf Yönetimi" },
  { key: "deneme", label: "📝 Deneme Yönetimi" },
  { key: "bireysel", label: "👤 Bireysel Veri" },
  { key: "toplu", label: "👥 Toplu Veri" },
  { key: "rapor", label: "📊 Raporlar" }
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
  elementary: [ // İlkokul (5. Sınıf) - User requested order: Turkish, Social Studies, Religious Culture, English, Mathematics, Science
    { key: "turkce", label: "Türkçe", grades: ["5"], color: COURSE_COLORS.turkce },
    { key: "sosyal", label: "Sosyal Bilgiler", grades: ["5"], color: COURSE_COLORS.sosyal },
    { key: "din", label: "Din Kültürü ve Ahlak Bilgisi", grades: ["5"], color: COURSE_COLORS.din },
    { key: "ingilizce", label: "İngilizce", grades: ["5"], color: COURSE_COLORS.ingilizce },
    { key: "matematik", label: "Matematik", grades: ["5"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fen Bilimleri", grades: ["5"], color: COURSE_COLORS.fen }
  ],
  middle: [ // Ortaokul (6,7,8. Sınıf) - User requested order: Turkish, Social Studies, Religious Culture, English, Mathematics, Science
    { key: "turkce", label: "Türkçe", grades: ["6", "7", "8"], color: COURSE_COLORS.turkce },
    { key: "sosyal", label: "Sosyal Bilgiler", grades: ["6", "7", "8"], color: COURSE_COLORS.sosyal },
    { key: "din", label: "Din Kültürü ve Ahlak Bilgisi", grades: ["8"], color: COURSE_COLORS.din },
    { key: "ingilizce", label: "İngilizce", grades: ["7", "8"], color: COURSE_COLORS.ingilizce },
    { key: "matematik", label: "Matematik", grades: ["6", "7", "8"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fen Bilimleri", grades: ["6", "7", "8"], color: COURSE_COLORS.fen }
  ],
  high: [ // Lise (9-12. Sınıf)
    { key: "turkce", label: "Türk Dili ve Edebiyatı", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.turkce },
    { key: "matematik", label: "Matematik", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fizik", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.fen },
    { key: "kimya", label: "Kimya", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.kimya },
    { key: "biyoloji", label: "Biyoloji", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.biyoloji },
    { key: "tarih", label: "Tarih", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.tarih },
    { key: "cografya", label: "Coğrafya", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.cografya },
    { key: "ingilizce", label: "İngilizce", grades: ["9-A", "9-B", "9-C", "10-A", "10-B", "10-C", "11-A", "11-B", "11-C", "12-A", "12-B", "12-C"], color: COURSE_COLORS.ingilizce }
  ]
};

// Sınıf seviyesine göre dersleri getir
const getCoursesByClass = (className: string) => {
  const normalizedClass = normalizeClassName(className);
  const grade = normalizedClass.charAt(0);

  // 2-5. sınıflar için elementary dersleri
  if (['2', '3', '4', '5'].includes(grade)) {
    return COURSES.elementary;
  }
  // 6-8. sınıflar için middle dersleri  
  else if (['6', '7', '8'].includes(grade)) {
    return COURSES.middle;
  }
  // Diğer durumlar için middle dersleri
  else {
    return COURSES.middle;
  }
};

const CLASS_OPTIONS = ["2-A", "3-A", "4-A", "5-A", "6-A", "7-A", "8-A"];

const normalizeClassName = (className: string) => {
  const upperClass = className.toUpperCase().trim();

  // 2-8-A formatı kontrolü
  const match = upperClass.match(/^([2-8])[- ]?([ABC])$/i);
  if (match) {
    const grade = match[1];
    const section = match[2].toUpperCase();
    return `${grade}-${section}`;
  }

  // Lise formatı kontrolü (9-A, 10-B, vb.)
  const highMatch = upperClass.match(/^(\d+)[- ]?([ABC])$/i);
  if (highMatch) {
    const grade = highMatch[1];
    const section = highMatch[2].toUpperCase();
    return `${grade}-${section}`;
  }

  return upperClass;
};

// LGS sınıfları için dersler
const getLGSCourses = (className: string) => {
  return getCoursesByClass(className);
};

// 📊 NET HESAPLAMA FONKSİYONU
const calcNet = (dogru: number, yanlis: number): number => {
  const net = dogru - (yanlis / 4);
  return Math.round(net * 100) / 100;
};

// ⭐ DERS EMOJI HARİTASı - Görsel İyileştirme
const getCourseEmoji = (courseKey: string): string => {
  const emojiMap: { [key: string]: string } = {
    turkce: "📝",
    matematik: "🔢",
    fen: "🔬",
    sosyal: "🌍",
    ingilizce: "🇺🇸",
    din: "☪️",
    kimya: "⚗️",
    biyoloji: "🧬",
    tarih: "📜",
    cografya: "🗺️"
  };
  return emojiMap[courseKey] || "📚";
};

const FoncsDataEntry = () => {
  const [activeTab, setActiveTab] = useState<string>("home");

  // 🔥 STATE YÖNETİMİ
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 🎯 SEÇİM STATE'LERİ
  const [selectedClass, setSelectedClass] = useState<string>("");

  // 🎓 FORMS STATE'LERİ
  const [studentForm, setStudentForm] = useState({ name: "", class: "" });
  const [examForm, setExamForm] = useState({ title: "", date: "", classes: [] as string[], description: "" });
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  // 👤 BİREYSEL VERİ TAB'I STATE'LERİ
  const [individualForm, setIndividualForm] = useState({
    studentId: "",
    examId: "",
    scores: {}
  });
  const [availableStudentsIndividual, setAvailableStudentsIndividual] = useState<Student[]>([]);
  const [availableExamsIndividual, setAvailableExamsIndividual] = useState<Exam[]>([]);
  const [studentScores, setStudentScores] = useState<{ [courseKey: string]: { D: string, Y: string, B: string } }>({});
  const [individualLoading, setIndividualLoading] = useState(false);

  // 👥 TOPLU VERİ TAB'I STATE'LERİ  
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvParsing, setCsvParsing] = useState(false);
  const [availableStudentsBatch, setAvailableStudentsBatch] = useState<Student[]>([]);
  const [availableExamsBatch, setAvailableExamsBatch] = useState<Exam[]>([]);
  const [bulkStudentScores, setBulkStudentScores] = useState<{ [studentId: string]: { [courseKey: string]: { D: string, Y: string, B: string } } }>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [csvError, setCsvError] = useState<string[]>([]);
  const [bulkSelectedExamId, setBulkSelectedExamId] = useState<string>("");

  // 👤 BİREYSEL VERİ TAB'I - GELİŞMİŞ VERSİYON
  const IndividualTab = () => {
    // Sınıf seçildiğinde öğrenci ve deneme listelerini güncelle - SONSUZ DÖNGÜ ÇÖZÜMÜ
    useEffect(() => {
      if (!selectedClass || students.length === 0) {
        setAvailableStudentsIndividual([]);
        setAvailableExamsIndividual([]);
        return;
      }

      try {
        // Seçilen sınıfa göre öğrencileri filtrele
        const filteredStudents = students.filter(student => student.class === selectedClass);
        setAvailableStudentsIndividual(filteredStudents);

        // Seçilen sınıfa göre denemeleri filtrele
        const filteredExams = exams.filter(exam =>
          exam.classes && exam.classes.includes(selectedClass)
        );
        setAvailableExamsIndividual(filteredExams);

        // Sınıf değiştiğinde formu sıfırla (dikkatli şekilde)
        if (individualForm.studentId || individualForm.examId || Object.keys(studentScores).length > 0) {
          setIndividualForm(prev => ({
            ...prev,
            studentId: "",
            examId: "",
            scores: {}
          }));
          setStudentScores({});
        }
      } catch (error) {
        console.warn('IndividualTab filter error:', error);
      }
    }, [selectedClass, students.length, exams.length]); // Bağımlılıkları net belirle

    // Öğrenci seçildiğinde dersleri yükle ve Firebase'den mevcut sonuçları getir
    useEffect(() => {
      if (!individualForm.studentId || !selectedClass || students.length === 0) {
        return;
      }

      try {
        const student = students.find(s => s.id === individualForm.studentId);
        if (student) {
          // Öğrencinin sınıfına göre dersleri yükle
          const studentCourses = getLGSCourses(student.class);
          const newScores: { [courseKey: string]: { D: string, Y: string, B: string } } = {};
          studentCourses.forEach(course => {
            newScores[course.key] = { D: "", Y: "", B: "" };
          });

          // Firebase'den bu öğrenci ve deneme için mevcut sonuçları getir
          if (individualForm.examId) {
            const existingResult = results.find(r =>
              r.studentId === individualForm.studentId && r.examId === individualForm.examId
            );

            if (existingResult && existingResult.scores) {
              // Mevcut sonuçları yükle
              Object.keys(existingResult.scores).forEach(courseKey => {
                if (newScores[courseKey]) {
                  newScores[courseKey] = {
                    D: existingResult.scores[courseKey].D?.toString() || "",
                    Y: existingResult.scores[courseKey].Y?.toString() || "",
                    B: existingResult.scores[courseKey].B?.toString() || ""
                  };
                }
              });
            }
          }

          setStudentScores(newScores);
        }
      } catch (error) {
        console.warn('IndividualTab data load error:', error);
      }
    }, [individualForm.studentId, individualForm.examId, selectedClass, students.length]);

    // 🎯 ANLIK NET HESABI VE VALIDATION (Bireysel veri için)
    const updateIndividualScore = useCallback((courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setStudentScores(prev => ({
        ...prev,
        [courseKey]: { ...prev[courseKey], [field]: value }
      }));
    }, []); // Sadece fonksiyon tanımı, hiçbir state read etmiyor

    const handleIndividualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClass || !individualForm.studentId || !individualForm.examId) {
        showToast('Sınıf, öğrenci ve deneme seçin', 'error');
        return;
      }

      setIndividualLoading(true);
      try {
        const student = students.find(s => s.id === individualForm.studentId);
        if (!student) {
          showToast('Öğrenci bulunamadı', 'error');
          return;
        }

        // Ders listesini al
        const studentCourses = getLGSCourses(student.class);

        // Skorları sayıya çevir ve net hesapla
        const scoresObject: any = {};
        const netsObject: any = {};
        let totalNet = 0;

        studentCourses.forEach(course => {
          const score = studentScores[course.key];
          if (score) {
            const d = parseInt(score.D) || 0;
            const y = parseInt(score.Y) || 0;
            const b = parseInt(score.B) || 0;
            const net = calcNet(d, y);

            scoresObject[course.key] = { D: d, Y: y, B: b };
            netsObject[course.key] = Number(net.toFixed(2));
            totalNet += net;
          }
        });

        netsObject.total = Number(totalNet.toFixed(2));

        // Mevcut sonuç var mı kontrol et
        const existingResult = results.find(r =>
          r.studentId === individualForm.studentId && r.examId === individualForm.examId
        );

        const resultData = {
          studentId: individualForm.studentId,
          examId: individualForm.examId,
          scores: scoresObject,
          nets: netsObject,
          createdAt: new Date().toISOString()
        };

        if (existingResult) {
          await updateResult(existingResult.id, resultData);
          showToast('Sonuç başarıyla güncellendi!', 'success');
        } else {
          await addResult(resultData);
          showToast('Sonuç başarıyla kaydedildi!', 'success');
        }

        // Firebase'den güncel verileri yükle
        await loadData();

        // Formu sıfırla
        setIndividualForm({ studentId: "", examId: "", scores: {} });
        setStudentScores({});
      } catch (error) {
        console.error('Individual result save error:', error);
        showToast('Sonuç kaydedilirken hata oluştu', 'error');
      } finally {
        setIndividualLoading(false);
      }
    };

    // Öğrencinin derslerini al
    const selectedStudent = students.find(s => s.id === individualForm.studentId);
    const availableCourses = selectedStudent ? getLGSCourses(selectedStudent.class) : [];

    return (
      <div className="space-y-8">
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-blue-500 text-white p-2 rounded-lg">👤</span>
            Bireysel Sonuç Girişi
          </h2>

          <form onSubmit={handleIndividualSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Exam Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Deneme Seçin
                </label>
                <select
                  value={individualForm.examId}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, examId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Deneme seçin...</option>
                  {availableExamsIndividual.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} - {new Date(exam.date).toLocaleDateString('tr-TR')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👨‍🎓 Öğrenci Seçin
                </label>
                <select
                  value={individualForm.studentId}
                  onChange={(e) => setIndividualForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Öğrenci seçin...</option>
                  {availableStudentsIndividual.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.class}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Score Entry */}
            {individualForm.studentId && individualForm.examId && availableCourses.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                  <span className="bg-green-500 text-white p-2 rounded-lg">📊</span>
                  Sonuç Girişi
                  {selectedStudent && (
                    <span className="text-sm font-normal text-gray-500">
                      {selectedStudent.name} - {selectedStudent.class}
                    </span>
                  )}
                </h3>

                {availableCourses.map(course => {
                  const scores = studentScores[course.key] || { D: "", Y: "", B: "" };
                  const d = parseInt(scores.D) || 0;
                  const y = parseInt(scores.Y) || 0;
                  const b = parseInt(scores.B) || 0;
                  const net = calcNet(d, y);

                  return (
                    <div key={course.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-800 flex items-center gap-2">
                          <span className="text-lg">{getCourseEmoji(course.key)}</span>
                          {course.label}
                        </h4>
                        <div className="text-sm text-gray-600">
                          Net: <span className="font-bold text-blue-600">{net.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Doğru (D)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scores.D}
                            onChange={(e) => updateIndividualScore(course.key, 'D', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Yanlış (Y)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scores.Y}
                            onChange={(e) => updateIndividualScore(course.key, 'Y', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Boş (B)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={scores.B}
                            onChange={(e) => updateIndividualScore(course.key, 'B', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit Button */}
            {individualForm.studentId && individualForm.examId && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={individualLoading}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {individualLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      💾 Sonucu Kaydet
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  };

  // 👥 TOPLU VERİ TAB'I - GELİŞMİŞ VERSİYON
  const BulkTab = () => {
    // 📊 PERFORMANCE OPTİMİZASYON: useMemo ile hesaplamalar
    const participatingClasses = useMemo(() => {
      const classSet = new Set(students.map(s => s.class));
      return Array.from(classSet).sort((a, b) => {
        const gradeA = parseInt(a.split('-')[0]);
        const gradeB = parseInt(b.split('-')[0]);
        if (gradeA !== gradeB) return gradeA - gradeB;
        return a.localeCompare(b);
      });
    }, [students.length]);

    // Selected students for current class
    const selectedExamStudents = availableStudentsBatch;

    // Optimized course selection (LGS sıralaması)
    const classCourses = useMemo(() => {
      if (!selectedExamStudents.length || !selectedClass) return [];
      return getLGSCourses(selectedClass);
    }, [selectedExamStudents, selectedClass]);

    // Optimized totals calculation
    const classTotals = useMemo(() => {
      if (!selectedExamStudents.length) return { totalD: 0, totalY: 0, totalB: 0, totalNet: 0, totalStudents: 0 };

      let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;

      selectedExamStudents.forEach(student => {
        const scores = bulkStudentScores[student.id] || {};
        classCourses.forEach(course => {
          const score = scores[course.key] || { D: "0", Y: "0", B: "0" };
          const d = parseInt(score.D) || 0;
          const y = parseInt(score.Y) || 0;
          const b = parseInt(score.B) || 0;
          const net = calcNet(d, y);

          totalD += d;
          totalY += y;
          totalB += b;
          totalNet += net;
        });
      });

      return {
        totalD,
        totalY,
        totalB,
        totalNet: Number(totalNet.toFixed(2)),
        totalStudents: selectedExamStudents.length
      };
    }, [selectedExamStudents, bulkStudentScores, classCourses]);

    // 🎯 ANLIK SCORE UPDATE fonksiyonu (Toplu veri için)
    const updateBulkScore = useCallback((studentId: string, courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setBulkStudentScores(prev => ({
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

    // Sınıf bazlı mod için diğer fonksiyonlar
    // Sınıf seçildiğinde öğrenci ve deneme listelerini güncelle - KRİTİK DÜZELTME
    useEffect(() => {
      // Guards - sadece gerçek değişikliklerde çalıştır
      if (!selectedClass || students.length === 0) {
        setAvailableStudentsBatch([]);
        setAvailableExamsBatch([]);
        setBulkStudentScores({});
        setBulkSelectedExamId(""); // Lokal state'i sıfırla
        return;
      }

      try {
        // Seçilen sınıfa göre öğrencileri filtrele
        const filteredStudents = students.filter(student => student.class === selectedClass);
        setAvailableStudentsBatch(filteredStudents);

        // Seçilen sınıfa göre denemeleri filtrele
        const filteredExams = exams.filter(exam =>
          exam.classes && exam.classes.includes(selectedClass)
        );
        setAvailableExamsBatch(filteredExams);

        // Öğrenci skorlarını sıfırla
        const initialScores: { [studentId: string]: { [courseKey: string]: { D: string, Y: string, B: string } } } = {};
        filteredStudents.forEach(student => {
          const courses = getLGSCourses(student.class);
          initialScores[student.id] = courses.reduce((acc, course) => {
            acc[course.key] = { D: "", Y: "", B: "" };
            return acc;
          }, {});
        });
        setBulkStudentScores(initialScores);
      } catch (error) {
        console.warn('BulkTab filter error:', error);
      }
    }, [selectedClass]); // SADECE selectedClass'a bağlı

    const handleScoreChange = useCallback((studentId: string, courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setBulkStudentScores(prev => ({
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

    const handleBulkSave = async () => {
      if (!selectedClass || !bulkSelectedExamId || availableStudentsBatch.length === 0) {
        showToast('Sınıf ve deneme seçin, en az bir öğrenci olmalı', 'error');
        return;
      }

      setBulkLoading(true);
      try {
        const newResults = availableStudentsBatch.map(student => {
          const scores = bulkStudentScores[student.id];
          if (!scores) return null;

          const courses = getLGSCourses(student.class);

          // Net hesaplamalarını yap
          const scoresObject: any = {};
          const netsObject: any = {};
          let totalNet = 0;

          courses.forEach(course => {
            const score = scores[course.key];
            if (score) {
              const d = parseInt(score.D) || 0;
              const y = parseInt(score.Y) || 0;
              const b = parseInt(score.B) || 0;
              const net = calcNet(d, y);

              scoresObject[course.key] = { D: d, Y: y, B: b };
              netsObject[course.key] = Number(net.toFixed(2));
              totalNet += net;
            }
          });

          netsObject.total = Number(totalNet.toFixed(2));

          return {
            studentId: student.id,
            examId: bulkSelectedExamId,
            scores: scoresObject,
            nets: netsObject,
            createdAt: new Date().toISOString()
          };
        }).filter(r => r !== null);

        // Her sonucu kaydet
        for (const result of newResults) {
          // Mevcut sonuç var mı kontrol et
          const existingResult = results.find(r =>
            r.studentId === result.studentId && r.examId === result.examId
          );

          if (existingResult) {
            await updateResult(existingResult.id, result);
          } else {
            await addResult(result);
          }
        }

        // Firebase'den güncel verileri yükle
        await loadData();

        // Formu sıfırla
        setBulkSelectedExamId("");
        setBulkStudentScores({});
        setShowSaveModal(false);
        showToast(`${newResults.length} sonuç başarıyla kaydedildi!`, 'success');
      } catch (error) {
        console.error('Bulk result save error:', error);
        showToast('Sonuçlar kaydedilirken hata oluştu', 'error');
      } finally {
        setBulkLoading(false);
      }
    };

    // Modal kapatma
    const closeModal = () => {
      setShowSaveModal(false);
    };

    return (
      <div className="space-y-8">
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-purple-500 text-white p-2 rounded-lg">👥</span>
            Toplu Sonuç Girişi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Exam Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Deneme Seçin
              </label>
              <select
                value={bulkSelectedExamId}
                onChange={(e) => setBulkSelectedExamId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
              >
                <option value="">Deneme seçin...</option>
                {availableExamsBatch.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} - {new Date(exam.date).toLocaleDateString('tr-TR')}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Class Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📚 Seçili Sınıf
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                {selectedClass || "Sınıf seçin..."}
              </div>
            </div>
          </div>

          {/* Bulk Score Entry Table */}
          {bulkSelectedExamId && availableStudentsBatch.length > 0 && classCourses.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-3">
                    <span className="bg-green-500 text-white p-2 rounded-lg">📊</span>
                    Toplu Sonuç Girişi
                  </h3>
                  <div className="text-sm text-gray-500">
                    {availableStudentsBatch.length} öğrenci • {classCourses.length} ders
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Öğrenci
                      </th>
                      {classCourses.map(course => (
                        <th key={course.key} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1 justify-center flex-col">
                            <span className="text-lg">{getCourseEmoji(course.key)}</span>
                            <span className="text-[10px]">{course.label}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            D / Y / B / Net
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableStudentsBatch.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.class}</div>
                          </div>
                        </td>
                        {classCourses.map((course) => {
                          const scores = bulkStudentScores[student.id]?.[course.key] || { D: "", Y: "", B: "" };
                          const d = parseInt(scores.D) || 0;
                          const y = parseInt(scores.Y) || 0;
                          const b = parseInt(scores.B) || 0;
                          const net = calcNet(d, y);

                          return (
                            <td key={course.key} className="px-2 py-4 whitespace-nowrap text-center">
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={scores.D}
                                  onChange={(e) => updateBulkScore(student.id, course.key, 'D', e.target.value)}
                                  className="w-12 h-8 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                  placeholder="D"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={scores.Y}
                                  onChange={(e) => updateBulkScore(student.id, course.key, 'Y', e.target.value)}
                                  className="w-12 h-8 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                  placeholder="Y"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={scores.B}
                                  onChange={(e) => updateBulkScore(student.id, course.key, 'B', e.target.value)}
                                  className="w-12 h-8 text-xs text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                  placeholder="B"
                                />
                                <div className="text-xs font-medium text-blue-600">
                                  {net.toFixed(2)}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Row */}
              {selectedExamStudents.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-sm text-gray-500">Toplam Öğrenci</div>
                      <div className="text-lg font-bold text-gray-800">{classTotals.totalStudents}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Toplam Doğru</div>
                      <div className="text-lg font-bold text-green-600">{classTotals.totalD}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Toplam Yanlış</div>
                      <div className="text-lg font-bold text-red-600">{classTotals.totalY}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Toplam Boş</div>
                      <div className="text-lg font-bold text-gray-600">{classTotals.totalB}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Toplam Net</div>
                      <div className="text-lg font-bold text-blue-600">{classTotals.totalNet.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors font-medium flex items-center gap-2"
                  >
                    💾 Tüm Sonuçları Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Confirmation Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Sonuçları Kaydet</h4>
              <p className="text-gray-600 mb-6">
                {availableStudentsBatch.length} öğrencinin sonuçlarını kaydetmek istediğinizden emin misiniz?
                Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleBulkSave}
                  disabled={bulkLoading}
                  className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    'Evet, Kaydet'
                  )}
                </button>
                <button
                  onClick={closeModal}
                  disabled={bulkLoading}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {bulkSelectedExamId && availableStudentsBatch.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="text-center text-gray-500">
              <p>Bu deneme için uygun öğrenci bulunamadı.</p>
              <p className="text-sm mt-1">Deneme sınıflarını ve mevcut öğrencileri kontrol edin.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 📊 ANA HOME TAB - DASHBOARD
  const HomeTab = () => {
    // Mevcut sınıf istatistikleri
    const classStats = useMemo(() => {
      const stats = students.reduce((acc, student) => {
        if (!acc[student.class]) {
          acc[student.class] = { studentCount: 0, averageScore: 0, totalResults: 0, scores: [] };
        }
        acc[student.class].studentCount++;
        return acc;
      }, {} as Record<string, { studentCount: number; averageScore: number; totalResults: number; scores: number[] }>);

      // Her sınıf için ortalama hesapla
      Object.keys(stats).forEach(className => {
        const classResults = results.filter(r => {
          const student = students.find(s => s.id === r.studentId);
          return student?.class === className;
        });

        stats[className].totalResults = classResults.length;

        if (classResults.length > 0) {
          const totalScores = classResults.reduce((sum, result) => {
            if (result.scores) {
              const scores = Object.values(result.scores || {});
              const net = scores.reduce((netSum: number, score: any) =>
                netSum + calcNet(score?.D || 0, score?.Y || 0), 0) as number;
              return sum + net;
            }
            return sum;
          }, 0);

          stats[className].averageScore = Math.round((totalScores / classResults.length) * 100) / 100;
        }
      });

      return stats;
    }, [students, results]);

    // Son eklenen denemeler
    const recentExams = useMemo(() => {
      return [...exams]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    }, [exams]);

    // En başarılı sınıflar
    const topClasses = useMemo(() => {
      return Object.entries(classStats)
        .sort(([, a], [, b]) => b.averageScore - a.averageScore)
        .slice(0, 3);
    }, [classStats]);

    return (
      <div className="space-y-8">
        {/* 🏆 Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">📊 Başarı Takip Sistemi</h1>
          <p className="text-blue-100 text-lg">
            Öğrencilerinizin akademik başarılarını takip edin ve analiz edin
          </p>
        </div>

        {/* 📈 Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <span className="text-2xl">👨‍🎓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Öğrenci</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Deneme</p>
                <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Sonuç</p>
                <p className="text-2xl font-bold text-gray-900">{results.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <span className="text-2xl">🏫</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Sınıf</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(classStats).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 📊 Class Performance */}
        {Object.keys(classStats).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="bg-blue-500 text-white p-2 rounded-lg">📈</span>
              Sınıf Performansları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topClasses.map(([className, stats]) => (
                <div key={className} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-800">{className}</h4>
                    <span className="text-sm text-gray-500">{stats.studentCount} öğrenci</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    Ortalama: {stats.averageScore.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stats.totalResults} sonuç kaydedildi
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📝 Recent Exams */}
        {recentExams.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="bg-green-500 text-white p-2 rounded-lg">📋</span>
              Son Eklenen Denemeler
            </h3>
            <div className="space-y-3">
              {recentExams.map((exam) => (
                <div key={exam.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">{exam.title}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(exam.date).toLocaleDateString('tr-TR')} -
                      {exam.classes?.join(', ') || 'Tüm sınıflar'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedExamId(exam.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Görüntüle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 👨‍🎓 STUDENT TAB - Sınıf Yönetimi
  const StudentTab = () => {
    const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!studentForm.name || !studentForm.class) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        const newStudent: Omit<Student, 'id'> = {
          name: studentForm.name.trim(),
          class: studentForm.class,
          createdAt: new Date().toISOString(),
          number: "0",
          viewCount: 0,
          lastViewDate: new Date().toISOString()
        };

        await addStudent(newStudent);
        showToast("Öğrenci başarıyla eklendi!", "success");
        setStudentForm({ name: "", class: "" });
        loadData();
      } catch (error) {
        console.error('Student add error:', error);
        showToast("Öğrenci eklenirken hata oluştu", "error");
      }
    };

    const handleDeleteStudent = async (studentId: string) => {
      try {
        await deleteStudent(studentId);
        showToast("Öğrenci başarıyla silindi", "success");
        setShowDeleteConfirm(null);
        loadData();
      } catch (error) {
        console.error('Student delete error:', error);
        showToast("Öğrenci silinirken hata oluştu", "error");
      }
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editStudent) return;

      try {
        await updateStudent(editStudent.id, {
          name: editStudent.name.trim(),
          class: editStudent.class
        });
        showToast("Öğrenci başarıyla güncellendi!", "success");
        setEditStudent(null);
        loadData();
      } catch (error) {
        console.error('Student update error:', error);
        showToast("Öğrenci güncellenirken hata oluştu", "error");
      }
    };

    // Seçili sınıfa göre filtrele
    const filteredStudents = selectedClass
      ? students.filter(student => student.class === selectedClass)
      : students;

    // Sınıf istatistikleri
    const classStats = useMemo(() => {
      const stats = students.reduce((acc, student) => {
        if (!acc[student.class]) {
          acc[student.class] = 0;
        }
        acc[student.class]++;
        return acc;
      }, {} as Record<string, number>);
      return stats;
    }, [students]);

    return (
      <div className="space-y-8">
        {/* Add Student Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-green-500 text-white p-2 rounded-lg">➕</span>
            Yeni Öğrenci Ekle
          </h2>
          <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Öğrenci Adı"
              value={studentForm.name}
              onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={studentForm.class}
              onChange={(e) => setStudentForm(prev => ({ ...prev, class: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sınıf Seçin</option>
              {CLASS_OPTIONS.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Ekle
            </button>
          </form>
        </div>

        {/* Class Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSelectedClass("")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedClass === ""
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Tüm Sınıflar
            </button>
            {Object.keys(classStats).map(className => (
              <button
                key={className}
                onClick={() => setSelectedClass(className)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedClass === className
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {className} ({classStats[className]})
              </button>
            ))}
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Öğrenci Listesi
              {selectedClass && ` - ${selectedClass}`}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredStudents.length} öğrenci)
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <div key={student.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{student.name}</h4>
                    <p className="text-sm text-gray-600">{student.class} sınıfı</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditStudent(student)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(student.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                {selectedClass
                  ? `${selectedClass} sınıfında henüz öğrenci yok`
                  : "Henüz hiç öğrenci eklenmemiş"
                }
              </div>
            )}
          </div>
        </div>

        {/* Edit Student Modal */}
        {editStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">✏️ Öğrenci Düzenle</h4>
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <input
                  type="text"
                  value={editStudent.name}
                  onChange={(e) => setEditStudent(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Öğrenci Adı"
                />
                <select
                  value={editStudent.class}
                  onChange={(e) => setEditStudent(prev => prev ? { ...prev, class: e.target.value } : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CLASS_OPTIONS.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStudent(null)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Öğrenciyi Sil</h4>
              <p className="text-gray-600 mb-6">
                Bu öğrenciyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDeleteStudent(showDeleteConfirm)}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Evet, Sil
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 📝 EXAM TAB - Deneme Yönetimi
  const ExamTab = () => {
    const handleAddExam = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!examForm.title || !examForm.date) {
        showToast("Lütfen deneme adı ve tarihi girin", "error");
        return;
      }

      try {
        const newExam: Omit<Exam, 'id'> = {
          title: examForm.title.trim(),
          date: examForm.date,
          classes: examForm.classes,
          description: examForm.description.trim()
        };

        await addExam(newExam);
        showToast("Deneme başarıyla eklendi!", "success");
        setExamForm({ title: "", date: "", classes: [], description: "" });
        loadData();
      } catch (error) {
        console.error('Exam add error:', error);
        showToast("Deneme eklenirken hata oluştu", "error");
      }
    };

    const handleDeleteExam = async (examId: string) => {
      try {
        await deleteExam(examId);
        showToast("Deneme başarıyla silindi", "success");
        setShowDeleteConfirm(null);
        loadData();
      } catch (error) {
        console.error('Exam delete error:', error);
        showToast("Deneme silinirken hata oluştu", "error");
      }
    };

    const handleUpdateExam = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editExam) return;

      try {
        await updateExam(editExam.id, {
          title: editExam.title.trim(),
          date: editExam.date,
          classes: editExam.classes || [],
          description: editExam.description?.trim() || ""
        });
        showToast("Deneme başarıyla güncellendi!", "success");
        setEditExam(null);
        loadData();
      } catch (error) {
        console.error('Exam update error:', error);
        showToast("Deneme güncellenirken hata oluştu", "error");
      }
    };

    const toggleClass = (className: string) => {
      setExamForm(prev => ({
        ...prev,
        classes: prev.classes.includes(className)
          ? prev.classes.filter(c => c !== className)
          : [...prev.classes, className]
      }));
    };

    const handleDelete = (examId: string) => {
      if (showDeleteConfirm === examId) {
        handleDeleteExam(examId);
      }
    };

    // Filtreleme
    const filteredExams = selectedClass
      ? exams.filter(exam => !exam.classes || exam.classes.includes(selectedClass))
      : exams;

    return (
      <div className="space-y-8">
        {/* Add Exam Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-purple-500 text-white p-2 rounded-lg">➕</span>
            Yeni Deneme Ekle
          </h2>
          <form onSubmit={handleAddExam} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Deneme Adı"
                value={examForm.title}
                onChange={(e) => setExamForm(prev => ({ ...prev, title: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <input
                type="date"
                value={examForm.date}
                onChange={(e) => setExamForm(prev => ({ ...prev, date: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hedef Sınıflar (En az bir tane seçin)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CLASS_OPTIONS.map(cls => (
                  <label key={cls} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={examForm.classes.includes(cls)}
                      onChange={() => toggleClass(cls)}
                      className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">{cls}</span>
                  </label>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Açıklama (Opsiyonel)"
              value={examForm.description}
              onChange={(e) => setExamForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />

            <button
              type="submit"
              className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Deneme Ekle
            </button>
          </form>
        </div>

        {/* Class Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSelectedClass("")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedClass === ""
                  ? "bg-purple-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              Tüm Denemeler
            </button>
            {CLASS_OPTIONS.map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedClass === cls
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                {cls} Denemeleri
              </button>
            ))}
          </div>
        </div>

        {/* Exams List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Deneme Listesi
              {selectedClass && ` - ${selectedClass}`}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredExams.length} deneme)
              </span>
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{exam.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      📅 {new Date(exam.date).toLocaleDateString('tr-TR')} •
                      🏫 {exam.classes?.join(', ') || 'Tüm sınıflar'}
                    </p>
                    {exam.description && (
                      <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setEditExam(exam)}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(exam.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredExams.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                {selectedClass
                  ? `${selectedClass} sınıfı için henüz deneme yok`
                  : "Henüz hiç deneme eklenmemiş"
                }
              </div>
            )}
          </div>
        </div>

        {/* Edit Exam Modal */}
        {editExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">✏️ Deneme Düzenle</h4>
              <form onSubmit={handleUpdateExam} className="space-y-4">
                <input
                  type="text"
                  value={editExam.title}
                  onChange={(e) => setEditExam(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Deneme Adı"
                />
                <input
                  type="date"
                  value={editExam.date}
                  onChange={(e) => setEditExam(prev => prev ? { ...prev, date: e.target.value } : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <textarea
                  value={editExam.description || ""}
                  onChange={(e) => setEditExam(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Açıklama (Opsiyonel)"
                />
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExam(null)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Denemeyi Sil</h4>
              <p className="text-gray-600 mb-6">
                Bu denemeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Evet, Sil
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 🔄 TAB CONTENT RENDERING
  const renderTabContent = () => {
    switch (activeTab) {
      case "home": return <HomeTab />;
      case "ogrenci": return <StudentTab />;
      case "deneme": return <ExamTab />;
      case "bireysel": return <IndividualTab />;
      case "toplu": return <BulkTab />;
      case "rapor": return <ReportSelector students={students} exams={exams} results={results} />;
      default: return <StudentTab />;
    }
  };

  // 💾 DATA LOADING
  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, examsData, resultsData] = await Promise.all([
        getStudents(),
        getExams(),
        getResults()
      ]);

      setStudents(studentsData);
      setExams(examsData);
      setResults(resultsData);
    } catch (error) {
      console.error('Data loading error:', error);
      showToast("Veriler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Firebase'den fresh veri yükle (IndividualTab ve BulkTab için)
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
      console.error('Firebase data refresh error:', error);
    }
  };

  // 🔄 USE EFFECT - Component Mount
  useEffect(() => {
    loadData();
  }, []);

  // 🎯 Toast Notification Function
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
    <div className="min-h-screen bg-gray-100">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white hover:text-gray-200">✕</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">📊 Başarı Takip Sistemi</h1>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('tr-TR')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </main>
    </div>
  );
};

export default FoncsDataEntry;