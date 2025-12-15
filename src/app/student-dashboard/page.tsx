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

      if (studentResults.length === 0) {
        console.log('Bu öğrencinin sınav sonucu bulunamadı');
        setReportData({
          student: studentData,
          examResults: []
        });
        setError('Bu öğrenci için henüz sınav sonucu bulunamadı.');
        setLoading(false);
        return;
      }

      const examResults = [];

      for (const result of studentResults) {
        const exam = examsData.find(e => e.id === result.examId);
        if (!exam) continue;

        // Sınıf ortalamasını hesapla (aynı sınıftaki öğrencilerin toplam net ortalaması)
        // NOT: 0 puanlı öğrenciler ortalamadan hariç tutulur ama deneme sayısına dahildir
        const classResults = resultsData.filter(r => r.examId === result.examId && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class);
        const classResultsFiltered = classResults.filter(r => (r.nets?.total || 0) > 0);
        const classAverage = classResultsFiltered.length > 0 
          ? classResultsFiltered.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / classResultsFiltered.length
          : 0;

        // Sınıf ortalama puanını hesapla
        // NOT: 0 puanlı öğrenciler ortalamadan hariç tutulur ama deneme sayısına dahildir
        const classResultsWithScore = resultsData.filter(r => r.examId === result.examId && 
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
  
  // Renk kodları - Tüm dersler için sabit renk
  const COLORS = ['#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6'];

  // Trend analizi
  const trend = scoreImprovement > 2 ? 'Yükseliş' : scoreImprovement < -2 ? 'Düşüş' : 'Stabil';
  const trendColor = scoreImprovement > 2 ? 'text-green-600' : scoreImprovement < -2 ? 'text-red-600' : 'text-yellow-600';

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

  // Subjects array kaldırıldı - syntax hatası testi için

  // Basitleştirilmiş return - JSX parser problemi çözmek için
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">LGS Portalı</h1>
              <p className="text-sm text-gray-600">{reportData.student.name} - {reportData.student.class}</p>
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
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Dashboard</h2>
          <p className="text-gray-600">Bu sayfa yükleniyor...</p>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="text-lg">Yükleniyor...</div></div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}