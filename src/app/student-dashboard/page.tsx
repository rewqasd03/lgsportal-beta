'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { Student, Exam, Result, getStudentTargets, getStudentScoreTarget, incrementStudentViewCount } from '../../firebase';
import { initializeApp } from 'firebase/app';
import { pdf } from '@react-pdf/renderer';
import html2canvas from 'html2canvas';
import StudentReportPDF from './StudentReportPDF';

// 📝 BRANS DENEMELERİ TAB COMPONENT
const BransDenemeleriTab = ({ studentId }: { studentId: string }) => {
  const [bransSonuclari, setBransSonuclari] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDers, setSelectedDers] = useState<string>('');
  const [stats, setStats] = useState<{
    totalExams: number;
    averageNet: number;
    maxNet: number;
    minNet: number;
  }>({ totalExams: 0, averageNet: 0, maxNet: 0, minNet: 0 });

  // Ders seçenekleri
  const dersler = [
    { key: 'turkce', name: 'Türkçe', color: '#10B981' },
    { key: 'matematik', name: 'Matematik', color: '#F59E0B' },
    { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6' },
    { key: 'sosyal', name: 'Sosyal Bilgiler', color: '#8B5CF6' },
    { key: 'ingilizce', name: 'İngilizce', color: '#EF4444' },
    { key: 'din', name: 'Din Kültürü', color: '#F97316' }
  ];

  useEffect(() => {
    loadBransDenemesiSonuclari();
  }, [studentId]);

  const loadBransDenemesiSonuclari = async () => {
    try {
      const { getBransDenemesiSonuclariByStudent, getBransDenemeleri } = await import('../../firebase');
      const sonuclar = await getBransDenemesiSonuclariByStudent(studentId);

      // Deneme bilgilerini al
      const denemeler = await getBransDenemeleri();

      // Sonuçları deneme bilgileriyle birleştir
      const sonuclarWithDetails = sonuclar.map(sonuc => {
        const deneme = denemeler.find(d => d.id === sonuc.denemeId);
        return {
          ...sonuc,
          dersAdi: deneme?.ders || 'Bilinmeyen Ders',
          soruSayisi: deneme?.soruSayisi || 0
        };
      });

      setBransSonuclari(sonuclarWithDetails);

      // İstatistikleri hesapla
      if (sonuclar.length > 0) {
        const nets = sonuclar.map(s => s.net);
        setStats({
          totalExams: sonuclar.length,
          averageNet: Math.round(nets.reduce((a, b) => a + b, 0) / nets.length * 10) / 10,
          maxNet: Math.max(...nets),
          minNet: Math.min(...nets)
        });
      }
    } catch (error) {
      console.error('Branş denemesi sonuçlarını yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Derse göre filtrele
  const filteredSonuclari = selectedDers
    ? bransSonuclari.filter(s => s.dersAdi === selectedDers)
    : bransSonuclari;

  // Tarihe göre sırala (en son en üstte)
  const sortedSonuclari = filteredSonuclari.sort((a, b) =>
    new Date(b.tarih).getTime() - new Date(a.tarih).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2">📝 Branş Denemeleri</h2>
        <p className="text-indigo-100">Katıldığınız branş denemelerini ve sonuçlarınızı görüntüleyin</p>
      </div>

      {/* İstatistikler */}
      {stats.totalExams > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="text-sm text-gray-500">Toplam Deneme</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.totalExams}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">Ortalama Net</div>
            <div className="text-2xl font-bold text-green-600">{stats.averageNet}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">En Yüksek Net</div>
            <div className="text-2xl font-bold text-blue-600">{stats.maxNet}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-500">En Düşük Net</div>
            <div className="text-2xl font-bold text-orange-600">{stats.minNet}</div>
          </div>
        </div>
      )}

      {/* Ders Filtresi */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">📚 Ders Filtresi</label>
        <select
          value={selectedDers}
          onChange={(e) => setSelectedDers(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Tüm Dersler</option>
          {dersler.map(ders => (
            <option key={ders.key} value={ders.key}>{ders.name}</option>
          ))}
        </select>
      </div>

      {/* Sonuç Listesi */}
      {sortedSonuclari.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Henüz Branş Denemesi Yok</h3>
          <p className="text-gray-500">Öğretmeniniz branş denemesi eklediğinde burada görünecektir.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ders</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Tarih</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Doğru</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Yanlış</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Boş</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Net</th>
              </tr>
            </thead>
            <tbody>
              {sortedSonuclari.map((sonuc, index) => {
                const ders = dersler.find(d => d.key === sonuc.ders);
                return (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2"
                          style={{ backgroundColor: ders?.color || '#6366f1' }}
                        >
                          {ders?.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-gray-800">{ders?.name || sonuc.dersAdi}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {new Date(sonuc.tarih).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                        {sonuc.dogru}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                        {sonuc.yanlis}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                        {sonuc.bos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-lg font-bold ${sonuc.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                        {sonuc.net.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bilgilendirme */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h4 className="font-semibold text-indigo-800 mb-2">💡 Bilgi</h4>
        <ul className="text-sm text-indigo-700 space-y-1">
          <li>• Net hesaplaması: Net = Doğru - (Yanlış / 3)</li>
          <li>• Branş denemeleri öğretmeniniz tarafından eklenir.</li>
          <li>• Sonuçlarınızı düzenli olarak takip edebilirsiniz.</li>
        </ul>
      </div>
    </div>
  );
};

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

// Sınıfa göre dersleri getir
const getSubjectsByClass = (studentClass: string) => {
  const SUBJECTS_CONFIG: {[key: string]: {key: string, name: string, color: string, emoji: string}[]} = {
    '2-A': [
      { key: 'turkce', name: 'Türkçe', color: '#10B981', emoji: '📖' },
      { key: 'matematik', name: 'Matematik', color: '#F59E0B', emoji: '🔢' },
      { key: 'hayat', name: 'Hayat Bilgisi', color: '#8B5CF6', emoji: '🌱' },
      { key: 'ingilizce', name: 'İngilizce', color: '#EF4444', emoji: '🗣️' },
    ],
    '3-A': [
      { key: 'turkce', name: 'Türkçe', color: '#10B981', emoji: '📖' },
      { key: 'matematik', name: 'Matematik', color: '#F59E0B', emoji: '🔢' },
      { key: 'hayat', name: 'Hayat Bilgisi', color: '#8B5CF6', emoji: '🌱' },
      { key: 'ingilizce', name: 'İngilizce', color: '#EF4444', emoji: '🗣️' },
      { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6', emoji: '🔬' },
    ],
    '4-A': [
      { key: 'turkce', name: 'Türkçe', color: '#10B981', emoji: '📖' },
      { key: 'matematik', name: 'Matematik', color: '#F59E0B', emoji: '🔢' },
      { key: 'sosyal', name: 'Sosyal Bilgiler', color: '#8B5CF6', emoji: '🌍' },
      { key: 'ingilizce', name: 'İngilizce', color: '#EF4444', emoji: '🗣️' },
      { key: 'din', name: 'Din Kültürü', color: '#F97316', emoji: '🕌' },
      { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6', emoji: '🔬' },
    ]
  };
  return SUBJECTS_CONFIG[studentClass] || SUBJECTS_CONFIG['4-A'];
};

// Sınıfa göre net hesaplaması için ders listesi
const getNetSubjectsByClass = (studentClass: string) => {
  const subjects = getSubjectsByClass(studentClass);
  return subjects.map(s => s.key);
};

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
  const [allResultsData, setAllResultsData] = useState<any[]>([]);
  const [allStudentsData, setAllStudentsData] = useState<any[]>([]);
  
  // Chart ref'leri
  const netChartRef = useRef<HTMLDivElement>(null);
  
  // PDF state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();

  // PDF Oluşturma Fonksiyonu
  const generatePDF = async () => {
    if (!reportData) return;
    
    setIsGeneratingPDF(true);
    setPdfProgress('Grafikler hazırlanıyor...');
    
    try {
      let chartImage = null;
      
      if (netChartRef.current) {
        try {
          const canvas = await html2canvas(netChartRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          chartImage = canvas.toDataURL('image/png');
        } catch (err) {
          console.warn('Chart yakalama hatası:', err);
        }
      }
      
      setPdfProgress('PDF oluşturuluyor...');
      
      const blob = await pdf(
        <StudentReportPDF 
          reportData={reportData} 
          chartImage={chartImage}
        />
      ).toBlob();
      
      setPdfProgress('İndirme hazırlanıyor...');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LGS_Rapor_${reportData.student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setPdfProgress('Tamamlandı!');
      
      setTimeout(() => {
        setIsGeneratingPDF(false);
        setPdfProgress('');
      }, 1000);
      
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      setIsGeneratingPDF(false);
      setPdfProgress('');
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };
  
  // URL parametresinden studentId al
  useEffect(() => {
    const urlStudentId = searchParams.get('studentId');
    
    if (urlStudentId && urlStudentId !== studentId) {
      setStudentId(urlStudentId);
      setError('');
    } else if (!urlStudentId && autoLoadAttempts === 0) {
      const timer = setTimeout(() => {
        setAutoLoadAttempts(1);
        const currentUrlStudentId = searchParams.get('studentId');
        if (currentUrlStudentId) {
          setStudentId(currentUrlStudentId);
        } else {
          setError('Öğrenci ID bulunamadı.');
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

    try {
      const studentDocRef = doc(db, 'students', studentId);
      const studentSnapshot = await getDoc(studentDocRef);
      
      if (!studentSnapshot.exists()) {
        throw new Error('Öğrenci bulunamadı');
      }

      const studentData = { ...studentSnapshot.data(), id: studentSnapshot.id } as Student;

      const examsQuery = query(collection(db, 'exams'), orderBy('date', 'asc'));
      const examsSnapshot = await getDocs(examsQuery);
      const examsData = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));

      const resultsSnapshot = await getDocs(collection(db, 'results'));
      const resultsData = resultsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
      setAllResultsData(resultsData);

      const allStudentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = allStudentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setAllStudentsData(studentsData);

      const studentResults = resultsData.filter(r => r.studentId === studentId);
      
      // 0 puan alan denemeleri filtrele
      const validStudentResults = studentResults.filter(result => {
        const score = typeof result.scores?.puan === 'string' ? parseFloat(result.scores.puan) :
                     typeof result.puan === 'number' ? result.puan : 
                     (typeof result.totalScore === 'number' ? result.totalScore : 0);
        return score > 0;
      });

      const classResults = resultsData.filter(r => {
        const student = studentsData.find(s => s.id === r.studentId);
        return student && student.class === studentData.class;
      });
      
      const classExamIds = new Set(classResults.map(r => r.examId).filter(examId => 
        examsData.find(e => e.id === examId)
      ));
      
      const examResults = [];

      for (const examId of Array.from(classExamIds)) {
        const exam = examsData.find(e => e.id === examId);
        
        if (!exam) continue;
        
        const studentResult = validStudentResults.find(r => r.examId === examId);
        
        if (!studentResult) {
          examResults.push({
            exam,
            studentResults: [],
            classAverage: 0,
            classAverageScore: 0,
            generalAverage: 0,
            generalAverageScore: 0,
            studentTotalNet: 0,
            studentTotalScore: 0
          });
          continue;
        }

        const classResultsFiltered = classResults.filter(r => r.examId === exam.id && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class);
        const classAverage = classResultsFiltered.length > 0 
          ? classResultsFiltered.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / classResultsFiltered.length
          : 0;

        const classResultsWithScore = classResults.filter(r => r.examId === exam.id && 
          studentsData.find(s => s.id === r.studentId)?.class === studentData.class);
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

        let generalAverageNet = classAverage;
        let generalAverageScoreNet = classAverageScore;
        
        if (exam.generalAverages && exam.generalAverages[studentData.class]) {
          const classAverages = exam.generalAverages[studentData.class];
          const dersNets = [
            (classAverages?.turkce) || 0,
            (classAverages?.matematik) || 0,
            (classAverages?.fen) || 0,
            (classAverages?.sosyal) || 0,
            (classAverages?.din) || 0,
            (classAverages?.ingilizce) || 0
          ];
          generalAverageNet = dersNets.reduce((sum, net) => sum + net, 0);
          if (classAverages.generalScore) {
            generalAverageScoreNet = classAverages.generalScore;
          }
        }

        examResults.push({
          exam,
          studentResults: [studentResult],
          classAverage: classAverage,
          classAverageScore: classAverageScore,
          generalAverage: generalAverageNet,
          generalAverageScore: generalAverageScoreNet,
          studentTotalNet: studentResult.nets?.total || 0,
          studentTotalScore: typeof studentResult.scores?.puan === 'string' ? parseFloat(studentResult.scores.puan) :
                           typeof studentResult.puan === 'number' ? studentResult.puan : 
                           (typeof studentResult.totalScore === 'number' ? studentResult.totalScore : 0)
        });
      }

      examResults.sort((a, b) => new Date(a.exam.date).getTime() - new Date(b.exam.date).getTime());
      
      const targetsData = await getStudentTargets(studentId) || {};
      const scoreTargetData = await getStudentScoreTarget(studentId);
      
      setReportData({
        student: studentData,
        examResults,
        studentTargets: targetsData
      });
      
      setStudentTargets(targetsData);
      setStudentScoreTarget(scoreTargetData || 450);
      
    } catch (error: any) {
      console.error('Veri yükleme hatası:', error);
      setError('Veri yükleme hatası: ' + error.message);
    } finally {
      setLoading(false);
      
      if (studentId && !error) {
        try {
          await incrementStudentViewCount(studentId);
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
        </div>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
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

  const examResultsWithScores = reportData.examResults.filter(item => item.studentTotalNet > 0);
  const totalNet = examResultsWithScores.reduce((sum, item) => sum + item.studentTotalNet, 0);
  const avgNet = examResultsWithScores.length > 0 ? totalNet / examResultsWithScores.length : 0;
  
  const classAverageNet = reportData.examResults.length > 0 
    ? reportData.examResults.reduce((sum, item) => sum + (item.classAverage || 0), 0) / reportData.examResults.length
    : 0;
  
  const studentAverageScore = examResultsWithScores.length > 0
    ? examResultsWithScores.reduce((sum, item) => sum + (item.studentTotalScore || 0), 0) / examResultsWithScores.length
    : 0;
  
  const classAverageScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, item) => sum + (item.classAverageScore || 0), 0) / reportData.examResults.length
    : 0;
  
  const latestNet = examResultsWithScores.length > 0 ? examResultsWithScores[examResultsWithScores.length - 1]?.studentTotalNet || 0 : 0;
  const previousNet = examResultsWithScores.length > 1 ? examResultsWithScores[examResultsWithScores.length - 2]?.studentTotalNet || 0 : 0;
  const improvement = latestNet - previousNet;
  
  // Son öğrenci puanını hesapla
  const calculateLatestStudentScore = () => {
    if (!reportData.examResults || reportData.examResults.length === 0) return 0;

    const sortedResults = [...reportData.examResults].sort((a, b) => 
      new Date(b.exam.date).getTime() - new Date(a.exam.date).getTime()
    );

    const latestResult = sortedResults[0];
    const studentResult = latestResult.studentResults[0];
    
    if (!studentResult) return 0;
    
    let totalScore = studentResult.puan;
    if (totalScore && typeof totalScore === 'string') {
      totalScore = parseFloat(totalScore);
    }
    if (!totalScore && studentResult.scores?.puan) {
      totalScore = studentResult.scores.puan;
      if (typeof totalScore === 'string') {
        totalScore = parseFloat(totalScore);
      }
    }
    if (!totalScore && studentResult.totalScore) {
      totalScore = studentResult.totalScore;
      if (typeof totalScore === 'string') {
        totalScore = parseFloat(totalScore);
      }
    }
    if (!totalScore && studentResult.nets?.total) {
      totalScore = studentResult.nets.total * 5;
    }
    
    return Math.round(totalScore || 0);
  };

  const latestScore = calculateLatestStudentScore();
  
  const netChartData = reportData.examResults.map((item) => ({
    exam: item.exam.title,
    öğrenci: item.studentTotalNet > 0 ? item.studentTotalNet : null,
    sınıf: item.classAverage,
    genel: item.generalAverage
  }));
  
  const studentClass = reportData?.student?.class || '4-A';
  const subjects = getSubjectsByClass(studentClass);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
            <div className="flex items-center gap-2">
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PDF İndir
              </button>
              <button
                onClick={() => router.push('/ogrenci')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Ana Sayfa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Öğrenci Bilgileri Kartı */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-3 gap-4">
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
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 px-4 border-b-2 font-medium text-xs whitespace-nowrap ${
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
                      {tab === 6 && '🎯 Hedef Takibi & Lise Tercih'}
                      {tab === 7 && '🧮 LGS Puan Hesaplama'}
                      {tab === 8 && '📖 Kitap Sınavı'}
                      {tab === 9 && '🎓 Lise Taban Puanları'}
                      {tab === 10 && '📝 Ödev Takibi'}
                      {tab === 11 && '📄 PDF İndir'}
                      {tab === 12 && '📝 Branş Denemeleri'}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Ortalama Net</h3>
                    <p className="text-sm font-bold text-blue-600">{(avgNet || 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-600 mt-1">Sınıf: {(classAverageNet || 0).toFixed(1)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Ortalama Puan</h3>
                    <p className="text-sm font-bold text-green-600">{(studentAverageScore || 0).toFixed(0)}</p>
                    <p className="text-xs text-gray-600 mt-1">Sınıf: {(classAverageScore || 0).toFixed(0)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Son Net</h3>
                    <p className="text-sm font-bold text-purple-600">{(latestNet || 0).toFixed(1)}</p>
                    <p className={`text-xs mt-1 ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(improvement || 0) >= 0 ? '+' : ''}{(improvement || 0).toFixed(1)} Değişim
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Son Puan</h3>
                    <p className="text-sm font-bold text-orange-600">{(latestScore || 0).toFixed(0)}</p>
                  </div>
                </div>

                {/* Net Gelişim Trendi */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-xs font-semibold text-gray-800 mb-4">Net Gelişim Trendi</h3>
                  <div ref={netChartRef}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={netChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="exam" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis domain={[0, 90]} />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, '']} />
                        <Legend />
                        <Line isAnimationActive={false} type="monotone" dataKey="öğrenci" stroke="#3B82F6" strokeWidth={2} name="Öğrenci" dot={{ fill: '#3B82F6', r: 4 }} />
                        <Line isAnimationActive={false} type="monotone" dataKey="sınıf" stroke="#10B981" strokeWidth={1} strokeDasharray="5 5" name="Sınıf Ortalaması" />
                        <Line isAnimationActive={false} type="monotone" dataKey="genel" stroke="#F59E0B" strokeWidth={1} strokeDasharray="3 3" name="Genel Ortalama" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Deneme Tablosu */}
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 font-semibold text-gray-700">Deneme</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Netiniz</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Sınıf Ort.</th>
                        <th className="text-center p-3 font-semibold text-gray-700">Genel Ort.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.examResults.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-3">{item.exam.title}</td>
                          <td className="p-3 text-center">{item.studentTotalNet > 0 ? item.studentTotalNet.toFixed(1) : '-'}</td>
                          <td className="p-3 text-center">{item.classAverage.toFixed(1)}</td>
                          <td className="p-3 text-center">{item.generalAverage.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xs font-semibold text-gray-800 mb-4">Net Gelişim Trendi</h3>
                <div ref={netChartRef}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={netChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 90]} />
                      <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, '']} />
                      <Legend />
                      <Line isAnimationActive={false} type="monotone" dataKey="öğrenci" stroke="#3B82F6" strokeWidth={2} name="Öğrenci" dot={{ fill: '#3B82F6', r: 4 }} />
                      <Line isAnimationActive={false} type="monotone" dataKey="sınıf" stroke="#10B981" strokeWidth={1} strokeDasharray="5 5" name="Sınıf Ortalaması" />
                      <Line isAnimationActive={false} type="monotone" dataKey="genel" stroke="#F59E0B" strokeWidth={1} strokeDasharray="3 3" name="Genel Ortalama" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-xs font-semibold text-gray-800 mb-4">Puan Gelişim Trendi</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={reportData.examResults.map(item => ({
                    exam: item.exam.title,
                    öğrenci: item.studentTotalScore > 0 ? item.studentTotalScore : null,
                    sınıf: item.classAverageScore,
                    genel: item.generalAverageScore
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="exam" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 500]} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(0)}`, '']} />
                    <Legend />
                    <Line isAnimationActive={false} type="monotone" dataKey="öğrenci" stroke="#8B5CF6" strokeWidth={2} name="Öğrenci Puanı" dot={{ fill: '#8B5CF6', r: 4 }} />
                    <Line isAnimationActive={false} type="monotone" dataKey="sınıf" stroke="#10B981" strokeWidth={1} strokeDasharray="5 5" name="Sınıf Ortalama Puan" />
                    <Line isAnimationActive={false} type="monotone" dataKey="genel" stroke="#F59E0B" strokeWidth={1} strokeDasharray="3 3" name="Genel Ortalama Puan" />
                  </LineChart>
                </ResponsiveContainer>
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
                                      <span className="text-xs text-gray-600">-/-/-</span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs font-bold text-blue-600">
                                        {studentSubjectNet.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-gray-600">-</span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-orange-600 font-medium">-</span>
                                    </td>
                                    <td className="px-1.5 py-1.5 text-center">
                                      <span className="text-xs text-gray-400">-</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Genel Deneme Listesi */}
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.examResults.map((result, index) => (
                          <tr 
                            key={result.exam.id} 
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedExamId === result.exam.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => setSelectedExamId(result.exam.id)}
                          >
                            <td className="px-0.5 py-0.25 text-[8px] font-medium text-gray-900">
                              {result.exam.title}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Ders Bazında Gelişim */}
            {activeTab === 5 && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">🎯 Ders Bazında Gelişim</h3>
                  <p className="text-xs text-gray-600">Derslerinizdeki gelişimi takip edin.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => {
                    const subjectResults = reportData.examResults
                      .filter(item => item.studentResults[0]?.nets?.[subject.key] > 0)
                      .map(item => ({
                        date: item.exam.date,
                        net: item.studentResults[0]?.nets?.[subject.key] || 0
                      }));
                    
                    const avgNet = subjectResults.length > 0 
                      ? subjectResults.reduce((sum, r) => sum + r.net, 0) / subjectResults.length 
                      : 0;
                    
                    return (
                      <div key={subject.key} className="bg-white rounded-lg shadow p-4">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: subject.color }}></div>
                          <h4 className="font-medium text-gray-800">{subject.name}</h4>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: subject.color }}>{avgNet.toFixed(1)}</div>
                        <div className="text-xs text-gray-500">Ortalama Net</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 6: Hedef Takibi & Lise Tercih */}
            {activeTab === 6 && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 Hedef Takibi ve Lise Tercih Önerileri</h3>
                  <p className="text-sm text-gray-600 mb-4">LGS puanınıza göre hedeflediğiniz liselere yakınsama durumunuzu takip edin.</p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">Hedef Puanınız</h4>
                    <div className="text-3xl font-bold text-blue-600">{studentScoreTarget}</div>
                    <p className="text-xs text-blue-700 mt-1">Son Puan: {latestScore}</p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Durum</h4>
                    <p className="text-sm text-green-700">
                      {latestScore >= studentScoreTarget 
                        ? 'Tebrikler! Hedef puanınıza ulaştınız.' 
                        : `Hedefinize ulaşmak için ${studentScoreTarget - latestScore} puan daha neediyorsunuz.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 7: LGS Puan Hesaplama */}
            {activeTab === 7 && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🧮 LGS Puan Hesaplama</h3>
                  <p className="text-sm text-gray-600 mb-4">LGS puanınızı hesaplayın.</p>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-2">Mevcut Puanınız</h4>
                    <div className="text-3xl font-bold text-purple-600">{latestScore}</div>
                    <p className="text-xs text-purple-700 mt-1">Ortalama: {studentAverageScore.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 8: Kitap Sınavı */}
            {activeTab === 8 && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📖 Kitap Sınavı</h3>
                  <p className="text-sm text-gray-600 mb-4">Okuduğunuz kitaplar için sınav sonuçlarınız.</p>
                  
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-500">Kitap sınavı verisi bulunmuyor.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 9: Lise Taban Puanları */}
            {activeTab === 9 && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">🎓 Lise Taban Puanları</h3>
                  <p className="text-sm text-gray-600 mb-4">2025 LGS taban puanları.</p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-800 mb-2">Van İli Taban Puanları</h4>
                    <p className="text-sm text-blue-700">Fen Liseleri: 400+ puan</p>
                    <p className="text-sm text-blue-700">Anadolu Liseleri: 350+ puan</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 10: Ödev Takibi */}
            {activeTab === 10 && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Ödev Takibi</h3>
                  <p className="text-sm text-gray-600 mb-4">Ödevlerinizi takip edin.</p>
                  
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <p className="text-gray-500">Ödev verisi bulunmuyor.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 11 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
                  <h2 className="text-2xl font-bold mb-2">📄 PDF Rapor İndir</h2>
                  <p className="text-blue-100">Öğrenci performans raporunu PDF olarak indirebilirsiniz</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-4">📋 Rapor İçeriği</h3>
                  <ul className="space-y-2 text-blue-700">
                    <li className="flex items-center"><span className="mr-2">✓</span>Genel performans özeti ve istatistikler</li>
                    <li className="flex items-center"><span className="mr-2">✓</span>Net gelişim trendi grafiği</li>
                    <li className="flex items-center"><span className="mr-2">✓</span>Deneme geçmişi tablosu</li>
                    <li className="flex items-center"><span className="mr-2">✓</span>Ders bazında gelişim analizi</li>
                    <li className="flex items-center"><span className="mr-2">✓</span>Hedef takibi ve lise önerileri</li>
                  </ul>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <button
                    onClick={generatePDF}
                    disabled={isGeneratingPDF || !reportData}
                    className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all ${
                      isGeneratingPDF
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {isGeneratingPDF ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {pdfProgress || 'PDF Oluşturuluyor...'}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        📥 PDF İndir
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 12 && (
              <BransDenemeleriTab studentId={studentId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
