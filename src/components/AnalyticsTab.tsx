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
  improvementRate: number;
  totalExams: number;
  classRank: number;
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

  // Performans verilerini hesapla
  const performanceData = useMemo((): PerformanceComparison[] => {
    return students.map(student => {
      const studentResults = results.filter(result => result.studentId === student.id);
      
      if (studentResults.length === 0) {
        return {
          studentId: student.id,
          studentName: student.name,
          averageNet: 0,
          bestPerformance: 0,
          worstPerformance: 0,
          improvementRate: 0,
          totalExams: 0,
          classRank: 0,
          subjectAverages: { turkce: 0, matematik: 0, fen: 0, sosyal: 0 }
        };
      }

      const nets = studentResults.map(result => result.nets.total);
      const averageNet = nets.reduce((sum, net) => sum + net, 0) / nets.length;
      const bestPerformance = Math.max(...nets);
      const worstPerformance = Math.min(...nets);

      // İyileşme oranını hesapla (son 3 sınav vs ilk 3 sınav)
      const sortedResults = studentResults.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstThree = sortedResults.slice(0, 3);
      const lastThree = sortedResults.slice(-3);
      
      const firstAvg = firstThree.length > 0 ? firstThree.reduce((sum, result) => sum + result.nets.total, 0) / firstThree.length : 0;
      const lastAvg = lastThree.length > 0 ? lastThree.reduce((sum, result) => sum + result.nets.total, 0) / lastThree.length : 0;
      const improvementRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

      // Konu bazlı ortalamalar
      const subjectAverages = {
        turkce: studentResults.reduce((sum, result) => sum + (result.nets.turkce || 0), 0) / studentResults.length,
        matematik: studentResults.reduce((sum, result) => sum + (result.nets.matematik || 0), 0) / studentResults.length,
        fen: studentResults.reduce((sum, result) => sum + (result.nets.fen || 0), 0) / studentResults.length,
        sosyal: studentResults.reduce((sum, result) => sum + (result.nets.sosyal || 0), 0) / studentResults.length
      };

      return {
        studentId: student.id,
        studentName: student.name,
        averageNet,
        bestPerformance,
        worstPerformance,
        improvementRate,
        totalExams: studentResults.length,
        classRank: 0, // Daha sonra hesaplanacak
        subjectAverages
      };
    }).sort((a, b) => b.averageNet - a.averageNet)
      .map((student, index) => ({ ...student, classRank: index + 1 }));
  }, [students, results]);

  // Sınıf filtreleme
  const filteredData = useMemo(() => {
    if (selectedClass === 'all') return performanceData;
    return performanceData.filter(student => {
      const studentObj = students.find(s => s.id === student.studentId);
      return studentObj?.class === selectedClass;
    });
  }, [performanceData, students, selectedClass]);

  // Sınıf listesi
  const classes = useMemo(() => {
    const uniqueClasses = Array.from(new Set(students.map(s => s.class)));
    return uniqueClasses.sort();
  }, [students]);

  // Sınıf ortalaması
  const classAverage = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return filteredData.reduce((sum, student) => sum + student.averageNet, 0) / filteredData.length;
  }, [filteredData]);

  // Seçilen öğrencinin sınıf ortalamasını hesapla
  const studentClassAverage = useMemo(() => {
    if (!selectedStudent) return 0;
    
    const student = students.find(s => s.id === selectedStudent);
    if (!student) return 0;
    
    const classStudents = students.filter(s => s.class === student.class);
    const classPerformanceData = performanceData.filter(p => 
      classStudents.some(cs => cs.id === p.studentId)
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
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Toplam Öğrenci</h3>
          <p className="text-3xl font-bold text-blue-600">{filteredData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sınıf Ortalaması</h3>
          <p className="text-3xl font-bold text-green-600">{classAverage.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">En Yüksek Net</h3>
          <p className="text-3xl font-bold text-purple-600">
            {filteredData.length > 0 ? Math.max(...filteredData.map(s => s.bestPerformance)).toFixed(1) : '0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Ortalama İyileşme</h3>
          <p className="text-3xl font-bold text-orange-600">
            {(filteredData.reduce((sum, s) => sum + s.improvementRate, 0) / filteredData.length).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Performans Dağılımı */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Performans Dağılımı</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="studentName" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="averageNet" fill="#3B82F6" name="Ortalama Net" />
            <Bar dataKey="bestPerformance" fill="#10B981" name="En İyi Performans" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama Net</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">En İyi</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">En Kötü</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İyileşme</th>
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
                      student.averageNet >= 15 ? 'bg-green-100 text-green-800' :
                      student.averageNet >= 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.averageNet.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                    {student.bestPerformance.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-semibold">
                    {student.worstPerformance.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.improvementRate > 0 ? 'bg-green-100 text-green-800' :
                      student.improvementRate < 0 ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {student.improvementRate > 0 ? '↗️' : student.improvementRate < 0 ? '↘️' : '➡️'} {student.improvementRate.toFixed(1)}%
                    </span>
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

      {/* Radar Chart - Konu Bazlı Karşılaştırma */}
      {filteredData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Konu Bazlı Performans Analizi</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={[filteredData[0]]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="studentName" />
              <PolarRadiusAxis angle={90} domain={[0, 20]} />
              <Radar
                name="Türkçe"
                dataKey="subjectAverages.turkce"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
              <Radar
                name="Matematik"
                dataKey="subjectAverages.matematik"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.3}
              />
              <Radar
                name="Fen"
                dataKey="subjectAverages.fen"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
              />
              <Radar
                name="Sosyal"
                dataKey="subjectAverages.sosyal"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
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
    
    // Sınıf ve genel ortalamaları hesapla
    const classResults = results.filter(r => {
      const rStudent = students.find(s => s.id === r.studentId);
      return rStudent?.class === student?.class;
    });
    
    const allResults = results; // Tüm öğrencilerin sonuçları
    
    const classAverageNet = classResults.length > 0 
      ? classResults.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / classResults.length
      : 0;
    
    const classAverageScore = classResults.length > 0
      ? classResults.reduce((sum, r) => {
          const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
          return sum + score;
        }, 0) / classResults.length
      : 0;
    
    const generalAverageNet = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + (r.nets?.total || 0), 0) / allResults.length
      : 0;
    
    const generalAverageScore = allResults.length > 0
      ? allResults.reduce((sum, r) => {
          const score = r.scores?.puan ? parseFloat(r.scores.puan) : (r.puan || 0);
          return sum + score;
        }, 0) / allResults.length
      : 0;

    // İstatistikleri hesapla
    const totalNet = studentResults.reduce((sum, result) => sum + (result.nets?.total || 0), 0);
    const avgNet = totalNet / studentResults.length;
    const scores = studentResults.map(result => result.nets?.total || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Puan istatistikleri
    const studentScores = studentResults.map(result => {
      const score = result.scores?.puan ? parseFloat(result.scores.puan) : (result.puan || 0);
      return score;
    });
    const avgScore = studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length;
    const highestScore = Math.max(...studentScores);
    const lowestScore = Math.min(...studentScores);
    const lastThreeAvg = studentScores.slice(-3).reduce((sum, score) => sum + score, 0) / Math.min(3, studentScores.length);
    
    // Son 3 deneme net ortalaması ve tahminler
    const lastThreeNets = studentResults.slice(-3).map(result => result.nets?.total || 0);
    const lastThreeAvgNet = lastThreeNets.reduce((sum, net) => sum + net, 0) / Math.min(3, lastThreeNets.length);
    const predictedNextScore = lastThreeAvg * 1.03; // %3 artış
    const predictedNextNet = lastThreeAvgNet * 1.03; // %3 artış
    
    const latestNet = studentResults[studentResults.length - 1]?.nets?.total || 0;
    const previousNet = studentResults[studentResults.length - 2]?.nets?.total || 0;
    const improvement = latestNet - previousNet;
    
    const latestScore = studentResults[studentResults.length - 1]?.scores?.puan ? 
      parseFloat(studentResults[studentResults.length - 1].scores?.puan) : 
      (studentResults[studentResults.length - 1]?.puan || 0);
    const previousScore = studentResults[studentResults.length - 2]?.scores?.puan ?
      parseFloat(studentResults[studentResults.length - 2].scores?.puan) :
      (studentResults[studentResults.length - 2]?.puan || 0);
    const scoreImprovement = latestScore - previousScore;
    
    // Trend analizi
    const trend = improvement > 2 ? 'Yükseliş' : improvement < -2 ? 'Düşüş' : 'Stabil';
    const trendColor = improvement > 2 ? 'text-green-600' : improvement < -2 ? 'text-red-600' : 'text-yellow-600';

    // Grafik verileri - student-dashboard ile aynı yapı
    const netChartData = studentResults.map((result, index) => ({
      exam: `Deneme ${index + 1}`,
      öğrenci: result.nets?.total || 0,
      sınıf: classAverageNet,
      genel: generalAverageNet
    }));
    
    const scoreChartData = studentResults.map((result, index) => {
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
      studentResults,
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
        {/* Öğrenci Seçimi */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">📊 Kapsamlı Öğrenci Trendi Analizi</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Öğrenci Seçin:</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Öğrenci seçin...</option>
              {students.map(student => {
                const studentExamCount = results.filter(r => r.studentId === student.id).length;
                return (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.class}) - {studentExamCount} sınav
                  </option>
                );
              })}
            </select>
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
                <p className="text-green-600">📈 Son Net: {analysis.latestNet.toFixed(1)}</p>
                <p className="text-green-600">📊 Ortalama Net: {analysis.avgNet.toFixed(1)}</p>
                <p className="text-green-600">📈 Son Puan: {analysis.latestScore.toFixed(0)}</p>
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
                  <p className="text-lg font-bold text-blue-600">{analysis.avgNet.toFixed(1)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Sınıf: <span className="font-semibold">{analysis.classAverageNet.toFixed(1)}</span><br/>
                    Genel: <span className="font-semibold">{analysis.generalAverageNet.toFixed(1)}</span>
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="text-xs font-medium text-green-800 mb-1">Son Deneme Net</h4>
                  <p className="text-lg font-bold text-green-600">{analysis.latestNet.toFixed(1)}</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="text-xs font-medium text-purple-800 mb-1">Son Deneme Puan</h4>
                  <p className="text-lg font-bold text-purple-600">{analysis.latestScore.toFixed(0)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Sınıf: <span className="font-semibold">{analysis.classAverageScore.toFixed(0)}</span><br/>
                    Genel: <span className="font-semibold">{analysis.generalAverageScore.toFixed(0)}</span>
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h4 className="text-xs font-medium text-orange-800 mb-1">Ortalama Puan</h4>
                  <p className="text-lg font-bold text-orange-600">{analysis.avgScore.toFixed(0)}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Sınıf: <span className="font-semibold">{analysis.classAverageScore.toFixed(0)}</span><br/>
                    Genel: <span className="font-semibold">{analysis.generalAverageScore.toFixed(0)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Net ve Puan Gelişim Grafikleri - student-dashboard ile aynı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Net Gelişim Trendi */}
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
                      name="Öğrenci"
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

              {/* Puan Gelişim Trendi */}
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
                      <th className="px-4 py-2 text-center">Toplam Net</th>
                      <th className="px-4 py-2 text-center">Türkçe</th>
                      <th className="px-4 py-2 text-center">Matematik</th>
                      <th className="px-4 py-2 text-center">Fen</th>
                      <th className="px-4 py-2 text-center">Sosyal</th>
                      <th className="px-4 py-2 text-center">Puan</th>
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
                              currentNet >= 60 ? 'text-green-600' : 
                              currentNet >= 40 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {currentNet.toFixed(1)}
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
                          <td className="px-4 py-2 text-center font-medium text-blue-600">
                            {score.toFixed(0)}
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
                  const subjectData = analysis.studentResults.map((result, index) => ({
                    exam: `Deneme ${index + 1}`,
                    net: result.nets?.[subject.key as keyof typeof result.nets] || 0,
                    classAvg: analysis.classAverageNet * (subject.key === 'matematik' ? 0.20 : subject.key === 'fen' ? 0.18 : subject.key === 'turkce' ? 0.15 : subject.key === 'sosyal' ? 0.15 : subject.key === 'ingilizce' ? 0.20 : 0.12),
                    generalAvg: analysis.generalAverageNet * (subject.key === 'matematik' ? 0.20 : subject.key === 'fen' ? 0.18 : subject.key === 'turkce' ? 0.15 : subject.key === 'sosyal' ? 0.15 : subject.key === 'ingilizce' ? 0.20 : 0.12)
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
                          <YAxis domain={[0, 20]} />
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

            {/* 5. Trend Tahmini ve Öneriler */}
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

              {/* Öneriler */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Öğrenci Gelişim Önerileri</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  {analysis.improvement > 0 ? (
                    <p>✅ Öğrenci pozitif trend gösteriyor. Mevcut çalışma yöntemlerini devam ettirebilir.</p>
                  ) : analysis.improvement < -2 ? (
                    <p>⚠️ Öğrencinin performansında düşüş var. Ek çalışma ve motivasyon desteği gerekebilir.</p>
                  ) : (
                    <p>➡️ Öğrencinin performansı stabil. Küçük iyileştirmeler hedeflenebilir.</p>
                  )}
                  
                  {(() => {
                    const lastResult = analysis.studentResults[analysis.studentResults.length - 1];
                    if (!lastResult) return null;
                    
                    const weakestSubject = subjects.reduce((weakest, subject) => {
                      const current = lastResult?.nets?.[subject.key] || 0;
                      const weakestNet = lastResult?.nets?.[weakest.key] || 0;
                      return current < weakestNet ? subject : weakest;
                    }, subjects[0]);
                    
                    return (
                      <p>🎯 En çok geliştirilmesi gereken ders: <strong>{weakestSubject.name}</strong></p>
                    );
                  })()}
                  
                  <p>📈 Son 3 deneme ortalamasını LGS hedefi ile karşılaştırarak çalışma planı oluşturulabilir.</p>                  
                  <p>📈 3 deneme ortalaması Son ile LGS hedefini karşılaştırarak çalışma planı oluşturulabilir.</p>
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