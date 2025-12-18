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
    // Seçili sınıfa göre öğrencileri filtrele
    const filteredStudents = selectedClass === 'all' 
      ? students 
      : students.filter(student => student.class === selectedClass);

    // Öğrencileri sınıfa göre grupla
    const groupedStudents = filteredStudents.reduce((acc, student) => {
      if (!acc[student.class]) {
        acc[student.class] = [];
      }
      acc[student.class].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    // Öğrenci raporuna yönlendirme fonksiyonu
    const handleStudentReport = (student: Student) => {
      // Direkt student dashboard'a yönlendir
      router.push(`/student-dashboard?studentId=${student.id}`);
    };

    return (
      <div className="space-y-6">
        {/* Başlık */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">📊 Sınıf Bazlı Öğrenci Listesi</h2>
            <p className="text-gray-600">
              Öğrenci detay raporunu görüntülemek için aşağıdaki öğrencilerden birine tıklayın.
            </p>
          </div>
        </div>

        {/* Sınıf Bazlı Öğrenci Listesi */}
        {Object.entries(groupedStudents).map(([className, classStudents]) => (
          <div key={className} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {className} Sınıfı ({classStudents.length} öğrenci)
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {classStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentReport(student)}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 border border-gray-200 hover:border-blue-300 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group"
                  >
                    <div className="text-center">
                      {/* Öğrenci Avatar */}
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:from-blue-500 group-hover:to-indigo-600 transition-colors">
                        <span className="text-white font-bold text-lg">
                          {student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      
                      {/* Öğrenci Bilgileri */}
                      <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                        {student.name}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        No: {student.number}
                      </p>
                      
                      {/* Görüntülenme Bilgisi */}
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{student.viewCount || 0} görüntülenme</span>
                      </div>
                      
                      {/* Rapor Butonu */}
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group-hover:shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">Raporu Görüntüle</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Eğer öğrenci yoksa */}
        {filteredStudents.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenci Bulunamadı</h3>
            <p className="text-gray-600">
              {selectedClass === 'all' 
                ? 'Henüz hiç öğrenci kaydı bulunmuyor.' 
                : `${selectedClass} sınıfında kayıtlı öğrenci bulunmuyor.`
              }
            </p>
          </div>
        )}
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