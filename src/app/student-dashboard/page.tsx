'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { Student, Exam, Result, getStudentTargets, getStudentScoreTarget } from '../../firebase';
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
        const classResults = resultsData.filter(r => r.examId === result.examId && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class);
        const classAverage = classResults.length > 0 
          ? classResults.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / classResults.length
          : 0;

        // Sınıf ortalama puanını hesapla
        const classResultsWithScore = resultsData.filter(r => r.examId === result.examId && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class && 
          (typeof r.scores?.puan === 'string' || typeof r.puan === 'number' || typeof r.totalScore === 'number'));
        const classAverageScore = classResultsWithScore.length > 0 
          ? classResultsWithScore.reduce((sum, r) => sum + (
            typeof r.scores?.puan === 'string' ? parseFloat(r.scores.puan) :
            typeof r.puan === 'number' ? r.puan : 
            (typeof r.totalScore === 'number' ? r.totalScore : 0)
          ), 0) / classResultsWithScore.length
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

  // İstatistikleri hesapla
  const totalNet = reportData.examResults.reduce((sum, item) => sum + item.studentTotalNet, 0);
  const avgNet = reportData.examResults.length > 0 ? totalNet / reportData.examResults.length : 0;
  const scores = reportData.examResults.map(item => item.studentTotalNet);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  // Sınıf ortalamaları
  const classAverageNet = reportData.examResults.length > 0 
    ? reportData.examResults.reduce((sum, item) => sum + (item.classAverage || 0), 0) / reportData.examResults.length
    : 0;
  
  const classAverageScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, item) => sum + (item.classAverageScore || 0), 0) / reportData.examResults.length
    : 0;
  
  // Genel ortalamalar
  const generalAverageNet = reportData.examResults.length > 0 
    ? reportData.examResults.reduce((sum, item) => sum + (item.generalAverage || 0), 0) / reportData.examResults.length
    : 0;
  
  const generalAverageScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, item) => sum + (item.generalAverageScore || 0), 0) / reportData.examResults.length
    : 0;
  
  const latestNet = reportData.examResults[reportData.examResults.length - 1]?.studentTotalNet || 0;
  const previousNet = reportData.examResults[reportData.examResults.length - 2]?.studentTotalNet || 0;
  const improvement = latestNet - previousNet;
  
  const latestScore = reportData.examResults[reportData.examResults.length - 1]?.studentTotalScore || 0;
  const previousScore = reportData.examResults[reportData.examResults.length - 2]?.studentTotalScore || 0;
  const scoreImprovement = latestScore - previousScore;
  
  // Trend analizi
  const trend = improvement > 2 ? 'Yükseliş' : improvement < -2 ? 'Düşüş' : 'Stabil';
  const trendColor = improvement > 2 ? 'text-green-600' : improvement < -2 ? 'text-red-600' : 'text-yellow-600';

  // Renk kodları - Tüm dersler için sabit renk
  const COLORS = ['#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6', '#3B82F6'];

  // Grafik verileri
  const netChartData = reportData.examResults.map((item, index) => ({
    exam: item.exam.title,
    öğrenci: item.studentTotalNet,
    sınıf: item.classAverage,
    genel: item.generalAverage
  }));
  
  const scoreChartData = reportData.examResults.map((item, index) => ({
    exam: item.exam.title,
    öğrenci: item.studentTotalScore,
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Öğrenci Bilgileri */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gray-800">{reportData.student.name}</h2>
            <button
              onClick={() => router.push('/ogrenci')}
              className="px-3 py-0.25 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
            >
              ← Geri Dön
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div className="bg-blue-50 p-2 rounded-lg">
              <h3 className="text-xs font-medium text-blue-800">Sınıf</h3>
              <p className="text-sm font-bold text-blue-600">{reportData.student.class}</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <h3 className="text-xs font-medium text-green-800">Toplam Deneme</h3>
              <p className="text-sm font-bold text-green-600">{reportData.examResults.length}</p>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg">
              <h3 className="text-xs font-medium text-purple-800">Son Net</h3>
              <p className="text-sm font-bold text-purple-600">{latestNet.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Eğer sonuç yoksa mesaj göster */}
        {reportData.examResults.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
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
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((tab) => (
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
                      {tab === 6 && '🎯 Hedef Takibi'}
                      {tab === 7 && '🧮 LGS Puan Hesaplama'}
                      {tab === 8 && '🎓 Van LGS Taban Puanları'}
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
                    <p className="text-sm font-bold text-blue-600">{avgNet.toFixed(1)}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Sınıf: <span className="font-semibold">{classAverageNet.toFixed(1)}</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Ortalama Puan</h3>
                    <p className="text-sm font-bold text-green-600">{generalAverageScore.toFixed(0)}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Sınıf: <span className="font-semibold">{classAverageScore.toFixed(0)}</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Son Deneme Net</h3>
                    <p className="text-sm font-bold text-purple-600">{latestNet.toFixed(1)}</p>
                    <p className={`text-xs mt-1 ${
                      improvement >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)} Değişim
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-1">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Son Deneme Puan</h3>
                    <p className="text-sm font-bold text-orange-600">{latestScore.toFixed(0)}</p>
                    <p className={`text-xs mt-1 ${
                      scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {scoreImprovement >= 0 ? '+' : ''}{scoreImprovement.toFixed(0)} Değişim
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
                                <span className={`font-semibold ${currentNet >= 60 ? 'text-green-600' : currentNet >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {currentNet.toFixed(1)}
                                </span>
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
                                {reportData.examResults[index]?.studentTotalScore.toFixed(0) || '0'} {/* Gerçek toplam puan */}
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
                        
                        return (
                          <div key={subject.name} className="bg-gray-50 p-3 rounded-lg border-l-4" style={{borderColor: subject.color}}>
                            <h4 className="text-xs font-medium text-gray-700 mb-1">{subject.name}</h4>
                            <p className="text-lg font-bold" style={{color: subject.color}}>
                              {subjectNet.toFixed(1)}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="h-2 rounded-full" 
                                style={{
                                  backgroundColor: subject.color,
                                  width: `${Math.min((subjectNet / Math.max(targetNet, 20)) * 100, 100)}%`
                                }}
                              ></div>
                            </div>
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
                        {((netChartData.slice(-2).reduce((sum, d) => sum + (d.öğrenci || 0), 0) / Math.min(2, netChartData.length)) + 2.5).toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <h4 className="text-xs font-medium opacity-90">Son Deneme Net</h4>
                      <p className="text-xl font-bold">
                        {netChartData.length > 0 ? netChartData[netChartData.length - 1].öğrenci.toFixed(1) : '0.0'}
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
                      {Math.max(...reportData.examResults.map(r => r.studentTotalScore)).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">Ortalama Puan</h4>
                    <p className="text-xl font-bold">
                      {(reportData.examResults.reduce((sum, r) => sum + r.studentTotalScore, 0) / reportData.examResults.length).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                    <h4 className="text-xs font-medium opacity-90">Son Puan</h4>
                    <p className="text-xl font-bold">
                      {reportData.examResults[reportData.examResults.length - 1]?.studentTotalScore.toFixed(0) || '0'}
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
                            Fark: {selectedExamResult.generalAverage >= selectedExamResult.studentTotalNet ? (
                              <span className="text-green-600">+{(selectedExamResult.generalAverage - selectedExamResult.studentTotalNet).toFixed(1)}</span>
                            ) : (
                              <span className="text-red-600">-{(selectedExamResult.studentTotalNet - selectedExamResult.generalAverage).toFixed(1)}</span>
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
                                const classAverages = selectedExamResult.exam.generalAverages?.[reportData.student.class] || {};
                                const classSubjectAverage = classAverages[subject.key] || 0;
                                // Genel ders ortalaması: toplam genel net'i ders sayısına bölerek tahmini değer hesapla
                                const totalGeneralAverage = selectedExamResult.generalAverage || 0;
                                const generalSubjectAverage = totalGeneralAverage / 6; // 6 ders var
                                const difference = studentSubjectNet - generalSubjectAverage;
                                const isAboveAverage = difference > 0;
                                
                                // Net hesabından tahmini doğru/yanlış sayıları (3.33 katsayısı ile)
                                const estimatedCorrect = Math.max(0, Math.round(studentSubjectNet * 3.33));
                                const estimatedWrong = Math.max(0, Math.round(studentSubjectNet * 1.5));
                                const estimatedBlank = Math.max(0, Math.round((estimatedCorrect + estimatedWrong) * 0.3));
                                
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
                                        <span className="font-bold text-green-600">{estimatedCorrect}</span>
                                        <span className="text-gray-400">/</span>
                                        <span className="font-bold text-red-600">{estimatedWrong}</span>
                                        <span className="text-gray-400">/</span>
                                        <span className="font-medium text-gray-600">{estimatedBlank}</span>
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
                                const studentSubjectNet = studentResult?.nets?.[subject.key] || 0;
                                return total + Math.max(0, Math.round(studentSubjectNet * 3.33));
                              }, 0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-red-50 rounded p-2">
                            <div className="text-xs font-medium text-red-700">Yanlış</div>
                            <div className="text-sm font-bold text-red-600">
                              {subjects.reduce((total, subject) => {
                                const studentSubjectNet = studentResult?.nets?.[subject.key] || 0;
                                return total + Math.max(0, Math.round(studentSubjectNet * 1.5));
                              }, 0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-gray-50 rounded p-2">
                            <div className="text-xs font-medium text-gray-700">Boş</div>
                            <div className="text-sm font-bold text-gray-600">
                              {subjects.reduce((total, subject) => {
                                const studentSubjectNet = studentResult?.nets?.[subject.key] || 0;
                                const estimatedCorrect = Math.max(0, Math.round(studentSubjectNet * 3.33));
                                const estimatedWrong = Math.max(0, Math.round(studentSubjectNet * 1.5));
                                return total + Math.max(0, Math.round((estimatedCorrect + estimatedWrong) * 0.3));
                              }, 0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-blue-50 rounded p-2">
                            <div className="text-xs font-medium text-blue-700">Net</div>
                            <div className="text-sm font-bold text-blue-600">
                              {selectedExamResult.studentTotalNet.toFixed(1)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[120px] bg-purple-50 rounded p-2">
                            <div className="text-xs font-medium text-purple-700">Puan</div>
                            <div className="text-sm font-bold text-purple-600">
                              {selectedExamResult.studentTotalScore.toFixed(0)}
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
                  const examResults = allResultsData.filter(result => result.examId === selectedExamId);
                  
                  const studentsWithScores = examResults.map(result => {
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
                                  {result.studentTotalNet.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-0.5 py-0.25 text-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {result.studentTotalScore.toFixed(0)}
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
                        
                        // Sınıf ortalaması: denemeye giren öğrencilerin o ders net ortalaması
                        const examResults = allResultsData.filter(r => r.examId === item.exam.id);
                        const classStudents = examResults.filter(r => {
                          const student = allStudentsData.find(s => s.id === r.studentId);
                          return student?.class === reportData.student.class;
                        });
                        const classSubjectAverage = classStudents.length > 0 
                          ? classStudents.reduce((sum, r) => sum + (r.nets?.[subject.key] || 0), 0) / classStudents.length
                          : 0;
                        
                        // Sınıf ve genel ortalamalarını hesapla
                        const classAverages = item.exam.generalAverages?.[reportData.student.class] || {};
                        const generalSubjectAverage = classAverages[subject.key] || 0; // Genel ders ortalaması (deneme yönetiminde girilen)
                        
                        return {
                          exam: item.exam.title,
                          öğrenci: studentNet,
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
                                formatter={(value, name) => [`${Number(value).toFixed(1)}`, name]}
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
                                  <p className="font-semibold text-blue-600">{data.öğrenci.toFixed(1)}</p>
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
                  <h3 className="text-xs font-semibold text-gray-800 mb-2">📚 Ders Bazında Hedef Takibi</h3>
                  
                  {/* Hedef durumunu kontrol et */}
                  {(() => {
                    const targets = studentTargets || {};
                    console.log('Tab 6 - Hedefler:', targets);
                    const targetCount = Object.keys(targets).length;
                    
                    if (targetCount === 0) {
                      return (
                        <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                          <div className="text-4xl mb-2">🎯</div>
                          <h4 className="text-base font-medium text-gray-700 mb-2">Hedefler Henüz Belirlenmemiş</h4>
                          <p className="text-sm text-gray-500">
                            Panel kısmından ders bazında hedeflerinizi belirleyin
                          </p>
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

                {/* Genel Hedef Ulaşma Durumu Özeti */}
                <div className="bg-white rounded-lg shadow p-2">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">🏆 Genel Hedefe Ulaşma Durumu</h3>
                  
                  {(() => {
                    const targets = studentTargets || {};
                    const toplamHedef = Object.values(targets).reduce((sum, target) => sum + (target || 0), 0);
                    
                    // Eğer hiç hedef belirlenmemişse mesaj göster
                    if (toplamHedef === 0) {
                      return (
                        <div className="text-center py-6">
                          <div className="text-6xl mb-4">🎯</div>
                          <h4 className="text-sm font-medium text-gray-800 mb-2">Hedeflerinizi Belirleyin!</h4>
                          <p className="text-gray-600 mb-4">
                            Henüz hiç hedef belirlenmemiş. Panel kısmından hedeflerinizi belirleyin ve takip edin.
                          </p>
                          <p className="text-sm text-blue-600 font-medium">
                            📌 Panel → Hedef Belirleme menüsünden ders bazında hedeflerinizi girebilirsiniz.
                          </p>
                        </div>
                      );
                    }
                    
                    const tamamlanmaOrani = (latestNet / toplamHedef);
                    
                    return (
                      <div className="text-center">
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Genel Hedef: {toplamHedef.toFixed(1)} net
                          </p>
                          <p className="text-xs text-gray-500">
                            Mevcut Durum: {latestNet.toFixed(1)} net
                          </p>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                          <div 
                            className={`h-3 rounded-full ${tamamlanmaOrani >= 1 ? 'bg-green-500' : tamamlanmaOrani >= 0.8 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, tamamlanmaOrani * 100)}%` }}
                          ></div>
                        </div>
                        
                        <p className="text-sm font-bold">
                          {Math.round(Math.min(100, tamamlanmaOrani * 100))}% tamamlandı
                        </p>
                        
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-700">
                            {tamamlanmaOrani >= 1 ? 
                              '🎉 Tebrikler! Genel hedefe ulaştınız! Daha yüksek hedefler belirleyebilirsiniz.' :
                              tamamlanmaOrani >= 0.8 ?
                              `📈 Harika ilerleme! Hedefe ${(toplamHedef - latestNet).toFixed(1)} net kaldı.` :
                              `🎯 Hedefe ${(toplamHedef - latestNet).toFixed(1)} net kaldı. Çalışmaya devam edin!`}
                          </p>
                        </div>
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

              </div>
            )}

            {/* Tab 7: LGS Puan Hesaplama */}
            {activeTab === 7 && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">🧮 LGS Puan Hesaplama</h3>
                  <p className="text-gray-600 mb-4">LGS puanınızı hesaplamak için aşağıdaki aracı kullanabilirsiniz.</p>
                  
                  {/* LGS Puan Hesaplama Widget */}
                  <div className="w-full border rounded-lg p-4 bg-gray-50">
                    <div id="hn-lgs-puan-widget"></div>
                    <script src="https://e.hesaplama.net/lgs-puan.do?bgcolor=FFFFFF&tcolor=000000&hcolor=3B8CEE&rcolor=EEEEEE&tsize=n&tfamily=n&btype=s&bsize=2px&bcolor=EEEEEE" type="text/javascript"></script>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 8: Van 2025 LGS Lise Taban Puanları */}
            {activeTab === 8 && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">🎓 Van 2025 LGS Lise Taban Puanları</h3>
                  <p className="text-gray-600 mb-4">Van ilindeki liselerin 2025 LGS taban puanları burada yayınlanacak.</p>
                  
                  {/* Yakında eklenecek mesajı */}
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🚧</div>
                    <h4 className="text-lg font-medium text-gray-800 mb-2">İçerik Hazırlanıyor</h4>
                    <p className="text-gray-600 mb-4">
                      Van ilindeki liselerin 2025 LGS taban puanları yakında burada yayınlanacak.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-yellow-800 text-sm">
                        <strong>Bilgi:</strong> Taban puanlar MEB tarafından açıklandığında bu sayfa güncellenecektir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
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
