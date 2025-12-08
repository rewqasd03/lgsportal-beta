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
      classAverage: classAverage
    }));
  }, [selectedStudent, results, classAverage]);

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

  const renderTrends = () => (
    <div className="space-y-6">
      {/* Öğrenci Seçimi */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Öğrenci Trendi Analizi</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Öğrenci Seçin:</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Öğrenci seçin...</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.name} ({student.class})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trend Grafikleri */}
      {selectedStudent && trendData.length > 0 && (
        <>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Net Gelişim Trendi</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tarih" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="toplamNet" stroke="#3B82F6" strokeWidth={3} name="Toplam Net" />
                <Line type="monotone" dataKey="classAverage" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" name="Sınıf Ortalaması" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Konu Bazlı Gelişim</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tarih" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="turkce" stroke="#10B981" strokeWidth={2} name="Türkçe" />
                <Line type="monotone" dataKey="matematik" stroke="#F59E0B" strokeWidth={2} name="Matematik" />
                <Line type="monotone" dataKey="fen" stroke="#3B82F6" strokeWidth={2} name="Fen" />
                <Line type="monotone" dataKey="sosyal" stroke="#8B5CF6" strokeWidth={2} name="Sosyal" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {selectedStudent && trendData.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Seçilen öğrenci için henüz sınav verisi bulunmamaktadır.</p>
        </div>
      )}
    </div>
  );

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