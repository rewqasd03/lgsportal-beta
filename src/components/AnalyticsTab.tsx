"use client";

import React, { useState, useMemo } from 'react';
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

  // Sınıf değişince öğrenci seçimini temizle
  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    setSelectedStudent(''); // Öğrenci seçimini temizle
  };
  const [trendsViewType, setTrendsViewType] = useState<'net' | 'puan'>('net');

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
        turkce: validStudentResults.reduce((sum, result) => sum + (result.nets.turkce || 0), 0) / validStudentResults.length,
        matematik: validStudentResults.reduce((sum, result) => sum + (result.nets.matematik || 0), 0) / validStudentResults.length,
        fen: validStudentResults.reduce((sum, result) => sum + (result.nets.fen || 0), 0) / validStudentResults.length,
        sosyal: validStudentResults.reduce((sum, result) => sum + (result.nets.sosyal || 0), 0) / validStudentResults.length
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

  // Trend verilerini hesapla
  const trendData = useMemo(() => {
    if (!selectedStudent) return [];
    
    const studentResults = results
      .filter(result => result.studentId === selectedStudent)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return studentResults.map((result, index) => ({
      sira: index + 1,
      tarih: new Date(result.createdAt).toLocaleDateString('tr-TR'),
      toplamNet: result.nets.total,
      turkce: result.nets.turkce || 0,
      matematik: result.nets.matematik || 0,
      fen: result.nets.fen || 0,
      sosyal: result.nets.sosyal || 0,
      classAverage: studentClassAverage
    }));
  }, [selectedStudent, results, studentClassAverage]);

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

  // Detaylı öğrenci analizi için yardımcı fonksiyonlar
  const getStudentDetailedAnalysis = (studentId: string) => {
    const studentResults = results
      .filter(result => result.studentId === studentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (studentResults.length === 0) return null;

    // Öğrenci ve sınıf bilgileri
    const student = students.find(s => s.id === studentId);
    
    // Sadece gerçek denemeye katılan sonuçları dahil et (0 puanlı denemeler hariç)
    const validStudentResults = studentResults.filter(r => {
      const net = r.nets?.total || 0;
      const score = r.scores?.puan ? parseFloat(r.scores.puan) : 
                   (r.puan || r.totalScore || 0);
      return net > 0 || score > 0;
    });
    
    // Eğer öğrencinin hiç gerçek denemesi yoksa analiz yapma
    if (validStudentResults.length === 0) return null;
    
    // Sınıf ve genel ortalamaları hesapla
    const classResults = results.filter(r => {
      const rStudent = students.find(s => s.id === r.studentId);
      return rStudent?.class === student?.class;
    });
    
    const allResults = results; // Tüm öğrencilerin sonuçları
    
    // Sadece puanı > 0 olan sonuçları dahil et
    const validClassResults = classResults.filter(r => {
      const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
      return score > 0;
    });
    
    const classAverageNet = validClassResults.length > 0 
      ? validClassResults.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / validClassResults.length
      : 0;
    
    const classAverageScore = validClassResults.length > 0
      ? validClassResults.reduce((sum, r) => {
          const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
          return sum + score;
        }, 0) / validClassResults.length
      : 0;
    
    // Sadece puanı > 0 olan tüm sonuçları dahil et
    const validAllResults = allResults.filter(r => {
      const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
      return score > 0;
    });
    
    const generalAverageNet = validAllResults.length > 0
      ? validAllResults.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / validAllResults.length
      : 0;
    
    const generalAverageScore = validAllResults.length > 0
      ? validAllResults.reduce((sum, r) => {
          const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
          return sum + score;
        }, 0) / validAllResults.length
      : 0;

    // İstatistikleri hesapla (sadece gerçek denemeler için)
    const totalNet = validStudentResults.reduce((sum, result) => sum + (result.nets?.total || 0), 0);
    const avgNet = validStudentResults.length > 0 ? totalNet / validStudentResults.length : 0;
    const scores = validStudentResults.map(result => result.nets?.total || 0);
    const mean = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const variance = scores.length > 0 ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length : 0;
    const stdDev = Math.sqrt(variance);
    
    // Puan istatistikleri (sadece gerçek denemeler için)
    const studentScores = validStudentResults.map(result => {
      const score = result.scores?.puan ? parseFloat(result.scores.puan) : (result.puan || 0);
      return score;
    });
    const avgScore = studentScores.length > 0 ? studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length : 0;
    const highestScore = studentScores.length > 0 ? Math.max(...studentScores) : 0;
    const lowestScore = studentScores.length > 0 ? Math.min(...studentScores) : 0;
    const lastThreeAvg = studentScores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, studentScores.length);
    
    // Son 3 deneme net ortalaması ve tahminler (sadece gerçek denemeler için)
    const lastThreeNets = validStudentResults.slice(-3).map(result => result.nets?.total || 0);
    const lastThreeAvgNet = lastThreeNets.length > 0 ? lastThreeNets.reduce((sum, net) => sum + net, 0) / lastThreeNets.length : 0;
    const predictedNextScore = lastThreeAvg * 1.03; // %3 artış
    const predictedNextNet = lastThreeAvgNet * 1.05; // %5 artış
    
    const latestNet = validStudentResults[validStudentResults.length - 1]?.nets?.total || 0;
    const previousNet = validStudentResults[validStudentResults.length - 2]?.nets?.total || 0;
    const improvement = latestNet - previousNet;
    
    const latestScore = validStudentResults[validStudentResults.length - 1]?.scores?.puan ? 
      parseFloat(validStudentResults[validStudentResults.length - 1].scores?.puan) : 
      (validStudentResults[validStudentResults.length - 1]?.puan || 0);
    const previousScore = validStudentResults[validStudentResults.length - 2]?.scores?.puan ?
      parseFloat(validStudentResults[validStudentResults.length - 2].scores?.puan) :
      (validStudentResults[validStudentResults.length - 2]?.puan || 0);
    const scoreImprovement = latestScore - previousScore;
    
    // Trend analizi
    const trend = improvement > 2 ? 'Yükseliş' : improvement < -2 ? 'Düşüş' : 'Stabil';
    const trendColor = improvement > 2 ? 'text-green-600' : improvement < -2 ? 'text-red-600' : 'text-yellow-600';

    // Grafik verileri - sadece gerçek denemeler için
    const netChartData = validStudentResults.map((result, index) => ({
      exam: `Deneme ${index + 1}`,
      öğrenci: result.nets?.total || 0,
      sınıf: classAverageNet,
      genel: generalAverageNet
    }));
    
    const scoreChartData = validStudentResults.map((result, index) => {
      const score = result.scores?.puan ? parseFloat(result.scores.puan) : (result.puan || 0);
      return {
        exam: `Deneme ${index + 1}`,
        öğrenci: score,
        sınıf: classAverageScore,
        genel: generalAverageScore
      };
    });

    return {
      student,
      studentResults: validStudentResults, // Sadece gerçek denemeler
      totalNet,
      avgNet,
      avgScore,
      highestScore,
      lowestScore,
      lastThreeAvg,
      lastThreeAvgNet,
      predictedNextScore,
      predictedNextNet,
      latestNet,
      previousNet,
      improvement,
      latestScore,
      previousScore,
      scoreImprovement,
      trend,
      trendColor,
      classAverageNet,
      classAverageScore,
      generalAverageNet,
      generalAverageScore,
      netChartData,
      scoreChartData
    };
  };

  const renderTrends = () => {
    const selectedStudentData = students.find(s => s.id === selectedStudent);
    const analysis = selectedStudent ? getStudentDetailedAnalysis(selectedStudent) : null;
    const hasExamData = analysis && analysis.studentResults.length > 0;
    
    const subjects = [
      { name: 'Türkçe', color: '#10B981', key: 'turkce' },
      { name: 'Matematik', color: '#F59E0B', key: 'matematik' },
      { name: 'Fen Bilimleri', color: '#3B82F6', key: 'fen' },
      { name: 'Sosyal Bilgiler', color: '#8B5CF6', key: 'sosyal' },
      { name: 'Din Kültürü', color: '#EF4444', key: 'din' },
      { name: 'İngilizce', color: '#6366F1', key: 'ingilizce' }
    ];

    return (
      <div className="space-y-6">
        {/* Sınıf ve Öğrenci Seçimi */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">📊 Kapsamlı Öğrenci Trendi Analizi</h3>
          
          {/* Sınıf Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sınıf Seçin:</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Sınıflar</option>
              <option value="2-A">2-A</option>
              <option value="3-A">3-A</option>
              <option value="4-A">4-A</option>
              <option value="5-A">5-A</option>
              <option value="6-A">6-A</option>
              <option value="7-A">7-A</option>
              <option value="8-A">8-A</option>
            </select>
          </div>

          {/* Öğrenci Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Öğrenci Seçin:</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={selectedClass === 'all'}
            >
              <option value="">Öğrenci seçin...</option>
              {students
                .filter(student => selectedClass === 'all' || student.class === selectedClass)
                .map(student => {
                  const studentResults = results.filter(r => r.studentId === student.id);
                  // Sadece 0 olmayan puanı olan denemeleri say (gerçek denemeye katılan)
                  const validExams = studentResults.filter(r => {
                    const net = r.nets?.total || 0;
                    const score = r.scores?.puan ? parseFloat(r.scores.puan) : 
                                (r.puan || r.totalScore || 0);
                    return net > 0 || score > 0;
                  });
                  const studentExamCount = validExams.length;
                  return { ...student, studentExamCount, validExams };
                })
                .filter(student => student.studentExamCount > 0) // Hiç gerçek denemesi olmayan öğrencileri gösterme
                .map(student => {
                  return (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.class}) - {student.studentExamCount} sınav
                    </option>
                  );
                })
              }
            </select>
            {selectedClass === 'all' && (
              <p className="text-sm text-gray-500 mt-1">
                ℹ️ Lütfen önce bir sınıf seçin
              </p>
            )}
          </div>
          
          {/* Seçilen Öğrenci Bilgileri */}
          {selectedStudentData && analysis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800">Öğrenci Bilgileri</h4>
                <p className="text-blue-600">👤 {selectedStudentData.name}</p>
                <p className="text-blue-600">🏫 {selectedStudentData.class}</p>
                <p className="text-blue-600">📝 Toplam Sınav: {analysis.studentResults.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800">Sonuçlar</h4>
                <p className="text-green-600">📈 Son Net: {(analysis.latestNet || 0).toFixed(1)}</p>
                <p className="text-green-600">📊 Ortalama Net: {(analysis.avgNet || 0).toFixed(1)}</p>
                <p className="text-green-600">📈 Son Puan: {(analysis.latestScore || 0).toFixed(0)}</p>
                <p className="text-green-600">📊 Ortalama Puan: {(analysis.avgScore || 0).toFixed(0)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800">Trend Analizi</h4>
              </div>
            </div>
          )}
        </div>

        {/* Ana İçerik */}
        {selectedStudent && hasExamData && analysis ? (
          <>
            {/* 1. Genel Görünüm - İstatistik Kartları */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">📊 Genel Performans Özeti</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-xs font-medium text-blue-800 mb-1">Ortalama Net</h4>
                  <p className="text-lg font-bold text-blue-600">{(analysis.avgNet || 0).toFixed(1)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Sınıf: <span className="font-semibold">{(analysis.classAverageNet || 0).toFixed(1)}</span><br/>
                    Genel: <span className="font-semibold">{(analysis.generalAverageNet || 0).toFixed(1)}</span>
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="text-xs font-medium text-green-800 mb-1">Son Deneme Net</h4>
                  <p className="text-lg font-bold text-green-600">{(analysis.latestNet || 0).toFixed(1)}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="text-xs font-medium text-purple-800 mb-1">Son Deneme Puan</h4>
                  <p className="text-lg font-bold text-purple-600">{(analysis.latestScore || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Sınıf: <span className="font-semibold">{(analysis.classAverageScore || 0).toFixed(0)}</span><br/>
                    Genel: <span className="font-semibold">{(analysis.generalAverageScore || 0).toFixed(0)}</span>
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="text-xs font-medium text-orange-800 mb-1">Ortalama Puan</h4>
                  <p className="text-lg font-bold text-orange-600">{(analysis.avgScore || 0).toFixed(0)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Sınıf: <span className="font-semibold">{(analysis.classAverageScore || 0).toFixed(0)}</span><br/>
                    Genel: <span className="font-semibold">{(analysis.generalAverageScore || 0).toFixed(0)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Net ve Puan Gelişim Grafikleri - student-dashboard ile aynı */}
            <div className="grid grid-cols-1 gap-6">
              {/* Seçilen Görünüme Göre Grafik */}
              {trendsViewType === 'net' ? (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-bold mb-4">📈 Net Gelişim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analysis.netChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toFixed(1)}`, name]}
                        labelFormatter={(label) => `Deneme: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="öğrenci" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Öğrenci Net"
                        dot={{ fill: '#3B82F6', strokeWidth: 1, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sınıf" 
                        stroke="#10B981" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Sınıf Ortalaması"
                      />
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
              ) : (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-bold mb-4">📊 Puan Gelişim Trendi</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analysis.scoreChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="exam" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis domain={[0, 500]} />
                      <Tooltip 
                        formatter={(value, name) => [`${Number(value).toFixed(0)}`, name]}
                        labelFormatter={(label) => `Deneme: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="öğrenci" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        name="Öğrenci Puanı"
                        dot={{ fill: '#8B5CF6', strokeWidth: 1, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sınıf" 
                        stroke="#10B981" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Sınıf Ortalama Puan"
                      />
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
              )}
            </div>

            {/* 4. Detaylı Deneme Tablosu */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">📋 Deneme Detayları ve Gelişim Analizi</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Deneme</th>
                      <th className="px-4 py-2 text-center">Tarih</th>
                      <th className="px-4 py-2 text-center">{trendsViewType === 'net' ? 'Toplam Net' : 'Puan'}</th>
                      <th className="px-4 py-2 text-center">Türkçe</th>
                      <th className="px-4 py-2 text-center">Matematik</th>
                      <th className="px-4 py-2 text-center">Fen</th>
                      <th className="px-4 py-2 text-center">Sosyal</th>
                      <th className="px-4 py-2 text-center">Gelişim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.studentResults.map((result, index) => {
                      const previousNet = index > 0 ? analysis.studentResults[index-1]?.nets?.total || 0 : 0;
                      const currentNet = result.nets?.total || 0;
                      const development = index > 0 ? (currentNet - previousNet) : 0;
                      const score = result.scores?.puan ? parseFloat(result.scores.puan) : (result.puan || 0);
                      
                      return (
                        <tr key={result.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-blue-600">Deneme {index + 1}</td>
                          <td className="px-4 py-2 text-center text-gray-600">
                            {new Date(result.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${
                              trendsViewType === 'net' ? (
                                currentNet >= 60 ? 'text-green-600' : 
                                currentNet >= 40 ? 'text-yellow-600' : 'text-red-600'
                              ) : (
                                score >= 400 ? 'text-green-600' : 
                                score >= 300 ? 'text-yellow-600' : 'text-red-600'
                              )
                            }`}>
                              {trendsViewType === 'net' ? currentNet.toFixed(1) : score.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-green-600 font-medium">
                            {(result.nets?.turkce || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-center text-orange-600 font-medium">
                            {(result.nets?.matematik || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-center text-blue-600 font-medium">
                            {(result.nets?.fen || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-center text-purple-600 font-medium">
                            {(result.nets?.sosyal || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {index > 0 ? (
                              <span className={`flex items-center justify-center ${
                                development > 0 ? 'text-green-600' : 
                                development < 0 ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                {development > 0 ? '↗️' : development < 0 ? '↘️' : '➡️'} 
                                {Math.abs(development).toFixed(1)}
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

            {/* 4. Ders Bazında Net Dağılımı - Çizgi Grafikleri */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">📊 Ders Bazında Net Trendi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { key: 'turkce', name: 'Türkçe', color: '#10B981', bg: 'bg-green-50' },
                  { key: 'matematik', name: 'Matematik', color: '#F59E0B', bg: 'bg-yellow-50' },
                  { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6', bg: 'bg-blue-50' },
                  { key: 'sosyal', name: 'Sosyal Bilgiler', color: '#8B5CF6', bg: 'bg-purple-50' },
                  { key: 'din', name: 'Din Kültürü', color: '#EF4444', bg: 'bg-red-50' },
                  { key: 'ingilizce', name: 'İngilizce', color: '#6366F1', bg: 'bg-indigo-50' }
                ].map((subject) => {
                  // Her ders için gerçek sınıf ve genel ortalamaları hesapla (puanı > 0 olanları dahil et)
                  // Student-dashboard'taki mantık: sınıf ortalaması = aynı sınıftaki öğrencilerin ortalaması
                  const classResults = results.filter(r => {
                    const rStudent = students.find(s => s.id === r.studentId);
                    return rStudent?.class === analysis.student?.class;
                  });
                  
                  // Sadece puanı > 0 olan sonuçları dahil et
                  const validClassResults = classResults.filter(r => {
                    const net = r.nets?.total || 0;
                    const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
                    return net > 0 || score > 0;
                  });
                  
                  const classSubjectAvg = validClassResults.length > 0
                    ? validClassResults.reduce((sum, r) => sum + (r.nets?.[subject.key as keyof typeof r.nets] || 0), 0) / validClassResults.length
                    : 0;
                  
                  // Genel ortalama: tüm öğrencilerin ortalaması
                  const validAllResults = results.filter(r => {
                    const net = r.nets?.total || 0;
                    const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
                    return net > 0 || score > 0;
                  });
                  
                  const generalSubjectAvg = validAllResults.length > 0
                    ? validAllResults.reduce((sum, r) => sum + (r.nets?.[subject.key as keyof typeof r.nets] || 0), 0) / validAllResults.length
                    : 0;

                  const subjectData = analysis.studentResults.map((result, index) => ({
                    exam: `Deneme ${index + 1}`,
                    net: result.nets?.[subject.key as keyof typeof result.nets] || 0,
                    classAvg: classSubjectAvg,
                    generalAvg: generalSubjectAvg
                  }));
                  
                  return (
                    <div key={subject.key} className={`${subject.bg} p-4 rounded-lg border`}>
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">{subject.name}</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={subjectData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="exam" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tick={{ fontSize: 8 }}
                          />
                          <YAxis domain={[0, 20]} tick={{ fontSize: 8 }} />
                          <Tooltip 
                            formatter={(value, name) => [`${Number(value).toFixed(1)}`, name]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="net" 
                            stroke={subject.color} 
                            strokeWidth={2}
                            name="Öğrenci Net"
                            dot={{ fill: subject.color, strokeWidth: 1, r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="classAvg" 
                            stroke="#9CA3AF" 
                            strokeWidth={1}
                            strokeDasharray="2 2"
                            name="Sınıf Ort."
                          />
                          <Line 
                            type="monotone" 
                            dataKey="generalAvg" 
                            stroke="#F59E0B" 
                            strokeWidth={1}
                            strokeDasharray="1 1"
                            name="Genel Ort."
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Trend Tahmini (Öneriler bölümü kaldırıldı) */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-4">🔮 Gelişim Trend Tahmini</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                  <h4 className="text-xs font-medium opacity-90">Son 3 Deneme Ort. (Puan)</h4>
                  <p className="text-xl font-bold">
                    {analysis.lastThreeAvg.toFixed(0)}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                  <h4 className="text-xs font-medium opacity-90">Sonraki Deneme Tahmini (Puan)</h4>
                  <p className="text-xl font-bold">
                    {analysis.predictedNextScore.toFixed(0)}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                  <h4 className="text-xs font-medium opacity-90">Son 3 Deneme Ort. (Net)</h4>
                  <p className="text-xl font-bold">
                    {analysis.lastThreeAvgNet.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                  <h4 className="text-xs font-medium opacity-90">Sonraki Deneme Tahmini (Net)</h4>
                  <p className="text-xl font-bold">
                    {analysis.predictedNextNet.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : selectedStudent && !hasExamData ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">Seçilen öğrenci için henüz sınav verisi bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600">Lütfen trend analizi için bir öğrenci seçin.</p>
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