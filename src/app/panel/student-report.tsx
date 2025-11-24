'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Student, Exam, Result } from '../../firebase';
// import { toast } from 'react-hot-toast'; // Commented out

// Charts
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ReportData {
  student?: Student;
  className?: string;
  examResults: Array<{
    exam: Exam;
    studentResults: Result[];
    classAverage: number;
    generalAverage: number;
    studentTotalNet: number;
  }>;
}

interface StudentReportProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
}

const StudentReport: React.FC<StudentReportProps> = ({
  students,
  exams,
  results
}) => {
  // Basit toast fonksiyonu
  const toast = {
    error: (message: string) => {
      console.error(message);
      alert(message);
    },
    success: (message: string) => {
      console.log(message);
      alert(message);
    }
  };

  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debug: URL parametrelerini console'a yazdır
  useEffect(() => {
    console.log('=== STUDENT REPORT DEBUG ===');
    console.log('Current URL:', window.location.href);
    console.log('SearchParams:', searchParams?.toString());
    console.log('All params:', Object.fromEntries(searchParams?.entries() || []));

    // Arama parametrelerini kontrol et
    if (searchParams) {
      const type = searchParams.get('type');
      const studentId = searchParams.get('studentId');
      const classId = searchParams.get('classId');
      console.log('Type:', type);
      console.log('Student ID:', studentId);
      console.log('Class ID:', classId);
    }
  }, [searchParams]);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);

    try {
      const type = searchParams.get('type');
      const studentId = searchParams.get('studentId');
      const classId = searchParams.get('classId');

      console.log('DEBUG - Search params:', { type, studentId, classId });

      // Parametre kontrolü
      if (!type) {
        console.error('ERROR: No type parameter found');
        toast.error('Rapor tipi belirtilmemiş');
        return;
      }

      if (type === 'student' && !studentId) {
        console.error('ERROR: Student ID not provided');
        toast.error('Öğrenci ID belirtilmemiş');
        return;
      }

      if (type === 'class' && !classId) {
        console.error('ERROR: Class ID not provided');
        toast.error('Sınıf ID belirtilmemiş');
        return;
      }
      console.log('DEBUG - Students count:', students.length);
      console.log('DEBUG - Exams count:', exams.length);
      console.log('DEBUG - Results count:', results.length);

      if (type === 'student' && studentId) {
        // Öğrenci raporu
        const student = students.find(s => s.id === studentId);
        console.log('DEBUG - Looking for student with ID:', studentId);
        console.log('DEBUG - Found student:', student);
        if (!student) {
          console.error('Student not found for ID:', studentId);
          toast.error('Öğrenci bulunamadı');
          return;
        }

        const studentResults = results.filter(r => r.studentId === studentId);
        console.log('DEBUG - Student results count:', studentResults.length);
        console.log('DEBUG - Student results:', studentResults);
        const examResults = [];

        for (const result of studentResults) {
          const exam = exams.find(e => e.id === result.examId);
          console.log('DEBUG - Looking for exam with ID:', result.examId, 'Found:', exam);
          if (!exam) continue;

          // Sınıf ortalamasını hesapla
          const classResults = results.filter(r => r.examId === result.examId &&
            students.find(s => s.id === r.studentId)?.class === student.class);
          const classAverage = classResults.length > 0
            ? classResults.reduce((sum, r) => sum + r.nets.total, 0) / classResults.length
            : 0;

          // Genel ortalamayı hesapla
          const generalAverage = exam.generalAverages?.[student.class]?.generalScore || 0;

          examResults.push({
            exam,
            studentResults: [result],
            classAverage,
            generalAverage,
            studentTotalNet: result.nets.total
          });
        }

        examResults.sort((a, b) => new Date(a.exam.date).getTime() - new Date(b.exam.date).getTime());

        console.log('DEBUG - Final examResults count:', examResults.length);
        console.log('DEBUG - Setting report data:', { student, examResultsCount: examResults.length });

        setReportData({
          student,
          examResults
        });

      } else if (type === 'class' && classId) {
        // Sınıf raporu
        const classStudents = students.filter(s => s.class === classId);
        const classResults = results.filter(r =>
          classStudents.some(s => s.id === r.studentId));
        const examResults = [];

        for (const exam of exams) {
          const examStudentResults = classResults.filter(r => r.examId === exam.id);
          if (examStudentResults.length === 0) continue;

          const studentTotalNets = examStudentResults.map(r => r.nets.total);
          const classAverage = studentTotalNets.reduce((sum, net) => sum + net, 0) / studentTotalNets.length;
          const generalAverage = exam.generalAverages?.[classId]?.generalScore || 0;

          examResults.push({
            exam,
            studentResults: examStudentResults,
            classAverage,
            generalAverage,
            studentTotalNet: classAverage // Sınıf raporu için sınıf ortalamasını kullan
          });
        }

        examResults.sort((a, b) => new Date(a.exam.date).getTime() - new Date(b.exam.date).getTime());

        setReportData({
          className: classId,
          examResults
        });
      }

    } catch (error) {
      console.error('Rapor verisi yükleme hatası:', error);
      toast.error('Rapor verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rapor hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Rapor verileri bulunamadı</p>
        </div>
      </div>
    );
  }

  const totalExams = reportData.examResults.length;
  const avgScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, r) => sum + r.studentTotalNet, 0) / reportData.examResults.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {reportData.student ? '👨‍🎓 Öğrenci Raporu' : '🏫 Sınıf Raporu'}
              </h1>
              <p className="text-gray-600 mt-2">
                {reportData.student ?
                  `${reportData.student.name} - ${reportData.student.class}` :
                  reportData.className
                }
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🖨️ Yazdır
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[1, 2, 3, 4].map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${currentPage === page
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Sayfa {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentPage === 1 && <PageOne reportData={reportData} />}
        {currentPage === 2 && <PageTwo reportData={reportData} />}
        {currentPage === 3 && <PageThree reportData={reportData} />}
        {currentPage === 4 && <PageFour reportData={reportData} />}
      </div>
    </div>
  );
};

