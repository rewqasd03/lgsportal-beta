"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface Student {
  id: string;
  name: string;
  class: string;
  number: string;
  viewCount: number;
  lastViewDate: string;
  createdAt: string;
}

interface Result {
  id: string;
  studentId: string;
  examId: string;
  nets: {
    turkce?: number;
    matematik?: number;
    fen?: number;
    sosyal?: number;
    din?: number;
    ingilizce?: number;
    total: number;
  };
  scores?: any;
  puan?: number;
  totalScore?: number;
  createdAt: string;
}

interface Exam {
  id: string;
  title: string;
  date: string;
  description?: string;
  classes?: string[];
  generalAverages?: { [className: string]: { [key: string]: any; generalScore?: number } };
}

interface PerformanceComparison {
  studentId: string;
  studentName: string;
  averageNet: number;
  bestPerformance: number;
  worstPerformance: number;
  totalExams: number;
  classRank: number;
  // Puan verileri
  averageScore: number;
  bestScore: number;
  worstScore: number;
  subjectAverages: {
    turkce: number;
    matematik: number;
    fen: number;
    sosyal: number;
  };
}

interface AnalyticsTabProps {
  students: Student[];
  results: Result[];
  exams: Exam[];
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ students, results, exams }) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [viewType, setViewType] = useState<'overview' | 'comparison' | 'trends'>('overview');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const router = useRouter();

  // Exams verisini kontrol et
  console.log('🔍 Exams debug:', {
    totalExams: exams.length,
    examsWithTitle: exams.filter(e => e.title && e.title.trim()).length,
    sampleTitles: exams.slice(0, 5).map(e => ({ id: e.id, title: e.title }))
  });

  // Sınıf değişince öğrenci seçimini temizle
  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    setSelectedStudent(''); // Öğrenci seçimini temizle
  };
  const [trendsViewType, setTrendsViewType] = useState<'net' | 'puan'>('net');

  // Gerçek exam başlığını al
  const getExamTitle = (examId: string, fallbackIndex: number) => {
    const exam = exams.find(e => e.id === examId);
    if (exam && exam.title && exam.title.trim()) {
      return exam.title.trim();
    }
    // Eğer exam başlığı yoksa tarihe göre fallback
    const examDate = new Date().toLocaleDateString('tr-TR');
    return `Deneme ${fallbackIndex + 1} (${examDate})`;
  };

  // Performans verilerini hesapla
  const performanceData = useMemo((): PerformanceComparison[] => {
    return students.map(student => {
      const studentResults = results.filter(result => result.studentId === student.id);
      
      // Sadece gerçek denemeye katılan sonuçları al (0 puanlı denemeler hariç)
      const validStudentResults = studentResults.filter(result => {
        const net = result.nets?.total || 0;
        const score = result.scores?.puan ? parseFloat(result.scores.puan) : 
                     (result.puan || result.totalScore || 0);
        return net > 0 || score > 0;
      });
      
      // Eğer öğrencinin hiç gerçek denemesi yoksa, boş veri döndür
      if (validStudentResults.length === 0) {
        return {
          studentId: student.id,
          studentName: student.name,
          averageNet: 0,
          bestPerformance: 0,
          worstPerformance: 0,
          totalExams: 0,
          classRank: 0,
          // Puan verileri
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          subjectAverages: { turkce: 0, matematik: 0, fen: 0, sosyal: 0 }
        };
      }

      const nets = validStudentResults.map(result => result.nets.total);
      const averageNet = nets.reduce((sum, net) => sum + net, 0) / nets.length;
      const bestPerformance = Math.max(...nets);
      const worstPerformance = Math.min(...nets);

      // Puan verilerini hesapla
      const scores = validStudentResults.map(result => {
        const score = result.scores?.puan ? parseFloat(result.scores.puan) : (result.puan || 0);
        return score;
      });
      const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const worstScore = scores.length > 0 ? Math.min(...scores) : 0;



      // Konu bazlı ortalamalar
      const subjectAverages = {
        turkce: validStudentResults.reduce((sum, result) => sum + ((result.nets?.turkce) || 0), 0) / validStudentResults.length,
        matematik: validStudentResults.reduce((sum, result) => sum + ((result.nets?.matematik) || 0), 0) / validStudentResults.length,
        fen: validStudentResults.reduce((sum, result) => sum + ((result.nets?.fen) || 0), 0) / validStudentResults.length,
        sosyal: validStudentResults.reduce((sum, result) => sum + ((result.nets?.sosyal) || 0), 0) / validStudentResults.length
      };

      return {
        studentId: student.id,
        studentName: student.name,
        averageNet,
        bestPerformance,
        worstPerformance,
        totalExams: validStudentResults.length,
        classRank: 0, // Daha sonra hesaplanacak
        // Puan verileri
        averageScore,
        bestScore,
        worstScore,
        subjectAverages
      };
    }).filter(student => student.totalExams > 0) // Sadece gerçek denemeye katılan öğrencileri göster
      .sort((a, b) => b.averageNet - a.averageNet)
      .map((student, index) => ({ ...student, classRank: index + 1 }));
  }, [students, results]);

  // Sınıf filtreleme ve tekrar sıralama
  const filteredData = useMemo(() => {
    let filtered = performanceData;
    
    if (selectedClass !== 'all') {
      filtered = performanceData.filter(student => {
        const studentObj = students.find(s => s.id === student.studentId);
        return studentObj?.class === selectedClass;
      });
    }
    
    // Seçilen sınıfa göre tekrar sırala ve sıra numaralarını güncelle
    return filtered
      .sort((a, b) => b.averageNet - a.averageNet)
      .map((student, index) => ({ ...student, classRank: index + 1 }));
  }, [performanceData, students, selectedClass]);

  // Sınıf listesi
  const classes = useMemo(() => {
    const uniqueClasses = Array.from(new Set(students.map(s => s.class)));
    return uniqueClasses.sort();
  }, [students]);

  // Sınıf ortalaması
  const classAverage = useMemo(() => {
    // Sadece puanı > 0 olan öğrencileri hesaba kat
    const validStudents = filteredData.filter(student => student.averageNet > 0);
    if (validStudents.length === 0) return 0;
    return validStudents.reduce((sum, student) => sum + student.averageNet, 0) / validStudents.length;
  }, [filteredData]);

  // Seçilen öğrencinin sınıf ortalamasını hesapla
  const studentClassAverage = useMemo(() => {
    if (!selectedStudent) return 0;
    
    const student = students.find(s => s.id === selectedStudent);
    if (!student) return 0;
    
    const classStudents = students.filter(s => s.class === student.class);
    const classPerformanceData = performanceData.filter(p => 
      classStudents.some(cs => cs.id === p.studentId) && p.averageNet > 0 // Sadece puanı > 0 olanları dahil et
    );
    
    if (classPerformanceData.length === 0) return 0;
    return classPerformanceData.reduce((sum, p) => sum + p.averageNet, 0) / classPerformanceData.length;
  }, [selectedStudent, students, performanceData]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Net/Puan Toggle */}
      <div className="flex justify-center mb-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTrendsViewType('net')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              trendsViewType === 'net'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Net
          </button>
          <button
            onClick={() => setTrendsViewType('puan')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              trendsViewType === 'puan'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎯 Puan
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Toplam Öğrenci</h3>
          <p className="text-3xl font-bold text-blue-600">{filteredData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sınıf Ortalaması</h3>
          <p className="text-3xl font-bold text-green-600">
            {trendsViewType === 'net' 
              ? (classAverage || 0).toFixed(1) 
              : (filteredData.length > 0 ? 
                  ((filteredData.reduce((sum, s) => sum + (s.averageScore || 0), 0) / filteredData.length) || 0).toFixed(0)
                  : '0')
            }
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            En {trendsViewType === 'net' ? 'Yüksek Net' : 'Yüksek Puan'}
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {filteredData.length > 0 
              ? (trendsViewType === 'net' 
                  ? Math.max(...filteredData.map(s => s.bestPerformance || 0)).toFixed(1)
                  : Math.max(...filteredData.map(s => s.bestScore || 0)).toFixed(0)
                )
              : '0'
            }
          </p>
        </div>

      </div>

      {/* Performans Dağılımı */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Performans Dağılımı</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="studentName" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
              tick={{ fontSize: 8 }}
            />
            <YAxis 
              domain={trendsViewType === 'net' ? [0, 90] : [0, 500]}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey={trendsViewType === 'net' ? 'averageNet' : 'averageScore'} 
              fill="#3B82F6" 
              name={trendsViewType === 'net' ? 'Ortalama Net' : 'Ortalama Puan'} 
            />
            <Bar 
              dataKey={trendsViewType === 'net' ? 'bestPerformance' : 'bestScore'} 
              fill="#10B981" 
              name={trendsViewType === 'net' ? 'En İyi Net' : 'En İyi Puan'} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      {/* Net/Puan Toggle */}
      <div className="flex justify-center mb-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTrendsViewType('net')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              trendsViewType === 'net'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Net
          </button>
          <button
            onClick={() => setTrendsViewType('puan')}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              trendsViewType === 'puan'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎯 Puan
          </button>
        </div>
      </div>

      {/* Karşılaştırma Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-xl font-bold">Detaylı Performans Karşılaştırması</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sıra</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öğrenci</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ortalama {trendsViewType === 'net' ? 'Net' : 'Puan'}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">En İyi</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">En Kötü</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sınav Sayısı</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((student, index) => (
                <tr key={student.studentId} className={index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index < 3 && <span className="text-yellow-500">🏆</span>} {student.classRank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trendsViewType === 'net' 
                        ? (student.averageNet >= 15 ? 'bg-green-100 text-green-800' :
                           student.averageNet >= 10 ? 'bg-yellow-100 text-yellow-800' :
                           'bg-red-100 text-red-800')
                        : (student.averageScore >= 400 ? 'bg-green-100 text-green-800' :
                           student.averageScore >= 300 ? 'bg-yellow-100 text-yellow-800' :
                           'bg-red-100 text-red-800')
                    }`}>
                      {trendsViewType === 'net' 
                        ? (student.averageNet || 0).toFixed(1)
                        : (student.averageScore || 0).toFixed(0)
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                    {trendsViewType === 'net' 
                      ? (student.bestPerformance || 0).toFixed(1)
                      : (student.bestScore || 0).toFixed(0)
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-semibold">
                    {trendsViewType === 'net' 
                      ? (student.worstPerformance || 0).toFixed(1)
                      : (student.worstScore || 0).toFixed(0)
                    }
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    {student.totalExams}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );

  const renderTrends = () => {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trend Analizi</h2>
            <p className="text-gray-600 mb-6">
              Detaylı öğrenci trend analizi ve gelişim takibi için Student Dashboard'a yönlendirileceksiniz.
            </p>
          </div>
          
          <button
            onClick={() => router.push('/student-dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Student Dashboard'a Git
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            Student Dashboard'da detaylı trend analizi, grafikler ve gelişim takibi yapabilirsiniz.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Analitik & Raporlar</h1>
            <p className="text-gray-600">Öğrenci performans analizi ve karşılaştırma raporları</p>
          </div>
          
          {/* Sınıf Filtresi */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Sınıflar</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Görünüm Seçenekleri */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { key: 'overview', label: '📈 Genel Bakış' },
            { key: 'comparison', label: '🔍 Karşılaştırma' },
            { key: 'trends', label: '📊 Trend Analizi' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewType(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewType === tab.key
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          
          {/* Trend Analizi için Net/Puan Toggle */}
          {viewType === 'trends' && selectedStudent && (
            <div className="flex ml-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTrendsViewType('net')}
                className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
                  trendsViewType === 'net'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📊 Net
              </button>
              <button
                onClick={() => setTrendsViewType('puan')}
                className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
                  trendsViewType === 'puan'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🎯 Puan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* İçerik */}
      {viewType === 'overview' && renderOverview()}
      {viewType === 'comparison' && renderComparison()}
      {viewType === 'trends' && renderTrends()}
    </div>
  );
};

export default AnalyticsTab;