'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { Student, Exam, Result, getStudentTargets, getStudentScoreTarget, incrementStudentViewCount } from '../../firebase';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBYfBhkLIfjqpnL9MxBhxW6iJeC0VAEDLk",
  authDomain: "kopruler-basari-portali.firebaseapp.com",
  projectId: "kopruler-basari-portali",
  storageBucket: "kopruler-basari-portali.firebasestorage.app",
  messagingSenderId: "318334276429",
  appId: "1:318334276429:web:7caa5e5b9dccb564d71d04",
  measurementId: "G-EF6P77SMFP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface ReportData {
  student: Student;
  examResults: {
    exam: Exam;
    studentResults: Result[];
    classAverage: number;
    classAverageScore: number;
    generalAverage: number;
    generalAverageScore: number;
    studentTotalNet: number;
    studentTotalScore: number;
  }[];
  studentTargets?: {[subject: string]: number};
}

// Student Dashboard içerik komponenti
function StudentDashboardContent() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentTargets, setStudentTargets] = useState<{[subject: string]: number}>({});
  const [studentScoreTarget, setStudentScoreTarget] = useState<number>(450);
  const [activeTab, setActiveTab] = useState(1);
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [autoLoadAttempts, setAutoLoadAttempts] = useState(0);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [allResultsData, setAllResultsData] = useState<Result[]>([]);
  const [allStudentsData, setAllStudentsData] = useState<Student[]>([]);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL parametresinden studentId al ve otomatik yükle
  useEffect(() => {
    const urlStudentId = searchParams.get('studentId');
    console.log('URL StudentId:', urlStudentId);
    
    if (urlStudentId && urlStudentId !== studentId) {
      setStudentId(urlStudentId);
      console.log('StudentId set edildi:', urlStudentId);
      setError('');
    } else if (!urlStudentId && autoLoadAttempts === 0) {
      // StudentId yoksa 2 saniye sonra yeniden kontrol et
      const timer = setTimeout(() => {
        setAutoLoadAttempts(1);
        console.log('StudentId kontrol ediliyor...');
        const currentUrlStudentId = searchParams.get('studentId');
        if (currentUrlStudentId) {
          setStudentId(currentUrlStudentId);
          console.log('İkinci denemede StudentId set edildi:', currentUrlStudentId);
        } else {
          setError('Öğrenci ID bulunamadı. Giriş sayfasına yönlendiriliyorsunuz...');
          setTimeout(() => router.push('/ogrenci'), 3000);
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, studentId, autoLoadAttempts, router]);

  // StudentId değiştiğinde raporu yükle
  useEffect(() => {
    if (studentId) {
      loadStudentReport();
    }
  }, [studentId]);

  const loadStudentReport = async () => {
    if (!studentId) {
      setError('Öğrenci ID bulunamadı');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    console.log('Rapor yükleniyor... StudentId:', studentId);

    try {
      // Öğrenci bilgilerini al
      const studentDocRef = doc(db, 'students', studentId);
      const studentSnapshot = await getDoc(studentDocRef);
      
      if (!studentSnapshot.exists()) {
        throw new Error(`Öğrenci bulunamadı: ${studentId}`);
      }

      const studentData = { ...studentSnapshot.data(), id: studentSnapshot.id } as Student;
      console.log('Öğrenci verisi alındı:', studentData);

      // Tüm sınavları al
      const examsQuery = query(collection(db, 'exams'), orderBy('date', 'asc'));
      const examsSnapshot = await getDocs(examsQuery);
      const examsData = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      console.log('Sınavlar alındı:', examsData.length);

      // Tüm sonuçları al
      const resultsSnapshot = await getDocs(collection(db, 'results'));
      const resultsData = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
      console.log('Sonuçlar alındı:', resultsData.length);
      setAllResultsData(resultsData);

      // Tüm öğrenci verilerini al (sınıf ortalaması hesabı için)
      const allStudentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = allStudentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      console.log('Tüm öğrenciler alındı:', studentsData.length);
      setAllStudentsData(studentsData);

      // Bu öğrencinin sonuçlarını filtrele
      const studentResults = resultsData.filter(r => r.studentId === studentId);
      console.log('Öğrenci sonuçları:', studentResults.length);

      // DEBUG: Hangi examId'lerin mevcut olup olmadığını kontrol et
      const studentExamIds = studentResults.map(r => r.examId);
      const availableExamIds = examsData.map(e => e.id);
      console.log('Öğrencinin examId\'leri:', studentExamIds);
      console.log('Mevcut examId\'ler:', availableExamIds);
      
      const missingExamIds = studentExamIds.filter(id => !availableExamIds.includes(id));
      console.log('Eksik examId\'ler:', missingExamIds);

      // 0 puan alan denemeleri filtrele (Kullanıcının isteği: "0 puan alan öğrenciyi o denemeye girmedi olarak kabul et")
      const validStudentResults = studentResults.filter(result => {
        const score = typeof result.scores?.puan === 'string' ? parseFloat(result.scores.puan) :
                     typeof result.puan === 'number' ? result.puan : 
                     (typeof result.totalScore === 'number' ? result.totalScore : 0);
        return score > 0;
      });

      console.log('Geçerli sonuçlar (0 puan hariç):', validStudentResults.length);

      if (validStudentResults.length === 0) {
        console.log('Bu öğrencinin geçerli sınav sonucu bulunamadı');
        setReportData({
          student: studentData,
          examResults: []
        });
        setError('Bu öğrenci için henüz geçerli sınav sonucu bulunamadı.');
        setLoading(false);
        return;
      }

      const examResults = [];

      for (const result of validStudentResults) {
        const exam = examsData.find(e => e.id === result.examId);
        if (!exam) {
          console.log('⚠️ Exam bulunamadı:', result.examId, 'Skipping this result');
          continue;
        }

        // Sınıf ortalamasını hesapla (aynı sınıftaki öğrencilerin toplam net ortalaması)
        // NOT: 0 puanlı öğrenciler ortalamadan hariç tutulur ama deneme sayısına dahildir
        const classResults = resultsData.filter(r => r.examId === exam.id && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class);
        const classResultsFiltered = classResults.filter(r => (r.nets?.total || 0) > 0);
        const classAverage = classResultsFiltered.length > 0 
          ? classResultsFiltered.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / classResultsFiltered.length
          : 0;

        // Sınıf ortalama puanını hesapla
        // NOT: 0 puanlı öğrenciler ortalamadan hariç tutulur ama deneme sayısına dahildir
        const classResultsWithScore = resultsData.filter(r => r.examId === exam.id && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class && 
          (typeof r.scores?.puan === 'string' || typeof r.puan === 'number' || typeof r.totalScore === 'number'));
        const classResultsWithScoreFiltered = classResultsWithScore.filter(r => {
          const score = typeof r.scores?.puan === 'string' ? parseFloat(r.scores.puan) :
                       typeof r.puan === 'number' ? r.puan : 
                       (typeof r.totalScore === 'number' ? r.totalScore : 0);
          return score > 0;
        });
        const classAverageScore = classResultsWithScoreFiltered.length > 0 
          ? classResultsWithScoreFiltered.reduce((sum, r) => sum + (
            typeof r.scores?.puan === 'string' ? parseFloat(r.scores.puan) :
            typeof r.puan === 'number' ? r.puan : 
            (typeof r.totalScore === 'number' ? r.totalScore : 0)
          ), 0) / classResultsWithScoreFiltered.length
          : 0;

        // Genel ortalamaları hesapla (deneme yönetimindeki sınıf genel ortalamalarından)
        let generalAverageNet = classAverage; // Varsayılan olarak sınıf ortalaması
        let generalAverageScoreNet = classAverageScore; // Varsayılan olarak sınıf ortalama puanı
        
        if (exam.generalAverages && exam.generalAverages[studentData.class]) {
          const classAverages = exam.generalAverages[studentData.class];
          
          // Genel net ortalaması: ders bazlı netlerin toplamı
          const dersNets = [
            classAverages.turkce || 0,
            classAverages.matematik || 0,
            classAverages.fen || 0,
            classAverages.sosyal || 0,
            classAverages.din || 0,
            classAverages.ingilizce || 0
          ];
          
          generalAverageNet = dersNets.reduce((sum, net) => sum + net, 0);
          
          // Genel puan ortalaması
          if (classAverages.generalScore) {
            generalAverageScoreNet = classAverages.generalScore;
          }
        }

        examResults.push({
          exam,
          studentResults: [result],
          classAverage: classAverage,
          classAverageScore: classAverageScore,
          generalAverage: generalAverageNet,
          generalAverageScore: generalAverageScoreNet,
          studentTotalNet: result.nets?.total || 0,
          studentTotalScore: typeof result.scores?.puan === 'string' ? parseFloat(result.scores.puan) :
                           typeof result.puan === 'number' ? result.puan : 
                           (typeof result.totalScore === 'number' ? result.totalScore : 0)
        });
      }

      // Sınavları tarihe göre sırala
      examResults.sort((a, b) => new Date(a.exam.date).getTime() - new Date(b.exam.date).getTime());
      
      console.log('Rapor verisi hazırlandı');
      
      // Öğrencinin hedeflerini çek (Yeni Firebase fonksiyonu ile)
      const targetsData = await getStudentTargets(studentId) || {};
      const scoreTargetData = await getStudentScoreTarget(studentId);
      console.log('Hedefler yüklendi:', studentId, targetsData);
      console.log('Puan hedefi yüklendi:', scoreTargetData);
      
      // Debug: Hedef verilerinin içeriğini kontrol et
      if (targetsData && Object.keys(targetsData).length > 0) {
        console.log('✅ Hedefler bulundu:', targetsData);
        Object.keys(targetsData).forEach(key => {
          console.log(`  ${key}: ${targetsData[key]}`);
        });
      } else {
        console.log('⚠️ Hiç hedef bulunamadı veya boş hedefler');
      }
      console.log('✅ Puan hedefi:', scoreTargetData);
      
      setReportData({
        student: studentData,
        examResults,
        studentTargets: targetsData
      });
      
      setStudentTargets(targetsData);
      setStudentScoreTarget(scoreTargetData || 450);
      
    } catch (error: any) {
      console.error('Veri yükleme hatası:', error);
      setError(`Veri yükleme hatası: ${error.message}`);
      
      if (error.message.includes('permission-denied') || error.message.includes('unavailable')) {
        setError('Firebase bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
      } else if (error.message.includes('not-found')) {
        setError('Öğrenci bulunamadı. Sınıf ve numaranızı kontrol edin.');
      }
    } finally {
      setLoading(false);
      
      // View count artırma (sadece başarılı yüklemede)
      if (studentId && !error) {
        try {
          await incrementStudentViewCount(studentId);
          console.log('✅ View count güncellendi');
        } catch (viewError) {
          console.warn('View count güncellenirken hata:', viewError);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Rapor hazırlanıyor...</p>
          {studentId && <p className="text-xs text-gray-500 mt-2">Öğrenci: {studentId}</p>}
        </div>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-sm font-semibold text-red-800 mb-2">Hata Oluştu</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => loadStudentReport()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Rapor verisi bulunamadı.</p>
        </div>
      </div>
    );
  }

  // İstatistikleri hesapla (sadece denemeye giren öğrencileri dahil et)
  const examResultsWithScores = reportData.examResults.filter(item => item.studentTotalNet > 0);
  const totalNet = examResultsWithScores.reduce((sum, item) => sum + item.studentTotalNet, 0);
  const avgNet = examResultsWithScores.length > 0 ? totalNet / examResultsWithScores.length : 0;
  const scores = examResultsWithScores.map(item => item.studentTotalNet);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  // Sınıf ortalamaları
  const classAverageNet = reportData.examResults.length > 0 
    ? reportData.examResults.reduce((sum, item) => sum + (item.classAverage || 0), 0) / reportData.examResults.length
    : 0;
  
  // Sınıf ortalaması: Tüm denemelerdeki sınıf ortalama puanlarının ortalaması
  const classAverageScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, item) => sum + (item.classAverageScore || 0), 0) / reportData.examResults.length
    : 0;
  
  // Genel ortalamalar
  const generalAverageNet = reportData.examResults.length > 0 
    ? reportData.examResults.reduce((sum, item) => sum + (item.generalAverage || 0), 0) / reportData.examResults.length
    : 0;
  
  // Öğrenci ortalama puanı: Sadece denemeye giren denemelerdeki puanlarının ortalaması
  const studentAverageScore = examResultsWithScores.length > 0
    ? examResultsWithScores.reduce((sum, item) => sum + (item.studentTotalScore || 0), 0) / examResultsWithScores.length
    : 0;
  
  // Genel ortalama puan: Tüm denemelerdeki genel ortalama puanların ortalaması
  const generalAverageScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, item) => sum + (item.generalAverageScore || 0), 0) / reportData.examResults.length
    : 0;
  
  // Genel görünümdeki ortalama puan açıklaması
  const averageScoreExplanation = reportData.examResults.length > 0 
    ? `Öğrencinin ${reportData.examResults.length} denemedeki puan ortalaması` 
    : 'Henüz puan verisi yok';
  
  const latestNet = examResultsWithScores.length > 0 ? examResultsWithScores[examResultsWithScores.length - 1]?.studentTotalNet || 0 : 0;
  const previousNet = examResultsWithScores.length > 1 ? examResultsWithScores[examResultsWithScores.length - 2]?.studentTotalNet || 0 : 0;
  const improvement = latestNet - previousNet;
  
  // Son öğrenci puanını hesapla - düzeltilmiş versiyon
  const calculateLatestStudentScore = (studentId: string) => {
    if (!studentId || reportData.examResults.length === 0) {
      return 0;
    }

    // En son denemeyi bul
    const sortedResults = [...reportData.examResults].sort((a, b) => 
      new Date(b.exam.date).getTime() - new Date(a.exam.date).getTime()
    );

    if (sortedResults.length === 0) {
      return 0;
    }

    const latestResult = sortedResults[0];
    const studentResult = latestResult.studentResults[0];

    if (!studentResult) {
      return 0;
    }

    // DEBUG: Tüm puan değerlerini logla
    console.log('🔍 Student Dashboard - Latest Result:', studentResult);
    console.log('🔍 puan field:', studentResult.puan);
    console.log('🔍 scores.puan field:', studentResult.scores?.puan);
    console.log('🔍 totalScore field:', studentResult.totalScore);
    console.log('🔍 nets.total:', studentResult.nets?.total);
    console.log('🔍 scores field:', studentResult.scores);

    // Önce manuel girilen puanı kontrol et (en doğru değer)
    let totalScore = studentResult.puan;
    
    // Eğer puan string ise parse et
    if (totalScore && typeof totalScore === 'string') {
      totalScore = parseFloat(totalScore);
    }
    
    // Eğer puan yoksa, scores.puan alanını kontrol et (en önemli!)
    if (!totalScore && studentResult.scores?.puan) {
      totalScore = studentResult.scores.puan;
      if (typeof totalScore === 'string') {
        totalScore = parseFloat(totalScore);
      }
    }
    
    // Eğer puan yoksa, totalScore field'ını kontrol et
    if (!totalScore && studentResult.totalScore) {
      totalScore = studentResult.totalScore;
      if (typeof totalScore === 'string') {
        totalScore = parseFloat(totalScore);
      }
    }
    
    // Eğer hala yoksa, nets.total kullan ve LGS puanı hesapla (net * 5)
    if (!totalScore && studentResult.nets?.total) {
      const netTotal = studentResult.nets.total;
      // Net toplamını 5 ile çarp (LGS puan hesabı: yaklaşık net * 5 = puan)
      totalScore = netTotal * 5;
    }
    
    console.log('🔍 Final calculated score:', Math.round(totalScore || 0));
    return Math.round(totalScore || 0);
  };

  // Öğrencinin en yüksek deneme puanını hesapla
  const calculateHighestStudentScore = (studentId: string) => {
    if (!studentId || reportData.examResults.length === 0) {
      return 0;
    }

    // Tüm denemelerdeki puanları topla
    const allScores: number[] = [];
    
    reportData.examResults.forEach(examResult => {
      const studentResult = examResult.studentResults[0];
      if (studentResult) {
        // Önce manuel girilen puanı kontrol et (en doğru değer)
        let totalScore = studentResult.puan;
        
        // Eğer puan string ise parse et
        if (totalScore && typeof totalScore === 'string') {
          totalScore = parseFloat(totalScore);
        }
        
        // Eğer puan yoksa, scores.puan alanını kontrol et (en önemli!)
        if (!totalScore && studentResult.scores?.puan) {
          totalScore = studentResult.scores.puan;
          if (typeof totalScore === 'string') {
            totalScore = parseFloat(totalScore);
          }
        }
        
        // Eğer puan yoksa, totalScore field'ını kontrol et
        if (!totalScore && studentResult.totalScore) {
          totalScore = studentResult.totalScore;
          if (typeof totalScore === 'string') {
            totalScore = parseFloat(totalScore);
          }
        }
        
        // Eğer hala yoksa, nets'den hesapla
        if (!totalScore || totalScore === 0) {
          const netTotal = studentResult.nets?.total || 0;
          // Net toplamını 5 ile çarp (yaklaşık puan hesabı)
          totalScore = netTotal * 5;
        }
        
        if (totalScore > 0) {
          allScores.push(Math.round(totalScore));
        }
      }
    });

    // En yüksek puanı döndür
    const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    console.log('🔍 Highest score calculated:', highestScore, 'All scores:', allScores);
    return highestScore;
  };

  const latestScore = calculateLatestStudentScore(studentId);
  const highestScore = calculateHighestStudentScore(studentId);
  
  // Lise Tercih Sistemi için en yüksek puanı kullan
  const liseTercihScore = highestScore;
  const previousScore = reportData.examResults.length > 1 ? 
    calculateLatestStudentScore(reportData.examResults[reportData.examResults.length - 2].studentResults[0]?.studentId || '') : 0;
  const scoreImprovement = latestScore - previousScore;
  
  // Trend analizi
  const trend = improvement > 2 ? 'Yükseliş' : improvement < -2 ? 'Düşüş' : 'Stabil';
  const trendColor = improvement > 2 ? 'text-green-600' : improvement < -2 ? 'text-red-600' : 'text-yellow-600';

  // Renk kodları - Tüm dersler için sabit renk
  const COLORS = ['#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6'];

  // Grafik verileri
  const netChartData = reportData.examResults.map((item, index) => ({
    exam: item.exam.title,
    öğrenci: item.studentTotalNet > 0 ? item.studentTotalNet : null, // 0 ise null yap
    sınıf: item.classAverage,
    genel: item.generalAverage
  }));
  
  const scoreChartData = reportData.examResults.map((item, index) => ({
    exam: item.exam.title,
    öğrenci: item.studentTotalScore > 0 ? item.studentTotalScore : null, // 0 ise null yap
    sınıf: item.classAverageScore,
    genel: item.generalAverageScore
  }));

  const subjects = [
    { name: 'Türkçe', color: COLORS[0], key: 'turkce' },
    { name: 'Sosyal Bilgiler', color: COLORS[1], key: 'sosyal' },
    { name: 'Din Kültürü', color: COLORS[2], key: 'din' },
    { name: 'İngilizce', color: COLORS[3], key: 'ingilizce' },
    { name: 'Matematik', color: COLORS[4], key: 'matematik' },
    { name: 'Fen Bilimleri', color: COLORS[5], key: 'fen' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/projelogo.png" 
                alt="LGS Portalı" 
                className="w-20 h-20 rounded-full shadow-md"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">LGS Portalı</h1>
                <p className="text-xs text-gray-600">{reportData.student.name} - {reportData.student.class}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/ogrenci')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              ← Ana Sayfa
            </button>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Öğrenci Bilgileri Kartı */}
        <div className="mb-4 sm:mb-8 bg-white rounded-lg shadow p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-xs font-medium text-blue-800 mb-1">Sınıf</h3>
              <p className="text-lg font-bold text-blue-600">{reportData.student.class}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-xs font-medium text-green-800 mb-1">Toplam Deneme</h3>
              <p className="text-lg font-bold text-green-600">{reportData.examResults.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-xs font-medium text-purple-800 mb-1">Son Net</h3>
              <p className="text-lg font-bold text-purple-600">{(latestNet || 0).toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Eğer sonuç yoksa mesaj göster */}
        {reportData.examResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Henüz Sınav Sonucunuz Bulunmuyor</h3>
            <p className="text-gray-600">İlk sınavınızı verdikten sonra burada detaylı raporunuzu görüntüleyebilirsiniz.</p>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 px-0.5 border-b-2 font-medium text-xs whitespace-nowrap ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab === 1 && '📊 Genel Görünüm'}
                      {tab === 2 && '📈 Net Gelişim Trendi'}
                      {tab === 3 && '📊 Puan Gelişim Trendi'}
                      {tab === 4 && '📚 Denemeler'}
                      {tab === 5 && '🎯 Ders Bazında Gelişim'}
                      {tab === 6 && '🎯 Hedef Takibi & Lise Tercih Önerileri'}
                      {tab === 7 && '🧮 LGS Puan Hesaplama'}
                      {tab === 8 && '📖 Kitap Sınavı'}
                      {tab === 9 && '🎓 Lise Taban Puanları'}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 1 && (
              <div className="space-y-3">
                {/* Özet Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Ortalama Net</h3>
                    <p className="text-sm font-bold text-blue-600">{(avgNet || 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Sınıf: <span className="font-semibold">{(classAverageNet || 0).toFixed(1)}</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Ortalama Puan</h3>
                    <p className="text-sm font-bold text-green-600">{(studentAverageScore || 0).toFixed(0)}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Sınıf: <span className="font-semibold">{(classAverageScore || 0).toFixed(0)}</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Son Deneme Net</h3>
                    <p className="text-sm font-bold text-purple-600">{(latestNet || 0).toFixed(1)}</p>
                    <p className={`text-xs mt-1 ${
                      improvement >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(improvement || 0) >= 0 ? '+' : ''}{(improvement || 0).toFixed(1)} Değişim
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Son Deneme Puan</h3>
                    <p className="text-sm font-bold text-orange-600">{(latestScore || 0).toFixed(0)}</p>
                    <p className={`text-xs mt-1 ${
                      scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(scoreImprovement || 0) >= 0 ? '+' : ''}{(scoreImprovement || 0).toFixed(0)} Değişim
                    </p>
                  </div>
                </div>

                {/* Ana Net Gelişim Grafiği */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">Net Gelişim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    {/* @ts-ignore */}
                    <LineChart data={netChartData}>
                      {/* @ts-ignore */}
                      <CartesianGrid strokeDasharray="3 3" />
                      {/* @ts-ignore */}
                      <XAxis 
                        dataKey="exam" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      {/* @ts-ignore */}
                      <YAxis domain={[0, 90]} />
                      {/* @ts-ignore */}
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toFixed(1)}`, name]}
                        labelFormatter={(label) => `Deneme: ${label}`}
                      />
                      {/* @ts-ignore */}
                      <Legend />
                      {/* @ts-ignore */}
                      <Line 
                        type="monotone" 
                        dataKey="öğrenci" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Öğrenci"
                        dot={{ fill: '#3B82F6', strokeWidth: 1, r: 4 }}
                      />
                      {/* @ts-ignore */}
                      <Line 
                        type="monotone" 
                        dataKey="sınıf" 
                        stroke="#10B981" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Sınıf Ortalaması"
                      />
                      {/* @ts-ignore */}
                      <Line 
                        type="monotone" 
                        dataKey="genel" 
                        stroke="#F59E0B" 
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        name="Genel Ortalama"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Puan Gelişim Trendi */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">Puan Gelişim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    {/* @ts-ignore */}
                    <LineChart data={scoreChartData}>
                      {/* @ts-ignore */}
                      <CartesianGrid strokeDasharray="3 3" />
                      {/* @ts-ignore */}
                      <XAxis 
                        dataKey="exam" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      {/* @ts-ignore */}
                      <YAxis domain={[0, 500]} />
                      {/* @ts-ignore */}
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toFixed(0)}`, name]}
                        labelFormatter={(label) => `Deneme: ${label}`}
                      />
                      {/* @ts-ignore */}
                      <Legend />
                      {/* @ts-ignore */}
                      <Line 
                        type="monotone" 
                        dataKey="öğrenci" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        name="Öğrenci Puanı"
                        dot={{ fill: '#8B5CF6', strokeWidth: 1, r: 4 }}
                      />
                      {/* @ts-ignore */}
                      <Line 
                        type="monotone" 
                        dataKey="sınıf" 
                        stroke="#10B981" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Sınıf Ortalama Puan"
                      />
                      {/* @ts-ignore */}
                      <Line 
                        type="monotone" 
                        dataKey="genel" 
                        stroke="#F59E0B" 
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        name="Genel Ortalama Puan"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-4">
                {/* Ana Net Gelişim Grafikleri */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">📈 Net Gelişim Trendi Analizi (YAxis: 0-90)</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Line Chart */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Çizgi Grafiği</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        {/* @ts-ignore */}
                        <LineChart data={netChartData}>
                          {/* @ts-ignore */}
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          {/* @ts-ignore */}
                          <XAxis 
                            dataKey="exam" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tick={{ fontSize: 9 }}
                          />
                          {/* @ts-ignore */}
                          <YAxis domain={[0, 90]} tick={{ fontSize: 9 }} />
                          {/* @ts-ignore */}
                          <Tooltip 
                            formatter={(value) => [`${Number(value).toFixed(1)}`, 'Net']}
                            labelStyle={{ color: '#374151' }}
                            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
                          />
                          {/* @ts-ignore */}
                          <Legend />
                          {/* @ts-ignore */}
                          <Line 
                            type="monotone" 
                            dataKey="öğrenci" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                            name="Öğrenci Net"
                          />
                          {/* @ts-ignore */}
                          <Line 
                            type="monotone" 
                            dataKey="sınıf" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Sınıf Ortalaması"
                          />
                          {/* @ts-ignore */}
                          <Line 
                            type="monotone" 
                            dataKey="genel" 
                            stroke="#F59E0B" 
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            name="Genel Ortalama"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Sütun Grafiği</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        {/* @ts-ignore */}
                        <BarChart data={netChartData}>
                          {/* @ts-ignore */}
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          {/* @ts-ignore */}
                          <XAxis 
                            dataKey="exam" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tick={{ fontSize: 9 }}
                          />
                          {/* @ts-ignore */}
                          <YAxis domain={[0, 90]} tick={{ fontSize: 9 }} />
                          {/* @ts-ignore */}
                          <Tooltip 
                            formatter={(value) => [`${Number(value).toFixed(1)}`, 'Net']}
                            labelStyle={{ color: '#374151' }}
                            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
                          />
                          {/* @ts-ignore */}
                          <Legend />
                          {/* @ts-ignore */}
                          <Bar dataKey="öğrenci" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Öğrenci Net" />
                          {/* @ts-ignore */}
                          <Bar dataKey="sınıf" fill="#10B981" radius={[2, 2, 0, 0]} name="Sınıf Ortalaması" />
                          {/* @ts-ignore */}
                          <Bar dataKey="genel" fill="#F59E0B" radius={[2, 2, 0, 0]} name="Genel Ortalama" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Net Gelişim İstatistikleri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">En Yüksek Net</h4>
                    <p className="text-xl font-bold">{Math.max(...netChartData.map(d => d.öğrenci || 0)).toFixed(1)}</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">En Düşük Net</h4>
                    <p className="text-xl font-bold">{Math.min(...netChartData.map(d => d.öğrenci || 0)).toFixed(1)}</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">Ortalama Net</h4>
                    <p className="text-xl font-bold">
                      {(netChartData.reduce((sum, d) => sum + (d.öğrenci || 0), 0) / netChartData.length).toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Deneme Detayları */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">📋 Deneme Detayları ve Gelişim Analizi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-2 text-left">Deneme</th>
                          <th className="px-2 py-2 text-center">Tarih</th>
                          <th className="px-2 py-2 text-center">Net</th>
                          <th className="px-2 py-2 text-center">Toplam Doğru</th>
                          <th className="px-2 py-2 text-center">Toplam Yanlış</th>
                          <th className="px-2 py-2 text-center">Toplam Boş</th>
                          <th className="px-2 py-2 text-center">Toplam Puan</th>
                          <th className="px-2 py-2 text-center">Gelişim</th>
                        </tr>
                      </thead>
                      <tbody>
                        {netChartData.map((exam, index) => {
                          const previousNet = index > 0 ? netChartData[index-1]?.öğrenci || 0 : 0;
                          const currentNet = exam.öğrenci || 0;
                          const development = index > 0 ? (currentNet - previousNet) : 0;
                          const totalQuestions = Math.round(currentNet + (exam.öğrenci || 0) * 0.2 + 10); // Tahmini
                          
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-2 py-2 font-medium text-blue-600">{exam.exam || `Deneme ${index + 1}`}</td>
                              <td className="px-2 py-2 text-center text-gray-600">
                                {reportData.examResults[index]?.exam?.date ? 
                                  new Date(reportData.examResults[index].exam.date).toLocaleDateString('tr-TR') : 
                                  `2025-${String(index + 1).padStart(2, '0')}-15`
                                }
                              </td>
                              <td className="px-2 py-2 text-center">
                                {currentNet > 0 ? (
                                  <span className={`font-semibold ${currentNet >= 60 ? 'text-green-600' : currentNet >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {currentNet.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 font-medium">
                                    Girmedi
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-green-600 font-medium">
                                {(() => {
                                  const examResult = reportData.examResults[index];
                                  const studentResult = examResult?.studentResults[0];
                                  const scores = studentResult?.scores || {};
                                  const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                                  const totalCorrect = subjects.reduce((sum, subject) => {
                                    const subjectScore = scores[subject];
                                    return sum + (subjectScore?.D ? parseInt(subjectScore.D) : 0);
                                  }, 0);
                                  return String(totalCorrect);
                                })()}
                              </td>
                              <td className="px-2 py-2 text-center text-red-600">
                                {(() => {
                                  const examResult = reportData.examResults[index];
                                  const studentResult = examResult?.studentResults[0];
                                  const scores = studentResult?.scores || {};
                                  const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                                  const totalWrong = subjects.reduce((sum, subject) => {
                                    const subjectScore = scores[subject];
                                    return sum + (subjectScore?.Y ? parseInt(subjectScore.Y) : 0);
                                  }, 0);
                                  return String(totalWrong);
                                })()}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-500">
                                {(() => {
                                  const examResult = reportData.examResults[index];
                                  const studentResult = examResult?.studentResults[0];
                                  const scores = studentResult?.scores || {};
                                  const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                                  const totalEmpty = subjects.reduce((sum, subject) => {
                                    const subjectScore = scores[subject];
                                    return sum + (subjectScore?.B ? parseInt(subjectScore.B) : 0);
                                  }, 0);
                                  return String(totalEmpty);
                                })()}
                              </td>
                              <td className="px-2 py-2 text-center font-medium text-blue-600">
                                {(reportData.examResults[index]?.studentTotalScore || 0) > 0 ? 
                                  reportData.examResults[index]?.studentTotalScore.toFixed(0) : 
                                  <span className="text-gray-400">Girmedi</span>
                                } {/* Gerçek toplam puan */}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {index > 0 ? (
                                  <span className={`flex items-center justify-center ${
                                    development > 0 ? 'text-green-600' : development < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {development > 0 ? '↗️' : development < 0 ? '↘️' : '➡️'} {Math.abs(development).toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ders Bazında Net Dağılımı */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">📚 Ders Bazında Net Dağılımı</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(() => {
                      const sonDeneme = reportData.examResults[reportData.examResults.length - 1];
                      const studentResult = sonDeneme?.studentResults[0];
                      const nets = studentResult?.nets || {};
                      
                      return subjects.map((subject) => {
                        const subjectNet = nets[subject.key] || 0;
                        const targetNet = studentTargets[subject.key] || 0;
                        const studentTotalNet = studentResult?.nets?.total || 0;
                        
                        return (
                          <div key={subject.name} className="bg-gray-50 p-3 rounded-lg border-l-4" style={{borderColor: subject.color}}>
                            <h4 className="text-xs font-medium text-gray-700 mb-1">{subject.name}</h4>
                            <p className="text-lg font-bold" style={{color: subject.color}}>
                              {studentTotalNet > 0 ? subjectNet.toFixed(1) : 'Girmedi'}
                            </p>
                            {studentTotalNet > 0 && (
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{
                                    backgroundColor: subject.color,
                                    width: `${Math.min((subjectNet / Math.max(targetNet, 20)) * 100, 100)}%`
                                  }}
                                ></div>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Hedef: {targetNet.toFixed(1)}
                            </p>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Gelişim Trend Tahmini */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold mb-3">🔮 Gelişim Trend Tahmini</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Son 3 Deneme Ortalaması</h4>
                      <p className="text-xl font-bold">
                        {(netChartData.slice(-3).reduce((sum, d) => sum + (d.öğrenci || 0), 0) / Math.min(3, netChartData.length)).toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Tahmini 5. Deneme</h4>
                      <p className="text-xl font-bold">
                        {(() => {
                          const lastThreeExams = netChartData.slice(-3);
                          const lastThreeAverage = lastThreeExams.length > 0 
                            ? lastThreeExams.reduce((sum, d) => sum + (d.öğrenci || 0), 0) / lastThreeExams.length 
                            : 0;
                          const predictedExam = lastThreeAverage * 1.05; // Son 3 denemenin %5 fazlası
                          return predictedExam.toFixed(1);
                        })()}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Son Deneme Net</h4>
                      <p className="text-xl font-bold">
                        {netChartData.length > 0 ? (netChartData[netChartData.length - 1].öğrenci || 0).toFixed(1) : '0.0'}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">LGS Hedef Net Uzaklığı</h4>
                      <p className="text-xl font-bold">
                        {Math.max(0, 75 - (netChartData.slice(-3).reduce((sum, d) => sum + (d.öğrenci || 0), 0) / Math.min(3, netChartData.length))).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-4">
                {/* Ana Puan Gelişim Grafikleri */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">📊 Puan Gelişim Trendi Analizi (YAxis: 0-500)</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Line Chart */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Çizgi Grafiği</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={scoreChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="exam" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tick={{ fontSize: 9 }}
                          />
                          <YAxis domain={[0, 500]} tick={{ fontSize: 9 }} />
                          <Tooltip 
                            formatter={(value) => [`${Number(value).toFixed(0)}`, 'Puan']}
                            labelStyle={{ color: '#374151' }}
                            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="öğrenci" 
                            stroke="#8B5CF6" 
                            strokeWidth={3}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                            name="Öğrenci Puanı"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sınıf" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Sınıf Ortalama"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="genel" 
                            stroke="#F59E0B" 
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            name="Genel Ortalama"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bar Chart */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-700 mb-2">Sütun Grafiği</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        {/* @ts-ignore */}
                        <BarChart data={scoreChartData}>
                          {/* @ts-ignore */}
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          {/* @ts-ignore */}
                          <XAxis 
                            dataKey="exam" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tick={{ fontSize: 9 }}
                          />
                          {/* @ts-ignore */}
                          <YAxis domain={[0, 500]} tick={{ fontSize: 9 }} />
                          {/* @ts-ignore */}
                          <Tooltip 
                            formatter={(value) => [`${Number(value).toFixed(0)}`, 'Puan']}
                            labelStyle={{ color: '#374151' }}
                            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
                          />
                          {/* @ts-ignore */}
                          <Legend />
                          {/* @ts-ignore */}
                          <Bar dataKey="öğrenci" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Öğrenci Puanı" />
                          {/* @ts-ignore */}
                          <Bar dataKey="sınıf" fill="#10B981" radius={[2, 2, 0, 0]} name="Sınıf Ortalama Puan" />
                          {/* @ts-ignore */}
                          <Bar dataKey="genel" fill="#F59E0B" radius={[2, 2, 0, 0]} name="Genel Ortalama Puan" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Puan İstatistikleri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">En Yüksek Puan</h4>
                    <p className="text-xl font-bold">
                      {Math.max(...reportData.examResults.filter(r => r.studentTotalScore > 0).map(r => r.studentTotalScore)).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">Ortalama Puan</h4>
                    <p className="text-xl font-bold">
                      {(reportData.examResults.filter(r => r.studentTotalScore > 0).reduce((sum, r) => sum + r.studentTotalScore, 0) / Math.max(1, reportData.examResults.filter(r => r.studentTotalScore > 0).length)).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">Son Puan</h4>
                    <p className="text-xl font-bold">
                      {(reportData.examResults[reportData.examResults.length - 1]?.studentTotalScore || 0) > 0 ? 
                        reportData.examResults[reportData.examResults.length - 1]?.studentTotalScore.toFixed(0) : 
                        'Girmedi'
                      }
                    </p>
                  </div>
                </div>

                {/* Puan Detayları */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">📋 Puan Detayları ve Performans Analizi</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-2 text-left">Deneme</th>
                          <th className="px-2 py-2 text-center">Tarih</th>
                          <th className="px-2 py-2 text-center">Toplam Puan</th>
                          <th className="px-2 py-2 text-center">Net Ortalaması</th>
                          <th className="px-2 py-2 text-center">Toplam Doğru</th>
                          <th className="px-2 py-2 text-center">Toplam Yanlış</th>
                          <th className="px-2 py-2 text-center">Toplam Boş</th>
                          <th className="px-2 py-2 text-center">Puan Gelişimi</th>
                          <th className="px-2 py-2 text-center">Seviye</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoreChartData.map((exam, index) => {
                          const previousScore = index > 0 ? scoreChartData[index-1]?.öğrenci || 0 : 0;
                          const currentScore = exam.öğrenci || 0;
                          const scoreDevelopment = index > 0 ? (currentScore - previousScore) : 0;
                          const currentNet = reportData.examResults[index]?.studentTotalNet || 0; // Gerçek net
                          const examResult = reportData.examResults[index];
                          const studentResult = examResult?.studentResults[0];
                          const nets = studentResult?.nets || {};
                          
                          // Firebase'den gerçek doğru/yanlış/boş sayılarını al
                          const scores = studentResult?.scores || {};
                          const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                          const totalCorrect = subjects.reduce((sum, subject) => {
                            const subjectScore = scores[subject];
                            return sum + (subjectScore?.D ? parseInt(subjectScore.D) : 0);
                          }, 0);
                          const wrongCount = subjects.reduce((sum, subject) => {
                            const subjectScore = scores[subject];
                            return sum + (subjectScore?.Y ? parseInt(subjectScore.Y) : 0);
                          }, 0);
                          const emptyCount = subjects.reduce((sum, subject) => {
                            const subjectScore = scores[subject];
                            return sum + (subjectScore?.B ? parseInt(subjectScore.B) : 0);
                          }, 0);
                          
                          let level = '';
                          let levelColor = '';
                          if (currentScore >= 400) {
                            level = 'Mükemmel';
                            levelColor = 'text-green-600';
                          } else if (currentScore >= 300) {
                            level = 'İyi';
                            levelColor = 'text-blue-600';
                          } else if (currentScore >= 200) {
                            level = 'Orta';
                            levelColor = 'text-yellow-600';
                          } else {
                            level = 'Gelişmeli';
                            levelColor = 'text-red-600';
                          }
                          
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-2 py-2 font-medium text-purple-600">{exam.exam || `Deneme ${index + 1}`}</td>
                              <td className="px-2 py-2 text-center text-gray-600">
                                {reportData.examResults[index]?.exam?.date ? 
                                  new Date(reportData.examResults[index].exam.date).toLocaleDateString('tr-TR') : 
                                  `2025-${String(index + 1).padStart(2, '0')}-15`
                                }
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span className={`font-semibold ${currentScore >= 400 ? 'text-green-600' : currentScore >= 300 ? 'text-blue-600' : currentScore >= 200 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {currentScore.toFixed(0)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center text-blue-600 font-medium">
                                {currentNet.toFixed(1)}
                              </td>
                              <td className="px-2 py-2 text-center text-green-600 font-medium">
                                {(() => {
                                  const scores = studentResult?.scores || {};
                                  const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                                  const totalCorrect = subjects.reduce((sum, subject) => {
                                    const subjectScore = scores[subject];
                                    return sum + (subjectScore?.D ? parseInt(subjectScore.D) : 0);
                                  }, 0);
                                  return totalCorrect;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-center text-red-600">
                                {(() => {
                                  const scores = studentResult?.scores || {};
                                  const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                                  const totalWrong = subjects.reduce((sum, subject) => {
                                    const subjectScore = scores[subject];
                                    return sum + (subjectScore?.Y ? parseInt(subjectScore.Y) : 0);
                                  }, 0);
                                  return totalWrong;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-500">
                                {(() => {
                                  const scores = studentResult?.scores || {};
                                  const subjects = ['turkce', 'matematik', 'fen', 'sosyal', 'din', 'ingilizce'];
                                  const totalEmpty = subjects.reduce((sum, subject) => {
                                    const subjectScore = scores[subject];
                                    return sum + (subjectScore?.B ? parseInt(subjectScore.B) : 0);
                                  }, 0);
                                  return totalEmpty;
                                })()}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {index > 0 ? (
                                  <span className={`flex items-center justify-center ${
                                    scoreDevelopment > 0 ? 'text-green-600' : scoreDevelopment < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {scoreDevelopment > 0 ? '↗️' : scoreDevelopment < 0 ? '↘️' : '➡️'} {Math.abs(scoreDevelopment).toFixed(0)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className={`px-2 py-2 text-center font-medium ${levelColor}`}>
                                {level}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ders Bazında Net Analizi */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">📊 Son Deneme Ders Bazında Net Analizi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(() => {
                      const sonDeneme = reportData.examResults[reportData.examResults.length - 1];
                      const studentResult = sonDeneme?.studentResults[0];
                      const nets = studentResult?.nets || {};
                      const targets = studentTargets || {};
                      
                      return subjects.map((subject) => {
                        const subjectNet = nets[subject.key] || 0;
                        const targetNet = targets[subject.key] || 0;
                        const successRate = targetNet > 0 ? Math.min((subjectNet / targetNet) * 100, 100) : 0;
                        
                        // Renk belirleme (hedeften yüksekse yeşil, yakınsa sarı, düşükse kırmızı)
                        let statusColor = '';
                        let statusText = '';
                        if (subjectNet >= targetNet) {
                          statusColor = '#10B981'; // Yeşil
                          statusText = 'Hedef Üstü';
                        } else if (subjectNet >= targetNet * 0.8) {
                          statusColor = '#F59E0B'; // Sarı
                          statusText = 'Yakın';
                        } else {
                          statusColor = '#EF4444'; // Kırmızı
                          statusText = 'Gelişmeli';
                        }
                        
                        return (
                          <div key={subject.name} className="bg-gray-50 p-3 rounded-lg border-l-4" style={{borderColor: statusColor}}>
                            <h4 className="text-xs font-medium text-gray-700 mb-1">{subject.name}</h4>
                            <p className="text-lg font-bold" style={{color: statusColor}}>
                              {subjectNet.toFixed(1)}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="h-2 rounded-full" 
                                style={{
                                  backgroundColor: statusColor,
                                  width: `${successRate}%`
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-gray-500">
                                Hedef: {targetNet.toFixed(1)}
                              </p>
                              <span className="text-xs font-medium" style={{color: statusColor}}>
                                {statusText}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Puan Hedef Analizi */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold mb-3">🎯 Puan Hedef Analizi ve Tahminler</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Puan Hedefi</h4>
                      <p className="text-xl font-bold">
                        {studentScoreTarget}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Son 3 Deneme Ort.</h4>
                      <p className="text-xl font-bold">
                        {(scoreChartData.slice(-3).reduce((sum, d) => sum + (d.öğrenci || 0), 0) / Math.min(3, scoreChartData.length)).toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">5. Deneme Tahmini</h4>
                      <p className="text-xl font-bold">
                        {((scoreChartData.slice(-2).reduce((sum, d) => sum + (d.öğrenci || 0), 0) / Math.min(2, scoreChartData.length)) + 25).toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Hedefe Ulaşma %</h4>
                      <p className="text-xl font-bold">
                        {((scoreChartData.slice(-3).reduce((sum, d) => sum + (d.öğrenci || 0), 0) / Math.min(3, scoreChartData.length)) / studentScoreTarget * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lise Tercih Önerileri */}
                <div className="bg-gradient-to-r from-blue-500 to-green-600 text-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold mb-3">🏫 Lise Tercih Önerilerin</h3>
                  
                  {/* Öğrenci Puan Bilgisi */}
                  <div className="mb-4 bg-white bg-opacity-10 p-3 rounded-lg">
                    <div className="text-sm font-medium">
                      En Yüksek Puanın: <span className="text-lg font-bold">{(() => {
                        // En yüksek puanı hesapla - DEBUG VERSİON
                        console.log('🔍 ENFAL DEBUG - Student Dashboard Lise Tercih Puan Hesaplama Başladı');
                        console.log('🔍 ENFAL DEBUG - Toplam deneme sayısı:', reportData.examResults.length);
                        
                        if (reportData.examResults.length === 0) {
                          console.log('🔍 ENFAL DEBUG - Deneme bulunamadı');
                          return 0;
                        }
                        
                        let highestScore = 0;
                        const allScores: number[] = [];
                        
                        reportData.examResults.forEach((examResult, index) => {
                          const studentResult = examResult.studentResults[0];
                          console.log(`🔍 ENFAL DEBUG - Deneme ${index + 1}:`, examResult.exam.title);
                          
                          if (studentResult) {
                            console.log(`🔍 ENFAL DEBUG - Raw studentResult:`, studentResult);
                            
                            // 1. Puan field'ını kontrol et
                            let totalScore = studentResult.puan;
                            console.log(`🔍 ENFAL DEBUG - Step 1 - puan field:`, totalScore);
                            
                            // 2. TotalScore field'ını kontrol et
                            if (!totalScore && studentResult.totalScore) {
                              totalScore = studentResult.totalScore;
                              console.log(`🔍 ENFAL DEBUG - Step 2 - totalScore field:`, totalScore);
                            }
                            
                            // 3. Nets total kontrol et
                            if (!totalScore && studentResult.nets?.total) {
                              totalScore = studentResult.nets.total;
                              console.log(`🔍 ENFAL DEBUG - Step 3 - nets.total:`, totalScore);
                            }
                            
                            // 4. Nets içindeki ders bazında hesaplama
                            if (!totalScore && studentResult.nets) {
                              const subjectNets = Object.values(studentResult.nets).filter(net => typeof net === 'number');
                              const calculatedTotal = subjectNets.reduce((sum, net) => sum + (net as number), 0);
                              totalScore = calculatedTotal * 5;
                              console.log(`🔍 ENFAL DEBUG - Step 4 - calculated from subject nets: ${subjectNets.join(' + ')} = ${calculatedTotal} * 5 = ${totalScore}`);
                            }
                            
                            console.log(`🔍 ENFAL DEBUG - Final score for ${examResult.exam.title}: ${totalScore}`);
                            
                            if (totalScore && totalScore > 0) {
                              allScores.push(totalScore);
                              if (totalScore > highestScore) {
                                highestScore = totalScore;
                                console.log(`🔍 ENFAL DEBUG - Yeni en yüksek puan: ${highestScore}`);
                              }
                            }
                          } else {
                            console.log(`🔍 ENFAL DEBUG - Student result bulunamadı`);
                          }
                        });
                        
                        console.log(`🔍 ENFAL DEBUG - ALL SCORES:`, allScores);
                        console.log(`🔍 ENFAL DEBUG - HIGHEST SCORE:`, highestScore);
                        
                        return highestScore.toFixed(0);
                      })()}</span> 
                      <span className="text-xs opacity-75 ml-2">(En yüksek deneme puanın)</span>
                    </div>
                  </div>
                  
                  {/* Dinamik Lise Önerileri */}
                  {(() => {
                    // Gerçek LGS lise veritabanı (Van ili)
                    const highSchools = [
                      { name: "Van Türk Telekom Fen Lisesi", type: "Fen Lisesi", score: 460.91, capacity: 150 },
                      { name: "İpekyolu Borsa İstanbul Fen Lisesi", type: "Fen Lisesi", score: 441.61, capacity: 150 },
                      { name: "Tuşba TOBB Fen Lisesi", type: "Fen Lisesi", score: 422.90, capacity: 150 },
                      { name: "Niyazi Türkmenoğlu Anadolu Lisesi", type: "Anadolu Lisesi", score: 416.75, capacity: 150 },
                      { name: "Şehit Erdoğan Cınbıroğlu Anadolu Lisesi", type: "Anadolu Lisesi", score: 412.45, capacity: 150 },
                      { name: "Van Anadolu Lisesi", type: "Anadolu Lisesi", score: 408.32, capacity: 150 },
                      { name: "Atatürk Anadolu Lisesi", type: "Anadolu Lisesi", score: 405.78, capacity: 150 },
                      { name: "Mehmet Akif Ersoy Anadolu Lisesi", type: "Anadolu Lisesi", score: 402.15, capacity: 150 }
                    ];
                    
                    // En yüksek deneme puanını hesapla - DEBUG VERSİON
                    const calculateHighestScore = () => {
                      console.log('🔍 ENFAL DEBUG 2 - İkinci Lise Tercih Puan Hesaplama Başladı');
                      
                      if (reportData.examResults.length === 0) {
                        console.log('🔍 ENFAL DEBUG 2 - Deneme bulunamadı');
                        return 0;
                      }
                      
                      let highestScore = 0;
                      const allScores: number[] = [];
                      
                      reportData.examResults.forEach((examResult, index) => {
                        const studentResult = examResult.studentResults[0];
                        console.log(`🔍 ENFAL DEBUG 2 - Deneme ${index + 1}:`, examResult.exam.title);
                        
                        if (studentResult) {
                          console.log(`🔍 ENFAL DEBUG 2 - Raw studentResult:`, studentResult);
                          
                          // 1. Puan field'ını kontrol et
                          let totalScore = studentResult.puan;
                          console.log(`🔍 ENFAL DEBUG 2 - Step 1 - puan field:`, totalScore);
                          
                          // 2. TotalScore field'ını kontrol et
                          if (!totalScore && studentResult.totalScore) {
                            totalScore = studentResult.totalScore;
                            console.log(`🔍 ENFAL DEBUG 2 - Step 2 - totalScore field:`, totalScore);
                          }
                          
                          // 3. Nets total kontrol et
                          if (!totalScore && studentResult.nets?.total) {
                            totalScore = studentResult.nets.total;
                            console.log(`🔍 ENFAL DEBUG 2 - Step 3 - nets.total:`, totalScore);
                          }
                          
                          // 4. Nets içindeki ders bazında hesaplama
                          if (!totalScore && studentResult.nets) {
                            const subjectNets = Object.values(studentResult.nets).filter(net => typeof net === 'number');
                            const calculatedTotal = subjectNets.reduce((sum, net) => sum + (net as number), 0);
                            totalScore = calculatedTotal * 5;
                            console.log(`🔍 ENFAL DEBUG 2 - Step 4 - calculated from subject nets: ${subjectNets.join(' + ')} = ${calculatedTotal} * 5 = ${totalScore}`);
                          }
                          
                          console.log(`🔍 ENFAL DEBUG 2 - Final score for ${examResult.exam.title}: ${totalScore}`);
                          
                          if (totalScore && totalScore > 0) {
                            allScores.push(totalScore);
                            if (totalScore > highestScore) {
                              highestScore = totalScore;
                              console.log(`🔍 ENFAL DEBUG 2 - Yeni en yüksek puan: ${highestScore}`);
                            }
                          }
                        } else {
                          console.log(`🔍 ENFAL DEBUG 2 - Student result bulunamadı`);
                        }
                      });
                      
                      console.log(`🔍 ENFAL DEBUG 2 - ALL SCORES:`, allScores);
                      console.log(`🔍 ENFAL DEBUG 2 - HIGHEST SCORE:`, highestScore);
                      
                      return highestScore;
                    };

                    const currentScore = calculateHighestScore();
                    
                    // Öğrencinin puanına göre kategorize et
                    const categorizedSchools = highSchools.map(school => {
                      let category = "";
                      let probability = 0;
                      
                      if (currentScore >= school.score + 25) {
                        category = "guvenli";
                        probability = 95;
                      } else if (currentScore >= school.score + 10) {
                        category = "guvenli";
                        probability = 85;
                      } else if (currentScore >= school.score) {
                        category = "orta";
                        probability = 70;
                      } else if (currentScore >= school.score - 15) {
                        category = "orta";
                        probability = 50;
                      } else {
                        category = "riskli";
                        probability = 25;
                      }
                      
                      return {
                        ...school,
                        category,
                        probability
                      };
                    });
                    
                    const guvenli = categorizedSchools.filter(s => s.category === "guvenli").slice(0, 2);
                    const orta = categorizedSchools.filter(s => s.category === "orta").slice(0, 2);
                    const riskli = categorizedSchools.filter(s => s.category === "riskli").slice(0, 2);
                    
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Güvenli Liseler */}
                        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                          <h4 className="text-xs font-medium opacity-90 mb-2 flex items-center">
                            ✅ Güvenli Tercihler
                          </h4>
                          <div className="space-y-2">
                            {guvenli.length > 0 ? guvenli.map(school => (
                              <div key={school.name} className="bg-white bg-opacity-10 p-2 rounded">
                                <div className="text-sm font-medium">{school.name}</div>
                                <div className="text-xs opacity-75">{school.score} taban • %{school.probability} yerleşme</div>
                              </div>
                            )) : (
                              <div className="text-xs opacity-75">Henüz güvenli seçenek bulunmuyor</div>
                            )}
                          </div>
                        </div>

                        {/* Orta Risk */}
                        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                          <h4 className="text-xs font-medium opacity-90 mb-2 flex items-center">
                            ⚠️ Orta Risk
                          </h4>
                          <div className="space-y-2">
                            {orta.length > 0 ? orta.map(school => (
                              <div key={school.name} className="bg-white bg-opacity-10 p-2 rounded">
                                <div className="text-sm font-medium">{school.name}</div>
                                <div className="text-xs opacity-75">{school.score} taban • %{school.probability} yerleşme</div>
                              </div>
                            )) : (
                              <div className="text-xs opacity-75">Orta risk seçenek bulunmuyor</div>
                            )}
                          </div>
                        </div>

                        {/* Riskli */}
                        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                          <h4 className="text-xs font-medium opacity-90 mb-2 flex items-center">
                            ⚡ Riskli Seçenekler
                          </h4>
                          <div className="space-y-2">
                            {riskli.length > 0 ? riskli.map(school => (
                              <div key={school.name} className="bg-white bg-opacity-10 p-2 rounded">
                                <div className="text-sm font-medium">{school.name}</div>
                                <div className="text-xs opacity-75">{school.score} taban • %{school.probability} yerleşme</div>
                              </div>
                            )) : (
                              <div className="text-xs opacity-75">Düşük puanlı seçenekler</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Tercih Tavsiyesi */}
                  <div className="mt-4 bg-white bg-opacity-10 p-3 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90 mb-2">🎯 Önerilen Tercih Stratejin:</h4>
                    <div className="text-sm space-y-1">
                      <div>• İlk 3 tercihi: Güvenli liseler</div>
                      <div>• 4-6. tercihler: Orta risk liseler</div>
                      <div>• Son 3 tercihi: Riskli ama istediğin liseler</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 4 && (
              <div className="space-y-3">
                {/* Deneme Seçimi */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">📚 Deneme Seçimi ve Detay Görüntüleme</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="examSelect" className="block text-xs font-medium text-gray-700 mb-2">
                      Hangi Denemenin Detaylarını Görmek İstiyorsunuz?
                    </label>
                    <select
                      id="examSelect"
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Deneme Seçin...</option>
                      {reportData.examResults.map((result) => (
                        <option key={result.exam.id} value={result.exam.id}>
                          {result.exam.title} - {new Date(result.exam.date).toLocaleDateString('tr-TR')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Seçilen Denemenin Detayları */}
                {selectedExamId && (() => {
                  const selectedExamResult = reportData.examResults.find(result => result.exam.id === selectedExamId);
                  if (!selectedExamResult) return null;

                  const studentResult = selectedExamResult.studentResults[0];
                  
                  return (
                    <div className="space-y-3">
                      {/* Seçilen Deneme Başlığı */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2">
                        <h3 className="text-sm font-bold text-gray-800">
                          📊 {selectedExamResult.exam.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          📅 {new Date(selectedExamResult.exam.date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>

                      {/* Ana İstatistikler */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                        <div className="bg-white rounded-lg shadow p-1">
                          <h4 className="text-[8px] font-medium text-gray-500 mb-1">Toplam Net</h4>
                          <p className="text-sm font-bold text-blue-600">{selectedExamResult.studentTotalNet.toFixed(1)}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            <div>Sınıf: {selectedExamResult.classAverage.toFixed(1)}</div>
                            <div className="text-orange-600">Genel: {selectedExamResult.generalAverage.toFixed(1)}</div>
                          </p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-1">
                          <h4 className="text-[8px] font-medium text-gray-500 mb-1">Toplam Puan</h4>
                          <p className="text-sm font-bold text-purple-600">{selectedExamResult.studentTotalScore.toFixed(0)}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            <div>Sınıf: {selectedExamResult.classAverageScore.toFixed(0)}</div>
                            <div className="text-orange-600">Genel: {selectedExamResult.generalAverageScore.toFixed(0)}</div>
                          </p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-1">
                          <h4 className="text-[8px] font-medium text-gray-500 mb-1">Sınıf İçi Sıralama</h4>
                          <p className="text-sm font-bold text-green-600">
                            {selectedExamResult.studentTotalNet > selectedExamResult.classAverage ? 'Üstte' : 'Altta'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Fark: {(selectedExamResult.studentTotalNet - selectedExamResult.classAverage).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-1">
                          <h4 className="text-[8px] font-medium text-gray-500 mb-1">Genel Ortalama</h4>
                          <p className="text-sm font-bold text-orange-600">{selectedExamResult.generalAverage.toFixed(1)}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Fark: {selectedExamResult.studentTotalNet >= selectedExamResult.generalAverage ? (
                              <span className="text-green-600">+{(selectedExamResult.studentTotalNet - selectedExamResult.generalAverage).toFixed(1)}</span>
                            ) : (
                              <span className="text-red-600">-{(selectedExamResult.generalAverage - selectedExamResult.studentTotalNet).toFixed(1)}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Ders Bazında Detaylar */}
                      <div className="bg-white rounded-lg shadow p-1">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">📖 Ders Bazında Detaylar</h4>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">D/Y/B</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Net</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Sınıf</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Genel</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Fark</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {subjects.map((subject) => {
                                const studentSubjectNet = studentResult?.nets?.[subject.key] || 0;
                                
                                // Sınıf ortalaması: Aynı sınıftaki öğrencilerin bu ders için net ortalamasını hesapla
                                const examResults = allResultsData.filter(result => result.examId === selectedExamId);
                                const classStudents = examResults.filter(result => {
                                  const student = allStudentsData.find(s => s.id === result.studentId);
                                  return student?.class === reportData.student.class && (result.nets?.total || 0) > 0;
                                });
                                const classSubjectAverage = classStudents.length > 0 
                                  ? classStudents.reduce((sum, r) => sum + (r.nets?.[subject.key] || 0), 0) / classStudents.length
                                  : 0;
                                
                                // Genel ders ortalaması: Deneme yönetiminde girilen genel ortalamalar
                                const classAverages = selectedExamResult.exam.generalAverages?.[reportData.student.class] || {};
                                const generalSubjectAverage = classAverages[subject.key] || 0;
                                
                                const difference = studentSubjectNet - generalSubjectAverage;
                                const isAboveAverage = difference > 0;
                                
                                // Firebase'den gerçek doğru/yanlış/boş sayılarını al
                                const scores = studentResult?.scores || {};
                                const subjectScore = scores[subject.key] || {};
                                const realCorrect = subjectScore.D ? parseInt(subjectScore.D) : 0;
                                const realWrong = subjectScore.Y ? parseInt(subjectScore.Y) : 0;
                                const realBlank = subjectScore.B ? parseInt(subjectScore.B) : 0;
                                
                                return (
                                  <tr key={subject.key} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center">
                                        <span 
                                          className="w-2 h-2 rounded-full mr-1"
                                          style={{ backgroundColor: subject.color }}
                                        ></span>
                                        <span className="text-xs font-medium text-gray-900">{subject.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <div className="flex items-center justify-center space-x-1 text-xs">
                                        <span className="font-bold text-green-600">{realCorrect}</span>
                                        <span className="text-gray-400">/</span>
                                        <span className="font-bold text-red-600">{realWrong}</span>
                                        <span className="text-gray-400">/</span>
                                        <span className="font-medium text-gray-600">{realBlank}</span>
                                      </div>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs font-bold text-blue-600">
                                        {studentSubjectNet.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-gray-600">
                                        {classSubjectAverage.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-orange-600 font-medium">
                                        {generalSubjectAverage.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className={`text-xs font-medium ${
                                          isAboveAverage ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {difference >= 0 ? '+' : ''}{difference.toFixed(1)}
                                        </span>
                                        <span className={`text-[10px] ${
                                          isAboveAverage ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                          {isAboveAverage ? '↗' : '↘'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Öğrenci-Sınıf-Genel Kıyaslama Tablosu */}
                      <div className="bg-white rounded-lg shadow p-1">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">📈 Öğrenci-Sınıf-Genel Kıyaslama</h4>
                        
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Net</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Sınıf Ort.</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Genel Ort.</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Sınıfa Göre</th>
                                <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Genele Göre</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const studentNet = selectedExamResult.studentTotalNet;
                                const classAverage = selectedExamResult.classAverage;
                                const generalAverage = selectedExamResult.generalAverage;
                                
                                return [
                                  {
                                    kategori: 'Toplam Net',
                                    net: studentNet,
                                    sinif: classAverage,
                                    genel: generalAverage,
                                    sinifFark: studentNet - classAverage,
                                    genelFark: studentNet - generalAverage
                                  },
                                  {
                                    kategori: 'Toplam Puan',
                                    net: selectedExamResult.studentTotalScore,
                                    sinif: selectedExamResult.classAverageScore,
                                    genel: selectedExamResult.generalAverageScore,
                                    sinifFark: selectedExamResult.studentTotalScore - selectedExamResult.classAverageScore,
                                    genelFark: selectedExamResult.studentTotalScore - selectedExamResult.generalAverageScore
                                  }
                                ].map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5">
                                      <span className="text-xs font-medium text-gray-900">{item.kategori}</span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs font-bold text-blue-600">
                                        {item.net.toFixed(item.kategori.includes('Puan') ? 0 : 1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-gray-600">
                                        {item.sinif.toFixed(item.kategori.includes('Puan') ? 0 : 1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-orange-600 font-medium">
                                        {item.genel.toFixed(item.kategori.includes('Puan') ? 0 : 1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className={`text-xs font-medium ${
                                          item.sinifFark >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {item.sinifFark >= 0 ? '+' : ''}{item.sinifFark.toFixed(item.kategori.includes('Puan') ? 0 : 1)}
                                        </span>
                                        <span className={`text-[10px] ${
                                          item.sinifFark >= 0 ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                          {item.sinifFark >= 0 ? '↗' : '↘'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <div className="flex flex-col items-center">
                                        <span className={`text-xs font-medium ${
                                          item.genelFark >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {item.genelFark >= 0 ? '+' : ''}{item.genelFark.toFixed(item.kategori.includes('Puan') ? 0 : 1)}
                                        </span>
                                        <span className={`text-[10px] ${
                                          item.genelFark >= 0 ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                          {item.genelFark >= 0 ? '↗' : '↘'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Toplam İstatistikler */}
                      <div className="bg-white rounded-lg shadow p-1">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">📊 Toplam İstatistikler</h4>
                        
                        <div className="flex flex-wrap gap-3 text-center">
                          <div className="flex-1 min-w-[120px] bg-green-50 rounded p-2">
                            <div className="text-xs font-medium text-green-700">Doğru</div>
                            <div className="text-sm font-bold text-green-600">
                              {subjects.reduce((total, subject) => {
                                const scores = studentResult?.scores || {};
                                const subjectScore = scores[subject.key] || {};
                                const realCorrect = subjectScore.D ? parseInt(subjectScore.D) : 0;
                                return total + realCorrect;
                              }, 0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-red-50 rounded p-2">
                            <div className="text-xs font-medium text-red-700">Yanlış</div>
                            <div className="text-sm font-bold text-red-600">
                              {subjects.reduce((total, subject) => {
                                const scores = studentResult?.scores || {};
                                const subjectScore = scores[subject.key] || {};
                                const realWrong = subjectScore.Y ? parseInt(subjectScore.Y) : 0;
                                return total + realWrong;
                              }, 0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-gray-50 rounded p-2">
                            <div className="text-xs font-medium text-gray-700">Boş</div>
                            <div className="text-sm font-bold text-gray-600">
                              {subjects.reduce((total, subject) => {
                                const scores = studentResult?.scores || {};
                                const subjectScore = scores[subject.key] || {};
                                const realBlank = subjectScore.B ? parseInt(subjectScore.B) : 0;
                                return total + realBlank;
                              }, 0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-blue-50 rounded p-2">
                            <div className="text-xs font-medium text-blue-700">Net</div>
                            <div className="text-sm font-bold text-blue-600">
                              {selectedExamResult.studentTotalNet > 0 ? selectedExamResult.studentTotalNet.toFixed(1) : 'Girmedi'}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-purple-50 rounded p-2">
                            <div className="text-xs font-medium text-purple-700">Puan</div>
                            <div className="text-sm font-bold text-purple-600">
                              {selectedExamResult.studentTotalScore > 0 ? selectedExamResult.studentTotalScore.toFixed(0) : 'Girmedi'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Seçilen Denemenin Sıralaması */}
                {selectedExamId && (() => {
                  const selectedExamResult = reportData.examResults.find(result => result.exam.id === selectedExamId);
                  if (!selectedExamResult) return null;

                  // Bu denemeye ait tüm öğrencilerin sonuçlarını al ve sırala
                  // NOT: Sadece gerçek denemeye katılan öğrencileri dahil et (0 puanlı denemeler hariç)
                  const examResults = allResultsData.filter(result => result.examId === selectedExamId);
                  const validExamResults = examResults.filter(result => {
                    const nets: Record<string, number> = result.nets || {};
                    const totalNet = (nets.turkce || 0) + (nets.sosyal || 0) + (nets.din || 0) + 
                                   (nets.ingilizce || 0) + (nets.matematik || 0) + (nets.fen || 0);
                    const score = typeof result.scores?.puan === 'string' ? parseFloat(result.scores.puan) :
                                  typeof result.puan === 'number' ? result.puan : 
                                  (typeof result.totalScore === 'number' ? result.totalScore : 0);
                    return totalNet > 0 || score > 0;
                  });
                  
                  const studentsWithScores = validExamResults.map(result => {
                    const student = allStudentsData.find(s => s.id === result.studentId);
                    const score = typeof result.scores?.puan === 'string' ? parseFloat(result.scores.puan) :
                                  typeof result.puan === 'number' ? result.puan : 
                                  (typeof result.totalScore === 'number' ? result.totalScore : 0);
                    
                    // Toplam net'i hesapla (ders bazındaki netlerin toplamı)
                    const nets: Record<string, number> = result.nets || {};
                    const totalNet = (nets.turkce || 0) + (nets.sosyal || 0) + (nets.din || 0) + 
                                   (nets.ingilizce || 0) + (nets.matematik || 0) + (nets.fen || 0);
                    
                    return {
                      studentId: result.studentId,
                      studentName: student?.name || 'Bilinmeyen Öğrenci',
                      studentNumber: student?.number || '',
                      totalScore: score,
                      totalNet: totalNet,
                      nets: nets
                    };
                  }).sort((a, b) => b.totalScore - a.totalScore);

                  const studentRank = studentsWithScores.findIndex(s => s.studentId === reportData.student.id) + 1;

                  return (
                    <div className="bg-white rounded-lg shadow p-2">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">
                        🏆 {selectedExamResult.exam.title} - Puan Sıralaması
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Bu denemeye katılan öğrencilerin puan sıralaması (Toplam {studentsWithScores.length} öğrenci)
                      </p>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Sıra</th>
                              <th className="px-1.5 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Öğrenci</th>
                              <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Puan</th>
                              <th className="px-1.5 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Net</th>
                              {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => (
                                <th key={subject} className="px-1 py-1 text-center text-[10px] font-medium text-gray-500 uppercase">
                                  {subject === 'turkce' ? 'TR' : 
                                   subject === 'sosyal' ? 'SOS' :
                                   subject === 'din' ? 'DİN' :
                                   subject === 'ingilizce' ? 'İNG' :
                                   subject === 'matematik' ? 'MAT' : 'FEN'}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {studentsWithScores.map((student, index) => (
                              <tr key={student.studentId} className={`hover:bg-gray-50 ${
                                student.studentId === reportData.student.id ? 'bg-blue-50 font-semibold' : ''
                              }`}>
                                <td className="px-1.5 py-1.5 text-center">
                                  <span className={`text-xs font-bold ${
                                    index === 0 ? 'text-yellow-600' : 
                                    index === 1 ? 'text-gray-600' : 
                                    index === 2 ? 'text-amber-600' : 'text-gray-700'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="px-1.5 py-1.5">
                                  <div className="text-xs">
                                    <div className="font-medium text-gray-900">{student.studentName}</div>
                                    <div className="text-gray-500">{student.studentNumber}</div>
                                  </div>
                                </td>
                                <td className="px-1.5 py-1.5 text-center">
                                  <span className="text-xs font-bold text-purple-600">
                                    {student.totalScore.toFixed(0)}
                                  </span>
                                </td>
                                <td className="px-1.5 py-1.5 text-center">
                                  <span className="text-xs font-bold text-blue-600">
                                    {student.totalNet.toFixed(1)}
                                  </span>
                                </td>
                                {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => (
                                  <td key={subject} className="px-1 py-1 text-center">
                                    <span className="text-xs text-gray-600">
                                      {(student.nets[subject] || 0).toFixed(1)}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {studentRank && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">
                            📍 {reportData.student.name} bu denemede {studentRank}. sırada yer alıyorsunuz
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Genel Deneme Listesi (Alt kısım) */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">📋 Tüm Denemeler</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Deneme</th>
                          <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                          <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Net</th>
                          <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Puan</th>
                          <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Sınıf</th>
                          <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.examResults.map((result, index) => {
                          const isImproved = index > 0 && result.studentTotalNet > reportData.examResults[index-1].studentTotalNet;
                          const isWorse = index > 0 && result.studentTotalNet < reportData.examResults[index-1].studentTotalNet;
                          
                          return (
                            <tr 
                              key={result.exam.id} 
                              className={`hover:bg-gray-50 cursor-pointer ${
                                selectedExamId === result.exam.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => setSelectedExamId(result.exam.id)}
                            >
                              <td className="px-0.5 py-0.25 text-[8px] font-medium text-gray-900">
                                {result.exam.title}
                                {selectedExamId === result.exam.id && (
                                  <span className="ml-1 text-[8px] text-blue-600 font-medium">(Seçili)</span>
                                )}
                              </td>
                              <td className="px-0.5 py-0.25 text-[8px] text-gray-600">
                                {new Date(result.exam.date).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-0.5 py-0.25 text-center">
                                <span className="text-xs font-bold text-blue-600">
                                  {result.studentTotalNet > 0 ? result.studentTotalNet.toFixed(1) : 'Girmedi'}
                                </span>
                              </td>
                              <td className="px-0.5 py-0.25 text-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {result.studentTotalScore > 0 ? result.studentTotalScore.toFixed(0) : 'Girmedi'}
                                </span>
                              </td>
                              <td className="px-0.5 py-0.25 text-center">
                                <span className="text-xs text-gray-600">
                                  {result.classAverage.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-0.5 py-0.25 text-center">
                                {index === 0 ? (
                                  <span className="text-[8px] text-gray-500">İlk</span>
                                ) : isImproved ? (
                                  <span className="text-[8px] text-green-600 font-medium">↗ Yükseliş</span>
                                ) : isWorse ? (
                                  <span className="text-[8px] text-red-600 font-medium">↘ Düşüş</span>
                                ) : (
                                  <span className="text-[8px] text-gray-500">→ Stabil</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 5 && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">Ders Bazında Net Gelişimi</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                    {subjects.map((subject) => {
                      const subjectData = reportData.examResults.map((item, index) => {
                        const studentResult = item.studentResults[0];
                        const studentNet = studentResult?.nets?.[subject.key] || 0;
                        
                        // Öğrenci denemeye girmemişse (nets.total = 0), bu ders için de null yap
                        const studentTotalNet = studentResult?.nets?.total || 0;
                        const displayStudentNet = studentTotalNet > 0 ? studentNet : null;
                        
                        // Sınıf ortalaması: denemeye giren öğrencilerin o ders net ortalaması
                        const examResults = allResultsData.filter(r => r.examId === item.exam.id);
                        const classStudents = examResults.filter(r => {
                          const student = allStudentsData.find(s => s.id === r.studentId);
                          return student?.class === reportData.student.class && (r.nets?.total || 0) > 0;
                        });
                        const classSubjectAverage = classStudents.length > 0 
                          ? classStudents.reduce((sum, r) => sum + (r.nets?.[subject.key] || 0), 0) / classStudents.length
                          : 0;
                        
                        // Sınıf ve genel ortalamalarını hesapla
                        const classAverages = item.exam.generalAverages?.[reportData.student.class] || {};
                        const generalSubjectAverage = classAverages[subject.key] || 0; // Genel ders ortalaması (deneme yönetiminde girilen)
                        
                        return {
                          exam: item.exam.title,
                          öğrenci: displayStudentNet, // 0 ise null yap
                          sınıf: classSubjectAverage,
                          genel: generalSubjectAverage,
                          index: index + 1
                        };
                      });

                      // YAxis domain değerini ders bazında sabitle
                      const yAxisDomain = subject.key === 'turkce' || subject.key === 'matematik' || subject.key === 'fen' ? [0, 20] : [0, 10];
                      const yAxisTick = subject.key === 'turkce' || subject.key === 'matematik' || subject.key === 'fen' ? 2 : 1;



                      return (
                        <div key={subject.key} className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                            <span 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: subject.color }}
                            ></span>
                            {subject.name}
                          </h4>
                          
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={subjectData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="index"
                                tickFormatter={(value) => `Deneme ${value}`}
                              />
                              <YAxis domain={yAxisDomain} tick={{ fontSize: 9 }} />
                              <Tooltip 
                                formatter={(value, name) => [value !== null && value !== undefined ? `${Number(value).toFixed(1)}` : 'Girmedi', name]}
                                labelFormatter={(label) => `Deneme ${label}`}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="öğrenci" 
                                stroke={subject.color} 
                                strokeWidth={2}
                                dot={{ fill: subject.color, strokeWidth: 1, r: 3 }}
                                name="Öğrenci"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="sınıf" 
                                stroke="#10B981" 
                                strokeWidth={1}
                                strokeDasharray="5 5"
                                name={`${subject.name} Sınıf Ort.`}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="genel" 
                                stroke="#F59E0B" 
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                name={`${subject.name} Genel Ort.`}
                              />
                            </LineChart>
                          </ResponsiveContainer>

                          {/* Deneme Değerleri */}
                          <div className="mt-3 text-xs">
                            <p className="text-gray-600 mb-2 font-medium">📊 Deneme Değerleri:</p>
                            <div className="grid grid-cols-2 gap-1">
                              {subjectData.map((data, index) => (
                                <div key={index} className="text-center bg-gray-50 rounded p-1">
                                  <p className="text-gray-500">Deneme {data.index}</p>
                                  <p className="font-semibold text-blue-600">{(data.öğrenci || 0).toFixed(1)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 6 && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">🎯 Hedef Takibi & Lise Tercih Önerileri</h3>
                  
                  {/* Hedef durumunu kontrol et */}
                  {(() => {
                    const targets = studentTargets || {};
                    console.log('Tab 6 - Hedefler:', targets);
                    const targetCount = Object.keys(targets).length;
                    
                    if (targetCount === 0) {
                      return (
                        <div className="p-4 text-center">
                          <div className="text-sm text-gray-600">
                            Hedef takibi için ders bazında hedeflerinizi panelden belirleyebilirsiniz.
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-0.5.5 py-0.25 text-left text-[8px] font-medium text-gray-500 uppercase">Ders</th>
                          <th className="px-0.5.5 py-0.25 text-left text-[8px] font-medium text-gray-500 uppercase">Hedef</th>
                          <th className="px-0.5.5 py-0.25 text-left text-[8px] font-medium text-gray-500 uppercase">Mevcut Net</th>
                          <th className="px-0.5.5 py-0.25 text-left text-[8px] font-medium text-gray-500 uppercase">Durum</th>
                          <th className="px-0.5.5 py-0.25 text-left text-[8px] font-medium text-gray-500 uppercase">İlerleme</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          const subjects = [
                            { key: 'turkce', name: 'Türkçe' },
                            { key: 'sosyal', name: 'Sosyal Bilgiler' },
                            { key: 'din', name: 'Din Kültürü' },
                            { key: 'ingilizce', name: 'İngilizce' },
                            { key: 'matematik', name: 'Matematik' },
                            { key: 'fen', name: 'Fen Bilimleri' }
                          ];
                          
                          const sonDeneme = reportData.examResults[reportData.examResults.length - 1]?.studentResults[0];
                          const nets = sonDeneme?.nets || {};
                          const targets = studentTargets || {};
                          
                          return subjects.map((subject) => {
                            const mevcutNet = nets[subject.key] || 0;
                            const hedefNet = targets[subject.key] || 17; // Varsayılan hedef
                            const ilerlemeOrani = hedefNet > 0 ? (mevcutNet / hedefNet) : 0;
                            const durum = ilerlemeOrani >= 1 ? 'Ulaştı' : 
                                        ilerlemeOrani >= 0.8 ? 'Yaklaştı' : 'Çalışmalı';
                            const durumRenk = ilerlemeOrani >= 1 ? 'green' : 
                                             ilerlemeOrani >= 0.8 ? 'yellow' : 'red';
                            const ilerlemeRenk = ilerlemeOrani >= 1 ? 'bg-green-500' : 
                                               ilerlemeOrani >= 0.8 ? 'bg-yellow-500' : 'bg-red-500';
                            
                            return (
                              <tr key={subject.key} className="hover:bg-gray-50">
                                <td className="px-0.5.5 py-0.25 text-[10px] font-medium text-gray-900">{subject.name}</td>
                                <td className="px-0.5.5 py-0.25 text-center">
                                  <span className="text-[10px] font-bold text-blue-600">{hedefNet.toFixed(1)}</span>
                                </td>
                                <td className="px-0.5.5 py-0.25 text-center">
                                  <span className="text-[10px] font-bold text-gray-800">{mevcutNet.toFixed(1)}</span>
                                </td>
                                <td className="px-0.5.5 py-0.25 text-center">
                                  <span className={`px-0.5 py-0.25 rounded-full text-[8px] font-medium bg-${durumRenk}-100 text-${durumRenk}-800`}>
                                    {durum}
                                  </span>
                                </td>
                                <td className="px-0.5.5 py-0.25 text-center">
                                  <div className="flex items-center justify-center">
                                    <div className="w-6 bg-gray-200 rounded-full h-1 mr-1">
                                      <div 
                                        className={`h-1 rounded-full ${ilerlemeRenk}`}
                                        style={{ width: `${Math.min(100, ilerlemeOrani * 100)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[8px] text-gray-600">{Math.round(Math.min(100, ilerlemeOrani * 100))}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  );
                })()}
                </div>



                {/* Denemeler ve Hedefe Ulaşma Durumu - Ders Bazında */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">📋 Denemeler ve Hedefe Ulaşma Durumu</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-1 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Deneme</th>
                          <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Tarih</th>
                          {subjects.map((subject) => (
                            <th key={subject.key} className="px-1 py-1.5 text-center text-[10px] font-medium text-gray-500 uppercase">
                              {subject.name}
                            </th>
                          ))}
                          <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Toplam Net</th>
                          <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Toplam Hedef</th>
                          <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 uppercase">Fark</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.examResults.map((result, index) => {
                          const studentResult = result.studentResults[0];
                          const nets = studentResult?.nets || {};
                          const targets = studentTargets || {};
                          
                          const subjectData = subjects.map(subject => {
                            const currentNet = nets[subject.key] || 0;
                            const targetNet = targets[subject.key] || 0;
                            const difference = currentNet - targetNet;
                            
                            return {
                              name: subject.name,
                              current: currentNet,
                              target: targetNet,
                              difference: difference,
                              achieved: currentNet >= targetNet
                            };
                          });
                          
                          const totalNet = subjectData.reduce((sum, data) => sum + data.current, 0);
                          const totalTarget = subjectData.reduce((sum, data) => sum + data.target, 0);
                          const totalDifference = totalNet - totalTarget;
                          
                          return (
                            <tr key={result.exam.id} className="hover:bg-gray-50">
                              <td className="px-1 py-1.5">
                                <span className="text-xs font-medium text-gray-900">{result.exam.title}</span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-xs text-gray-600">
                                  {new Date(result.exam.date).toLocaleDateString('tr-TR')}
                                </span>
                              </td>
                              {subjectData.map((data, subIndex) => (
                                <td key={subIndex} className="px-1 py-1.5 text-center">
                                  <div className="text-[10px]">
                                    <div className={`font-bold ${
                                      data.achieved ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {data.current.toFixed(1)}
                                    </div>
                                    <div className="text-gray-500">
                                      {data.target > 0 ? `/${data.target.toFixed(1)}` : '/0'}
                                    </div>
                                    <div className={`text-[8px] ${
                                      data.difference >= 0 ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                      {data.difference >= 0 ? '+' : ''}{data.difference.toFixed(1)}
                                    </div>
                                  </div>
                                </td>
                              ))}
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-xs font-bold text-blue-600">
                                  {totalNet.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-xs font-medium text-gray-700">
                                  {totalTarget.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className={`text-xs font-medium ${
                                  totalDifference >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {totalDifference >= 0 ? '+' : ''}{totalDifference.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Hedef Durumu Özeti */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Hedef Durumu Özeti</h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {subjects.map((subject) => {
                        const target = studentTargets[subject.key] || 0;
                        const current = reportData.examResults[reportData.examResults.length - 1]?.studentResults[0]?.nets?.[subject.key] || 0;
                        const achieved = current >= target && target > 0;
                        
                        return (
                          <div key={subject.key} className="text-center">
                            <div className="text-xs text-gray-600 mb-1">{subject.name}</div>
                            <div className={`text-xs font-bold ${
                              achieved ? 'text-green-600' : target > 0 ? 'text-red-600' : 'text-gray-500'
                            }`}>
                              {achieved ? '✅ Hedefe Ulaştı' : target > 0 ? '🎯 Hedefe Çalışıyor' : 'Hedef Belirlenmemiş'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lise Tercih Önerileri - Hedef Takibi Tab'ına Eklendi */}
                <LiseTercihOnerileriTab 
                  reportData={reportData} 
                  studentTargets={studentTargets}
                  latestNet={latestNet}
                  latestScore={liseTercihScore}
                />
              </div>
            )}

            {/* Tab 7: LGS Puan Hesaplama */}
            {activeTab === 7 && (
              <LGSHesaplamaTab />
            )}

            {/* Tab 8: Kitap Sınavı */}
            {activeTab === 8 && (
              <KitapSinaviTab />
            )}

            {/* Tab 9: Lise Taban Puanları */}
            {activeTab === 9 && (
              <LiseTabanPuanlariTab />
            )}


          </>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <img src="/projelogo.png" alt="LGS Portalı" className="w-10 h-10 mr-3" />
              <span className="text-sm font-medium text-gray-900">LGS Portalı</span>
            </div>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} LGS Portalı | Developed by Murat UYSAL
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// LGS Puan Hesaplama Tab Komponenti
function LGSHesaplamaTab() {
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
  const basePoints = 193.493;

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
    <div className="space-y-3">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">🧮 LGS Puan Hesaplama</h3>
        <p className="text-gray-600 mb-4">LGS puanınızı hesaplamak için doğru ve yanlış sayılarınızı girin.</p>
        
        {/* Hesaplama Formu */}
        <div className="space-y-4">
          {/* İstenen ders sıralaması: Türkçe, Sosyal, Din, İngilizce, Matematik, Fen */}
          {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => (
            <div key={subject} className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">
                    {subject === 'turkce' && '📝'}
                    {subject === 'matematik' && '🔢'}
                    {subject === 'fen' && '🧪'}
                    {subject === 'sosyal' && '🌍'}
                    {subject === 'din' && '🕌'}
                    {subject === 'ingilizce' && '🇺🇸'}
                  </span>
                  {subjectNames[subject]}
                </div>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {questionCounts[subject]} soru
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doğru Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores[subject].dogru}
                    onChange={(e) => handleScoreChange(subject, 'dogru', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yanlış Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores[subject].yanlis}
                    onChange={(e) => handleScoreChange(subject, 'yanlis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Hesapla Butonları */}
          <div className="flex gap-3">
            <button
              onClick={calculateLGSPoints}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              🧮 Puanı Hesapla
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔄 Temizle
            </button>
          </div>
        </div>

        {/* Sonuçlar */}
        {result && (
          <div className="mt-6 space-y-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
              <h4 className="text-xl font-bold mb-2">🎯 LGS Puanınız</h4>
              <div className="text-3xl font-bold">{result.totalPoints}</div>
              <p className="text-blue-100 text-sm mt-2">
                Maksimum puan: 500 • Minimum puan: 0
              </p>
            </div>

            {/* Ders Bazında Detaylar */}
            <div className="border rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-3">📊 Ders Bazında Detaylar</h5>
              <div className="space-y-3">
                {/* İstenen ders sıralaması: Türkçe, Sosyal, Din, İngilizce, Matematik, Fen */}
                {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => {
                  const name = subjectNames[subject];
                  const subjectData = result.subjects[subject] || { dogru: 0, yanlis: 0, net: 0, points: 0 };
                  return (
                  <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">
                        {subject === 'turkce' && '📝'}
                        {subject === 'matematik' && '🔢'}
                        {subject === 'fen' && '🧪'}
                        {subject === 'sosyal' && '🌍'}
                        {subject === 'din' && '🕌'}
                        {subject === 'ingilizce' && '🇺🇸'}
                      </span>
                      <span className="font-medium">{name}</span>
                      <span className="text-xs text-gray-500 ml-2">({questionCounts[subject]} soru)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Doğru: {subjectData.dogru} | Yanlış: {subjectData.yanlis} | Net: {subjectData.net}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>

            {/* Bilgilendirme */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                <strong>💡 Bilgi:</strong> Bu hesaplama MEB'in resmi LGS puan hesaplama sistemine uygun olarak yapılmıştır. 
                Net sayıları = Doğru sayısı - (Yanlış sayısı ÷ 3) formülü ile hesaplanır. 
                <strong>Taban puan: 193.493</strong> otomatik olarak eklenir.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Merkezi Yerleştirme Taban Puanları Component
function MerkeziYerlestirmePuanlari() {
  const merkeziSchools = [
    {
      name: "Van Türk Telekom Fen Lisesi",
      type: "Fen Lisesi", 
      score: "460.91",
      capacity: "150",
      district: "Edremit",
      yertip: "Merkezi Yerleştirme",
      percentile: "2.51"
    },
    {
      name: "İpekyolu Borsa İstanbul Fen Lisesi",
      type: "Fen Lisesi",
      score: "441.61",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "4.67"
    },
    {
      name: "Tuşba TOBB Fen Lisesi",
      type: "Fen Lisesi",
      score: "422.90",
      capacity: "150",
      district: "Tuşba",
      yertip: "Merkezi Yerleştirme",
      percentile: "7.20"
    },
    {
      name: "Niyazi Türkmenoğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "416.75",
      capacity: "120",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "8.09"
    },
    {
      name: "Erciş Fen Lisesi",
      type: "Fen Lisesi",
      score: "402.18",
      capacity: "150",
      district: "Erciş",
      yertip: "Merkezi Yerleştirme",
      percentile: "10.39"
    },
    {
      name: "Kazım Karabekir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "400.23",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "10.71"
    },
    {
      name: "Türkiye Yardımsevenler Derneği Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "387.01",
      capacity: "120",
      district: "Edremit",
      yertip: "Merkezi Yerleştirme",
      percentile: "12.92"
    },
    {
      name: "Van Atatürk Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "379.46",
      capacity: "180",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "14.26"
    },
    {
      name: "Abdurrahman Gazi Borsa İstanbul Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "367.20",
      capacity: "150",
      district: "Tuşba",
      yertip: "Merkezi Yerleştirme",
      percentile: "16.52"
    },
    {
      name: "Muradiye Alpaslan Fen Lisesi",
      type: "Fen Lisesi",
      score: "366.59",
      capacity: "120",
      district: "Muradiye",
      yertip: "Merkezi Yerleştirme",
      percentile: "16.63"
    },
    {
      name: "Erciş Sosyal Bilimler Lisesi",
      type: "Sosyal Bilimler Lisesi",
      score: "366.09",
      capacity: "120",
      district: "Erciş",
      yertip: "Merkezi Yerleştirme",
      percentile: "20.09"
    },
    {
      name: "Van Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "360.29",
      capacity: "120",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "19.06"
    },
    {
      name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "349.74",
      capacity: "180",
      district: "Edremit",
      yertip: "Merkezi Yerleştirme",
      percentile: "23.59"
    },
    {
      name: "Sevim Kürüm Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "349.08",
      capacity: "120",
      district: "Erciş",
      yertip: "Merkezi Yerleştirme",
      percentile: "18.31"
    },
    {
      name: "İskele Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "325.31",
      capacity: "120",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "27.46"
    },
    {
      name: "Edremit Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "312.80",
      capacity: "120",
      district: "Edremit",
      yertip: "Merkezi Yerleştirme",
      percentile: "39.48"
    },
    {
      name: "Mehmet Erdemoğlu Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "305.71",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Merkezi Yerleştirme",
      percentile: "30.94"
    },
    {
      name: "Şehit Polis Halil Hamuryen Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "308.52",
      capacity: "120",
      district: "Erciş",
      yertip: "Merkezi Yerleştirme",
      percentile: "40.76"
    },
    {
      name: "Tevfik İleri Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "294.42",
      capacity: "120",
      district: "Erciş",
      yertip: "Merkezi Yerleştirme",
      percentile: "45.03"
    },
    {
      name: "Erciş Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "293.47",
      capacity: "150",
      district: "Erciş",
      yertip: "Merkezi Yerleştirme",
      percentile: "50.02"
    },
    {
      name: "Mizancı Murat Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "293.21",
      capacity: "120",
      district: "Edremit",
      yertip: "Merkezi Yerleştirme",
      percentile: "55.88"
    },
    {
      name: "Gevaş Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "267.96",
      capacity: "120",
      district: "Gevaş",
      yertip: "Merkezi Yerleştirme",
      percentile: "98.45"
    },
    {
      name: "Hüseyin Çelik Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "263.42",
      capacity: "120",
      district: "Tuşba",
      yertip: "Merkezi Yerleştirme",
      percentile: "48.81"
    },
    {
      name: "Özalp Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "255.88",
      capacity: "120",
      district: "Özalp",
      yertip: "Merkezi Yerleştirme",
      percentile: "89.83"
    },
    {
      name: "Tuşba Şehit Ferhat Arslan Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "251.82",
      capacity: "120",
      district: "Tuşba",
      yertip: "Merkezi Yerleştirme",
      percentile: "97.98"
    },
    {
      name: "Şehit Haluk Varlı Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "221.47",
      capacity: "120",
      district: "Gürpınar",
      yertip: "Merkezi Yerleştirme",
      percentile: "94.06"
    },
    {
      name: "Muradiye Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "208.61",
      capacity: "120",
      district: "Muradiye",
      yertip: "Merkezi Yerleştirme",
      percentile: "97.43"
    },
    {
      name: "Başkale Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "199.41",
      capacity: "120",
      district: "Başkale",
      yertip: "Merkezi Yerleştirme",
      percentile: "99.80"
    },
    {
      name: "Çaldıran Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "197.30",
      capacity: "120",
      district: "Çaldıran",
      yertip: "Merkezi Yerleştirme",
      percentile: "82.62"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-blue-600 mr-2">🎯</span>
          Van İli Merkezi Yerleştirme Taban Puanları (2025)
        </h4>
        <p className="text-gray-600 mb-4 text-sm">
          2025 LGS sonuçlarına göre merkezi yerleştirme kapsamındaki okulların taban puanları:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-800">Lise Adı</th>
                <th className="text-left p-3 font-semibold text-gray-800">Tür</th>
                <th className="text-center p-3 font-semibold text-gray-800">Yerleştirme Türü</th>
                <th className="text-center p-3 font-semibold text-gray-800">Taban Puan</th>
                <th className="text-center p-3 font-semibold text-gray-800">Yüzdelik Dilim</th>
                <th className="text-center p-3 font-semibold text-gray-800">Kontenjan</th>
                <th className="text-left p-3 font-semibold text-gray-800">İlçe</th>
              </tr>
            </thead>
            <tbody>
              {merkeziSchools.map((school, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{school.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      school.type === 'Fen Lisesi' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {school.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      school.yertip === 'Merkezi Yerleştirme'
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {school.yertip}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-blue-600">{school.score}</td>
                  <td className="p-3 text-center font-bold text-purple-600 text-lg">{school.percentile}%</td>
                  <td className="p-3 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-3 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-xs">
            <strong>Not:</strong> Bu puanlar 2025 LGS sonuçlarına göre merkezi yerleştirme taban puanlarıdır ve MEB verilerine dayanmaktadır.
          </p>
        </div>
      </div>
    </div>
  );
}

// Yerel Yerleştirme Taban Puanları Component
function YerelYerlestirmePuanlari() {
  const yerelSchools = [
    {
      name: "Mesut Özata Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "91.09",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Yerel Yerleştirme",
      percentile: "5.2"
    },
    {
      name: "Özen Adalı Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.66",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Yerel Yerleştirme",
      percentile: "7.8"
    },
    {
      name: "Mehmet Akif Ersoy Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "88.96",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Yerel Yerleştirme",
      percentile: "8.5"
    },
    {
      name: "Arif Nihat Asya Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.39",
      capacity: "150",
      district: "Erciş",
      yertip: "Yerel Yerleştirme",
      percentile: "7.1"
    },
    {
      name: "Faki Teyran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "85.96",
      capacity: "150",
      district: "Edremit",
      yertip: "Yerel Yerleştirme",
      percentile: "12.3"
    },
    {
      name: "İki Nisan Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.93",
      capacity: "150",
      district: "İpekyolu",
      yertip: "Yerel Yerleştirme",
      percentile: "14.1"
    },
    {
      name: "Çaldıran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.30",
      capacity: "120",
      district: "Çaldıran",
      yertip: "Yerel Yerleştirme",
      percentile: "15.2"
    },
    {
      name: "İzzeddin Şir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "83.69",
      capacity: "120",
      district: "Gevaş",
      yertip: "Yerel Yerleştirme",
      percentile: "16.8"
    },
    {
      name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "84.09",
      capacity: "150",
      district: "Edremit",
      yertip: "Yerel Yerleştirme",
      percentile: "15.7"
    },
    {
      name: "Said Nursi Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "65.83",
      capacity: "120",
      district: "İpekyolu",
      yertip: "Yerel Yerleştirme",
      percentile: "45.2"
    },
    {
      name: "Evliya Çelebi Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "45.72",
      capacity: "150",
      district: "Edremit",
      yertip: "Yerel Yerleştirme",
      percentile: "78.5"
    },
    {
      name: "Kalecik Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "43.85",
      capacity: "120",
      district: "Tuşba",
      yertip: "Yerel Yerleştirme",
      percentile: "82.1"
    },
    {
      name: "Tuşba Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "42.18",
      capacity: "120",
      district: "Tuşba",
      yertip: "Yerel Yerleştirme",
      percentile: "85.3"
    },
    {
      name: "Başkale Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "41.65",
      capacity: "120",
      district: "Başkale",
      yertip: "Yerel Yerleştirme",
      percentile: "86.7"
    },
    {
      name: "Muradiye Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "39.24",
      capacity: "120",
      district: "Muradiye",
      yertip: "Yerel Yerleştirme",
      percentile: "91.2"
    },
    {
      name: "Gürpınar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "38.97",
      capacity: "120",
      district: "Gürpınar",
      yertip: "Yerel Yerleştirme",
      percentile: "92.4"
    },
    {
      name: "Özalp Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "35.82",
      capacity: "120",
      district: "Özalp",
      yertip: "Yerel Yerleştirme",
      percentile: "95.8"
    },
    {
      name: "Saray Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "34.15",
      capacity: "120",
      district: "Saray",
      yertip: "Yerel Yerleştirme",
      percentile: "97.1"
    },
    {
      name: "Bahçesaray Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "32.48",
      capacity: "120",
      district: "Bahçesaray",
      yertip: "Yerel Yerleştirme",
      percentile: "97.9"
    },
    {
      name: "Gevaş Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "30.76",
      capacity: "120",
      district: "Gevaş",
      yertip: "Yerel Yerleştirme",
      percentile: "98.5"
    },
    {
      name: "Akdamar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "29.31",
      capacity: "120",
      district: "Gevaş",
      yertip: "Yerel Yerleştirme",
      percentile: "98.9"
    },
    {
      name: "Çatak Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "27.84",
      capacity: "120",
      district: "Çatak",
      yertip: "Yerel Yerleştirme",
      percentile: "99.2"
    },
    {
      name: "Gevaş Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "26.45",
      capacity: "120",
      district: "Gevaş",
      yertip: "Yerel Yerleştirme",
      percentile: "99.5"
    },
    {
      name: "Başkale Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "24.89",
      capacity: "120",
      district: "Başkale",
      yertip: "Yerel Yerleştirme",
      percentile: "99.7"
    },
    {
      name: "Çatak Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "23.68",
      capacity: "120",
      district: "Çatak",
      yertip: "Yerel Yerleştirme",
      percentile: "99.9"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-green-600 mr-2">🏠</span>
          Van İli Yerel Yerleştirme Taban Puanları (2025)
        </h4>
        <p className="text-gray-600 mb-4 text-sm">
          2025 OBP sonuçlarına göre yerel yerleştirme kapsamındaki okulların taban puanları:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 font-semibold text-gray-800">Okul Adı</th>
                <th className="text-left p-3 font-semibold text-gray-800">Tür</th>
                <th className="text-center p-3 font-semibold text-gray-800">Yerleştirme Türü</th>
                <th className="text-center p-3 font-semibold text-gray-800">Taban Puan</th>
                <th className="text-center p-3 font-semibold text-gray-800">Kontenjan</th>
                <th className="text-left p-3 font-semibold text-gray-800">İlçe</th>
              </tr>
            </thead>
            <tbody>
              {yerelSchools.map((school, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{school.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      school.type.includes('İmam Hatip') 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {school.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      school.yertip === 'Yerel Yerleştirme'
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {school.yertip}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-green-600">{school.score}</td>
                  <td className="p-3 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-3 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-xs">
            <strong>Not:</strong> Bu puanlar 2025 OBP sonuçlarına göre yerel yerleştirme taban puanlarıdır ve MEB verilerine dayanmaktadır.
          </p>
        </div>
      </div>
    </div>
  );
}

// Van İli Lise Taban Puanları Verisi
const vanLgsSchools = [
  {
    name: "Van Türk Telekom Fen Lisesi",
    type: "Fen Lisesi", 
    score: "460.91",
    percentile: "2.51",
    capacity: "150",
    district: "Edremit"
  },
  {
    name: "İpekyolu Borsa İstanbul Fen Lisesi",
    type: "Fen Lisesi",
    score: "441.61",
    percentile: "4.67",
    capacity: "150",
    district: "İpekyolu"
  },
  {
    name: "Tuşba TOBB Fen Lisesi",
    type: "Fen Lisesi",
    score: "422.90",
    percentile: "7.20",
    capacity: "150",
    district: "Tuşba"
  },
  {
    name: "Niyazi Türkmenoğlu Anadolu Lisesi",
    type: "Anadolu Lisesi",
    score: "416.75",
    percentile: "8.09",
    capacity: "120",
    district: "İpekyolu"
  },
  {
    name: "Şehit Erdoğan Cınbıroğlu Anadolu Lisesi",
    type: "Anadolu Lisesi",
    score: "412.45",
    percentile: "9.12",
    capacity: "150",
    district: "İpekyolu"
  },
  {
    name: "Erciş Fen Lisesi",
    type: "Fen Lisesi",
    score: "402.18",
    percentile: "10.39",
    capacity: "150",
    district: "Erciş"
  },
  {
    name: "Van Anadolu Lisesi",
    type: "Anadolu Lisesi",
    score: "408.32",
    percentile: "9.87",
    capacity: "150",
    district: "İpekyolu"
  },
  {
    name: "Atatürk Anadolu Lisesi",
    type: "Anadolu Lisesi",
    score: "405.78",
    percentile: "10.23",
    capacity: "150",
    district: "İpekyolu"
  },
  {
    name: "Kazım Karabekir Anadolu Lisesi",
    type: "Anadolu Lisesi",
    score: "400.23",
    percentile: "10.71",
    capacity: "150",
    district: "İpekyolu"
  },
  {
    name: "Mehmet Akif Ersoy Anadolu Lisesi",
    type: "Anadolu Lisesi",
    score: "402.15",
    percentile: "10.58",
    capacity: "150",
    district: "İpekyolu"
  }
];

// Lise Tercih Önerileri Tab Komponenti - Hedef Takibi için
function LiseTercihOnerileriTab({ reportData, studentTargets, latestNet, latestScore }: {
  reportData: ReportData;
  studentTargets: {[subject: string]: number};
  latestNet: number;
  latestScore: number;
}) {
  // Ortalama puanı hesapla
  const studentScores = reportData.examResults.filter(r => r.studentTotalScore > 0).map(r => r.studentTotalScore);
  const currentStudentScore = studentScores.length > 0 
    ? studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length 
    : 0;
  
  // Son deneme puanını al
  const lastExamScore = reportData.examResults.length > 0 
    ? reportData.examResults[reportData.examResults.length - 1].studentTotalScore 
    : 0;

  // Component return JSX
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">🏫 Lise Tercih Önerileri</h3>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">📊 Mevcut Durumunuz</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentStudentScore > 0 ? `${Math.round(currentStudentScore)} puan` : 'Puan bulunamadı'}
              </div>
              <div className="text-sm text-blue-700">Ortalama Puanınız</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {lastExamScore > 0 ? `${Math.round(lastExamScore)} puan` : '-'}
              </div>
              <div className="text-sm text-purple-700">Son Deneme Puanınız</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{latestNet.toFixed(1)} net</div>
              <div className="text-sm text-green-700">Son Deneme Net'iniz</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{reportData.examResults.length}</div>
              <div className="text-sm text-orange-700">Toplam Deneme Sayınız</div>
            </div>
          </div>
        </div>

        {/* Önerilen Okullar */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">
            🎯 Size Önerilen Liseler (Van İli - 2025 LGS)
          </h4>
          
          {currentStudentScore === 0 ? (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
              <p className="text-orange-700 text-sm">
                ⚠️ Henüz deneme puanı bulunmuyor. Öneriler genel bilgilendirme amaçlıdır. 
                Deneme sınavları çözdükten sonra size özel öneriler alabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎓</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Tercih Önerileri</h4>
              <p className="text-gray-600">
                Öğrenci puanınız: {Math.round(currentStudentScore)} puan
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Sisteminiz güncellenmektedir. Yakında kişiselleştirilmiş öneriler gelecektir.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Ana sayfa komponenti
export default function StudentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sayfa yükleniyor...</p>
        </div>
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  );
}

// 📖 KITAP SINAVI TAB COMPONENT
const KitapSinaviTab = () => {
  const [kitapSinavlari, setKitapSinavlari] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Öğrenci ID'sini al
  const [studentId, setStudentId] = useState<string>('');

  // URL parametresinden öğrenci ID'sini al (hem id hem studentId destekli)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || urlParams.get('studentId') || '';
    console.log('🔍 DEBUG: URL parametreleri:', window.location.search);
    console.log('🔍 DEBUG: Bulunan student ID:', id);
    setStudentId(id);
    
    if (id) {
      loadKitapSinavlari(id);
    } else {
      // Student ID yoksa loading'i false yap
      console.log('🔍 DEBUG: Student ID bulunamadı, loading=false');
      setLoading(false);
    }
  }, []);

  // Kitap sınavlarını getir
  const loadKitapSinavlari = async (studentId: string) => {
    console.log('🔍 DEBUG: loadKitapSinavlari başladı, studentId:', studentId);
    setLoading(true);
    setError(null);
    
    try {
      const { getKitapSinavlari } = await import('../../firebase');
      const sinavlar = await getKitapSinavlari();
      
      console.log('🔍 DEBUG: Firestore\'dan gelen sınavlar:', sinavlar);
      
      // Bu öğrencinin puanı olan sınavları filtrele
      const ogrenciSinavlari = sinavlar.filter((sinav: any) => {
        return sinav.puanlar && sinav.puanlar[studentId];
      });
      
      console.log('🔍 DEBUG: Öğrencinin sınavları:', ogrenciSinavlari);
      setKitapSinavlari(ogrenciSinavlari);
    } catch (error) {
      console.error('🔍 DEBUG: Kitap sınavları yüklenirken hata:', error);
      setError('Kitap sınavları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Kitap sınavları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => studentId && loadKitapSinavlari(studentId)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
              📖 Kitap Sınavlarım
            </h3>
            
            {kitapSinavlari.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-4">📚</div>
                <p className="text-gray-500">Henüz kitap sınavı bulunmuyor.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Öğretmenleriniz kitap sınavları ekledikçe burada görünecek.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📚 Kitap & Sınıf
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📅 Tarih
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        🎯 Benim Puanım
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        👥 Sınıf Ortalaması
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📈 Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {kitapSinavlari.map((sinav) => {
                      const benimPuanim = sinav.puanlar[studentId]?.puan || 0;
                      const sinifPuanlari = Object.values(sinav.puanlar).map(p => (p as any).puan);
                      const sinifOrtalamasi = sinifPuanlari.length > 0 
                        ? (sinifPuanlari.reduce((a, b) => a + b, 0) / sinifPuanlari.length).toFixed(1)
                        : '0';
                      const fark = benimPuanim - parseFloat(sinifOrtalamasi);
                      const durum = fark > 0 ? 'Üstte' : fark < 0 ? 'Altta' : 'Eşit';
                      const durumRengi = fark > 0 ? 'text-green-600' : fark < 0 ? 'text-red-600' : 'text-gray-600';
                      
                      return (
                        <tr key={sinav.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{sinav.kitapAdi}</div>
                            <div className="text-xs text-gray-500">{sinav.sinif}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(sinav.tarih).toLocaleDateString('tr-TR')}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className="text-sm font-bold text-blue-600">{benimPuanim}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{sinifOrtalamasi}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className={`text-sm font-medium ${durumRengi}`}>
                              {durum} {fark !== 0 && `(${fark > 0 ? '+' : ''}${fark.toFixed(1)})`}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 🎓 LİSE TABAN PUANLARI TAB COMPONENT - Tam kopyası foncs-data-entry'den
const LiseTabanPuanlariTab = () => {
  const [selectedType, setSelectedType] = useState<'merkezi' | 'yerel' | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">🎓 Lise Taban Puanları</h2>
        
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

// Merkezi Yerleştirme Taban Puanları Component
const MerkeziYerlestirmePuanlariPanel = () => {
  const lgsSchools = [
    {
      name: "Van Türk Telekom Fen Lisesi",
      type: "Fen Lisesi", 
      score: "460.91",
      percentile: "2.51",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İpekyolu Borsa İstanbul Fen Lisesi",
      type: "Fen Lisesi",
      score: "441.61",
      percentile: "4.67",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Tuşba TOBB Fen Lisesi",
      type: "Fen Lisesi",
      score: "422.90",
      percentile: "7.20",
      capacity: "150",
      district: "Tuşba"
    },
    {
      name: "Niyazi Türkmenoğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "416.75",
      percentile: "8.09",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Erciş Fen Lisesi",
      type: "Fen Lisesi",
      score: "402.18",
      percentile: "10.39",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Kazım Karabekir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "400.23",
      percentile: "10.71",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Şehit Erdoğan Cınbıroğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "412.45",
      percentile: "9.12",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Van Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "408.32",
      percentile: "9.87",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Atatürk Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "405.78",
      percentile: "10.23",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Mehmet Akif Ersoy Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "402.15",
      percentile: "10.58",
      capacity: "150",
      district: "İpekyolu"
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
                <th className="text-center p-4 font-semibold text-gray-800">Yüzdelik Dilim</th>
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
                  <td className="p-4 text-center font-bold text-purple-600 text-lg">{school.percentile}%</td>
                  <td className="p-4 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-4 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Yerel Yerleştirme Taban Puanları Component
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
      score: "79.31",
      capacity: "120",
      district: "Çaldıran"
    },
    {
      name: "Gürpınar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "70.45",
      capacity: "120",
      district: "Gürpınar"
    },
    {
      name: "Tuşba Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "68.92",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Edremit Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "65.78",
      capacity: "120",
      district: "Edremit"
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
                <th className="text-left p-4 font-semibold text-gray-800">Lise Adı</th>
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
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
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
      </div>
    </div>
  );
};