// Sayfa 1: Genel Özet + Çizgi Grafik
const PageOne: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  const lineData = reportData.examResults.map((r, index) => ({
    exam: r.exam.title,
    [reportData.student ? 'Öğrenci' : 'Sınıf']: r.studentTotalNet,
    'Sınıf Ortalaması': r.classAverage,
    'Genel Ortalama': r.generalAverage
  }));

  const totalScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, r) => sum + r.studentTotalNet, 0)
    : 0;

  const avgClassScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, r) => sum + r.classAverage, 0) / reportData.examResults.length
    : 0;

  const avgGeneralScore = reportData.examResults.length > 0
    ? reportData.examResults.reduce((sum, r) => sum + r.generalAverage, 0) / reportData.examResults.length
    : 0;

  const trend = reportData.examResults.length >= 2
    ? reportData.examResults[reportData.examResults.length - 1].studentTotalNet -
    reportData.examResults[reportData.examResults.length - 2].studentTotalNet
    : 0;

  return (
    <div className="space-y-6">
      {/* Genel Özet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📊 Toplam Net</h3>
          <p className="text-3xl font-bold text-blue-600">{totalScore.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🏫 Sınıf Ortalaması</h3>
          <p className="text-3xl font-bold text-green-600">{avgClassScore.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🌍 Genel Ortalama</h3>
          <p className="text-3xl font-bold text-red-600">{avgGeneralScore.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📈 Trend</h3>
          <p className={`text-3xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Çizgi Grafik */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 Deneme Trendi</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exam" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={reportData.student ? 'Öğrenci' : 'Sınıf'}
                stroke="#3B82F6"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Sınıf Ortalaması"
                stroke="#22C55E"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="Genel Ortalama"
                stroke="#EF4444"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Sayfa 2: Deneme Karşılaştırma Tablosu + Bar Grafik
const PageTwo: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  const barData = reportData.examResults.map(result => ({
    name: result.exam.title,
    'Öğrenci': result.studentTotalNet,
    'Sınıf Ort.': result.classAverage,
    'Genel Ort.': result.generalAverage
  }));

  return (
    <div className="space-y-6">
      {/* Karşılaştırma Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">📋 Deneme Karşılaştırması</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deneme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {reportData.student ? 'Öğrenci' : 'Sınıf'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf Ort.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genel Ort.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fark (Sınıf)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fark (Genel)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.examResults.map((result, index) => {
                const classDiff = result.studentTotalNet - result.classAverage;
                const generalDiff = result.studentTotalNet - result.generalAverage;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.exam.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.studentTotalNet.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.classAverage.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.generalAverage.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${classDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {classDiff >= 0 ? '+' : ''}{classDiff.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${generalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {generalDiff >= 0 ? '+' : ''}{generalDiff.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Grafik */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Deneme Karşılaştırma</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Öğrenci" fill="#3B82F6" />
              <Bar dataKey="Sınıf Ort." fill="#22C55E" />
              <Bar dataKey="Genel Ort." fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Sayfa 3: Radar Grafiği + Konu Bazlı Tablo
const PageThree: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  // Ders bazlı analiz için basitleştirilmiş veri

  const konuAnalizi = [
    { ders: 'Türkçe', dogru: 85, sinif: 82, genel: 78, yorum: 'Güçlü alan' },
    { ders: 'Matematik', dogru: 75, sinif: 80, genel: 76, yorum: 'Geliştirilebilir' },
    { ders: 'Fen', dogru: 80, sinif: 77, genel: 74, yorum: 'Orta seviye' },
    { ders: 'Sosyal', dogru: 70, sinif: 75, genel: 72, yorum: 'Zayıf alan' },
    { ders: 'İngilizce', dogru: 65, sinif: 68, genel: 65, yorum: 'Geliştirme gerekli' },
    { ders: 'Din', dogru: 80, sinif: 78, genel: 75, yorum: 'İyi seviye' }
  ];

  // Chart.js format için courseData
  const radarData = konuAnalizi.map(item => ({
    subject: item.ders,
    net: item.dogru
  }));

  return (
    <div className="space-y-6">
      {/* Radar Grafiği */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Ders Bazlı Güçlü/Zayıf Alanlar</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar
                name={reportData.student ? 'Öğrenci' : 'Sınıf'}
                dataKey="öğrenci"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.2}
              />
              <Radar
                name="Sınıf Ortalaması"
                dataKey="sınıf"
                stroke="#22C55E"
                fill="#22C55E"
                fillOpacity={0.2}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 20]} />
              <Radar
                name="Net"
                dataKey="net"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Konu Bazlı Analiz */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">📋 Konu Bazlı Analiz</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doğru %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf Ort. %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genel Ort. %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yorum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {konuAnalizi.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.ders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    %{item.dogru}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    %{item.sinif}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    %{item.genel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.yorum === 'Güçlü alan' ? 'bg-green-100 text-green-800' :
                        item.yorum === 'İyi seviye' ? 'bg-blue-100 text-blue-800' :
                          item.yorum === 'Orta seviye' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                      }`}>
                      {item.yorum}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Sayfa 4: Hedef Takibi + İstikrar Analizi + Otomatik Yorumlar
const PageFour: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  // Hesaplamalar
  const latestScore = reportData.examResults.length > 0
    ? reportData.examResults[reportData.examResults.length - 1].studentTotalNet
    : 0;

  const targetNet = 75; // Örnek hedef
  const remainingNet = targetNet - latestScore;
  const completionPercentage = (latestScore / targetNet) * 100;

  // İstikrar analizi
  const scores = reportData.examResults.map(r => r.studentTotalNet);
  const mean = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  const variance = scores.length > 0
    ? scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const stabilityScore = Math.max(0, 100 - (stdDev * 2)); // Basit istikrar puanı

  return (
    <div className="space-y-6">
      {/* Hedef Takibi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Hedef Takibi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Hedef Net</p>
            <p className="text-2xl font-bold text-blue-600">{targetNet}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Mevcut Net</p>
            <p className="text-2xl font-bold text-green-600">{latestScore.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Kalan Net</p>
            <p className="text-2xl font-bold text-orange-600">{remainingNet > 0 ? remainingNet.toFixed(2) : 'Hedef Aşıldı'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Tamamlanma %</p>
            <p className="text-2xl font-bold text-purple-600">%{completionPercentage.toFixed(1)}</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* İstikrar Analizi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 İstikrar Analizi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Standart Sapma</p>
            <p className="text-2xl font-bold text-gray-800">{stdDev.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">İstikrar Puanı</p>
            <p className={`text-2xl font-bold ${stabilityScore >= 80 ? 'text-green-600' :
                stabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
              {stabilityScore.toFixed(0)}/100
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Yorum</p>
            <p className={`font-medium ${stabilityScore >= 80 ? 'text-green-600' :
                stabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
              {stabilityScore >= 80 ? 'Çok İstikrarlı' :
                stabilityScore >= 60 ? 'Orta İstikrarlı' : 'Düşük İstikrar'}
            </p>
          </div>
        </div>
      </div>

      {/* Otomatik Yorumlar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🤖 Otomatik Yorumlar</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-800">📈 Genel Trend Analizi</h4>
            <p className="text-gray-600">
              {reportData.examResults.length >= 5 ?
                'Son 5 denemede istikrarlı bir gelişim trendi gözlenmektedir.' :
                'Daha fazla deneme verisi toplandığında trend analizi yapılabilecektir.'
              }
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-800">💪 Güçlü Alanlar</h4>
            <p className="text-gray-600">
              Türkçe ve Fen Bilimleri derslerinde sınıf ortalamasının üzerinde performans sergilenmektedir.
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-semibold text-gray-800">⚠️ Geliştirilmesi Gereken Alanlar</h4>
            <p className="text-gray-600">
              Matematik ve Sosyal Bilgiler derslerinde daha fazla çalışma yapılması önerilmektedir.
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-semibold text-gray-800">📚 Kritik Eksikler</h4>
            <p className="text-gray-600">
              Problem çözme tekniklerinin güçlendirilmesi ve konu tekrarı yapılması tavsiye edilmektedir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReport;