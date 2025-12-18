'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [isExporting, setIsExporting] = useState(false);
  
  // PDF Export için ref'ler
  const pageRefs = {
    1: useRef<HTMLDivElement>(null),
    2: useRef<HTMLDivElement>(null),
    3: useRef<HTMLDivElement>(null),
    4: useRef<HTMLDivElement>(null),
    5: useRef<HTMLDivElement>(null) // Puan Gelişim sayfası için
  };

  // URL parametrelerini kontrol et
  useEffect(() => {
    if (searchParams) {
      const type = searchParams.get('type');
      const studentId = searchParams.get('studentId');
      const classId = searchParams.get('classId');
      
      // Arama parametrelerini doğrula
      if (!type || (type === 'student' && !studentId) || (type === 'class' && !classId)) {
        toast.error('Geçersiz rapor parametreleri');
      }
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

      // Parametre kontrolü
      if (!type) {
        toast.error('Rapor tipi belirtilmemiş');
        return;
      }

      if (type === 'student' && !studentId) {
        toast.error('Öğrenci ID belirtilmemiş');
        return;
      }

      if (type === 'class' && !classId) {
        toast.error('Sınıf ID belirtilmemiş');
        return;
      }
      console.log('DEBUG - Students count:', students.length);
      console.log('DEBUG - Exams count:', exams.length);
      console.log('DEBUG - Results count:', results.length);

      if (type === 'student' && studentId) {
        // Öğrenci raporu
        const student = students.find(s => s.id === studentId);
        if (!student) {
          toast.error('Öğrenci bulunamadı');
          return;
        }

        const studentResults = results.filter(r => r.studentId === studentId);
        const examResults = [];

        for (const result of studentResults) {
          const exam = exams.find(e => e.id === result.examId);
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

  // PDF Export Fonksiyonu
  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      // jsPDF ve html2canvas'i dinamik olarak import et
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;
      let yPosition = margin;

      // PDF başlığı
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const title = reportData.student ? 
        `${reportData.student.name} - ${reportData.student.class} Öğrenci Raporu` : 
        `${reportData.className} Sınıf Raporu`;
      
      pdf.text(title, margin, yPosition);
      yPosition += 20;

      // Her sayfa için
      for (let pageNum = 1; pageNum <= 5; pageNum++) {
        const pageRef = pageRefs[pageNum as keyof typeof pageRefs]?.current;
        if (!pageRef) continue;

        // Sayfa içeriğini canvas'a çevir
        const canvas = await html2canvas(pageRef, {
          scale: 2,
          useCORS: true,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Yeni sayfa ekle (ilk sayfa hariç)
        if (pageNum > 1) {
          pdf.addPage();
          yPosition = margin;
        }

        // Resmi PDF'e ekle
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      }

      // PDF'i indir
      const fileName = reportData.student ? 
        `ogrenci-raporu-${reportData.student.name.replace(/\s+/g, '-')}.pdf` :
        `sinif-raporu-${reportData.className}.pdf`;
      
      pdf.save(fileName);
      
      toast.success('PDF başarıyla oluşturuldu!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsExporting(false);
    }
  };

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
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { num: 1, label: 'Genel Görünüm', icon: '📊' },
              { num: 2, label: 'Net Gelişim', icon: '📈' },
              { num: 3, label: 'Puan Gelişim', icon: '🎯' },
              { num: 4, label: 'Denemeler', icon: '📋' },
              { num: 5, label: 'Ders Bazında', icon: '📚' }
            ].map(page => (
              <button
                key={page.num}
                onClick={() => setCurrentPage(page.num)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  currentPage === page.num
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {page.icon} {page.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentPage === 1 && (
          <div ref={pageRefs[1]}>
            <PageOne reportData={reportData} onExportPDF={exportToPDF} isExporting={isExporting} />
          </div>
        )}
        {currentPage === 2 && (
          <div ref={pageRefs[2]}>
            <PageTwo reportData={reportData} />
          </div>
        )}
        {currentPage === 3 && (
          <div ref={pageRefs[3]}>
            <ScoreProgressPage reportData={reportData} />
          </div>
        )}
        {currentPage === 4 && (
          <div ref={pageRefs[4]}>
            <PageFour reportData={reportData} />
          </div>
        )}
        {currentPage === 5 && (
          <div ref={pageRefs[5]}>
            <PageThree reportData={reportData} />
          </div>
        )}
      </div>
    </div>
  );
};

// Sayfa 1: Genel Özet + Çizgi Grafik
interface PageOneProps {
  reportData: ReportData;
  onExportPDF: () => void;
  isExporting: boolean;
}

const PageOne: React.FC<PageOneProps> = ({ reportData, onExportPDF, isExporting }) => {
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
      {/* PDF İndir Butonu */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Genel Görünüm</h2>
          <p className="text-gray-600 mt-1">Öğrenci performansının genel analizi</p>
        </div>
        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">PDF Oluşturuluyor...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium">📄 Tüm Raporu PDF Olarak İndir</span>
            </>
          )}
        </button>
      </div>

      {/* Genel Özet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📊 Toplam Net</h3>
          <p className="text-3xl font-bold text-blue-600">{(totalScore || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🏫 Sınıf Ortalaması</h3>
          <p className="text-3xl font-bold text-green-600">{(avgClassScore || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🌍 Genel Ortalama</h3>
          <p className="text-3xl font-bold text-red-600">{(avgGeneralScore || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📈 Trend</h3>
          <p className={`text-3xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(trend || 0) >= 0 ? '+' : ''}{(trend || 0).toFixed(2)}
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

// Sayfa 3: Konu Bazlı Analiz Tablosu
const PageThree: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  // Gerçek verilerle basitleştirilmiş analiz
  const examResults = reportData.examResults;
  const subjectNames = ['Türkçe', 'Matematik', 'Fen', 'Sosyal', 'İngilizce', 'Din'];

  // Ortalama hesaplama - gerçek verilerle
  const subjectAverages = subjectNames.map(subject => {
    const subjectNets = examResults.map(result => {
      // Gerçek veri yapısından subject netini al
      return result.studentResults[0]?.nets?.[subject.toLowerCase()] || 0;
    });

    const avg = subjectNets.length > 0
      ? subjectNets.reduce((sum, net) => sum + net, 0) / subjectNets.length
      : 0;

    return {
      ders: subject,
      ortalama: avg,
      sinif: examResults.length > 0
        ? examResults.reduce((sum, r) => sum + r.classAverage, 0) / examResults.length
        : 0,
      genel: examResults.length > 0
        ? examResults.reduce((sum, r) => sum + r.generalAverage, 0) / examResults.length
        : 0
    };
  });

  return (
    <div className="space-y-6">
      {/* Konu Bazlı Analiz */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">📊 Konu Bazlı Analiz</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama Net</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sınıf Ortalaması</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genel Ortalama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjectAverages.map((item, index) => {
                const diff = item.ortalama - item.sinif;
                const durum = diff > 5 ? 'Güçlü' : diff > -5 ? 'Normal' : 'Zayıf';
                const durumColor = diff > 5 ? 'bg-green-100 text-green-800' :
                  diff > -5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800';

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.ders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.ortalama.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.sinif.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.genel.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${durumColor}`}>
                        {durum}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Özet Değerlendirme */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📝 Genel Değerlendirme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-green-800 mb-3">💪 Güçlü Konular</h4>
            <ul className="space-y-2">
              {subjectAverages.filter(item => item.ortalama > item.sinif + 5).map((item, index) => (
                <li key={index} className="text-green-700 flex items-center">
                  <span className="mr-2">✅</span>
                  {item.ders} (Net: {item.ortalama.toFixed(1)})
                </li>
              ))}
              {subjectAverages.filter(item => item.ortalama > item.sinif + 5).length === 0 && (
                <li className="text-gray-500 text-sm">Güçlü konu bulunamadı</li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-red-800 mb-3">⚠️ Geliştirilmesi Gerekenler</h4>
            <ul className="space-y-2">
              {subjectAverages.filter(item => item.ortalama < item.sinif - 5).map((item, index) => (
                <li key={index} className="text-red-700 flex items-center">
                  <span className="mr-2">📚</span>
                  {item.ders} (Net: {item.ortalama.toFixed(1)})
                </li>
              ))}
              {subjectAverages.filter(item => item.ortalama < item.sinif - 5).length === 0 && (
                <li className="text-gray-500 text-sm">Zayıf konu bulunamadı</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sayfa 3: Puan Gelişim Analizi
const ScoreProgressPage: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  // Puan verilerini hazırla
  const scoreData = reportData.examResults.map((r, index) => {
    // Gerçek puan verisini al (result.scores.puan veya result.puan veya result.totalScore)
    const score = r.studentResults[0]?.scores?.puan ? 
      parseFloat(r.studentResults[0].scores.puan) : 
      (r.studentResults[0]?.puan || r.studentResults[0]?.totalScore || 0);
    
    return {
      exam: r.exam.title,
      puan: score,
      net: r.studentTotalNet,
      tarih: new Date(r.exam.date).toLocaleDateString('tr-TR')
    };
  }).filter(item => item.puan > 0); // Sadece puanı olan denemeleri göster

  // İstatistikler
  const totalScores = scoreData.map(d => d.puan);
  const avgScore = totalScores.length > 0 ? totalScores.reduce((sum, s) => sum + s, 0) / totalScores.length : 0;
  const bestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;
  const worstScore = totalScores.length > 0 ? Math.min(...totalScores) : 0;
  const scoreTrend = scoreData.length >= 2 ? 
    scoreData[scoreData.length - 1].puan - scoreData[scoreData.length - 2].puan : 0;

  // Puan aralıkları analizi
  const scoreRanges = {
    '450+': scoreData.filter(d => d.puan >= 450).length,
    '400-449': scoreData.filter(d => d.puan >= 400 && d.puan < 450).length,
    '350-399': scoreData.filter(d => d.puan >= 350 && d.puan < 400).length,
    '300-349': scoreData.filter(d => d.puan >= 300 && d.puan < 350).length,
    '300-': scoreData.filter(d => d.puan < 300).length
  };

  return (
    <div className="space-y-6">
      {/* Puan İstatistikleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🎯 Ortalama Puan</h3>
          <p className="text-3xl font-bold text-blue-600">{avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">🏆 En Yüksek Puan</h3>
          <p className="text-3xl font-bold text-green-600">{bestScore.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📉 En Düşük Puan</h3>
          <p className="text-3xl font-bold text-red-600">{worstScore.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">📈 Son Trend</h3>
          <p className={`text-3xl font-bold ${scoreTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {scoreTrend >= 0 ? '+' : ''}{scoreTrend.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Puan Trendi Grafik */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 Puan Gelişim Trendi</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="exam" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={[200, 500]} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'puan' ? `${value} puan` : `${value} net`,
                  name === 'puan' ? 'Puan' : 'Net'
                ]}
                labelFormatter={(label) => `Deneme: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="puan"
                stroke="#8B5CF6"
                strokeWidth={3}
                name="Puan"
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Net"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Puan Aralıkları Analizi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Puan Aralıkları</h3>
          <div className="space-y-3">
            {Object.entries(scoreRanges).map(([range, count]) => (
              <div key={range} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{range} Puan</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / Math.max(...Object.values(scoreRanges))) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Puan Performansı</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">LGS Başarı Hedefi:</span>
              <span className="font-bold text-purple-600">450+ Puan</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Mevcut Durum:</span>
              <span className={`font-bold ${avgScore >= 450 ? 'text-green-600' : avgScore >= 400 ? 'text-yellow-600' : 'text-red-600'}`}>
                {avgScore >= 450 ? 'Mükemmel' : avgScore >= 400 ? 'İyi' : 'Gelişim Gerekli'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hedefe Uzaklık:</span>
              <span className="font-bold text-blue-600">
                {Math.max(0, 450 - avgScore).toFixed(1)} puan
              </span>
            </div>
            <div className="pt-2 border-t">
              <div className="bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((avgScore / 500) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                %{((avgScore / 500) * 100).toFixed(1)} tamamlandı
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detaylı Puan Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">📋 Detaylı Puan Analizi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deneme</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scoreData.map((item, index) => {
                const isImprovement = index > 0 ? item.puan > scoreData[index - 1].puan : false;
                const isDecline = index > 0 ? item.puan < scoreData[index - 1].puan : false;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.exam}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.tarih}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {item.puan.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.net.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isImprovement && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ↗️ Artış
                        </span>
                      )}
                      {isDecline && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ↘️ Azalış
                        </span>
                      )}
                      {!isImprovement && !isDecline && index === 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          📊 İlk Deneme
                        </span>
                      )}
                      {!isImprovement && !isDecline && index > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          ➡️ Sabit
                        </span>
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
  );
};

// Sayfa 4: Hedef Takibi ve Genel Özet
const PageFour: React.FC<{ reportData: ReportData }> = ({ reportData }) => {
  // Hesaplamalar
  const latestScore = reportData.examResults.length > 0
    ? reportData.examResults[reportData.examResults.length - 1].studentTotalNet
    : 0;

  const targetNet = 70; // Varsayılan hedef
  const completionPercentage = Math.min((latestScore / targetNet) * 100, 100);

  // Basit istikrar analizi
  const scores = reportData.examResults.map(r => r.studentTotalNet);
  const mean = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
  const variance = scores.length > 0
    ? scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const stability = stdDev <= 3 ? 'İstikrarlı' : stdDev <= 6 ? 'Orta İstikrar' : 'Değişken';

  return (
    <div className="space-y-6">
      {/* Hedef Takibi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Hedef Takibi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Hedef Net</p>
            <p className="text-3xl font-bold text-blue-600">{targetNet}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Son Net</p>
            <p className="text-3xl font-bold text-green-600">{latestScore.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Tamamlanma</p>
            <p className="text-3xl font-bold text-purple-600">%{completionPercentage.toFixed(0)}</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Performans İstikrarı */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Performans Durumu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">İstikrar Durumu</p>
            <p className={`text-2xl font-bold ${stability === 'İstikrarlı' ? 'text-green-600' :
                stability === 'Orta İstikrar' ? 'text-yellow-600' : 'text-red-600'
              }`}>
              {stability}
            </p>
            <p className="text-xs text-gray-500 mt-1">Standart Sapma: {stdDev.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Toplam Deneme</p>
            <p className="text-2xl font-bold text-gray-800">{reportData.examResults.length}</p>
            <p className="text-xs text-gray-500 mt-1">Ortalama Net: {mean.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Basit Yorumlar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📝 Genel Değerlendirme</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-green-700">💪 Güçlü Yönler</h4>
            <p className="text-gray-600 text-sm">
              {latestScore > mean + 5 ? 'Son denemede yüksek performans sergiledi.' :
                mean > 50 ? 'Genel performans ortalamanın üzerinde.' :
                  'Düzenli çalışma sergiliyor.'}
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-blue-700">📈 İlerleme Önerisi</h4>
            <p className="text-gray-600 text-sm">
              {completionPercentage < 80 ? 'Hedef net için çalışmaya devam edilmeli.' :
                'Hedef net tutturulmuş, daha yüksek hedef belirlenebilir.'}
            </p>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-orange-700">🎯 Sonraki Adımlar</h4>
            <p className="text-gray-600 text-sm">
              {stdDev > 5 ? 'Performansta istikrar sağlanmalı.' :
                'Mevcut çalışma düzeni korunmalı.'}
            </p>
          </div>
        </div>
      </div>

      {/* Özet Bilgi */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Rapor Özeti</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          Bu rapor {reportData.student ? reportData.student.name + ' öğrencisinin' : 'sınıfın'}
          {reportData.examResults.length} denemedeki performansını göstermektedir.
          {latestScore > mean ? 'Genel olarak pozitif bir trend' : 'İstikrarlı bir performans'}
          sergilenmekte olup, hedef netlere ulaşmak için
          {stdDev > 5 ? ' daha düzenli çalışma yapılması' : ' mevcut çalışma düzeninin sürdürülmesi'} önerilir.
        </p>
      </div>
    </div>
  );
};

export default StudentReport;
