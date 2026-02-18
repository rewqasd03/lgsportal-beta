"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

import { getStudents, getExams, getResults, addStudent, addExam, addResult, deleteStudent, deleteExam, deleteResult, updateStudent, updateResult, updateExam, saveStudentTargets, getAllTargets, getStudentScoreTarget, mapDashboardKeysToPanel, mapPanelKeysToDashboard, db, doc, getDoc, incrementStudentViewCount, generateStudentPin, assignPinsToAllStudents, createMissingTopic, getMissingTopicsByClass, Student, Exam, Result } from "../../firebase";

// İlkokul Sınıf Bazlı Ders Konfigürasyonu
const SUBJECTS_CONFIG = {
  '2-A': [
    { key: 'turkce', name: 'Türkçe', color: '#10B981' },
    { key: 'matematik', name: 'Matematik', color: '#F59E0B' },
    { key: 'hayat', name: 'Hayat Bilgisi', color: '#8B5CF6' },
    { key: 'ingilizce', name: 'İngilizce', color: '#EF4444' },
  ],
  '3-A': [
    { key: 'turkce', name: 'Türkçe', color: '#10B981' },
    { key: 'matematik', name: 'Matematik', color: '#F59E0B' },
    { key: 'hayat', name: 'Hayat Bilgisi', color: '#8B5CF6' },
    { key: 'ingilizce', name: 'İngilizce', color: '#EF4444' },
    { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6' },
  ],
  '4-A': [
    { key: 'turkce', name: 'Türkçe', color: '#10B981' },
    { key: 'matematik', name: 'Matematik', color: '#F59E0B' },
    { key: 'sosyal', name: 'Sosyal Bilgiler', color: '#8B5CF6' },
    { key: 'ingilizce', name: 'İngilizce', color: '#EF4444' },
    { key: 'din', name: 'Din Kültürü', color: '#F97316' },
    { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6' },
  ]
};

// Sınıfa göre dersleri getiren yardımcı fonksiyon
const getSubjectsByClass = (studentClass: string) => {
  return SUBJECTS_CONFIG[studentClass as keyof typeof SUBJECTS_CONFIG] || SUBJECTS_CONFIG['4-A'];
};

// 8-A sınıfı için LGS dersleri (ortaokul)
const lgsSubjects = [
  { key: 'turkce', label: 'Türkçe', target: 0 },
  { key: 'sosyal', label: 'Sosyal Bilgiler', target: 0 },
  { key: 'din', label: 'Din Kültürü', target: 0 },
  { key: 'ingilizce', label: 'İngilizce', target: 0 },
  { key: 'matematik', label: 'Matematik', target: 0 },
  { key: 'fen', label: 'Fen Bilimleri', target: 0 }
];

import AnalyticsTab from "../../components/AnalyticsTab";
// PDF İçe Aktarım Tab Component
const PDFImportTab = ({ students, exams, onDataUpdate }: { 
  students: Student[], 
  exams: Exam[], 
  onDataUpdate: () => void 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [examInfo, setExamInfo] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    classes: [] as string[]
  });
  const [importResults, setImportResults] = useState<{
    total: number;
    added: number;
    updated: number;
    errors: string[];
  }>({ total: 0, added: 0, updated: 0, errors: [] });

  // PDF'den text çıkarma fonksiyonu
  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // PDF.js benzeri basit text extraction
          // Bu basit bir implementasyondur, gerçek projede pdf-lib kullanılabilir
          const text = new TextDecoder().decode(arrayBuffer);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // PDF içeriğini parse etme fonksiyonu
  const parsePDFContent = (text: string): any[] => {
    const students: any[] = [];
    const lines = text.split('\n');
    
    let currentStudent: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Öğrenci adını yakala (genellikle başlıkta veya özel formatta)
      const nameMatch = line.match(/([A-Za-zÇçĞğİıÖöŞşÜü\s]+)\s+(\d+)\s+(\d+-[A-Z])/);
      if (nameMatch) {
        // Önceki öğrenciyi kaydet
        if (currentStudent) {
          students.push(currentStudent);
        }
        
        // Yeni öğrenci başlat
        currentStudent = {
          name: nameMatch[1].trim(),
          number: nameMatch[2],
          class: nameMatch[3],
          scores: {}
        };
        continue;
      }
      
      // Ders skorlarını yakala
      const scoreMatch = line.match(/(Türkçe|Matematik|Fen|Sosyal|İngilizce|Din)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)/);
      if (scoreMatch && currentStudent) {
        const subject = scoreMatch[1];
        const dogru = parseInt(scoreMatch[2]);
        const yanlis = parseInt(scoreMatch[3]);
        const net = parseFloat(scoreMatch[4]);
        const bos = parseInt(scoreMatch[5]);
        
        currentStudent.scores[subject.toLowerCase()] = {
          D: dogru,
          Y: yanlis,
          N: net,
          B: bos
        };
        continue;
      }
      
      // Toplam puanı yakala
      const totalScoreMatch = line.match(/Toplam\s+Puan\s+([\d.]+)/);
      if (totalScoreMatch && currentStudent) {
        currentStudent.puan = parseFloat(totalScoreMatch[1]);
        continue;
      }
    }
    
    // Son öğrenciyi kaydet
    if (currentStudent) {
      students.push(currentStudent);
    }
    
    return students;
  };

  // Dosya seçme işlemi
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setParsedData([]);
    } else {
      alert('Lütfen bir PDF dosyası seçin.');
    }
  };

  // PDF'i işleme
  const processPDF = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      const text = await extractTextFromPDF(selectedFile);
      const parsed = parsePDFContent(text);
      setParsedData(parsed);
    } catch (error) {
      console.error('PDF processing error:', error);
      alert('PDF işlenirken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Firebase'e veri aktarımı
  const importToFirebase = async () => {
    if (parsedData.length === 0) return;
    
    setIsProcessing(true);
    const results = {
      total: parsedData.length,
      added: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Deneme bilgilerini kontrol et/oluştur
      let examId = '';
      const existingExam = exams.find(e => 
        e.title === examInfo.title && e.date === examInfo.date
      );
      
      if (existingExam) {
        examId = existingExam.id;
      } else {
        // Yeni deneme oluştur
        const newExam: Omit<Exam, 'id'> = {
          title: examInfo.title,
          date: examInfo.date,
          classes: examInfo.classes.length > 0 ? examInfo.classes : undefined
        };
        
        examId = await addExam(newExam);
      }

      // Her öğrenci için sonuç oluştur
      for (const studentData of parsedData) {
        try {
          // Mevcut öğrenciyi bul veya oluştur
          let student = students.find(s => 
            s.name === studentData.name && s.class === studentData.class
          );
          
          if (!student) {
            // Yeni öğrenci oluştur
            const newStudent: Omit<Student, 'id'> = {
              name: studentData.name,
              class: studentData.class,
              number: studentData.number || "0",
              viewCount: 0,
              lastViewDate: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            
            const studentId = await addStudent(newStudent);
            student = { ...newStudent, id: studentId };
            results.added++;
          } else {
            results.updated++;
          }

          // Sonuç oluştur
          const nets: Result['nets'] = { total: 0 };
          let totalNet = 0;
          Object.entries(studentData.scores || {}).forEach(([subject, scores]: [string, any]) => {
            const netValue = scores.N || 0;
            (nets as any)[subject] = netValue;
            totalNet += netValue;
          });
          nets.total = totalNet;

          const newResult: Omit<Result, 'id'> = {
            studentId: student.id,
            examId,
            nets,
            scores: {
              puan: studentData.puan || 0,
              ...studentData.scores
            },
            createdAt: new Date().toISOString()
          };
          
          const resultId = await addResult(newResult);
        } catch (error) {
          console.error('Student import error:', error);
          results.errors.push(`Öğrenci ${studentData.name}: ${error}`);
        }
      }
      
      setImportResults(results);
      onDataUpdate();
      alert(`İçe aktarım tamamlandı! ${results.added} yeni öğrenci eklendi, ${results.updated} güncellendi.`);
      
    } catch (error) {
      console.error('Firebase import error:', error);
      alert('Firebase\'e aktarım sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 📄 PDF İçe Aktarım Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">📄 PDF İçe Aktarım</h1>
        <p className="text-purple-100 text-xs">
          PDF dosyasından otomatik olarak öğrenci verilerini çıkarın ve sisteme aktarın
        </p>
      </div>

      {/* 📤 PDF Yükleme Alanı */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-purple-600 mr-3">📁</span>
          PDF Dosyası Seçin
        </h3>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="text-purple-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {selectedFile ? selectedFile.name : 'PDF dosyasını buraya sürükleyin veya seçin'}
            </p>
            <p className="text-sm text-gray-500">
              Sadece PDF dosyaları desteklenmektedir
            </p>
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center text-green-600">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Dosya seçildi: {selectedFile.name}</span>
            </div>
            <button
              onClick={processPDF}
              disabled={isProcessing}
              className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'İşleniyor...' : '📄 PDF\'i İşle'}
            </button>
          </div>
        )}
      </div>

      {/* 📊 Deneme Bilgileri */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-blue-600 mr-3">📋</span>
            Deneme Bilgileri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deneme Adı *
              </label>
              <input
                type="text"
                value={examInfo.title}
                onChange={(e) => setExamInfo(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Deneme adını girin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deneme Tarihi *
              </label>
              <input
                type="date"
                value={examInfo.date}
                onChange={(e) => setExamInfo(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İlgili Sınıflar (Opsiyonel)
            </label>
            <div className="flex flex-wrap gap-2">
              {CLASS_OPTIONS.map(cls => (
                <label key={cls} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={examInfo.classes.includes(cls)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExamInfo(prev => ({
                          ...prev,
                          classes: [...prev.classes, cls]
                        }));
                      } else {
                        setExamInfo(prev => ({
                          ...prev,
                          classes: prev.classes.filter(c => c !== cls)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{cls}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 📋 Parse Edilen Veri Önizlemesi */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-green-600 mr-3">👥</span>
            Parse Edilen Öğrenci Verileri ({parsedData.length} öğrenci)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Öğrenci Adı</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Sınıf</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Numara</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Türkçe Net</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Matematik Net</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Fen Net</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Toplam Puan</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.class}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.number}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {student.scores?.turkce?.N || 0}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {student.scores?.matematik?.N || 0}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {student.scores?.fen?.N || 0}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">
                      {student.puan || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={importToFirebase}
              disabled={isProcessing || !examInfo.title}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-semibold"
            >
              {isProcessing ? 'Aktarılıyor...' : `🚀 ${parsedData.length} Öğrenciyi Firebase'e Aktar`}
            </button>
          </div>
        </div>
      )}

      {/* 📈 İçe Aktarım Sonuçları */}
      {importResults.total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-indigo-600 mr-3">📊</span>
            İçe Aktarım Sonuçları
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
              <div className="text-blue-800">Toplam Öğrenci</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{importResults.added}</div>
              <div className="text-green-800">Yeni Eklenen</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{importResults.updated}</div>
              <div className="text-orange-800">Güncellenen</div>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">Hatalar:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {importResults.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 📚 Yardım Bilgileri */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <span className="text-blue-600 mr-3">💡</span>
          Nasıl Kullanılır?
        </h3>
        
        <div className="space-y-3 text-blue-800">
          <div className="flex items-start">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
            <div>
              <p className="font-medium">PDF Dosyası Yükleyin</p>
              <p className="text-sm">Deneme sonuçlarınızın bulunduğu PDF dosyasını seçin.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
            <div>
              <p className="font-medium">PDF'i İşleyin</p>
              <p className="text-sm">Sistem PDF'den öğrenci bilgilerini ve skorları otomatik olarak çıkarır.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
            <div>
              <p className="font-medium">Deneme Bilgilerini Girin</p>
              <p className="text-sm">Deneme adı ve tarihini girin, ilgili sınıfları seçin.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
            <div>
              <p className="font-medium">Firebase'e Aktarın</p>
              <p className="text-sm">Parse edilen verileri kontrol edin ve sisteme aktarın.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-100 rounded-lg">
          <p className="text-blue-900 text-sm">
            <strong>📋 Not:</strong> PDF formatınız desteklenmiyorsa, lütfen PDF'in düzenli bir formatta olduğundan emin olun. 
            Öğrenci adları, sınıf bilgileri ve ders skorları açık bir şekilde görünmelidir.
          </p>
        </div>
      </div>
    </div>
  );
};

// Excel İçe Aktarım Tab Component
const ExcelImportTab = ({ students, exams, onDataUpdate }: { 
  students: Student[], 
  exams: Exam[], 
  onDataUpdate: () => void 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [pasteData, setPasteData] = useState('');
  const [examInfo, setExamInfo] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    classes: [] as string[]
  });
  const [importResults, setImportResults] = useState<{
    total: number;
    added: number;
    updated: number;
    errors: string[];
  }>({ total: 0, added: 0, updated: 0, errors: [] });

  // Şablon indirme fonksiyonu
  const downloadTemplate = () => {
    const templateData = [
      ['Öğrenci Adı', 'Sınıf', 'Numara', 'Türkçe (D/Y/B)', 'Tarih (D/Y/B)', 'Din K.ve A.B. (D/Y/B)', 'İngilizce (D/Y/B)', 'Matematik (D/Y/B)', 'Fen (D/Y/B)', 'Toplam (D/Y/B)', 'LGS Neti (N)', 'LGS Puanı'],
      ['Ahmet Yılmaz', '8-A', '1', '20/5/15', '18/7/5', '15/3/2', '16/4/0', '25/8/7', '22/6/2', '116/33/31', '85.2', '425.8'],
      ['Ayşe Demir', '8-B', '2', '22/3/5', '20/5/5', '18/2/0', '18/3/1', '28/6/6', '25/4/1', '131/23/18', '89.5', '465.2'],
      ['Mehmet Kaya', '8-A', '3', '18/8/14', '15/10/5', '12/6/2', '14/6/0', '20/12/8', '19/8/3', '98/50/32', '76.3', '380.1'],
      ['Fatma Özkan', '8-C', '4', '24/1/5', '22/3/5', '20/1/1', '19/2/1', '30/3/7', '27/2/1', '142/12/20', '92.8', '495.7'],
      ['Ali Çelik', '8-B', '5', '19/6/15', '17/8/5', '14/5/1', '15/5/0', '23/9/8', '21/7/2', '109/40/31', '81.6', '410.3']
    ];

    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'lgs_ogrenci_veri_sablonu.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // LGS D/Y/B formatını parse etme fonksiyonu
  const parseDYBFormat = (dybString: string): { D: number, Y: number, B: number, net: number } => {
    const parts = dybString.split('/');
    const D = parseInt(parts[0]) || 0;
    const Y = parseInt(parts[1]) || 0;
    const B = parseInt(parts[2]) || 0;
    // LGS net hesaplama: Net = Doğru - (Yanlış/4)
    const net = D - (Y / 4);
    
    return { D, Y, B, net: Math.round(net * 10) / 10 };
  };

  // CSV/Excel veri parsing fonksiyonu
  const parseCSVData = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    const students: any[] = [];
    
    // Header satırını atla (eğer varsa)
    const dataLines = lines.slice(1);
    
    dataLines.forEach((line, index) => {
      if (!line.trim()) return;
      
      // Virgül ile ayrılmış veriyi parse et
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      
      if (columns.length >= 12) {
        // LGS D/Y/B formatını parse et
        const turkceData = parseDYBFormat(columns[3] || '0/0/0');
        const matematikData = parseDYBFormat(columns[7] || '0/0/0');
        const fenData = parseDYBFormat(columns[8] || '0/0/0');
        
        const student = {
          name: columns[0] || '',
          class: columns[1] || '',
          number: columns[2] || '',
          turkce: turkceData.net,
          matematik: matematikData.net,
          fen: fenData.net,
          puan: parseFloat(columns[11]) || 0, // LGS Puanı
          scores: {
            turkce: { D: turkceData.D, Y: turkceData.Y, N: turkceData.net, B: turkceData.B },
            matematik: { D: matematikData.D, Y: matematikData.Y, N: matematikData.net, B: matematikData.B },
            fen: { D: fenData.D, Y: fenData.Y, N: fenData.net, B: fenData.B }
          },
          // LGS ek bilgileri
          tarih: parseDYBFormat(columns[4] || '0/0/0'),
          din: parseDYBFormat(columns[5] || '0/0/0'),
          ingilizce: parseDYBFormat(columns[6] || '0/0/0'),
          toplam: parseDYBFormat(columns[9] || '0/0/0'),
          lgsNeti: parseFloat(columns[10]) || 0
        };
        students.push(student);
      }
    });
    
    return students;
  };

  // Excel dosyasını okuma
  const readExcelFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Dosya seçme işlemi
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
      setParsedData([]);
    } else {
      alert('Lütfen bir CSV veya Excel dosyası seçin.');
    }
  };

  // Excel/CSV'i işleme
  const processExcel = async () => {
    let text = '';
    
    if (importMode === 'file' && selectedFile) {
      setIsProcessing(true);
      try {
        text = await readExcelFile(selectedFile);
      } catch (error) {
        console.error('File reading error:', error);
        alert('Dosya okunurken bir hata oluştu.');
        setIsProcessing(false);
        return;
      }
    } else if (importMode === 'paste' && pasteData.trim()) {
      text = pasteData;
    } else {
      alert('Lütfen bir dosya seçin veya veri yapıştırın.');
      return;
    }
    
    try {
      const parsed = parseCSVData(text);
      setParsedData(parsed);
      if (parsed.length === 0) {
        alert('Hiç veri bulunamadı. Lütfen formatı kontrol edin.');
      }
    } catch (error) {
      console.error('Parsing error:', error);
      alert('Veri parse edilirken bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Firebase'e veri aktarımı
  const importToFirebase = async () => {
    if (parsedData.length === 0) return;
    
    setIsProcessing(true);
    const results = {
      total: parsedData.length,
      added: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Deneme bilgilerini kontrol et/oluştur
      let examId = '';
      const existingExam = exams.find(e => 
        e.title === examInfo.title && e.date === examInfo.date
      );
      
      if (existingExam) {
        examId = existingExam.id;
      } else {
        const newExam: Omit<Exam, 'id'> = {
          title: examInfo.title,
          date: examInfo.date,
          classes: examInfo.classes.length > 0 ? examInfo.classes : undefined
        };
        examId = await addExam(newExam);
      }

      // Her öğrenci için sonuç oluştur
      for (const studentData of parsedData) {
        try {
          let student = students.find(s => 
            s.name === studentData.name && s.class === studentData.class
          );
          
          if (!student) {
            const newStudent: Omit<Student, 'id'> = {
              name: studentData.name,
              class: studentData.class,
              number: studentData.number || "0",
              viewCount: 0,
              lastViewDate: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            
            const studentId = await addStudent(newStudent);
            student = { ...newStudent, id: studentId };
            results.added++;
          } else {
            results.updated++;
          }

          const nets: Result['nets'] = { 
            total: (studentData.turkce || 0) + (studentData.matematik || 0) + (studentData.fen || 0),
            turkce: studentData.turkce || 0,
            matematik: studentData.matematik || 0,
            fen: studentData.fen || 0
          };

          const newResult: Omit<Result, 'id'> = {
            studentId: student.id,
            examId,
            nets,
            scores: {
              puan: studentData.puan || 0,
              ...studentData.scores
            },
            createdAt: new Date().toISOString()
          };
          
          await addResult(newResult);
        } catch (error) {
          console.error('Student import error:', error);
          results.errors.push(`Öğrenci ${studentData.name}: ${error}`);
        }
      }
      
      setImportResults(results);
      onDataUpdate();
      alert(`İçe aktarım tamamlandı! ${results.added} yeni öğrenci eklendi, ${results.updated} güncellendi.`);
      
    } catch (error) {
      console.error('Firebase import error:', error);
      alert('Firebase\'e aktarım sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 📊 Excel İçe Aktarım Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">📊 Excel/CSV İçe Aktarım</h1>
        <p className="text-green-100 text-xs">
          Excel (.xlsx) veya CSV dosyalarından öğrenci verilerini hızlıca sisteme aktarın
        </p>
      </div>

      {/* 📋 İçe Aktarım Modu Seçimi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">İçe Aktarım Yöntemi</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setImportMode('file')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              importMode === 'file' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📁 Dosya Yükle
          </button>
          <button
            onClick={() => setImportMode('paste')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              importMode === 'paste' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 Yapıştır
          </button>
        </div>
      </div>

      {/* 📥 Şablon İndirme */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-blue-600 mr-3">📥</span>
          Excel Şablonu İndir
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              LGS sınav sonuçları için hazır şablonu indirin. Şablondaki örnek verileri kendi verilerinizle değiştirin.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• D/Y/B Formatı: Doğru/Yanlış/Boş (örn: 20/5/15 = 20 doğru, 5 yanlış, 15 boş)</li>
              <li>• Net Hesaplama: Net = Doğru - (Yanlış/4)</li>
              <li>• LGS Neti: Tüm derslerin toplam neti</li>
              <li>• LGS Puanı: 100-500 arası puan aralığı</li>
            </ul>
          </div>
          <button
            onClick={downloadTemplate}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Şablon İndir (.CSV)
          </button>
        </div>
      </div>

      {/* 📤 Dosya Yükleme veya Veri Yapıştırma */}
      {importMode === 'file' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-green-600 mr-3">📁</span>
            Dosya Seçin
          </h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <div className="text-green-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {selectedFile ? selectedFile.name : 'Excel/CSV dosyasını buraya sürükleyin veya seçin'}
              </p>
              <p className="text-sm text-gray-500">
                CSV, XLSX veya XLS dosyaları desteklenmektedir
              </p>
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-blue-600 mr-3">📋</span>
            Veri Yapıştır
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Excel'den veya Google Sheets'ten verileri kopyalayıp buraya yapıştırın:
          </p>
          <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Öğrenci Adı, Sınıf, Numara, Türkçe (D/Y/B), Tarih (D/Y/B), Din K.ve A.B. (D/Y/B), İngilizce (D/Y/B), Matematik (D/Y/B), Fen (D/Y/B), Toplam (D/Y/B), LGS Neti (N), LGS Puanı&#10;Ahmet Yılmaz, 8-A, 1, 20/5/15, 18/7/5, 15/3/2, 16/4/0, 25/8/7, 22/6/2, 116/33/31, 85.2, 425.8"
            className="w-full h-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
          />
        </div>
      )}

      {/* Process Button */}
      {(selectedFile || pasteData.trim()) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-center">
            <button
              onClick={processExcel}
              disabled={isProcessing}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-semibold"
            >
              {isProcessing ? 'İşleniyor...' : '📊 Veriyi İşle'}
            </button>
          </div>
        </div>
      )}

      {/* 📊 Deneme Bilgileri */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-blue-600 mr-3">📋</span>
            Deneme Bilgileri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deneme Adı *
              </label>
              <input
                type="text"
                value={examInfo.title}
                onChange={(e) => setExamInfo(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Deneme adını girin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deneme Tarihi *
              </label>
              <input
                type="date"
                value={examInfo.date}
                onChange={(e) => setExamInfo(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İlgili Sınıflar (Opsiyonel)
            </label>
            <div className="flex flex-wrap gap-2">
              {CLASS_OPTIONS.map(cls => (
                <label key={cls} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={examInfo.classes.includes(cls)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExamInfo(prev => ({
                          ...prev,
                          classes: [...prev.classes, cls]
                        }));
                      } else {
                        setExamInfo(prev => ({
                          ...prev,
                          classes: prev.classes.filter(c => c !== cls)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{cls}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 📋 Parse Edilen Veri Önizlemesi */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-green-600 mr-3">👥</span>
            Parse Edilen Öğrenci Verileri ({parsedData.length} öğrenci)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Öğrenci Adı</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Sınıf</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Numara</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Türkçe Net</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Matematik Net</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Fen Net</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Toplam Puan</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.class}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.number}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.turkce}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.matematik}</td>
                    <td className="border border-gray-300 px-4 py-2">{student.fen}</td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold">{student.puan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={importToFirebase}
              disabled={isProcessing || !examInfo.title}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-semibold"
            >
              {isProcessing ? 'Aktarılıyor...' : `🚀 ${parsedData.length} Öğrenciyi Firebase'e Aktar`}
            </button>
          </div>
        </div>
      )}

      {/* 📈 İçe Aktarım Sonuçları */}
      {importResults.total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-indigo-600 mr-3">📊</span>
            İçe Aktarım Sonuçları
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{importResults.total}</div>
              <div className="text-blue-800">Toplam Öğrenci</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{importResults.added}</div>
              <div className="text-green-800">Yeni Eklenen</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{importResults.updated}</div>
              <div className="text-orange-800">Güncellenen</div>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">Hatalar:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {importResults.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 📚 Format Yardımı */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
          <span className="text-green-600 mr-3">💡</span>
          Desteklenen Formatlar
        </h3>
        
        <div className="space-y-3 text-green-800">
          <div>
            <p className="font-medium">📊 Excel/CSV Format:</p>
            <p className="text-sm">Öğrenci Adı, Sınıf, Numara, Türkçe Net, Matematik Net, Fen Net, Toplam Puan</p>
          </div>
          
          <div>
            <p className="font-medium">📋 Örnek Veri:</p>
            <pre className="bg-green-100 p-2 rounded text-xs">
{`Ahmet Yılmaz, 8-A, 1, 15.2, 12.8, 14.5, 425
Ayşe Demir, 8-B, 2, 16.1, 11.9, 15.2, 432
Mehmet Kaya, 8-A, 3, 14.8, 13.5, 13.9, 418`}
            </pre>
          </div>
          
          <div className="bg-green-100 p-3 rounded">
            <p className="text-green-900 text-sm">
              <strong>💡 İpucu:</strong> Excel'den verileri kopyalayıp "Yapıştır" modunda doğrudan buraya yapıştırabilirsiniz. 
              Bu yöntem PDF'den çok daha hızlı ve güvenilirdir!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ana Tab Interface
interface Tab {
  key: string;
  label: string;
}

const TABS: Tab[] = [
  { key: "home", label: "🏠 Ana Sayfa" },
  { key: "sinif", label: "🏛️ Sınıf Yönetimi" },
  { key: "deneme", label: "📋 Deneme Yönetimi" },
  { key: "bireysel", label: "👨‍🎓 Bireysel Veri" },
  { key: "toplu", label: "👥 Toplu Veri" },
  { key: "excel-import", label: "📊 Excel İçe Aktar" },
  { key: "kitap-sinavi", label: "📚 Kitap Sınavı" },
  { key: "odev-takibi", label: "📝 Ödev Takibi" },
  { key: "eksik-konu", label: "📊 Deneme Değerlendirme" },

  { key: "hedef", label: "🎯 Hedef Belirleme" },
  { key: "lgs-hesaplama", label: "🧮 LGS Puan Hesaplama" },
  { key: "analytics", label: "📊 Analitik & Raporlar" },
  { key: "van-taban-puan", label: "🎓 Lise Taban Puanları" },
  { key: "puan-bazli-tavsiye", label: "🎯 Puan Bazlı Tavsiye" },
  { key: "okuma-sinavi", label: "📚 Okuma Sınavı" },
  { key: "brans-denemesi", label: "📝 Branş Denemesi" },
  { key: "basari-rozetleri", label: "🏆 Başarı Rozetleri" }
];

// 📊 DERS RENK KODLAMASI - Görsel iyileştirme
const COURSE_COLORS = {
  turkce: "#10B981", // Yeşil
  matematik: "#F59E0B", // Turuncu  
  fen: "#3B82F6", // Mavi
  sosyal: "#8B5CF6", // Mor
  ingilizce: "#EF4444", // Kırmızı
  din: "#F97316", // Koyu Turuncu
  kimya: "#06B6D4", // Cyan
  biyoloji: "#84CC16", // Lime
  tarih: "#EC4899", // Pembe
  cografya: "#6366F1" // İndigo
};

const COURSES = {
  elementary: [ // İlkokul (2, 3, 4, 5. Sınıf)
    { key: "turkce", label: "Türkçe", grades: ["2", "3", "4", "5"], color: COURSE_COLORS.turkce },
    { key: "sosyal", label: "Sosyal Bilgiler", grades: ["4", "5"], color: COURSE_COLORS.sosyal },
    { key: "din", label: "Din Kültürü ve Ahlak Bilgisi", grades: ["4", "5"], color: COURSE_COLORS.din },
    { key: "ingilizce", label: "İngilizce", grades: ["2", "3", "4", "5"], color: COURSE_COLORS.ingilizce },
    { key: "matematik", label: "Matematik", grades: ["2", "3", "4", "5"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fen Bilimleri", grades: ["3", "4", "5"], color: COURSE_COLORS.fen },
    { key: "hayat", label: "Hayat Bilgisi", grades: ["2", "3"], color: "#F59E0B" }
  ],
  middle: [ // Ortaokul (6,7,8. Sınıf)
    { key: "turkce", label: "Türkçe", grades: ["6", "7", "8"], color: COURSE_COLORS.turkce },
    { key: "sosyal", label: "Sosyal Bilgiler", grades: ["6", "7", "8"], color: COURSE_COLORS.sosyal },
    { key: "din", label: "Din Kültürü ve Ahlak Bilgisi", grades: ["6", "7", "8"], color: COURSE_COLORS.din },
    { key: "ingilizce", label: "İngilizce", grades: ["6", "7", "8"], color: COURSE_COLORS.ingilizce },
    { key: "matematik", label: "Matematik", grades: ["6", "7", "8"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fen Bilimleri", grades: ["6", "7", "8"], color: COURSE_COLORS.fen }
  ],
  high: [ // Lise (9,10,11,12. Sınıf)
    { key: "turkce", label: "Türk Dili ve Edebiyatı", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.turkce },
    { key: "matematik", label: "Matematik", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.matematik },
    { key: "fen", label: "Fizik", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.fen },
    { key: "kimya", label: "Kimya", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.kimya },
    { key: "biyoloji", label: "Biyoloji", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.biyoloji },
    { key: "sosyal", label: "Tarih", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.tarih },
    { key: "cografya", label: "Coğrafya", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.cografya },
    { key: "ingilizce", label: "İngilizce", grades: ["9", "10", "11", "12"], color: COURSE_COLORS.ingilizce }
  ]
};

// CLASS_OPTIONS
const CLASS_OPTIONS = [
  "2-A", "3-A", "4-A", "5-A", "6-A", "7-A", "8-A"
];

// Yardımcı fonksiyonlar
const normalizeClassName = (className: string) => {
  const grade = className.split('-')[0];
  const letter = className.split('-')[1];
  return `${grade}-${letter}`;
};

const getCoursesByClass = (className: string) => {
  const grade = className.split('-')[0];
  const gradeNum = parseInt(grade);
  
  if (gradeNum <= 5) {
    return COURSES.elementary.filter(course => course.grades.includes(grade));
  } else if (gradeNum <= 8) {
    return COURSES.middle.filter(course => course.grades.includes(grade));
  } else {
    return COURSES.high.filter(course => course.grades.includes(grade));
  }
};

const calcNet = (dogru: number, yanlis: number) => {
  return dogru - (yanlis * 0.33);
};

const getLGSCourses = () => [
  { key: "turkce", label: "Türkçe", color: COURSE_COLORS.turkce },
  { key: "matematik", label: "Matematik", color: COURSE_COLORS.matematik },
  { key: "fen", label: "Fen", color: COURSE_COLORS.fen },
  { key: "sosyal", label: "Sosyal", color: COURSE_COLORS.sosyal },
  { key: "ingilizce", label: "İngilizce", color: COURSE_COLORS.ingilizce }
];

const getCourseEmoji = (courseKey: string) => {
  const emojiMap: Record<string, string> = {
    turkce: "📚",
    matematik: "🔢",
    fen: "🔬",
    sosyal: "🌍",
    ingilizce: "🇺🇸",
    din: "🕌",
    kimya: "⚗️",
    biyoloji: "🧬",
    tarih: "📜",
    cografya: "🗺️"
  };
  return emojiMap[courseKey] || "📖";
};

// Ana Component
export default function FoncsDataEntry() {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Lise veritabanı (LGS ve OBP verileri)
  const lgsSchools = [
    {
      name: "Van Türk Telekom Fen Lisesi",
      type: "Fen Lisesi", 
      score: "460.91",
      percentile: "2.51",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İpekyolu Borsa İstanbul Fen Lisesi",
      type: "Fen Lisesi",
      score: "441.61",
      percentile: "4.67",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Tuşba TOBB Fen Lisesi",
      type: "Fen Lisesi",
      score: "422.90",
      percentile: "7.20",
      capacity: "150",
      district: "Tuşba"
    },
    {
      name: "Niyazi Türkmenoğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "416.75",
      percentile: "8.09",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Erciş Fen Lisesi",
      type: "Fen Lisesi",
      score: "402.18",
      percentile: "10.39",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Kazım Karabekir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "400.23",
      percentile: "10.71",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Şehit Erdoğan Cınbıroğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "412.45",
      percentile: "9.12",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Van Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "408.32",
      percentile: "9.87",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Atatürk Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "405.78",
      percentile: "10.23",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Mehmet Akif Ersoy Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "402.15",
      percentile: "10.58",
      capacity: "150",
      district: "İpekyolu"
    }
  ];

  const obpSchools = [
    {
      name: "Mesut Özata Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "91.09",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Özen Adalı Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.66",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Mehmet Akif Ersoy Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "88.96",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Arif Nihat Asya Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.39",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Faki Teyran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "85.96",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İki Nisan Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.93",
      capacity: "150",
      district: "İpekyolu"
    }
  ];
  
  // Hedef Belirleme için state'ler
  const [studentTargets, setStudentTargets] = useState<{[studentId: string]: {[subject: string]: number}}>({});
  const [studentScoreTargets, setStudentScoreTargets] = useState<{[studentId: string]: number}>({});
  const [selectedStudentForTarget, setSelectedStudentForTarget] = useState<string>('');
  const [selectedTargetClass, setSelectedTargetClass] = useState<string | undefined>();

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, examsData, resultsData, targetsData] = await Promise.all([
        getStudents(),
        getExams(), 
        getResults(),
        getAllTargets()
      ]);
      
      // Puan hedeflerini de getir (tüm öğrenciler için)
      const scoreTargetsData: {[studentId: string]: number} = {};
      await Promise.all(
        studentsData.map(async (student) => {
          try {
            const scoreTarget = await getStudentScoreTarget(student.id);
            if (scoreTarget) {
              scoreTargetsData[student.id] = scoreTarget;
            }
          } catch (error) {
            console.error(`Puan hedefi çekilemedi (${student.id}):`, error);
            scoreTargetsData[student.id] = 450; // Varsayılan değer
          }
        })
      );
      
      setStudents(studentsData);
      setExams(examsData);
      setResults(resultsData);
      setStudentTargets(targetsData);
      setStudentScoreTargets(scoreTargetsData);
    } catch (error) {
      console.error('Data loading error:', error);
      showToast("Veriler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Firebase'den fresh veri yükle
  const loadDataFromFirebase = async () => {
    try {
      const [studentsData, examsData, resultsData] = await Promise.all([
        getStudents(),
        getExams(),
        getResults()
      ]);
      
      setStudents(studentsData);
      setExams(examsData);
      setResults(resultsData);
    } catch (error) {
      console.error('Firebase data load error:', error);
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // 📊 ANA HOME TAB - DASHBOARD
  const HomeTab = () => {
    // Her öğrencinin deneme performanslarını hesapla
    const studentPerformance = useMemo(() => {
      return students.map(student => {
        const studentResults = results
          .filter(r => r.studentId === student.id)
          .sort((a, b) => {
            const examA = exams.find(e => e.id === a.examId);
            const examB = exams.find(e => e.id === b.examId);
            if (!examA || !examB) return 0;
            return new Date(examB.date).getTime() - new Date(examA.date).getTime();
          });

        const totalExams = studentResults.length;
        
        // ✅ DÜZELTİLMİŞ ORTALAMA HESAPLAMA - Sadece ders netleri
        const avgNet = totalExams > 0 
          ? studentResults.reduce((sum: number, r) => {
              // Sadece ders netlerini al (total field'ını hariç tut)
              const subjectNets = Object.entries(r.nets || {}).filter(([key]) => key !== 'total');
              const totalNet = subjectNets.reduce((netSum: number, [, score]) => netSum + (Number(score) || 0), 0);
              return sum + totalNet;
            }, 0) / totalExams
          : 0;
        
        // Son hesaplama
        if (student.name === 'Şükrüye Akpınar') {
          console.log(`✅ ŞÜKRÜYE FINAL (Ders Bazında): avgNet = ${avgNet.toFixed(2)}`);
        }

        const lastResult = studentResults[0];
        const lastExam = lastResult ? exams.find(e => e.id === lastResult.examId) : null;

        return {
          ...student,
          totalExams,
          avgNet,
          avgPuan: totalExams > 0 
            ? (() => {
                // Her iki alandan da puan bilgisini al ve birleştir
                const allScores: number[] = [];
                
                studentResults.forEach(r => {
                  // r.puan alanından
                  if (r.puan != null && r.puan > 0) {
                    allScores.push(Number(r.puan));
                  }
                  
                  // r.scores?.puan alanından (string ise number'a çevir)
                  if (r.scores?.puan != null) {
                    const scoreValue = typeof r.scores.puan === 'string' ? parseFloat(r.scores.puan) : r.scores.puan;
                    if (scoreValue > 0) {
                      allScores.push(scoreValue);
                    }
                  }
                });
                
                return allScores.length > 0 
                  ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
                  : 0;
              })()
            : 0,
          lastExam: lastExam?.title || 'Deneme yok',
          lastDate: lastExam ? new Date(lastExam.date).toLocaleDateString('tr-TR') : 'N/A',
          lastNet: lastResult ? Object.entries(lastResult.nets || {}).filter(([key]) => key !== 'total').reduce((sum: number, [, score]) => sum + (Number(score) || 0), 0) : 0
        };
      });
    }, [students, results, exams]);

    // En başarılı öğrenciler (Net) - Sınıf grupları
    const topStudentsByNetByClass = useMemo(() => {
      const classGroups = studentPerformance.reduce((acc, student) => {
        if (!acc[student.class]) acc[student.class] = [];
        acc[student.class].push(student);
        return acc;
      }, {} as Record<string, typeof studentPerformance>);

      const classRankings: Record<string, typeof studentPerformance> = {};
      Object.entries(classGroups).forEach(([className, students]) => {
        classRankings[className] = students
          .sort((a, b) => b.avgNet - a.avgNet)
          .slice(0, 5);
      });

      return classRankings;
    }, [studentPerformance]);

    // En başarılı öğrenciler (Puan) - Sınıf grupları
    const topStudentsByScoreByClass = useMemo(() => {
      const classGroups = studentPerformance.reduce((acc, student) => {
        if (!acc[student.class]) acc[student.class] = [];
        acc[student.class].push(student);
        return acc;
      }, {} as Record<string, typeof studentPerformance>);

      const classRankings: Record<string, typeof studentPerformance> = {};
      Object.entries(classGroups).forEach(([className, students]) => {
        classRankings[className] = students
          .sort((a, b) => b.avgPuan - a.avgPuan)
          .slice(0, 5);
      });

      return classRankings;
    }, [studentPerformance]);

    // Son eklenen denemeler
    const recentExams = useMemo(() => {
      return [...exams]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    }, [exams]);

    // Genel istatistikler
    const stats = useMemo(() => {
      const totalStudents = students.length;
      const totalExams = exams.length;
      const totalResults = results.length;
      const avgStudentsPerExam = totalExams > 0 ? Math.round(totalResults / totalExams) : 0;
      
      // Görüntülenme istatistikleri
      const totalViews = students.reduce((sum, student) => sum + (student.viewCount || 0), 0);
      const activeStudents = students.filter(student => (student.viewCount || 0) > 0).length;
      const avgViewsPerStudent = totalStudents > 0 ? Math.round(totalViews / totalStudents) : 0;
      
      return {
        totalStudents,
        totalExams,
        totalResults,
        avgStudentsPerExam,
        totalViews,
        activeStudents,
        avgViewsPerStudent
      };
    }, [students, exams, results]);

    return (
      <div className="space-y-8">
        {/* 🏆 Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <img 
                src="/projelogo.png" 
                alt="Proje Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">📊 Başarı Takip Sistemi</h1>
              <p className="text-blue-100 text-sm">
                Öğrencilerinizin akademik başarılarını takip edin ve analiz edin
              </p>
            </div>
          </div>
        </div>

        {/* 📈 Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Öğrenci</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <span className="text-xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Deneme</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <span className="text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Sonuç</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalResults}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded-full">
                <span className="text-xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Toplam Görüntülenme</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
              </div>
              <div className="bg-yellow-100 p-2 rounded-full">
                <span className="text-xl">👁️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Aktif Öğrenci</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
              </div>
              <div className="bg-indigo-100 p-2 rounded-full">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs">Ort. Görüntülenme</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgViewsPerStudent}</p>
              </div>
              <div className="bg-cyan-100 p-2 rounded-full">
                <span className="text-xl">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🏆 Top Students */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-3">
              <span className="bg-yellow-100 p-2 rounded-lg">🏆</span>
              En Başarılı Öğrenciler (Ortalama Net)
            </h3>
          </div>
          <div className="space-y-6">
            {Object.keys(topStudentsByNetByClass).length > 0 ? (
              Object.entries(topStudentsByNetByClass).map(([className, students]) => (
                <div key={className} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <span className="bg-green-100 p-1 rounded text-xs">🎯</span>
                      {className}
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {students.length > 0 ? (
                      students.map((student, index) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{(student.avgNet || 0).toFixed(2)} net</p>
                            <p className="text-xs text-gray-500">{student.totalExams} deneme</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4 text-sm">Bu sınıfta henüz deneme sonucu bulunmamaktadır.</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz sonuç bulunmamaktadır.</p>
            )}
          </div>
        </div>

        {/* 🏅 En Başarılı Öğrenciler (Ortalama Puan) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-3">
              <span className="bg-purple-100 p-2 rounded-lg">🏅</span>
              En Başarılı Öğrenciler (Ortalama Puan)
            </h3>
          </div>
          <div className="space-y-6">
            {Object.keys(topStudentsByScoreByClass).length > 0 ? (
              Object.entries(topStudentsByScoreByClass).map(([className, students]) => (
                <div key={className} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <span className="bg-purple-100 p-1 rounded text-xs">🎯</span>
                      {className}
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {students.length > 0 ? (
                      students.map((student, index) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-purple-600">{(student.avgPuan || 0).toFixed(0)} puan</p>
                            <p className="text-xs text-gray-500">{student.totalExams} deneme</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4 text-sm">Bu sınıfta henüz deneme sonucu bulunmamaktadır.</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz sonuç bulunmamaktadır.</p>
            )}
          </div>
        </div>

        {/* 📋 Recent Exams */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-800 flex items-center gap-3">
              <span className="bg-blue-100 p-2 rounded-lg">📋</span>
              Son Eklenen Denemeler
            </h3>
          </div>
          <div className="p-6">
            {recentExams.length > 0 ? (
              <div className="space-y-4">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{exam.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(exam.date).toLocaleDateString('tr-TR')} • {exam.classes?.join(', ') || 'Tüm sınıflar'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {results.filter(r => r.examId === exam.id).length} sonuç
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz deneme bulunmamaktadır.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 🎓 STUDENT MANAGEMENT TAB
  const StudentTab = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentForm, setStudentForm] = useState({
      name: '',
      class: '',
      number: '0',
      viewCount: 0,
      lastViewDate: new Date().toISOString()
    });
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [assigningPins, setAssigningPins] = useState(false);

    const handleAddStudent = async () => {
      if (!studentForm.name.trim() || !studentForm.class) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingStudents(true);
        const newStudent: Omit<Student, 'id'> = {
          name: studentForm.name.trim(),
          class: studentForm.class,
          number: studentForm.number || "0",
          viewCount: 0,
          lastViewDate: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        
        await addStudent(newStudent);
        await loadData();
        
        // Formu temizle
        setStudentForm({
          name: '',
          class: '',
          number: '0',
          viewCount: 0,
          lastViewDate: new Date().toISOString()
        });
        setShowAddForm(false);
        
        showToast("Öğrenci başarıyla eklendi! (PIN otomatik atandı)", "success");
      } catch (error) {
        console.error('Add student error:', error);
        showToast("Öğrenci eklenirken hata oluştu", "error");
      } finally {
        setLoadingStudents(false);
      }
    };

    // Tüm öğrencilere PIN ata
    const handleAssignPinsToAll = async () => {
      if (!confirm('Tüm öğrencilere otomatik PIN atanacak. Devam etmek istiyor musunuz?')) {
        return;
      }

      try {
        setAssigningPins(true);
        const result = await assignPinsToAllStudents();
        await loadData();
        
        if (result.errors.length === 0) {
          showToast(`✅ ${result.updated} öğrenciye başarıyla PIN atandı!`, "success");
        } else {
          showToast(`⚠️ ${result.updated} öğrenciye PIN atandı, ${result.errors.length} hata oluştu`, "info");
          console.log('Hatalar:', result.errors);
        }
      } catch (error) {
        console.error('PIN atama hatası:', error);
        showToast("PIN atama işlemi sırasında hata oluştu", "error");
      } finally {
        setAssigningPins(false);
      }
    };

    const handleUpdateStudent = async () => {
      if (!editingStudent || !studentForm.name.trim() || !studentForm.class) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingStudents(true);
        const updatedStudent: Partial<Student> = {
          name: studentForm.name.trim(),
          class: studentForm.class,
          number: studentForm.number || "0"
        };
        
        await updateStudent(editingStudent.id, updatedStudent);
        await loadData();
        
        setEditingStudent(null);
        setStudentForm({
          name: '',
          class: '',
          number: '0',
          viewCount: 0,
          lastViewDate: new Date().toISOString()
        });
        
        showToast("Öğrenci başarıyla güncellendi!", "success");
      } catch (error) {
        console.error('Update student error:', error);
        showToast("Öğrenci güncellenirken hata oluştu", "error");
      } finally {
        setLoadingStudents(false);
      }
    };

    const handleDeleteStudent = async (student: Student) => {
      if (!confirm(`${student.name} öğrencisini silmek istediğinizden emin misiniz?`)) {
        return;
      }

      try {
        await deleteStudent(student.id);
        await loadData();
        showToast("Öğrenci başarıyla silindi!", "success");
      } catch (error) {
        console.error('Delete student error:', error);
        showToast("Öğrenci silinirken hata oluştu", "error");
      }
    };

    const startEdit = (student: Student) => {
      setEditingStudent(student);
      setStudentForm({
        name: student.name,
        class: student.class,
        number: student.number || "0",
        viewCount: student.viewCount || 0,
        lastViewDate: student.lastViewDate || new Date().toISOString()
      });
      setShowAddForm(true);
    };

    const cancelEdit = () => {
      setEditingStudent(null);
      setShowAddForm(false);
      setStudentForm({
        name: '',
        class: '',
        number: '0',
        viewCount: 0,
        lastViewDate: new Date().toISOString()
      });
    };

    return (
      <div className="space-y-8">
        {/* 🎓 Student Management Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">🎓 Öğrenci Yönetimi</h1>
          <p className="text-indigo-100 text-xs">
            Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin
          </p>
        </div>

        {/* Add/Edit Student Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-semibold text-gray-800 mb-4">
              {editingStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Öğrenci Adı *
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Öğrenci adını girin"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Sınıf *
                </label>
                <select
                  value={studentForm.class}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, class: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Sınıf seçin</option>
                  {CLASS_OPTIONS.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Numara
                </label>
                <input
                  type="text"
                  value={studentForm.number}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, number: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Öğrenci numarası"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={editingStudent ? handleUpdateStudent : handleAddStudent}
                disabled={loadingStudents}
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {loadingStudents ? 'Kaydediliyor...' : (editingStudent ? 'Güncelle' : 'Kaydet')}
              </button>
              <button
                onClick={cancelEdit}
                disabled={loadingStudents}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add Student Button and PIN Management */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Öğrenci Listesi</h2>
          <div className="flex gap-3">
            <button
              onClick={handleAssignPinsToAll}
              disabled={assigningPins}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
            >
              {assigningPins ? '🔄 PIN Atanıyor...' : '🔐 Tüm Öğrencilere PIN Ata'}
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              + Yeni Öğrenci
            </button>
          </div>
        </div>

        {/* 📚 Sınıf Bazında Kategorize Edilmiş Öğrenci Listesi */}
        <div className="space-y-6">
          {/* Sınıf İstatistikleri */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            {CLASS_OPTIONS.map(cls => {
              const classStudentCount = students.filter(s => s.class === cls).length;
              return (
                <div key={cls} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{classStudentCount}</div>
                  <div className="text-xs text-gray-600">{cls} Sınıfı</div>
                </div>
              );
            })}
          </div>

          {/* Sınıf Bazında Öğrenci Grupları */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {CLASS_OPTIONS.map(className => {
              const classStudents = students.filter(s => s.class === className);
              const grade = className.split('-')[0];
              
              return (
                <div key={className} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className={`px-6 py-4 border-b border-gray-200 ${
                    grade === '8' ? 'bg-gradient-to-r from-red-50 to-red-100' :
                    grade === '7' ? 'bg-gradient-to-r from-orange-50 to-orange-100' :
                    grade === '6' ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' :
                    'bg-gradient-to-r from-blue-50 to-blue-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          grade === '8' ? 'bg-red-500' :
                          grade === '7' ? 'bg-orange-500' :
                          grade === '6' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          {grade}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{className}</h3>
                          <p className="text-xs text-gray-600">{classStudents.length} öğrenci</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {classStudents.length > 0 ? '✅ Aktif' : '⏳ Boş'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {classStudents.length > 0 ? (
                      <div className="p-4 space-y-2">
                        {classStudents.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-900">{student.name}</div>
                                <div className="text-xs text-gray-500">No: {student.number}</div>
                                {student.pin && (
                                  <div className="text-xs text-blue-600 font-medium">PIN: {student.pin}</div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {student.createdAt ? new Date(student.createdAt).toLocaleDateString('tr-TR') : 'N/A'}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => startEdit(student)}
                                  className="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                >
                                  Düzenle
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student)}
                                  className="text-xs px-2 py-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                >
                                  Sil
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-xs">Bu sınıfta henüz öğrenci bulunmuyor</p>
                        <p className="text-xs text-gray-400 mt-1">Öğrenci eklemek için yukarıdaki formu kullanın</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toplam Özet */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">{students.length}</div>
                <div className="text-indigo-100">Toplam Öğrenci</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{new Set(students.map(s => s.class)).size}</div>
                <div className="text-indigo-100">Aktif Sınıf</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{Math.round(students.length / Math.max(new Set(students.map(s => s.class)).size, 1))}</div>
                <div className="text-indigo-100">Ortalama Sınıf Öğrenci</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 📋 EXAM MANAGEMENT TAB
  const ExamTab = () => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [examForm, setExamForm] = useState({
      title: '',
      date: new Date().toISOString().split('T')[0],
      classes: [] as string[]
    });
    const [generalAverages, setGeneralAverages] = useState<{ [className: string]: { [key: string]: any; generalScore?: number } }>({});
    const [loadingExams, setLoadingExams] = useState(false);

    const handleAddExam = async () => {
      if (!examForm.title.trim() || !examForm.date) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingExams(true);
        const newExam: Omit<Exam, 'id'> = {
          title: examForm.title.trim(),
          date: examForm.date,
          classes: examForm.classes.length > 0 ? examForm.classes : undefined,
          generalAverages: Object.keys(generalAverages).length > 0 ? generalAverages : undefined
        };
        
        await addExam(newExam);
        await loadData();
        
        setExamForm({
          title: '',
          date: new Date().toISOString().split('T')[0],
          classes: []
        });
        setShowAddForm(false);
        
        showToast("Deneme başarıyla eklendi!", "success");
      } catch (error) {
        console.error('Add exam error:', error);
        showToast("Deneme eklenirken hata oluştu", "error");
      } finally {
        setLoadingExams(false);
      }
    };

    const handleUpdateExam = async () => {
      if (!editingExam || !examForm.title.trim() || !examForm.date) {
        showToast("Lütfen tüm alanları doldurun", "error");
        return;
      }

      try {
        setLoadingExams(true);
        const updatedExam: Partial<Exam> = {
          title: examForm.title.trim(),
          date: examForm.date,
          classes: examForm.classes.length > 0 ? examForm.classes : undefined,
          generalAverages: Object.keys(generalAverages).length > 0 ? generalAverages : undefined
        };
        
        await updateExam(editingExam.id, updatedExam);
        await loadData();
        
        setEditingExam(null);
        setExamForm({
          title: '',
          date: new Date().toISOString().split('T')[0],
          classes: []
        });
        setShowAddForm(false);
        
        showToast("Deneme başarıyla güncellendi!", "success");
      } catch (error) {
        console.error('Update exam error:', error);
        showToast("Deneme güncellenirken hata oluştu", "error");
      } finally {
        setLoadingExams(false);
      }
    };

    const handleDeleteExam = async (exam: Exam) => {
      if (!confirm(`${exam.title} denemesini silmek istediğinizden emin misiniz?`)) {
        return;
      }

      try {
        await deleteExam(exam.id);
        await loadData();
        showToast("Deneme başarıyla silindi!", "success");
      } catch (error) {
        console.error('Delete exam error:', error);
        showToast("Deneme silinirken hata oluştu", "error");
      }
    };

    const startEdit = (exam: Exam) => {
      setEditingExam(exam);
      setExamForm({
        title: exam.title,
        date: exam.date,
        classes: exam.classes || []
      });
      // Genel ortalama bilgilerini yükle
      setGeneralAverages(exam.generalAverages || {});
      setShowAddForm(true);
    };

    const cancelEdit = () => {
      setEditingExam(null);
      setShowAddForm(false);
      setExamForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        classes: []
      });
      setGeneralAverages({});
    };

    const toggleClass = (className: string) => {
      setExamForm(prev => ({
        ...prev,
        classes: prev.classes.includes(className)
          ? prev.classes.filter(c => c !== className)
          : [...prev.classes, className]
      }));
    };

    const updateGeneralAverage = (className: string, courseKey: string, value: number) => {
      setGeneralAverages(prev => ({
        ...prev,
        [className]: {
          ...prev[className],
          [courseKey]: value
        }
      }));
    };

    const updateGeneralScore = (className: string, value: number) => {
      setGeneralAverages(prev => ({
        ...prev,
        [className]: {
          ...prev[className],
          generalScore: value
        }
      }));
    };

    return (
      <div className="space-y-8">
        {/* 📋 Exam Management Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">📋 Deneme Yönetimi</h1>
          <p className="text-emerald-100 text-xs">
            Deneme bilgilerini ekleyin, düzenleyin ve yönetin
          </p>
        </div>

        {/* Add/Edit Exam Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-semibold text-gray-800 mb-4">
              {editingExam ? 'Deneme Düzenle' : 'Yeni Deneme Ekle'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deneme Adı *
                </label>
                <input
                  type="text"
                  value={examForm.title}
                  onChange={(e) => setExamForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Deneme adını girin"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deneme Tarihi *
                </label>
                <input
                  type="date"
                  value={examForm.date}
                  onChange={(e) => setExamForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Hedef Sınıflar (İsteğe bağlı)
              </label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {CLASS_OPTIONS.map(cls => (
                  <label key={cls} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={examForm.classes.includes(cls)}
                      onChange={() => toggleClass(cls)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-700">{cls}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Boş bırakılırsa tüm sınıflar için geçerli olur
              </p>
            </div>
            {/* 🆕 GENEL ORTALAMA GİRİŞ BÖLÜMÜ */}
            {examForm.classes.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-blue-800">📊 Genel Ortalama Bilgileri</h4>
                </div>
                
                {examForm.classes.length > 0 && (
                  <div className="space-y-6">
                    <p className="text-xs text-blue-700">
                      📋 Her sınıf için genel ortalamaları girin. Bu bilgiler üçlü kıyaslama yorumlayıcısında kullanılacak.
                    </p>
                    
                    {examForm.classes.map(className => {
                      const classAverage = generalAverages[className] || { generalScore: 0 };
                      const courses = getCoursesByClass(className);
                      
                      return (
                        <div key={className} className="bg-white p-4 rounded border border-blue-200">
                          <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold mr-2">
                              {className}
                            </span>
                            {className} Sınıfı Genel Ortalamaları
                          </h5>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                            {courses
                              .sort((a, b) => {
                                // Türkçe, Sosyal Bilgiler, Din Kültürü, İngilizce, Matematik, Fen sıralaması
                                const order: { [key: string]: number } = { 
                                  "turkce": 1, 
                                  "sosyal": 2, 
                                  "din": 3, 
                                  "ingilizce": 4, 
                                  "matematik": 5, 
                                  "fen": 6 
                                };
                                return (order[a.key] || 999) - (order[b.key] || 999);
                              })
                              .map(course => (
                              <div key={course.key} className="space-y-1">
                                <label className="block text-xs font-medium text-gray-600">
                                  {course.label} Net
                                </label>
                                <input
                                  key={`avg-${className}-${course.key}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={classAverage[course.key] || ''}
                                  onChange={(e) => updateGeneralAverage(className, course.key, Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0,00"
                                />
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              🎆 {className} Genel Puan Ortalaması
                            </label>
                            <input
                              key={`gen-${className}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={classAverage.generalScore || ''}
                              onChange={(e) => updateGeneralScore(className, Number(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={editingExam ? handleUpdateExam : handleAddExam}
                disabled={loadingExams}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {loadingExams ? 'Kaydediliyor...' : (editingExam ? 'Güncelle' : 'Kaydet')}
              </button>
              <button
                onClick={cancelEdit}
                disabled={loadingExams}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Add Exam Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Deneme Listesi</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            + Yeni Deneme
          </button>
        </div>

        {/* Exam List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deneme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sınıflar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sonuç Sayısı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{exam.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {new Date(exam.date).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500">
                        {exam.classes && exam.classes.length > 0 
                          ? exam.classes.join(', ')
                          : 'Tüm sınıflar'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {results.filter(r => r.examId === exam.id).length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(exam)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {exams.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Henüz deneme bulunmamaktadır.
            </div>
          )}
        </div>
      </div>
    );
  };

  // 👨‍🎓 BİREYSEL VERİ GİRİŞİ TAB'ı
  const IndividualTab = () => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [individualForm, setIndividualForm] = useState({
      studentId: '',
      examId: '',
      puan: '', // Ayrı Puan alanı
      scores: {} as { [courseKey: string]: { D: string, Y: string, B: string } }
    });
    const [availableStudentsIndividual, setAvailableStudentsIndividual] = useState<Student[]>([]);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(false);

    // Sınıf seçildiğinde öğrenci ve deneme listelerini güncelle
    useEffect(() => {
      if (selectedClass) {
        // Sadece gerçek denemeye katılan öğrencileri göster
        const filteredStudents = students.filter(student => {
          const studentResults = results.filter(r => r.studentId === student.id);
          const validExams = studentResults.filter(r => {
            const net = r.nets?.total || 0;
            const score = r.scores?.puan ? parseFloat(r.scores.puan) : 
                         (r.puan || r.totalScore || 0);
            return net > 0 || score > 0;
          });
          return validExams.length > 0;
        }).filter(student => student.class === selectedClass);
        
        setAvailableStudentsIndividual(filteredStudents);
        
        const filteredExams = exams.filter(exam => 
          !exam.classes || exam.classes.includes(selectedClass) || exam.classes.length === 0
        );
        setAvailableExams(filteredExams);
        
        // Form'u sıfırla
        setIndividualForm({
          studentId: '',
          examId: '',
          puan: '',
          scores: {}
        });
      } else {
        setAvailableStudentsIndividual([]);
        setAvailableExams([]);
      }
    }, [selectedClass, students, exams]);

    // Seçilen öğrenci ve denemeye göre mevcut verileri yükle
    useEffect(() => {
      if (individualForm.studentId && individualForm.examId && selectedClass) {
        const selectedStudent = availableStudentsIndividual.find(s => s.id === individualForm.studentId);
        if (selectedStudent) {
          const courses = getCoursesByClass(selectedClass);
          
          // Mevcut verileri bul
          const existingResult = results.find(result => 
            result.studentId === individualForm.studentId && 
            result.examId === individualForm.examId
          );
          
          // Her zaman önce form'u temizle, sonra veri varsa yükle
          const loadedScores = courses.reduce((acc, course) => {
            if (existingResult && existingResult.scores && existingResult.scores[course.key]) {
              acc[course.key] = {
                D: existingResult.scores[course.key].D || '',
                Y: existingResult.scores[course.key].Y || '',
                B: existingResult.scores[course.key].B || ''
              };
            } else {
              acc[course.key] = { D: '', Y: '', B: '' };
            }
            return acc;
          }, {});
          
          setIndividualForm(prev => ({ 
            ...prev, 
            puan: existingResult.scores.puan || '',
            scores: loadedScores
          }));
          // Toast kaldırıldı - kullanıcı zaten form dolu olduğunu görebilir
        }
      }
    }, [individualForm.studentId, individualForm.examId, selectedClass, availableStudentsIndividual, results]);

    const updateIndividualScore = useCallback((courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setIndividualForm(prev => ({
        ...prev,
        scores: {
          ...prev.scores,
          [courseKey]: {
            ...prev.scores[courseKey],
            [field]: value
          }
        }
      }));
    }, []);

    const calculateIndividualTotals = useCallback(() => {
      const scores = individualForm.scores;
      let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;
      
      Object.values(scores).forEach(score => {
        const d = parseInt(score.D) || 0;
        const y = parseInt(score.Y) || 0;
        const b = parseInt(score.B) || 0;
        const net = calcNet(d, y);
        
        totalD += d;
        totalY += y;
        totalB += b;
        totalNet += net;
      });
      
      // Puan alanını da dahil et
      const totalPuan = parseFloat(individualForm.puan) || 0;
      
      return { totalD, totalY, totalB, totalNet: Number(totalNet.toFixed(2)), totalP: totalPuan };
    }, [individualForm.scores, individualForm.puan]);

    const handleIndividualSubmit = async () => {
      if (!individualForm.studentId || !individualForm.examId) {
        showToast("Lütfen öğrenci ve deneme seçin", "error");
        return;
      }

      const totals = calculateIndividualTotals();
      
      try {
        setLoading(true);
        
        // Net hesaplama
        const nets: any = { total: totals.totalNet };
        Object.entries(individualForm.scores).forEach(([courseKey, score]) => {
          const d = parseInt(score.D) || 0;
          const y = parseInt(score.Y) || 0;
          nets[courseKey] = calcNet(d, y);
        });

        const resultData: Omit<Result, 'id' | 'createdAt'> = {
          studentId: individualForm.studentId,
          examId: individualForm.examId,
          nets,
          scores: {
            ...individualForm.scores,
            puan: individualForm.puan || '0' // Puan'ı ayrı kaydet
          }
        };

        // Aynı öğrenci ve deneme için mevcut kayıt var mı kontrol et
        const existingResult = results.find(r => 
          r.studentId === individualForm.studentId && 
          r.examId === individualForm.examId
        );

        if (existingResult) {
          // Mevcut kaydı güncelle
          await updateResult(existingResult.id, resultData);
        } else {
          // Yeni kayıt ekle
          await addResult(resultData);
        }
        await loadData();
        
        // Form'u sıfırla
        setIndividualForm({
          studentId: '',
          examId: '',
          puan: '',
          scores: {}
        });
        
        showToast("Bireysel sonuç başarıyla kaydedildi!", "success");
      } catch (error) {
        console.error('Individual result error:', error);
        showToast("Sonuç kaydedilirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    const totals = calculateIndividualTotals();

    return (
      <div className="space-y-8">
        {/* 📊 Bireysel Veri Girişi Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">👨‍🎓 Bireysel Veri Girişi</h1>
          <p className="text-blue-100 text-xs">
            Öğrencilerin tek tek deneme sonuçlarını girin ve analiz edin
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleIndividualSubmit(); }} className="space-y-6">
            {/* Sınıf Seçimi */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Sınıf Seçin *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sınıf seçin</option>
                {CLASS_OPTIONS.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Öğrenci ve Deneme Seçimi */}
            {selectedClass && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Öğrenci Seçin *
                  </label>
                  <select
                    value={individualForm.studentId}
                    onChange={(e) => setIndividualForm(prev => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Öğrenci seçin</option>
                    {availableStudentsIndividual.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Deneme Seçin *
                  </label>
                  <select
                    value={individualForm.examId}
                    onChange={(e) => setIndividualForm(prev => ({ ...prev, examId: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Deneme seçin</option>
                    {availableExams.map(exam => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} ({new Date(exam.date).toLocaleDateString('tr-TR')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Skor Girişi */}
            {individualForm.studentId && individualForm.examId && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-800">Net Hesaplama</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getCoursesByClass(selectedClass).map(course => (
                    <div key={course.key} className="bg-gray-50 p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-800 mb-3">{course.label}</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Doğru (D)</label>
                          <input
                            type="number"
                            min="0"
                            value={individualForm.scores[course.key]?.D || ''}
                            onChange={(e) => updateIndividualScore(course.key, 'D', e.target.value)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Yanlış (Y)</label>
                          <input
                            type="number"
                            min="0"
                            value={individualForm.scores[course.key]?.Y || ''}
                            onChange={(e) => updateIndividualScore(course.key, 'Y', e.target.value)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Boş (B)</label>
                          <input
                            type="number"
                            min="0"
                            value={individualForm.scores[course.key]?.B || ''}
                            onChange={(e) => updateIndividualScore(course.key, 'B', e.target.value)}
                            className="w-full px-3 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="text-xs font-bold text-blue-600">
                            Net: {calcNet(
                              parseInt(individualForm.scores[course.key]?.D || '0'),
                              parseInt(individualForm.scores[course.key]?.Y || '0')
                            ).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Puan Girişi */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2">🎯 Toplam Puan (Puan Tabanında)</h4>
                  <div className="max-w-md">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Öğrencinin Toplam Puanı
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={individualForm.puan || ''}
                      onChange={(e) => setIndividualForm(prev => ({ ...prev, puan: e.target.value }))}
                      className="w-full px-3 py-2 text-lg border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Öğrencinin toplam puanını girin"
                    />
                    <p className="text-xs text-yellow-700 mt-1">
                      Puan alanını manuel giriniz
                    </p>
                  </div>
                </div>

                {/* Toplam İstatistikler */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Toplam İstatistikler</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{totals.totalD}</div>
                      <div className="text-xs text-blue-700">Toplam Doğru</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{totals.totalY}</div>
                      <div className="text-xs text-red-700">Toplam Yanlış</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">{totals.totalB}</div>
                      <div className="text-xs text-gray-700">Toplam Boş</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{totals.totalP}</div>
                      <div className="text-xs text-yellow-700">Toplam Puan</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{totals.totalNet}</div>
                      <div className="text-xs text-green-700">Toplam Net</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            {individualForm.studentId && individualForm.examId && (
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {loading ? 'Kaydediliyor...' : '💾 Sonuçları Kaydet'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  };

  // 🎯 HEDEF BELİRLEME TAB'ı
  const TargetTab = () => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [studentTargetForm, setStudentTargetForm] = useState<{[subject: string]: number}>({});
    const [studentScoreTarget, setStudentScoreTarget] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    // Seçilen öğrencinin sınıfına göre dinamik dersleri al
    const selectedStudentData = students.find(s => s.id === selectedStudent);
    const dynamicSubjects = useMemo(() => {
      if (!selectedStudentData) return [];
      return getSubjectsByClass(selectedStudentData.class);
    }, [selectedStudentData]);

    // Öğrencinin mevcut ortalamalarını hesapla
    const getStudentCurrentAverages = () => {
      
      if (!selectedStudent || results.length === 0) {
        return dynamicSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      // Seçili öğrencinin tüm deneme sonuçlarını al
      const studentResults = results.filter(r => r.studentId === selectedStudent);
      
      if (studentResults.length === 0) {
        return dynamicSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      // İlk sonucun örnek yapısını göster
      if (studentResults.length > 0) {

      }

      // Her ders için ortalama hesapla
      const averages: {[key: string]: number} = {};
      
      dynamicSubjects.forEach(subject => {

        const subjectScores: number[] = [];
        
        studentResults.forEach((result, index) => {

          
          // Scores objesinden D-Y değerlerini alıp net hesapla
          if (result.scores && result.scores[subject.key]) {
            const subjectData = result.scores[subject.key];

            
            const d = parseInt(subjectData.D) || 0;
            const y = parseInt(subjectData.Y) || 0;
            const net = calcNet(d, y);
            

            
            if (net > 0) {
              subjectScores.push(net);
            }
          } else {
            // Bu ders için veri yok, skor hesaplanmayacak
          }
        });
        

        
        // Ortalama hesapla (eğer veri varsa)
        // NOT: 0 değerleri ortalamadan hariç tutulur ama deneme sayısına dahildir
        const filteredScores = subjectScores.filter(score => score > 0);
        const average = filteredScores.length > 0 
          ? filteredScores.reduce((sum, net) => sum + net, 0) / filteredScores.length 
          : 0;
        

        averages[subject.key] = average;
      });
      

      return averages;
    };

    // Son deneme netlerini al
    const getStudentLastExamNets = () => {

      
      if (!selectedStudent || results.length === 0) {

        return dynamicSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      const studentResults = results.filter(r => r.studentId === selectedStudent);

      
      if (studentResults.length === 0) {

        return dynamicSubjects.reduce((acc, subject) => {
          acc[subject.key] = 0;
          return acc;
        }, {} as {[key: string]: number});
      }

      // En son denemeyi al (sonuçlar tarih sırasına göre düzenlenmiş olmalı)
      const lastResult = studentResults[studentResults.length - 1];

      
      const lastNets: {[key: string]: number} = {};
      
      dynamicSubjects.forEach(subject => {

        
        if (lastResult.scores && lastResult.scores[subject.key]) {
          const d = parseInt(lastResult.scores[subject.key].D) || 0;
          const y = parseInt(lastResult.scores[subject.key].Y) || 0;
          const net = calcNet(d, y);
          

          lastNets[subject.key] = net;
        } else {

          lastNets[subject.key] = 0;
        }
      });


      return lastNets;
    };

    // Öğrenci seçildiğinde hedefleri yükle (verimli versiyon)
    useEffect(() => {
      if (selectedStudent) {
        // Firebase'den fresh veri çek
        const loadFreshTargets = async () => {
          try {
            // Sadece seçili öğrencinin hedefini çek (daha verimli)
            const targetsRef = doc(db, 'targets', selectedStudent);
            const targetsSnapshot = await getDoc(targetsRef);
            
            if (targetsSnapshot.exists()) {
              const data = targetsSnapshot.data();
              const dashboardTargets = data.targets || {};
              const panelTargets = mapDashboardKeysToPanel(dashboardTargets);
              const scoreTarget = data.targetScore || 0;
              
              const formData: {[subject: string]: number} = {};
              
              dynamicSubjects.forEach(subject => {
                formData[subject.key] = panelTargets[subject.key] || 0;
              });
              
              console.log('📊 Fresh hedefler yüklendi - Panel:', formData);
              console.log('🎯 Fresh puan hedefi:', scoreTarget);
              setStudentTargetForm(formData);
              setStudentScoreTarget(scoreTarget);
              
            } else {
              // Hedef bulunamadı, varsayılan değerlerle başla
              const formData: {[subject: string]: number} = {};
              dynamicSubjects.forEach(subject => {
                formData[subject.key] = 0;
              });
              setStudentTargetForm(formData);
              setStudentScoreTarget(0);
              console.log('📋 Hedef bulunamadı, varsayılan değerler yüklendi');
            }
            
          } catch (error) {
            console.error('Fresh target load error:', error);
            // Hata durumunda varsayılan değerlerle devam et
            const formData: {[subject: string]: number} = {};
            dynamicSubjects.forEach(subject => {
              formData[subject.key] = 0;
            });
            setStudentTargetForm(formData);
            setStudentScoreTarget(450);
          }
        };
        
        loadFreshTargets();
      } else {
        setStudentTargetForm({});
        setStudentScoreTarget(450);
      }
    }, [selectedStudent]);

    // Hedef güncelleme
    const updateTarget = (subject: string, target: number) => {
      setStudentTargetForm(prev => ({
        ...prev,
        [subject]: target
      }));
    };

    // Hedefleri kaydetme
    const handleSaveTargets = async () => {
      if (!selectedStudent) {
        showToast("Lütfen bir öğrenci seçin", "error");
        return;
      }

      try {
        setLoading(true);
        // Firebase'e hedefleri kaydet (net hedefleri + puan hedefi)
        await saveStudentTargets(selectedStudent, studentTargetForm, studentScoreTarget);
        
        // Local state'i de güncelle (dashboard formatında)
        const dashboardTargets = mapPanelKeysToDashboard(studentTargetForm);
        setStudentTargets(prev => ({
          ...prev,
          [selectedStudent]: dashboardTargets
        }));
        
        // Puan hedeflerini güncelle
        setStudentScoreTargets(prev => ({
          ...prev,
          [selectedStudent]: studentScoreTarget
        }));

        showToast("Hedefler başarıyla kaydedildi!", "success");
      } catch (error) {
        console.error('Target save error:', error);
        showToast("Hedefler kaydedilirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    // Hesaplamalar
    const currentAverages = getStudentCurrentAverages();
    const lastExamNets = getStudentLastExamNets();
    const currentTotal = Object.values(currentAverages).reduce((sum, current) => sum + current, 0);
    const targetTotal = Object.values(studentTargetForm).reduce((sum, target) => sum + target, 0);
    const totalImprovement = targetTotal - currentTotal;

    return (
      <div className="space-y-8">
        {/* 🎯 Hedef Belirleme Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">🎯 Hedef Belirleme</h1>
          <p className="text-purple-100 text-xs">
            Öğrenciler için ders bazında hedef net belirleyin ve takip edin
          </p>
        </div>

        {/* Sınıf ve Öğrenci Seçimi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xs font-semibold text-gray-800 mb-4">Seçim Yapın</h3>
          
          {/* Sınıf Seçimi */}
          <div className="mb-4">
            <label className="block text-xs text-gray-600 mb-2">Sınıf Seçin</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent(''); // Sınıf değişince öğrenci seçimini temizle
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sınıf seçin</option>
              {Array.from(new Set(students.map(s => s.class))).map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
          
          {/* Öğrenci Seçimi */}
          {selectedClass && (
            <div>
              <label className="block text-xs text-gray-600 mb-2">Öğrenci Seçin</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Öğrenci seçin</option>
                {students
                  .filter(student => {
                    const studentResults = results.filter(r => r.studentId === student.id);
                    const validExams = studentResults.filter(r => {
                      const net = r.nets?.total || 0;
                      const score = r.scores?.puan ? parseFloat(r.scores.puan) : 
                                   (r.puan || r.totalScore || 0);
                      return net > 0 || score > 0;
                    });
                    return validExams.length > 0;
                  })
                  .filter(student => student.class === selectedClass)
                  .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Hedef Belirleme Formu - Sadece öğrenci seçildiğinde görünür */}
        {!selectedStudent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Hedef Belirleme</h3>
            <p className="text-gray-600 mb-4">Bir öğrenci seçerek ders hedeflerini belirleyebilir ve mevcut durumunu görüntüleyebilirsiniz.</p>
            <p className="text-sm text-gray-500">Yukarıdan bir sınıf ve öğrenci seçin</p>
          </div>
        )}

        {selectedStudent && (
          <div className="space-y-6">
            {/* Hedef Puan Belirleme */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                🎯 {students.find(s => s.id === selectedStudent)?.name} - LGS Puan Hedefi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Hedef Puan</label>
                  <input
                    type="number"
                    min="100"
                    max="500"
                    value={studentScoreTarget}
                    onChange={(e) => {
                      const newValue = Number(e.target.value) || 0;
                      setStudentScoreTarget(newValue);
                    }}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50"
                    placeholder="Hedef puanınızı girin (100-500)"
                  />

                </div>
              </div>
            </div>

            {/* Ders Bazında Hedef Netler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                📚 {students.find(s => s.id === selectedStudent)?.name} - LGS Ders Hedefleri
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {dynamicSubjects.map((subject) => (
                  <div key={subject.key} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 min-h-[280px] flex flex-col">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center text-sm">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2" style={{ backgroundColor: `${subject.color}20`, color: subject.color }}>
                        {subject.name.charAt(0)}
                      </span>
                      {subject.name}
                    </h4>
                    
                    <div className="space-y-3 flex-grow">
                      {/* Mevcut Durum */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mevcut Durum</label>
                        <div className="bg-gray-100 p-2 rounded-lg space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Ortalama:</span>
                            <span className="text-xs font-bold text-gray-700">
                              {currentAverages[subject.key]?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Son Deneme:</span>
                            <span className="text-xs font-bold text-gray-700">
                              {lastExamNets[subject.key]?.toFixed(1) || '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mevcut Hedef */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mevcut Hedef</label>
                        <div className="bg-purple-100 p-2 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-xs text-purple-600">Belirlenen:</span>
                            <span className="text-xs font-bold text-purple-700">
                              {studentTargetForm[subject.key]?.toFixed(1) || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-purple-600">Fark:</span>
                            <span className={`text-xs font-bold ${
                              (studentTargetForm[subject.key] || 0) - (currentAverages[subject.key] || 0) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {((studentTargetForm[subject.key] || 0) - (currentAverages[subject.key] || 0)) >= 0 ? '+' : ''}
                              {((studentTargetForm[subject.key] || 0) - (currentAverages[subject.key] || 0)).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hedef Net */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Yeni Hedef Net
                        </label>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.5"
                          value={studentTargetForm[subject.key] || ''}
                          onChange={(e) => updateTarget(subject.key, Number(e.target.value))}
                          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                          placeholder="0"
                        />
                      </div>
                      
                      {/* Gelişim */}
                      <div className="text-center">
                        <span className="text-xs text-gray-500">Artış:</span>
                        <span className={`ml-1 font-bold text-xs ${(studentTargetForm[subject.key] || 0) - (currentAverages[subject.key] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {((studentTargetForm[subject.key] || 0) - (currentAverages[subject.key] || 0)) >= 0 ? '+' : ''}
                          {((studentTargetForm[subject.key] || 0) - (currentAverages[subject.key] || 0)).toFixed(1)} net
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, ((studentTargetForm[subject.key] || 0) / 20) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Toplam Hedef Özeti */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl p-8">
              <h4 className="text-2xl font-bold mb-6 text-center">🏆 Toplam Hedef Özeti</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-6">
                  <div className="text-3xl font-bold mb-2">{currentTotal}</div>
                  <div className="text-purple-100 text-lg">Mevcut Toplam Net</div>
                </div>
                <div className="bg-white bg-opacity-30 rounded-lg p-6 border-2 border-white">
                  <div className="text-4xl font-bold mb-2">{targetTotal}</div>
                  <div className="text-white text-xl">Hedef Toplam Net</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-6">
                  <div className="text-3xl font-bold mb-2 text-yellow-300">
                    {totalImprovement >= 0 ? '+' : ''}{totalImprovement.toFixed(1)}
                  </div>
                  <div className="text-purple-100 text-lg">Toplam Artış</div>
                </div>
              </div>
              
              {/* İlerleme Çubuğu */}
              <div className="mt-8">
                <div className="flex justify-between text-xs mb-2">
                  <span>Mevcut Durum</span>
                  <span>Hedef</span>
                </div>
                <div className="w-full bg-white bg-opacity-20 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-green-400 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (currentTotal / targetTotal) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Sınıf Filtreleme */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">📊 Sınıf Bazında Hedef Belirleme</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sınıf Seçin:</label>
                <select 
                  value={selectedTargetClass || ''} 
                  onChange={(e) => setSelectedTargetClass(e.target.value || undefined)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Tüm Sınıflar</option>
                  {Array.from(new Set(students.map(s => s.class))).map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-600">
                {selectedTargetClass ? `${selectedTargetClass} sınıfı için hedef belirleme` : 'Tüm sınıflar için hedef belirleme'}
              </div>
            </div>

            {/* Öğrenci Listesi - Hızlı Hedef Belirleme */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xs font-semibold text-gray-800 mb-4">📝 Öğrenci Hedefleri</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedTargetClass ? 
                  students.filter(student => {
                    const studentResults = results.filter(r => r.studentId === student.id);
                    const validExams = studentResults.filter(r => {
                      const net = r.nets?.total || 0;
                      const score = r.scores?.puan ? parseFloat(r.scores.puan) : 
                                   (r.puan || r.totalScore || 0);
                      return net > 0 || score > 0;
                    });
                    return validExams.length > 0;
                  }).filter(s => s.class === selectedTargetClass) 
                  : 
                  students.filter(student => {
                    const studentResults = results.filter(r => r.studentId === student.id);
                    const validExams = studentResults.filter(r => {
                      const net = r.nets?.total || 0;
                      const score = r.scores?.puan ? parseFloat(r.scores.puan) : 
                                   (r.puan || r.totalScore || 0);
                      return net > 0 || score > 0;
                    });
                    return validExams.length > 0;
                  })
                ).map((student) => {
                  const studentTarget = studentTargets[student.id];
                  const totalTarget = studentTarget ? Object.values(studentTarget).reduce((sum, target) => sum + target, 0) : 0;
                  
                  return (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{student.name}</h4>
                        <span className="text-xs text-gray-500">{student.class}</span>
                      </div>
                      
                      {studentTarget ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">
                            Toplam Hedef: <span className="font-bold text-purple-600">{totalTarget.toFixed(1)}</span> net
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-500 h-2 rounded-full" 
                              style={{ width: `${(totalTarget / 120) * 100}%` }}
                            ></div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedStudent(student.id)}
                              className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Düzenle
                            </button>
                            <button 
                              onClick={() => {
                                const updatedTargets = { ...studentTargets };
                                delete updatedTargets[student.id];
                                setStudentTargets(updatedTargets);
                              }}
                              className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setSelectedStudent(student.id)}
                          className="text-xs px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          + Hedef Belirle
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="text-center">
              <button
                onClick={handleSaveTargets}
                disabled={loading || !selectedStudent}
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors ${
                  loading || !selectedStudent
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {loading ? 'Kaydediliyor...' : '💾 Hedefleri Kaydet'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 👥 TOPLU VERİ GİRİŞİ TAB'ı
  const BulkTab = () => {
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [bulkScores, setBulkScores] = useState<{[studentId: string]: {[courseKey: string]: {D: string, Y: string, B: string}}}>({});
    const [studentPuan, setStudentPuan] = useState<{[studentId: string]: string}>({});
    const [loading, setLoading] = useState(false);
    const [availableStudentsBatch, setAvailableStudentsBatch] = useState<Student[]>([]);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);

    // Sınıf seçildiğinde öğrenci ve deneme listelerini güncelle
    useEffect(() => {
      if (selectedClass) {
        const filteredStudents = students.filter(student => student.class === selectedClass);
        setAvailableStudentsBatch(filteredStudents);
        
        const filteredExams = exams.filter(exam => 
          !exam.classes || exam.classes.includes(selectedClass) || exam.classes.length === 0
        );
        setAvailableExams(filteredExams);
        
        // Öğrenci skorlarını sıfırla
        const initialScores: {[studentId: string]: {[courseKey: string]: {D: string, Y: string, B: string}}} = {};
        filteredStudents.forEach(student => {
          const courses = getCoursesByClass(student.class);
          initialScores[student.id] = courses.reduce((acc, course) => {
            acc[course.key] = { D: "", Y: "", B: "" };
            return acc;
          }, {});
        });
        setBulkScores(initialScores);
        setSelectedExamId(''); // Sınıf değiştiğinde deneme seçimini temizle
      } else {
        setAvailableStudentsBatch([]);
        setAvailableExams([]);
        setBulkScores({});
        setSelectedExamId('');
      }
    }, [selectedClass, students, exams]);

    // Deneme seçildiğinde mevcut verileri yükle (deneme değişikliğinde yeniden yükle)
    useEffect(() => {
      if (selectedExamId && selectedClass && availableStudentsBatch.length > 0) {
        loadExistingExamData();
      }
    }, [selectedExamId, selectedClass, availableStudentsBatch.length]);

    // Mevcut deneme verilerini yükle (güvenli versiyon)
    const loadExistingExamData = useCallback(() => {
      try {
        // Sadece deneme ID'si varsa devam et
        if (!selectedExamId) return;
        
        // State'den verileri oku (re-render tetiklemeden)
        const classStudentIds = availableStudentsBatch.map(s => s.id);
        const existingResults = results.filter(result => 
          result.examId === selectedExamId && classStudentIds.includes(result.studentId)
        );

        // Sadece mevcut veri varsa yükle
        if (existingResults.length > 0) {
          const loadedScores: {[studentId: string]: {[courseKey: string]: {D: string, Y: string, B: string}}} = {};
          const loadedPuanScores: {[studentId: string]: string} = {};
          
          availableStudentsBatch.forEach(student => {
            const studentResult = existingResults.find(r => r.studentId === student.id);
            const courses = getCoursesByClass(student.class);
            
            loadedScores[student.id] = courses.reduce((acc, course) => {
              if (studentResult && studentResult.scores && studentResult.scores[course.key]) {
                acc[course.key] = {
                  D: studentResult.scores[course.key].D || "",
                  Y: studentResult.scores[course.key].Y || "",
                  B: studentResult.scores[course.key].B || ""
                };
              } else {
                acc[course.key] = { D: "", Y: "", B: "" };
              }
              return acc;
            }, {});
            
            // Puan değerini ayrı olarak yükle
            if (studentResult && studentResult.scores && studentResult.scores.puan) {
              loadedPuanScores[student.id] = studentResult.scores.puan;
            }
          });
          
          setBulkScores(loadedScores);
          setStudentPuan(loadedPuanScores);
          
          // Toast kaldırıldı - kullanıcı zaten form dolu olduğunu görebilir
        }
        // Sonuç yoksa formu bozmuyoruz - mevcut durum korunuyor
      } catch (error) {
        console.error('Load existing exam data error:', error);
        setTimeout(() => {
          showToast("Mevcut veriler yüklenirken hata oluştu", "error");
        }, 100);
      }
    }, [selectedExamId, availableStudentsBatch, results, setBulkScores, setStudentPuan]);

    const updateBulkScore = useCallback((studentId: string, courseKey: string, field: 'D' | 'Y' | 'B', value: string) => {
      setBulkScores(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [courseKey]: {
            ...prev[studentId][courseKey],
            [field]: value
          }
        }
      }));
    }, []);

    const calculateStudentTotal = useCallback((studentScores: {[courseKey: string]: {D: string, Y: string, B: string}}) => {
      let totalD = 0, totalY = 0, totalB = 0, totalNet = 0;
      
      Object.values(studentScores).forEach(score => {
        const d = parseInt(score.D) || 0;
        const y = parseInt(score.Y) || 0;
        const b = parseInt(score.B) || 0;
        const net = calcNet(d, y);
        
        totalD += d;
        totalY += y;
        totalB += b;
        totalNet += net;
      });
      
      return { totalD, totalY, totalB, totalNet: Number(totalNet.toFixed(2)) };
    }, []);

    const calculateClassTotals = useCallback(() => {
      let classTotals = { totalD: 0, totalY: 0, totalB: 0, totalNet: 0 };
      
      // Sadece geçerli puanı olan (0 olmayan) öğrencileri ortalamaya dahil et
      // NOT: 0 puanlı öğrenciler ortalamadan hariç tutulur ama deneme sayısına dahildir
      const validStudents = Object.values(bulkScores).filter(studentScores => {
        const totals = calculateStudentTotal(studentScores);
        return totals.totalNet > 0; // Sadece 0 olmayan neti olan öğrencileri ortalamaya dahil et
      });
      const studentCount = validStudents.length;
      
      validStudents.forEach(studentScores => {
        const totals = calculateStudentTotal(studentScores);
        classTotals.totalD += totals.totalD;
        classTotals.totalY += totals.totalY;
        classTotals.totalB += totals.totalB;
        classTotals.totalNet += totals.totalNet;
      });
      
      // Puan ortalamasını ayrı hesapla
      // NOT: 0 puanlı öğrenciler ortalamadan hariç tutulur ama deneme sayısına dahildir
      const puanValues = Object.values(studentPuan)
        .map(p => parseFloat(p) || 0)
        .filter(p => p > 0); // 0 puanlı öğrencileri hariç tut
      const totalPuan = puanValues.reduce((sum, p) => sum + p, 0);
      const averagePuan = puanValues.length > 0 ? totalPuan / puanValues.length : 0;
      
      // Ortalamaları hesapla
      return {
        totalD: studentCount > 0 ? Number((classTotals.totalD / studentCount).toFixed(2)) : 0,
        totalY: studentCount > 0 ? Number((classTotals.totalY / studentCount).toFixed(2)) : 0,
        totalB: studentCount > 0 ? Number((classTotals.totalB / studentCount).toFixed(2)) : 0,
        totalNet: studentCount > 0 ? Number((classTotals.totalNet / studentCount).toFixed(2)) : 0,
        averagePuan: Number(averagePuan.toFixed(2))
      };
    }, [bulkScores, calculateStudentTotal, studentPuan]);

    const handleBulkSubmit = async () => {
      if (!selectedClass || !selectedExamId) {
        showToast("Lütfen sınıf ve deneme seçin", "error");
        return;
      }

      const studentCount = Object.keys(bulkScores).length;

      try {
        setLoading(true);
        
        // DİKKAT: Sadece seçili sınıfın sonuçlarını sil, diğer sınıfları koru!
        const existingResults = results.filter(r => r.examId === selectedExamId);
        if (existingResults.length > 0) {
          // Sadece seçili sınıfın sonuçlarını sil
          const selectedClassResults = existingResults.filter(r => {
            const student = students.find(s => s.id === r.studentId);
            return student && student.class === selectedClass;
          });
          
          if (selectedClassResults.length > 0) {
            const deletePromises = selectedClassResults.map(result => deleteResult(result.id));
            await Promise.all(deletePromises);
          }
        }
        
        // Yeni sonuçları ekle
        const promises = Object.entries(bulkScores).map(async ([studentId, scores]) => {
          const totals = calculateStudentTotal(scores);
          
          // Net hesaplama
          const nets: any = { total: totals.totalNet };
          Object.entries(scores).forEach(([courseKey, score]) => {
            const d = parseInt(score.D) || 0;
            const y = parseInt(score.Y) || 0;
            nets[courseKey] = calcNet(d, y);
          });

          const resultData: Omit<Result, 'id' | 'createdAt'> = {
            studentId,
            examId: selectedExamId,
            nets,
            scores: {
              ...scores,
              puan: studentPuan[studentId] || '0' // Puan'ı ayrı kaydet
            }
          };

          return addResult(resultData);
        });

        await Promise.all(promises);
        
        // Verileri güncelle
        await loadData();
        
        showToast(`${studentCount} öğrenci için sonuçlar başarıyla kaydedildi!`, "success");
      } catch (error) {
        console.error('Bulk results error:', error);
        showToast("Sonuçlar kaydedilirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    };

    const classTotals = calculateClassTotals();

    return (
      <div className="space-y-6">
        {/* 📊 Toplu Veri Girişi Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">👥 Toplu Veri Girişi</h1>
          <p className="text-cyan-100 text-xs">
            Birden fazla öğrencinin deneme sonuçlarını aynı anda girin
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="space-y-4">
            {/* Sınıf ve Deneme Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Sınıf Seçin *
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                >
                  <option value="">Sınıf seçin</option>
                  {CLASS_OPTIONS.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Deneme Seçin *
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                  disabled={!selectedClass}
                >
                  <option value="">Deneme seçin</option>
                  {availableExams.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({new Date(exam.date).toLocaleDateString('tr-TR')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Öğrenci Listesi ve Skor Girişi */}
            {selectedClass && selectedExamId && availableStudentsBatch.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-800">
                  Öğrenci Sonuç Girişi ({availableStudentsBatch.length} öğrenci)
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg" style={{ fontSize: '11px' }}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-700 border-b">
                          Öğrenci
                        </th>
                        {getCoursesByClass(selectedClass).map(course => (
                          <th key={course.key} className="px-1 py-1 text-center text-[10px] font-medium text-gray-700 border-b min-w-[100px]">
                            {course.label}
                            <div className="text-[8px] text-gray-600 mt-0.5 font-semibold">
                              <span className="inline-block w-4 text-center">D</span>
                              <span className="inline-block w-4 text-center">Y</span>
                              <span className="inline-block w-4 text-center">B</span>
                              <span className="inline-block w-4 text-center">N</span>
                            </div>
                          </th>
                        ))}
                        <th className="px-2 py-1 text-center text-[10px] font-medium text-gray-700 border-b">
                          Puan
                        </th>
                        <th className="px-2 py-1 text-center text-[10px] font-medium text-gray-700 border-b">
                          D/Y/B/N
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {availableStudentsBatch.map((student, index) => (
                        <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1 text-[10px] font-medium text-gray-900 border-b">
                            <div>
                              <div>{student.name}</div>
                              <div className="text-[8px] text-gray-500">No: {student.number}</div>
                            </div>
                          </td>
                          {getCoursesByClass(selectedClass).map(course => (
                            <td key={course.key} className="px-1 py-1 border-b text-center">
                              <div className="flex flex-col items-center space-y-0.5">
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">D</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bulkScores[student.id]?.[course.key]?.D || ''}
                                    onChange={(e) => updateBulkScore(student.id, course.key, 'D', e.target.value)}
                                    className="w-8 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center font-semibold"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">Y</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bulkScores[student.id]?.[course.key]?.Y || ''}
                                    onChange={(e) => updateBulkScore(student.id, course.key, 'Y', e.target.value)}
                                    className="w-8 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center font-semibold"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">B</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bulkScores[student.id]?.[course.key]?.B || ''}
                                    onChange={(e) => updateBulkScore(student.id, course.key, 'B', e.target.value)}
                                    className="w-8 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-center font-semibold"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="flex flex-col items-center">
                                  <label className="text-[8px] text-gray-600 font-medium mb-0.5">N</label>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={calcNet(
                                      parseInt(bulkScores[student.id]?.[course.key]?.D || '0'),
                                      parseInt(bulkScores[student.id]?.[course.key]?.Y || '0')
                                    ).toFixed(2)}
                                    readOnly
                                    className="w-9 h-5 px-0.5 py-0.5 text-[9px] border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-center font-bold"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </td>
                          ))}
                          <td className="px-2 py-1 text-center border-b">
                            <div className="grid grid-cols-2 gap-0.5 text-[8px]">
                              <div className="bg-blue-100 px-0.5 py-0.5 rounded text-blue-800 font-medium">
                                D: {calculateStudentTotal(bulkScores[student.id] || {}).totalD}
                              </div>
                              <div className="bg-red-100 px-0.5 py-0.5 rounded text-red-800 font-medium">
                                Y: {calculateStudentTotal(bulkScores[student.id] || {}).totalY}
                              </div>
                              <div className="bg-gray-100 px-0.5 py-0.5 rounded text-gray-800 font-medium">
                                B: {calculateStudentTotal(bulkScores[student.id] || {}).totalB}
                              </div>
                              <div className="bg-green-100 px-0.5 py-0.5 rounded text-green-800 font-bold col-span-2">
                                N: {calculateStudentTotal(bulkScores[student.id] || {}).totalNet.toFixed(2)}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-center border-b">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={studentPuan[student.id] || ''}
                              onChange={(e) => setStudentPuan(prev => ({
                                ...prev,
                                [student.id]: e.target.value
                              }))}
                              className="w-full px-1 py-0.5 text-[9px] border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-center font-semibold"
                              placeholder="Puan"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sınıf Ortalamaları */}
                <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                  <h4 className="font-semibold text-cyan-800 mb-2 text-sm">Sınıf Ortalama İstatistikleri</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    <div>
                      <div className="text-xl font-bold text-blue-600">{classTotals.totalD}</div>
                      <div className="text-[10px] text-blue-700">Ortalama Doğru</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-red-600">{classTotals.totalY}</div>
                      <div className="text-[10px] text-red-700">Ortalama Yanlış</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-600">{classTotals.totalB}</div>
                      <div className="text-[10px] text-gray-700">Ortalama Boş</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-yellow-600">{classTotals.averagePuan.toFixed(2)}</div>
                      <div className="text-[10px] text-yellow-700">Ortalama Puan</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">{classTotals.totalNet.toFixed(2)}</div>
                      <div className="text-[10px] text-green-700">Ortalama Net</div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleBulkSubmit}
                    disabled={loading}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors text-sm ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-cyan-500 text-white hover:bg-cyan-600'
                    }`}
                  >
                    {loading ? 'Kaydediliyor...' : `💾 ${availableStudentsBatch.length} Öğrenci Sonucunu Kaydet`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render current tab
  const renderTab = () => {
    switch (activeTab) {
      case "home": return <HomeTab />;
      case "sinif": return <StudentTab />;
      case "deneme": return <ExamTab />;
      case "bireysel": return <IndividualTab />;
      case "toplu": return <BulkTab />;
      case "excel-import": return <ExcelImportTab students={students} exams={exams} onDataUpdate={loadDataFromFirebase} />;
      case "kitap-sinavi": return <KitapSinaviTab students={students} onDataUpdate={loadDataFromFirebase} />;
      case "odev-takibi": return <OdevTakibiTab students={students} onDataUpdate={loadDataFromFirebase} />;
      case "eksik-konu": return <DenemeDegerlendirmeTab students={students} onDataUpdate={loadDataFromFirebase} />;

      case "hedef": return <TargetTab />;
      case "lgs-hesaplama": return <LGSCalculatorTab />;
      case "analytics": return <AnalyticsTab students={students} results={results} exams={exams} />;
      case "van-taban-puan": return <VanTabanPuanTab lgsSchools={lgsSchools} obpSchools={obpSchools} />;
      case "puan-bazli-tavsiye": return <PuanBazliLiseTavsiyesiTab students={students} results={results} exams={exams} lgsSchools={lgsSchools} obpSchools={obpSchools} />;
      case "okuma-sinavi": return <OkumaSinaviTab students={students} />;
      case "brans-denemesi": return <BransDenemesiTab students={students} />;
      case "basari-rozetleri": return <BasariRozetleriTab students={students} results={results} exams={exams} />;
      default: return <HomeTab />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Toast Notification - Modern Design */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 transform transition-all duration-300 ease-in-out animate-slideIn`}>
          <div className={`
            relative min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl text-white overflow-hidden
            ${toast.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 border border-emerald-400' 
              : toast.type === 'error' 
                ? 'bg-gradient-to-r from-red-500 to-pink-600 border border-red-400'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400'
            }
          `}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat'
              }}></div>
            </div>
            
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 h-1 bg-white bg-opacity-30 animate-progressBar"></div>
            
            <div className="relative flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && (
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-relaxed">
                  {toast.message}
                </p>
              </div>
              
              {/* Close Button */}
              <button 
                onClick={() => setToast(null)} 
                className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200 group"
              >
                <svg className="w-3 h-3 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Başarı Takip Sistemi</h1>
          <p className="text-sm sm:text-base text-gray-600">Öğrencilerinizin akademik başarılarını yönetin</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-4 md:mb-8">
          <div className="flex flex-wrap gap-1 md:gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 md:px-6 md:py-3 rounded-lg font-medium text-xs md:text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

// LGS Puan Hesaplama Tab Component
const LGSCalculatorTab = () => {
  const [scores, setScores] = useState({
    turkce: { dogru: 0, yanlis: 0 },
    matematik: { dogru: 0, yanlis: 0 },
    fen: { dogru: 0, yanlis: 0 },
    sosyal: { dogru: 0, yanlis: 0 },
    din: { dogru: 0, yanlis: 0 },
    ingilizce: { dogru: 0, yanlis: 0 }
  });

  const [result, setResult] = useState(null);

  // MEB LGS Taban Puanı
  const basePoints = 193.492;

  // LGS Puan Katsayıları (MEB 2025 - 1 net'in getirdiği puan)
  const coefficients = {
    turkce: 3.671,
    matematik: 4.953,
    fen: 4.072,
    sosyal: 1.685,
    din: 1.941,
    ingilizce: 1.632
  };

  // Ders Soru Sayıları
  const questionCounts = {
    turkce: 20,
    matematik: 20,
    fen: 20,
    sosyal: 10,
    din: 10,
    ingilizce: 10
  };

  const subjectNames = {
    turkce: 'Türkçe',
    matematik: 'Matematik',
    fen: 'Fen Bilimleri',
    sosyal: 'Sosyal Bilgiler',
    din: 'Din Kültürü ve Ahlak Bilgisi',
    ingilizce: 'İngilizce'
  };

  const handleScoreChange = (subject, field, value) => {
    const numValue = parseInt(value) || 0;
    setScores(prev => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: Math.max(0, numValue)
      }
    }));
  };

  const calculateLGSPoints = () => {
    let totalPoints = basePoints; // Taban puanı ekle
    const subjectResults = {};

    Object.keys(scores).forEach(subject => {
      const { dogru, yanlis } = scores[subject];
      // MEB Formülü: Net = Doğru - (Yanlış ÷ 3) - 3 yanlış 1 doğruyu götürüyor
      const net = dogru - (yanlis / 3);
      const points = net * coefficients[subject];
      
      subjectResults[subject] = {
        dogru,
        yanlis,
        net: Math.round(net * 100) / 100,
        points: Math.round(points * 100) / 100
      };
      
      totalPoints += points;
    });

    const finalResult = {
      totalPoints: Math.round(totalPoints * 100) / 100,
      subjects: subjectResults
    };

    setResult(finalResult);
  };

  const resetForm = () => {
    setScores({
      turkce: { dogru: 0, yanlis: 0 },
      matematik: { dogru: 0, yanlis: 0 },
      fen: { dogru: 0, yanlis: 0 },
      sosyal: { dogru: 0, yanlis: 0 },
      din: { dogru: 0, yanlis: 0 },
      ingilizce: { dogru: 0, yanlis: 0 }
    });
    setResult(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">🧮 LGS Puan Hesaplama</h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-6">LGS puanınızı hesaplamak için doğru ve yanlış sayılarınızı girin.</p>
        
        {/* Hesaplama Formu */}
        <div className="space-y-3 sm:space-y-4">
          {/* İstenen ders sıralaması: Türkçe, Sosyal, Din, İngilizce, Matematik, Fen */}
          {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => (
            <div key={subject} className="border rounded-lg p-3 sm:p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2 text-lg sm:text-xl">
                    {subject === 'turkce' && '📝'}
                    {subject === 'matematik' && '🔢'}
                    {subject === 'fen' && '🧪'}
                    {subject === 'sosyal' && '🌍'}
                    {subject === 'din' && '🕌'}
                    {subject === 'ingilizce' && '🇺🇸'}
                  </span>
                  <span className="text-sm sm:text-base">{subjectNames[subject]}</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {questionCounts[subject]} soru
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Doğru Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores[subject].dogru}
                    onChange={(e) => handleScoreChange(subject, 'dogru', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Yanlış Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores[subject].yanlis}
                    onChange={(e) => handleScoreChange(subject, 'yanlis', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md sm:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Hesapla Butonları */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={calculateLGSPoints}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-md sm:rounded-lg font-medium transition-colors flex items-center justify-center text-sm sm:text-base"
            >
              🧮 Puanı Hesapla
            </button>
            <button
              onClick={resetForm}
              className="px-3 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm sm:text-base"
            >
              🔄 Temizle
            </button>
          </div>
        </div>

        {/* Sonuçlar */}
        {result && (
          <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 sm:p-6 lg:p-8">
              <h4 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 sm:mb-3">🎯 LGS Puanınız</h4>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{result.totalPoints}</div>
              <p className="text-blue-100 text-xs sm:text-sm mt-2 sm:mt-3">
                Maksimum puan: 500 • Minimum puan: 0
              </p>
            </div>

            {/* Ders Bazında Detaylar */}
            <div className="border rounded-lg p-3 sm:p-4 lg:p-6">
              <h5 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">📊 Ders Bazında Detaylar</h5>
              <div className="space-y-3 sm:space-y-4">
                {/* İstenen ders sıralaması: Türkçe, Sosyal, Din, İngilizce, Matematik, Fen */}
                {['turkce', 'sosyal', 'din', 'ingilizce', 'matematik', 'fen'].map(subject => {
                  const name = subjectNames[subject];
                  const subjectData = result.subjects[subject] || { dogru: 0, yanlis: 0, net: 0, points: 0 };
                  return (
                  <div key={subject} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2 sm:mr-3 text-lg sm:text-xl">
                        {subject === 'turkce' && '📝'}
                        {subject === 'matematik' && '🔢'}
                        {subject === 'fen' && '🧪'}
                        {subject === 'sosyal' && '🌍'}
                        {subject === 'din' && '🕌'}
                        {subject === 'ingilizce' && '🇺🇸'}
                      </span>
                      <span className="font-medium text-sm sm:text-base">{name}</span>
                      <span className="text-xs text-gray-500 ml-2">({questionCounts[subject]} soru)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm text-gray-600">
                        Doğru: {subjectData.dogru} | Yanlış: {subjectData.yanlis} | Boş: {20 - subjectData.dogru - subjectData.yanlis} | Net: {subjectData.net}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>

            {/* Bilgilendirme */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 lg:p-6">
              <p className="text-green-800 text-xs sm:text-sm">
                <strong>💡 Bilgi:</strong> Bu hesaplama MEB'in resmi LGS puan hesaplama sistemine uygun olarak yapılmıştır. 
                Net sayıları = Doğru sayısı - (Yanlış sayısı ÷ 3) formülü ile hesaplanır. 
                <strong>Taban puan: 193.492</strong> otomatik olarak eklenir.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
// Lise Taban Puanları Tab Component
const VanTabanPuanTab = ({ lgsSchools, obpSchools }: {
  lgsSchools: Array<{
    name: string;
    type: string;
    score: string;
    percentile: string;
    capacity: string;
    district: string;
  }>,
  obpSchools: Array<{
    name: string;
    type: string;
    score: string;
    capacity: string;
    district: string;
  }>
}) => {
  const [selectedType, setSelectedType] = useState<'merkezi' | 'yerel' | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">🎓 Lise Taban Puanları</h2>
        
        {!selectedType ? (
          <>
            {/* LGS ve OBP Yerleştirme Bilgilendirme */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">📚 Lise Yerleştirme Sistemi</h3>
              
              <div className="bg-white rounded-lg p-6 border mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="text-purple-600 mr-3 text-2xl">🎓</span>
                  Lise Yerleştirme Türleri
                </h4>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="text-blue-600 mr-2 text-xl">🎯</span>
                      Merkezi Yerleştirme
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>Tanım:</strong> LGS sınav puanına göre Türkiye genelinde sıralama yapılarak öğrenci alan okullara yerleşme.
                      </p>
                      <p className="text-gray-700">
                        <strong>Okul Türleri:</strong> Fen Liseleri, Sosyal Bilimler Liseleri, Anadolu Liseleri, proje okulları, bazı teknik programlar
                      </p>
                      <p className="text-gray-700">
                        <strong>Belirleyici Faktör:</strong> LGS puanı ve tercih sırası; adres dikkate alınmaz.
                      </p>
                      <p className="text-gray-700">
                        <strong>Tercih:</strong> Öğrenciler sınavla alan okullar için ayrı tercih listesinden seçim yapar.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <h5 className="font-semibold text-green-800 mb-3 flex items-center">
                      <span className="text-green-600 mr-2 text-xl">🏠</span>
                      Yerel Yerleştirme (Adrese Dayalı)
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <strong>Tanım:</strong> Öğrencinin ikamet adresi, okul türü ve kontenjan dikkate alınarak kendi kayıt alanındaki okullara yerleşme.
                      </p>
                      <p className="text-gray-700">
                        <strong>Okul Türleri:</strong> Anadolu Liseleri, Meslek Liseleri, İmam Hatip Liseleri
                      </p>
                      <p className="text-gray-700">
                        <strong>Belirleyici Faktör:</strong> Kayıt alanı, okul türü ve kontenjan; tercih sırası önemlidir.
                      </p>
                      <p className="text-gray-700">
                        <strong>Tercih:</strong> Kayıt alanı önceliklidir; farklı alanlardan (komşu/diğer) okul seçimi sınırlıdır.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-purple-800 text-sm">
                    <strong>💡 Bilgi:</strong> LGS puanınız ile merkezi yerleştirme kapsamındaki okullara (Fen, Sosyal Bilimler), 
                    adres bilginiz ile yerel yerleştirme kapsamındaki okullara (Anadolu, Meslek, İmam Hatip) başvurabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Seçim Kartları */}
            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => setSelectedType('merkezi')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-8 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3 mr-4">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Merkezi Yerleştirme</h4>
                    <p className="text-blue-100 text-sm">Fen & Sosyal Bilimler Liseleri</p>
                  </div>
                </div>
                <p className="text-blue-100 text-sm">
                  LGS puanına göre merkezi yerleştirme kapsamındaki okulların taban puanlarını görüntüleyin.
                </p>
              </button>

              <button
                onClick={() => setSelectedType('yerel')}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg p-8 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3 mr-4">
                    <span className="text-3xl">🏠</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Yerel Yerleştirme</h4>
                    <p className="text-green-100 text-sm">İmam Hatip & Meslek Liseleri</p>
                  </div>
                </div>
                <p className="text-green-100 text-sm">
                  Adres bilginize göre yerel yerleştirme kapsamındaki okulların taban puanlarını görüntüleyin.
                </p>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Geri Dönüş Butonu */}
            <div className="mb-6">
              <button
                onClick={() => setSelectedType(null)}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Geri Dön
              </button>
            </div>

            {/* Seçilen İçerik */}
            {selectedType === 'merkezi' ? (
              <MerkeziYerlestirmePuanlariPanel />
            ) : (
              <YerelYerlestirmePuanlariPanel />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Merkezi Yerleştirme Taban Puanları Component (Panel)
const MerkeziYerlestirmePuanlariPanel = () => {
  const lgsSchools = [
    {
      name: "Van Türk Telekom Fen Lisesi",
      type: "Fen Lisesi", 
      score: "460.91",
      percentile: "2.51",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İpekyolu Borsa İstanbul Fen Lisesi",
      type: "Fen Lisesi",
      score: "441.61",
      percentile: "4.67",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Tuşba TOBB Fen Lisesi",
      type: "Fen Lisesi",
      score: "422.90",
      percentile: "7.20",
      capacity: "150",
      district: "Tuşba"
    },
    {
      name: "Niyazi Türkmenoğlu Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "416.75",
      percentile: "8.09",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Erciş Fen Lisesi",
      type: "Fen Lisesi",
      score: "402.18",
      percentile: "10.39",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Kazım Karabekir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "400.23",
      percentile: "10.71",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Türkiye Yardımsevenler Derneği Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "387.01",
      percentile: "12.92",
      capacity: "120",
      district: "Edremit"
    },
    {
      name: "Van Atatürk Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "379.46",
      percentile: "14.26",
      capacity: "180",
      district: "İpekyolu"
    },
    {
      name: "Abdurrahman Gazi Borsa İstanbul Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "367.20",
      percentile: "16.52",
      capacity: "150",
      district: "Tuşba"
    },
    {
      name: "Muradiye Alpaslan Fen Lisesi",
      type: "Fen Lisesi",
      score: "366.59",
      percentile: "16.63",
      capacity: "120",
      district: "Muradiye"
    },
    {
      name: "Erciş Sosyal Bilimler Lisesi",
      type: "Sosyal Bilimler Lisesi",
      score: "366.09",
      percentile: "20.09",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "Van Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "360.29",
      percentile: "19.06",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "349.74",
      percentile: "23.59",
      capacity: "180",
      district: "Edremit"
    },
    {
      name: "Sevim Kürüm Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "349.08",
      percentile: "18.31",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "İskele Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "325.31",
      percentile: "27.46",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Edremit Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "312.80",
      percentile: "39.48",
      capacity: "120",
      district: "Edremit"
    },
    {
      name: "Mehmet Erdemoğlu Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "305.71",
      percentile: "30.94",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Şehit Polis Halil Hamuryen Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "308.52",
      percentile: "40.76",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "Tevfik İleri Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "294.42",
      percentile: "45.03",
      capacity: "120",
      district: "Erciş"
    },
    {
      name: "Erciş Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "293.47",
      percentile: "50.02",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Mizancı Murat Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "293.21",
      percentile: "55.88",
      capacity: "120",
      district: "Edremit"
    },
    {
      name: "Gevaş Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "267.96",
      percentile: "98.45",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Hüseyin Çelik Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "263.42",
      percentile: "48.81",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Özalp Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "255.88",
      percentile: "89.83",
      capacity: "120",
      district: "Özalp"
    },
    {
      name: "Tuşba Şehit Ferhat Arslan Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "251.82",
      percentile: "97.98",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Şehit Haluk Varlı Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "221.47",
      percentile: "94.06",
      capacity: "120",
      district: "Gürpınar"
    },
    {
      name: "Muradiye Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "208.61",
      percentile: "97.43",
      capacity: "120",
      district: "Muradiye"
    },
    {
      name: "Başkale Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "199.41",
      percentile: "99.80",
      capacity: "120",
      district: "Başkale"
    },
    {
      name: "Çaldıran Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "197.30",
      percentile: "82.62",
      capacity: "120",
      district: "Çaldıran"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-blue-600 mr-3">🎯</span>
          Van İli Merkezi Yerleştirme Taban Puanları (2025)
        </h3>
        <p className="text-gray-600 mb-6">
          2025 LGS sonuçlarına göre Van ilindeki merkezi yerleştirme kapsamındaki okulların taban puanları:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-800">Lise Adı</th>
                <th className="text-left p-4 font-semibold text-gray-800">Tür</th>
                <th className="text-center p-4 font-semibold text-gray-800">Taban Puan</th>
                <th className="text-center p-4 font-semibold text-gray-800">Yüzdelik Dilim</th>
                <th className="text-center p-4 font-semibold text-gray-800">Kontenjan</th>
                <th className="text-left p-4 font-semibold text-gray-800">İlçe</th>
              </tr>
            </thead>
            <tbody>
              {lgsSchools.map((school, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{school.name}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      school.type === 'Fen Lisesi' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {school.type}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600 text-lg">{school.score}</td>
                  <td className="p-4 text-center font-bold text-purple-600 text-lg">{school.percentile}%</td>
                  <td className="p-4 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-4 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


      </div>
    </div>
  );
};

// Van OBP Taban Puanları Component (Panel)
const YerelYerlestirmePuanlariPanel = () => {
  const obpSchools = [
    {
      name: "Mesut Özata Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "91.09",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Özen Adalı Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.66",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Mehmet Akif Ersoy Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "88.96",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Arif Nihat Asya Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "89.39",
      capacity: "150",
      district: "Erciş"
    },
    {
      name: "Faki Teyran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "85.96",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "İki Nisan Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.93",
      capacity: "150",
      district: "İpekyolu"
    },
    {
      name: "Çaldıran Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "84.30",
      capacity: "120",
      district: "Çaldıran"
    },
    {
      name: "İzzeddin Şir Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "83.69",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "84.09",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "Said Nursi Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "65.83",
      capacity: "120",
      district: "İpekyolu"
    },
    {
      name: "Evliya Çelebi Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "45.72",
      capacity: "150",
      district: "Edremit"
    },
    {
      name: "Kalecik Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "43.85",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Tuşba Mesleki ve Teknik Anadolu Lisesi",
      type: "Mesleki ve Teknik Anadolu Lisesi",
      score: "42.18",
      capacity: "120",
      district: "Tuşba"
    },
    {
      name: "Başkale Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "41.65",
      capacity: "120",
      district: "Başkale"
    },
    {
      name: "Muradiye Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "39.24",
      capacity: "120",
      district: "Muradiye"
    },
    {
      name: "Gürpınar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "38.97",
      capacity: "120",
      district: "Gürpınar"
    },
    {
      name: "Özalp Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "35.82",
      capacity: "120",
      district: "Özalp"
    },
    {
      name: "Saray Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "34.15",
      capacity: "120",
      district: "Saray"
    },
    {
      name: "Bahçesaray Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "32.48",
      capacity: "120",
      district: "Bahçesaray"
    },
    {
      name: "Gevaş Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "30.76",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Akdamar Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "29.31",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Çatak Anadolu Lisesi",
      type: "Anadolu Lisesi",
      score: "27.84",
      capacity: "120",
      district: "Çatak"
    },
    {
      name: "Gevaş Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "26.45",
      capacity: "120",
      district: "Gevaş"
    },
    {
      name: "Başkale Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "24.89",
      capacity: "120",
      district: "Başkale"
    },
    {
      name: "Çatak Kız Anadolu İmam Hatip Lisesi",
      type: "Anadolu İmam Hatip Lisesi",
      score: "23.68",
      capacity: "120",
      district: "Çatak"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-green-600 mr-3">📖</span>
          Van İli Yerel Yerleştirme Taban Puanları (2025)
        </h3>
        <p className="text-gray-600 mb-6">
          2025 OBP sonuçlarına göre Van ilindeki yerel yerleştirme kapsamındaki okulların taban puanları:
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-800">Okul Adı</th>
                <th className="text-left p-4 font-semibold text-gray-800">Tür</th>
                <th className="text-center p-4 font-semibold text-gray-800">Taban Puan</th>
                <th className="text-center p-4 font-semibold text-gray-800">Kontenjan</th>
                <th className="text-left p-4 font-semibold text-gray-800">İlçe</th>
              </tr>
            </thead>
            <tbody>
              {obpSchools.map((school, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{school.name}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      school.type.includes('İmam Hatip') 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {school.type}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-green-600 text-lg">{school.score}</td>
                  <td className="p-4 text-center text-gray-700">{school.capacity}</td>
                  <td className="p-4 text-gray-600">{school.district}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Not:</strong> Bu puanlar 2025 OBP sonuçlarına göre yerel yerleştirme taban puanlarıdır ve MEB verilerine dayanmaktadır.
          </p>
        </div>
      </div>
    </div>
  );
};

// 🎯 PUAN BAZLI LİSE TAVSİYESİ TAB COMPONENT
const PuanBazliLiseTavsiyesiTab = ({ students, results, exams, lgsSchools, obpSchools }: { 
  students: Student[],
  results: any[],
  exams: any[],
  lgsSchools: Array<{
    name: string;
    type: string;
    score: string;
    percentile: string;
    capacity: string;
    district: string;
  }>,
  obpSchools: Array<{
    name: string;
    type: string;
    score: string;
    capacity: string;
    district: string;
  }>
}) => {
  const [selectedSinif, setSelectedSinif] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentPuan, setStudentPuan] = useState<number>(0);
  const [averagePuan, setAveragePuan] = useState<number>(0);

  // Sınıf listesi
  const siniflar = Array.from(new Set(students.map(s => s.class))).sort();

  // Helper: String veya number puan alanını number'a çevir
  const parsePuan = (value: any): number => {
    if (typeof value === 'number') return value > 0 ? value : 0;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Helper: studentResult'dan puanı al (fallback zinciri)
  const getScoreFromResult = (studentResult: any): number => {
    if (!studentResult) return 0;
    
    // Önce manuel girilen puanı kontrol et (en doğru değer)
    let totalScore = parsePuan(studentResult.puan);
    
    // Eğer puan yoksa, scores.puan alanını kontrol et
    if (!totalScore) {
      totalScore = parsePuan(studentResult.scores?.puan);
    }
    
    // Eğer totalScore alanı varsa onu kontrol et
    if (!totalScore) {
      totalScore = parsePuan(studentResult.totalScore);
    }
    
    // Son olarak nets.total'ı kontrol et
    if (!totalScore) {
      totalScore = parsePuan(studentResult.nets?.total);
    }
    
    return totalScore;
  };

  // Seçili öğrenci değiştiğinde puanları hesapla
  useEffect(() => {
    if (selectedStudent && results.length > 0) {
      // Öğrencinin deneme sonuçlarını bul
      const studentResults = results.filter((r: any) => r.studentId === selectedStudent);
      
      if (studentResults.length > 0) {
        // Ortalama puanı hesapla
        let totalScore = 0;
        let count = 0;
        let highestScore = 0;
        
        studentResults.forEach((result: any) => {
          // result'ın içindeki puanı al - examResults formatında olabilir
          const examData = result.examData || result;
          const studentResult = examData?.studentResults?.find((sr: any) => sr.studentId === selectedStudent);
          
          if (studentResult) {
            const score = getScoreFromResult(studentResult);
            if (score > 0) {
              totalScore += score;
              count++;
              highestScore = Math.max(highestScore, score);
            }
          } else {
            // Direct result format
            const score = getScoreFromResult(result);
            if (score > 0) {
              totalScore += score;
              count++;
              highestScore = Math.max(highestScore, score);
            }
          }
        });
        
        setAveragePuan(count > 0 ? totalScore / count : 0);
        setStudentPuan(highestScore);
      } else {
        setAveragePuan(0);
        setStudentPuan(0);
      }
    } else {
      setAveragePuan(0);
      setStudentPuan(0);
    }
  }, [selectedStudent, results]);

  // Van ili lise veritabanı
  const vanLgsSchools = [
    { name: "Van Türk Telekom Fen Lisesi", type: "Fen Lisesi", score: 460.91, district: "Edremit" },
    { name: "İpekyolu Borsa İstanbul Fen Lisesi", type: "Fen Lisesi", score: 441.61, district: "İpekyolu" },
    { name: "Tuşba TOBB Fen Lisesi", type: "Fen Lisesi", score: 422.90, district: "Tuşba" },
    { name: "Niyazi Türkmenoğlu Anadolu Lisesi", type: "Anadolu Lisesi", score: 416.75, district: "İpekyolu" },
    { name: "Erciş Fen Lisesi", type: "Fen Lisesi", score: 402.18, district: "Erciş" },
    { name: "Kazım Karabekir Anadolu Lisesi", type: "Anadolu Lisesi", score: 400.23, district: "İpekyolu" },
    { name: "Türkiye Yardımsevenler Derneği Anadolu Lisesi", type: "Anadolu Lisesi", score: 387.01, district: "Edremit" },
    { name: "Van Atatürk Anadolu Lisesi", type: "Anadolu Lisesi", score: 379.46, district: "İpekyolu" },
    { name: "Abdurrahman Gazi Borsa İstanbul Anadolu Lisesi", type: "Anadolu Lisesi", score: 367.20, district: "Tuşba" },
    { name: "Muradiye Alpaslan Fen Lisesi", type: "Fen Lisesi", score: 366.59, district: "Muradiye" },
    { name: "Erciş Sosyal Bilimler Lisesi", type: "Sosyal Bilimler Lisesi", score: 366.09, district: "Erciş" },
    { name: "Van Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 360.29, district: "İpekyolu" },
    { name: "Van-Borsa İstanbul Mesleki ve Teknik Anadolu Lisesi", type: "Mesleki ve Teknik Anadolu Lisesi", score: 349.74, district: "Edremit" },
    { name: "Sevim Kürüm Anadolu Lisesi", type: "Anadolu Lisesi", score: 349.08, district: "Erciş" },
    { name: "İskele Kız Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 325.31, district: "İpekyolu" },
    { name: "Edremit Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 312.80, district: "Edremit" },
    { name: "Mehmet Erdemoğlu Mesleki ve Teknik Anadolu Lisesi", type: "Mesleki ve Teknik Anadolu Lisesi", score: 305.71, district: "İpekyolu" },
    { name: "Şehit Polis Halil Hamuryen Kız Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 308.52, district: "Erciş" },
    { name: "Tevfik İleri Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 294.42, district: "Erciş" },
    { name: "Erciş Mesleki ve Teknik Anadolu Lisesi", type: "Mesleki ve Teknik Anadolu Lisesi", score: 293.47, district: "Erciş" },
    { name: "Mizancı Murat Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 293.21, district: "Edremit" },
    { name: "Gevaş Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 267.96, district: "Gevaş" },
    { name: "Hüseyin Çelik Kız Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 263.42, district: "Tuşba" },
    { name: "Özalp Kız Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 255.88, district: "Özalp" },
    { name: "Tuşba Şehit Ferhat Arslan Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 251.82, district: "Tuşba" },
    { name: "Şehit Haluk Varlı Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 221.47, district: "Gürpınar" },
    { name: "Muradiye Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 208.61, district: "Muradiye" },
    { name: "Başkale Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 199.41, district: "Başkale" },
    { name: "Çaldıran Anadolu İmam Hatip Lisesi", type: "Anadolu İmam Hatip Lisesi", score: 197.30, district: "Çaldıran" }
  ];

  // Helper: Liseleri kategorize et
  const categorizeSchools = (baseScore: number) => {
    const highRange = { min: baseScore - 20, max: baseScore + 20 };
    const mediumRange = { min: baseScore + 21, max: baseScore + 40 };
    const lowRange = { min: baseScore + 41, max: baseScore + 60 };

    const highProbabilitySchools = vanLgsSchools.filter(school => 
      school.score >= highRange.min && school.score <= highRange.max
    );
    
    const mediumProbabilitySchools = vanLgsSchools.filter(school => 
      school.score >= mediumRange.min && school.score <= mediumRange.max
    );
    
    const lowProbabilitySchools = vanLgsSchools.filter(school => 
      school.score >= lowRange.min && school.score <= lowRange.max
    );

    return { highRange, mediumRange, lowRange, highProbabilitySchools, mediumProbabilitySchools, lowProbabilitySchools };
  };

  // Ortalama puana göre kategorize et
  const averageData = averagePuan > 0 ? categorizeSchools(averagePuan) : null;
  
  // En yüksek puana göre kategorize et
  const highestData = studentPuan > 0 ? categorizeSchools(studentPuan) : null;

  // Liseleri gösteren bileşen
  const LiseListesi = ({ data, title, puanLabel }: { data: any, title: string, puanLabel: string }) => {
    if (!data) return null;

    const { highRange, mediumRange, lowRange, highProbabilitySchools, mediumProbabilitySchools, lowProbabilitySchools } = data;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">{title}</h3>
        
        {/* Puan Bilgisi */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="text-sm text-blue-700 mb-1">{puanLabel}</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(averagePuan || studentPuan)} puan
            </div>
          </div>
        </div>

        {/* Puan Aralıklarına Göre Lise Önerileri */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Yüksek İhtimal -20 ile +20 arası */}
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                ✅ Yüksek İhtimal
              </h5>
              <div className="text-xs text-green-700 mb-3">
                {Math.round(highRange.min)}-{Math.round(highRange.max)} puan aralığı
              </div>
              <div className="space-y-2">
                {highProbabilitySchools.length > 0 ? highProbabilitySchools.slice(0, 4).map(school => (
                  <div key={school.name} className="bg-white p-2 rounded border">
                    <div className="text-sm font-medium text-gray-900">{school.name}</div>
                    <div className="text-xs text-gray-600">{school.type} • {school.score.toFixed(2)} taban • {school.district}</div>
                  </div>
                )) : (
                  <div className="text-xs text-green-600">Bu aralıkta okul bulunmuyor</div>
                )}
              </div>
            </div>

            {/* Orta İhtimal +21 ile +40 arası */}
            <div className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                ⚠️ Orta İhtimal
              </h5>
              <div className="text-xs text-yellow-700 mb-3">
                {Math.round(mediumRange.min)}-{Math.round(mediumRange.max)} puan aralığı
              </div>
              <div className="space-y-2">
                {mediumProbabilitySchools.length > 0 ? mediumProbabilitySchools.slice(0, 4).map(school => (
                  <div key={school.name} className="bg-white p-2 rounded border">
                    <div className="text-sm font-medium text-gray-900">{school.name}</div>
                    <div className="text-xs text-gray-600">{school.type} • {school.score.toFixed(2)} taban • {school.district}</div>
                  </div>
                )) : (
                  <div className="text-xs text-yellow-600">Bu aralıkta okul bulunmuyor</div>
                )}
              </div>
            </div>

            {/* Düşük İhtimal +41 ile +60 arası */}
            <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-red-800 mb-2 flex items-center">
                🔥 Düşük İhtimal
              </h5>
              <div className="text-xs text-red-700 mb-3">
                {Math.round(lowRange.min)}-{Math.round(lowRange.max)} puan aralığı
              </div>
              <div className="space-y-2">
                {lowProbabilitySchools.length > 0 ? lowProbabilitySchools.slice(0, 4).map(school => (
                  <div key={school.name} className="bg-white p-2 rounded border">
                    <div className="text-sm font-medium text-gray-900">{school.name}</div>
                    <div className="text-xs text-gray-600">{school.type} • {school.score.toFixed(2)} taban • {school.district}</div>
                  </div>
                )) : (
                  <div className="text-xs text-red-600">Bu aralıkta okul bulunmuyor</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">🎯 Puan Bazlı Lise Tavsiyesi</h2>
        <p className="text-purple-100 text-lg">
          Öğrencinin puanına göre uygun lise önerileri
        </p>
      </div>

      {/* Öğrenci Seçimi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">👨‍🎓 Öğrenci Seçimi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sınıf Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏫 Sınıf Seçin
            </label>
            <select
              value={selectedSinif}
              onChange={(e) => {
                setSelectedSinif(e.target.value);
                setSelectedStudent('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sınıf seçin...</option>
              {siniflar.map(sinif => (
                <option key={sinif} value={sinif}>{sinif}</option>
              ))}
            </select>
          </div>

          {/* Öğrenci Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Öğrenci Seçin
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={!selectedSinif}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
            >
              <option value="">Öğrenci seçin...</option>
              {selectedSinif && students.filter(s => s.class === selectedSinif).map(student => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ortalama ve En Yüksek Puan */}
      {selectedStudent && (averagePuan > 0 || studentPuan > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="text-sm text-blue-700 mb-1">📈 Ortalama Puan</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(averagePuan)} puan
            </div>
            <div className="text-xs text-blue-600 mt-1">
              (Denemelerin ortalaması)
            </div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-sm text-green-700 mb-1">🏆 En Yüksek Puan</div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(studentPuan)} puan
            </div>
            <div className="text-xs text-green-600 mt-1">
              (En başarılı deneme)
            </div>
          </div>
        </div>
      )}

      {/* Bölüm 1: Ortalama Puana Göre Lise Önerileri */}
      {selectedStudent && averagePuan > 0 && (
        <LiseListesi 
          data={averageData} 
          title="📊 Ortalama Puana Göre Lise Önerileri" 
          puanLabel="📈 Öğrencinin Ortalama Deneme Puanı"
        />
      )}

      {/* Bölüm 2: En Yüksek Puana Göre Lise Önerileri */}
      {selectedStudent && studentPuan > 0 && (
        <LiseListesi 
          data={highestData} 
          title="🏆 En Yüksek Puana Göre Lise Önerileri" 
          puanLabel="📊 Öğrencinin En Yüksek Deneme Puanı"
        />
      )}

      {/* Tavsiye */}
      {selectedStudent && (averagePuan > 0 || studentPuan > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">💡 Tavsiyeler</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📚 Çalışma Tavsiyesi</h4>
              <p className="text-blue-700">
                {(averagePuan || studentPuan) >= 400 ? 'Mükemmel! Bu performansı sürdürmek için düzenli tekrar yapın.' :
                 (averagePuan || studentPuan) >= 350 ? 'İyi gidiyorsunuz! Zayıf derslerinize daha çok odaklanın.' :
                 (averagePuan || studentPuan) >= 300 ? 'Hedeflerinize ulaşmak için günde en az 3 saat çalışın.' :
                 'Temel konuları tekrar ederek başlayın. Günde en az 4 saat çalışmalısınız.'}
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">🎯 Strateji</h4>
              <p className="text-purple-700">
                {(averagePuan || studentPuan) >= 400 ? 'En iyi liseleri hedefleyin. Matematik ve fen odaklı çalışın.' :
                 (averagePuan || studentPuan) >= 350 ? 'Orta düzey liselere odaklanın. Türkçe ve sosyal geliştirin.' :
                 (averagePuan || studentPuan) >= 300 ? 'Temel liseleri hedefleyin. Tüm derslerde denge kurun.' :
                 'Temel konularda eksiklerinizi kapatın. Sınav stratejisi geliştirin.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 📚 KITAP SINAVI TAB COMPONENT
const KitapSinaviTab = ({ students, onDataUpdate }: { 
  students: Student[], 
  onDataUpdate: () => void 
}) => {
  const [kitapSinavlari, setKitapSinavlari] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSinav, setEditingSinav] = useState<any>(null);
  const [selectedSinav, setSelectedSinav] = useState<any>(null);
  const [sinavSonuclari, setSinavSonuclari] = useState<any[]>([]);
  const [newSinav, setNewSinav] = useState({
    kitapAdi: '',
    sinif: '',
    tarih: new Date().toISOString().split('T')[0],
    puanlar: {} as {[studentId: string]: number}
  });

  // Tüm sınıfları al
  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();

  // Kitap sınavlarını getir
  useEffect(() => {
    loadKitapSinavlari();
  }, []);

  const loadKitapSinavlari = async () => {
    setLoading(true);
    try {
      const { getKitapSinavlari } = await import('../../firebase');
      const sinavlar = await getKitapSinavlari();
      setKitapSinavlari(sinavlar);
    } catch (error) {
      console.error('Kitap sınavları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Yeni sınav oluştur
  const handleCreateSinav = async () => {
    if (!newSinav.kitapAdi || !newSinav.sinif) {
      alert('Lütfen kitap adı ve sınıf seçiniz!');
      return;
    }

    try {
      const { addKitapSinavi } = await import('../../firebase');
      const puanlarFormatted = Object.entries(newSinav.puanlar).reduce((acc, [studentId, puan]) => {
        acc[studentId] = { puan, tarih: newSinav.tarih };
        return acc;
      }, {} as {[studentId: string]: {puan: number; tarih: string}});

      await addKitapSinavi({
        kitapAdi: newSinav.kitapAdi,
        sinif: newSinav.sinif,
        tarih: newSinav.tarih,
        puanlar: puanlarFormatted
      });

      // Form'u sıfırla
      setNewSinav({
        kitapAdi: '',
        sinif: '',
        tarih: new Date().toISOString().split('T')[0],
        puanlar: {}
      });
      setShowAddForm(false);
      
      // Listeyi yenile
      loadKitapSinavlari();
      
      alert('📚 Kitap sınavı başarıyla eklendi!');
    } catch (error) {
      console.error('Kitap sınavı eklenirken hata:', error);
      alert('Kitap sınavı eklenirken hata oluştu!');
    }
  };

  // Puan güncelle
  const handlePuanChange = (studentId: string, puan: string) => {
    const puanNum = parseFloat(puan) || 0;
    setNewSinav(prev => ({
      ...prev,
      puanlar: {
        ...prev.puanlar,
        [studentId]: puanNum
      }
    }));
  };

  // Seçilen sınıftaki öğrenciler
  const selectedClassStudents = students.filter(s => s.class === newSinav.sinif);

  // Sınavı düzenle
  const handleEditSinav = (sinav: any) => {
    setEditingSinav(sinav);
    setNewSinav({
      kitapAdi: sinav.kitapAdi,
      sinif: sinav.sinif,
      tarih: sinav.tarih,
      puanlar: Object.fromEntries(Object.entries(sinav.puanlar || {}).map(([id, p]: [string, any]) => [id, p.puan]))
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  // Sınavı güncelle
  const handleUpdateSinav = async () => {
    if (!editingSinav || !newSinav.kitapAdi || !newSinav.sinif) {
      alert('Lütfen kitap adı ve sınıf seçiniz!');
      return;
    }

    try {
      const { updateKitapSinavi } = await import('../../firebase');
      const puanlarFormatted = Object.entries(newSinav.puanlar).reduce((acc, [studentId, puan]) => {
        acc[studentId] = { puan, tarih: newSinav.tarih };
        return acc;
      }, {} as {[studentId: string]: {puan: number; tarih: string}});

      await updateKitapSinavi(editingSinav.id, puanlarFormatted);

      // Form'u sıfırla
      setEditingSinav(null);
      setNewSinav({
        kitapAdi: '',
        sinif: '',
        tarih: new Date().toISOString().split('T')[0],
        puanlar: {}
      });
      setShowEditForm(false);
      
      // Listeyi yenile
      loadKitapSinavlari();
      
      alert('📚 Kitap sınavı başarıyla güncellendi!');
    } catch (error) {
      console.error('Kitap sınavı güncellenirken hata:', error);
      alert('Kitap sınavı güncellenirken hata oluştu!');
    }
  };

  // Sınavı sil
  const handleDeleteSinav = async (sinavId: string) => {
    if (!confirm('Bu kitap sınavını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    try {
      const { deleteKitapSinavi } = await import('../../firebase');
      await deleteKitapSinavi(sinavId);
      
      // Listeyi yenile
      loadKitapSinavlari();
      
      // Eğer silinen sınav seçiliyse temizle
      if (selectedSinav?.id === sinavId) {
        setSelectedSinav(null);
        setSinavSonuclari([]);
      }
      
      alert('📚 Kitap sınavı başarıyla silindi!');
    } catch (error) {
      console.error('Kitap sınavı silinirken hata:', error);
      alert('Kitap sınavı silinirken hata oluştu!');
    }
  };

  // Seçilen sınavın sonuçlarını getir
  const loadSinavSonuclari = async (sinav: any) => {
    setSelectedSinav(sinav);
    
    // Sonuçları öğrenci bilgileriyle birleştir
    const sonuclar = Object.entries(sinav.puanlar || {}).map(([studentId, data]: [string, any]) => {
      const student = students.find(s => s.id === studentId);
      return {
        studentId,
        studentName: student?.name || 'Bilinmeyen Öğrenci',
        studentNumber: student?.number || '-',
        studentClass: student?.class || '-',
        puan: data.puan,
        tarih: data.tarih
      };
    });
    
    // Öğrenci numarasına göre sırala
    sonuclar.sort((a, b) => {
      const numA = typeof a.studentNumber === 'number' ? a.studentNumber : parseInt(a.studentNumber) || 0;
      const numB = typeof b.studentNumber === 'number' ? b.studentNumber : parseInt(b.studentNumber) || 0;
      return numA - numB;
    });
    
    setSinavSonuclari(sonuclar);
  };

  // Sınav seçimini temizle
  const clearSelectedSinav = () => {
    setSelectedSinav(null);
    setSinavSonuclari([]);
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Yeni Sınav Butonu */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📚 Kitap Sınavı Yönetimi</h2>
          <p className="text-gray-600">Kitap sınavları oluşturun ve puanları yönetin</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowEditForm(false);
            setEditingSinav(null);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-medium"
        >
          {showAddForm || showEditForm ? 'İptal' : '➕ Yeni Sınav Ekle'}
        </button>
      </div>

      {/* 📊 Sınav Sonuçları Görüntüleme Bölümü */}
      {kitapSinavlari.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📊 Sınav Sonuçlarını Görüntüle</h3>
            {selectedSinav && (
              <button
                onClick={clearSelectedSinav}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Sınav Seçimine Dön
              </button>
            )}
          </div>
          
          {selectedSinav ? (
            /* Seçilen Sınavın Sonuçları */
            <div>
              {/* Seçilen Sınav Bilgisi */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📖</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-blue-800">{selectedSinav.kitapAdi}</h4>
                    <p className="text-sm text-blue-600">
                      {selectedSinav.sinif} Sınıfı • {new Date(selectedSinav.tarih).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                
                {/* İstatistikler */}
                {sinavSonuclari.length > 0 && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-800">{sinavSonuclari.length}</div>
                      <div className="text-xs text-gray-500">Toplam Öğrenci</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(sinavSonuclari.reduce((sum, s) => sum + s.puan, 0) / sinavSonuclari.length).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Sınıf Ortalaması</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.max(...sinavSonuclari.map(s => s.puan))}
                      </div>
                      <div className="text-xs text-gray-500">En Yüksek</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {Math.min(...sinavSonuclari.map(s => s.puan))}
                      </div>
                      <div className="text-xs text-gray-500">En Düşük</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sonuç Tablosu */}
              {sinavSonuclari.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Öğrenci Adı
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sınıf
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Puan
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Başarı Durumu
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sinavSonuclari.map((sonuc, index) => {
                        const basariDurumu = sonuc.puan >= 85 ? 'Mükemmel' : 
                                           sonuc.puan >= 70 ? 'İyi' : 
                                           sonuc.puan >= 50 ? 'Orta' : 'Gelişmeli';
                        const basariRengi = sonuc.puan >= 85 ? 'text-green-600 bg-green-100' : 
                                          sonuc.puan >= 70 ? 'text-blue-600 bg-blue-100' : 
                                          sonuc.puan >= 50 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                        
                        return (
                          <tr key={sonuc.studentId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{sonuc.studentName}</div>
                              <div className="text-xs text-gray-500">No: {sonuc.studentNumber}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {sonuc.studentClass}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="text-lg font-bold text-gray-900">{sonuc.puan}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${basariRengi}`}>
                                {basariDurumu}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Bu sınav için sonuç bulunmuyor.
                </div>
              )}
            </div>
          ) : (
            /* Sınav Seçim Dropdown */
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Görüntülemek istediğiniz sınavı seçin
              </label>
              <select
                onChange={(e) => {
                  const sinavId = e.target.value;
                  if (sinavId) {
                    const sinav = kitapSinavlari.find(s => s.id === sinavId);
                    if (sinav) {
                      loadSinavSonuclari(sinav);
                    }
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">📚 Sınav seçiniz...</option>
                {kitapSinavlari.map((sinav) => (
                  <option key={sinav.id} value={sinav.id}>
                    📖 {sinav.kitapAdi} - {sinav.sinif} ({new Date(sinav.tarih).toLocaleDateString('tr-TR')})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Yeni Sınav Ekleme Formu */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">📝 Yeni Kitap Sınavı Oluştur</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Kitap Adı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📖 Kitap Adı
              </label>
              <input
                type="text"
                value={newSinav.kitapAdi}
                onChange={(e) => setNewSinav(prev => ({ ...prev, kitapAdi: e.target.value }))}
                placeholder="Kitap adını giriniz..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sınıf Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏛️ Sınıf Seçin
              </label>
              <select
                value={newSinav.sinif}
                onChange={(e) => setNewSinav(prev => ({ 
                  ...prev, 
                  sinif: e.target.value,
                  puanlar: {} // Sınıf değişince puanları sıfırla
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sınıf seçiniz...</option>
                {uniqueClasses.map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>

            {/* Tarih */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Sınav Tarihi
              </label>
              <input
                type="date"
                value={newSinav.tarih}
                onChange={(e) => setNewSinav(prev => ({ ...prev, tarih: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Öğrenci Listesi ve Puan Girişi */}
          {selectedClassStudents.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">
                👥 {newSinav.sinif} Sınıfı Öğrencileri ({selectedClassStudents.length} öğrenci)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {selectedClassStudents.map(student => (
                  <div key={student.id} className="flex items-center space-x-3 p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{student.name}</p>
                      <p className="text-xs text-gray-500">No: {student.number}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Puan"
                      value={newSinav.puanlar[student.id] || ''}
                      onChange={(e) => handlePuanChange(student.id, e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kaydet Butonu */}
          <div className="flex justify-end mt-6">
            <button
              onClick={editingSinav ? handleUpdateSinav : handleCreateSinav}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 font-medium"
            >
              {editingSinav ? '💾 Sınavı Güncelle' : '💾 Sınavı Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Sınav Düzenleme Formu */}
      {showEditForm && editingSinav && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">✏️ Kitap Sınavını Düzenle</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Kitap Adı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📖 Kitap Adı
              </label>
              <input
                type="text"
                value={newSinav.kitapAdi}
                onChange={(e) => setNewSinav(prev => ({ ...prev, kitapAdi: e.target.value }))}
                placeholder="Kitap adını giriniz..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Sınıf Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏛️ Sınıf Seçin
              </label>
              <select
                value={newSinav.sinif}
                onChange={(e) => setNewSinav(prev => ({ 
                  ...prev, 
                  sinif: e.target.value,
                  puanlar: {} // Sınıf değişince puanları sıfırla
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sınıf seçiniz...</option>
                {uniqueClasses.map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>

            {/* Tarih */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Sınav Tarihi
              </label>
              <input
                type="date"
                value={newSinav.tarih}
                onChange={(e) => setNewSinav(prev => ({ ...prev, tarih: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Öğrenci Listesi ve Puan Girişi */}
          {selectedClassStudents.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">
                👥 {newSinav.sinif} Sınıfı Öğrencileri ({selectedClassStudents.length} öğrenci)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {selectedClassStudents.map(student => (
                  <div key={student.id} className="flex items-center space-x-3 p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{student.name}</p>
                      <p className="text-xs text-gray-500">No: {student.number}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Puan"
                      value={newSinav.puanlar[student.id] || ''}
                      onChange={(e) => handlePuanChange(student.id, e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Güncelle Butonu */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleUpdateSinav}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 font-medium"
            >
              💾 Sınavı Güncelle
            </button>
          </div>
        </div>
      )}

      {/* Mevcut Kitap Sınavları */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">📊 Mevcut Kitap Sınavları</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Yükleniyor...</p>
          </div>
        ) : kitapSinavlari.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            📚 Henüz kitap sınavı bulunmamaktadır.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    📖 Kitap Adı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🏛️ Sınıf
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    📅 Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    👥 Öğrenci Sayısı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    📊 Ortalama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ⚙️ İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kitapSinavlari.map((sinav) => {
                  const ogrenciSayisi = Object.keys(sinav.puanlar || {}).length;
                  const puanlar = Object.values(sinav.puanlar || {}).map(p => (p as any).puan);
                  const ortalama = puanlar.length > 0 ? (puanlar.reduce((a, b) => a + b, 0) / puanlar.length).toFixed(1) : '0';
                  
                  return (
                    <tr key={sinav.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{sinav.kitapAdi}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sinav.sinif}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(sinav.tarih).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{ogrenciSayisi}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">{ortalama}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditSinav(sinav)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSinav(sinav.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// 📝 Ödev Takibi Tab Component
const OdevTakibiTab = ({ students, onDataUpdate }: { 
  students: any[]; 
  onDataUpdate: () => void;
}) => {
  const [selectedSinif, setSelectedSinif] = useState<string>('');
  const [selectedDers, setSelectedDers] = useState<string>('');
  const [odevDurumlar, setOdevDurumlar] = useState<{[key: string]: string}>({});
  const [tarih, setTarih] = useState<string>(new Date().toISOString().split('T')[0]);
  const [gecmisKayitlar, setGecmisKayitlar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [dirtyStates, setDirtyStates] = useState<{[key: string]: boolean}>({});
  const [activeOdevTab, setActiveOdevTab] = useState<'yeni' | 'rapor'>('yeni');
  const [raporSinif, setRaporSinif] = useState<string>('');
  const [raporOgrenci, setRaporOgrenci] = useState<string>('');
  const [raporDers, setRaporDers] = useState<string>('');
  
  // Geçmiş kontroller için filtreler
  const [gecmisFilterSinif, setGecmisFilterSinif] = useState<string>('');
  const [gecmisFilterDers, setGecmisFilterDers] = useState<string>('');

  // Dersler listesi
  const dersler = [
    { key: 'turkce', label: '📖 Türkçe', color: '#10B981' },
    { key: 'matematik', label: '🔢 Matematik', color: '#F59E0B' },
    { key: 'fen', label: '🔬 Fen Bilimleri', color: '#3B82F6' },
    { key: 'sosyal', label: '🌍 Sosyal Bilgiler', color: '#8B5CF6' },
    { key: 'din', label: '🕌 Din Kültürü', color: '#F97316' },
    { key: 'ingilizce', label: '🇺🇸 İngilizce', color: '#EF4444' }
  ];

  // Sınıf listesi
  const siniflar = Array.from(new Set(students.map(s => s.class))).sort();

  // Seçili sınıfın öğrencileri
  const seciliSinifOgrencileri = students.filter(s => s.class === selectedSinif);
  



  // Geçmiş kayıtları yükle
  useEffect(() => {
    loadGecmisKayitlar();
  }, []);

  // Seçilen ders ve sınıfa göre ödev durumlarını yükle (sadece kayıt varsa)
  useEffect(() => {
    if (selectedDers && selectedSinif && tarih) {
      // seciliSinifOgrencileri'yi yeniden hesapla (race condition önlemek için)
      const currentSinifOgrencileri = students.filter(s => s.class === selectedSinif);
      loadOdevDurumlariWithStudents(currentSinifOgrencileri);
    } else {
      // Seçimler temizlenirse durumları da temizle
      setOdevDurumlar({});
      setDirtyStates({});
    }
  }, [selectedDers, selectedSinif, tarih, students]);

  const loadGecmisKayitlar = async () => {
    setLoading(true);
    try {
      const { getOdevDurumlariTumKayitlar } = await import('../../firebase');
      const kayitlar = await getOdevDurumlariTumKayitlar();
      setGecmisKayitlar(kayitlar);
    } catch (error) {
      console.error('Geçmiş kayıtlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOdevDurumlariWithStudents = async (currentSinifOgrencileri: any[]) => {

    
    try {
      const { getOdevDurumlari } = await import('../../firebase');
      const durumlar = await getOdevDurumlari(selectedDers, selectedSinif, tarih);
      
      // Eğer kayıt varsa durumları yükle, yoksa tüm öğrenciler için varsayılan "yapıldı" durumları oluştur
      if (Object.keys(durumlar).length > 0) {
        setOdevDurumlar(durumlar);
        setDirtyStates({}); // Mevcut kayıt varsa, dirty state'i temizle

      } else {
        // Hiç kayıt yoksa tüm öğrenciler için varsayılan "yapıldı" durumları ve YENİ KAYIT için dirty yap

        
        const varsayilanDurumlar: {[key: string]: string} = {};
        const yeniDirtyStates: {[key: string]: boolean} = {};
        currentSinifOgrencileri.forEach(student => {
          varsayilanDurumlar[student.id] = 'yapildi'; // Varsayılan olarak yapıldı
          yeniDirtyStates[student.id] = true; // Yeni kayıt için tüm öğrencileri dirty yap
        });
        


        
        setOdevDurumlar(varsayilanDurumlar);
        setDirtyStates(yeniDirtyStates); // Yeni kayıt için tüm öğrencileri dirty olarak işaretle

      }
    } catch (error) {
      console.error('Ödev durumları yüklenirken hata:', error);
      // Hata durumunda da tüm öğrenciler için varsayılan "yapıldı" durumları
      const hataDurumlar: {[key: string]: string} = {};
      const hataDirtyStates: {[key: string]: boolean} = {};
      currentSinifOgrencileri.forEach(student => {
        hataDurumlar[student.id] = 'yapildi'; // Hata durumunda da varsayılan yapıldı
        hataDirtyStates[student.id] = true; // Hata durumunda da yeni kayıt olarak işaretle
      });
      setOdevDurumlar(hataDurumlar);
      setDirtyStates(hataDirtyStates);
    }
  };

  const loadOdevDurumlari = async () => {
    // Mevcut seciliSinifOgrencileri'yi kullan
    const currentSinifOgrencileri = students.filter(s => s.class === selectedSinif);
    await loadOdevDurumlariWithStudents(currentSinifOgrencileri);
  };

  // Öğrenci ödev durumunu değiştir (sadece işaretlendiğinde)
  const handleOdevDurumu = (studentId: string, durum: string) => {
    // Eğer durum 'yapildi' ise ve daha önce hiç işaretlenmemişse, sadece varsayılan
    // Sadece gerçekten değişiklik varsa işle
    setOdevDurumlar(prev => {
      const mevcutDurum = prev[studentId];
      
      // Eğer durum değişmediyse hiçbir şey yapma
      if (mevcutDurum === durum) {
        return prev;
      }
      
      // Sadece değişen öğrenciyi güncelle
      return {
        ...prev,
        [studentId]: durum
      };
    });

    // Değişikliği takip et (sadece gerçekten değişiklik varsa)
    setDirtyStates(prev => ({
      ...prev,
      [studentId]: true
    }));
  };

  // Tüm değişiklikleri kaydet
  const handleSaveAllChanges = async () => {
    setLoading(true);
    try {
      const { updateOdevDurumu, getOdevDurumlari } = await import('../../firebase');
      
      // Mevcut durumu kontrol et
      const mevcutDurumlar = await getOdevDurumlari(selectedDers, selectedSinif, tarih);
      const mevcutKayitVar = Object.keys(mevcutDurumlar).length > 0;
      
      // Eğer hiç değişiklik yoksa ve mevcut kayıt varsa, sadece bilgi ver
      if (Object.keys(dirtyStates).length === 0 && mevcutKayitVar) {
        alert('ℹ️ Bu ödev kontrolü zaten kaydedilmiş. Herhangi bir değişiklik bulunmuyor.');
        setLoading(false);
        return;
      }
      
      // Yeni kayıt için tüm öğrencileri tek seferde kaydet, değişiklik varsa mevcut kaydı güncelle
      if (Object.keys(dirtyStates).length === 0 && mevcutKayitVar) {
        // Sadece bilgi ver, kaydetme yapma
        alert('ℹ️ Bu ödev kontrolü zaten kaydedilmiş. Herhangi bir değişiklik bulunmuyor.');
        setLoading(false);
        return;
      }
      
      // Yeni kayıt için veya değişiklik varsa tüm öğrencileri sırayla kaydet
      // Her öğrenci için güncel tüm durumları koruyarak kaydet
      for (const student of seciliSinifOgrencileri) {
        const durum = odevDurumlar[student.id] || 'yapildi';
        await updateOdevDurumu(selectedDers, selectedSinif, tarih, student.id, durum);
  
      }
      

      
      // Optimistic update - yeni kaydı hemen tabloda göster
      const yeniKayit = {
        ders: selectedDers,
        sinif: selectedSinif,
        tarih: tarih,
        ogrenciler: Object.entries(odevDurumlar).map(([ogrenciId, durum]) => ({
          ogrenciId,
          durum
        })),
        toplamOgrenci: seciliSinifOgrencileri.length,
        yapildi: seciliSinifOgrencileri.filter(s => odevDurumlar[s.id] === 'yapildi').length,
        eksikYapildi: seciliSinifOgrencileri.filter(s => odevDurumlar[s.id] === 'eksikYapildi').length,
        yapilmadi: seciliSinifOgrencileri.filter(s => odevDurumlar[s.id] === 'yapilmadi').length,
        updatedAt: new Date().toISOString()
      };
      
      // Mevcut kayıt var mı kontrol et, varsa güncelle, yoksa ekle
      setGecmisKayitlar(prev => {
        const existingIndex = prev.findIndex(kayit => 
          kayit.ders === selectedDers && 
          kayit.sinif === selectedSinif && 
          kayit.tarih === tarih
        );
        
        if (existingIndex >= 0) {
          // Mevcut kaydı güncelle
          const yeniKayitlar = [...prev];
          yeniKayitlar[existingIndex] = yeniKayit;
          return yeniKayitlar;
        } else {
          // Yeni kayıt ekle (en başa)
          return [yeniKayit, ...prev];
        }
      });
      
      // Durumu temizle
      setDirtyStates({});
      
      // Öğrenci dashboard'ını güncelle
      if (onDataUpdate) onDataUpdate();
      
      // Başarı mesajı - detaylı bilgi ile
      const yapildiSayisi = seciliSinifOgrencileri.filter(s => odevDurumlar[s.id] === 'yapildi').length;
      const eksikSayisi = seciliSinifOgrencileri.filter(s => odevDurumlar[s.id] === 'eksikYapildi').length;
      const yapilmadiSayisi = seciliSinifOgrencileri.filter(s => odevDurumlar[s.id] === 'yapilmadi').length;
      
      alert(`✅ Ödev kontrolü başarıyla kaydedildi!\n\n📊 İstatistikler:\n• ✅ Yapıldı: ${yapildiSayisi} öğrenci\n• ⚠️ Eksik Yapıldı: ${eksikSayisi} öğrenci\n• ❌ Yapılmadı: ${yapilmadiSayisi} öğrenci\n• 📝 Toplam: ${seciliSinifOgrencileri.length} öğrenci\n\n📅 ${selectedDers} - ${selectedSinif} - ${tarih}`);
      
      // Background'da da geçmiş kayıtları güncelle (eşzamanlılık için)
      loadGecmisKayitlar();
    } catch (error) {
      console.error('Ödev durumları kaydedilirken hata:', error);
      alert('❌ Kaydetme sırasında hata oluştu!');
    } finally {
      setLoading(false);
    }
  };





  // TÜM Din Kültürü verilerini Firebase'den tamamen sil
  const forceDeleteDinKulturuData = async () => {
    setLoading(true);
    try {
      const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      

      
      // Yöntem 1: where('ders', '==', 'din-kulturu') ile bul
      const odevlerRef = collection(db, 'odevler');
      const dinKulturuQuery = query(odevlerRef, where('ders', '==', 'din-kulturu'));
      const snapshot = await getDocs(dinKulturuQuery);
      

      
      // Yöntem 2: Tüm kayıtları tara ve Din Kültürü olanları bul
      const allSnapshot = await getDocs(odevlerRef);
      let allDinKulturuCount = 0;
      let manualDeleteCount = 0;
      let dinKulturuKayitlari: any[] = [];
      
      for (const docSnap of allSnapshot.docs) {
        const data = docSnap.data();
        if (data.ders === 'din-kulturu' || data.ders === 'din_kulturu' || 
            (typeof data.ders === 'string' && data.ders.toLowerCase().includes('din'))) {
          allDinKulturuCount++;
          dinKulturuKayitlari.push({ id: docSnap.id, ...data });

        }
      }
      

      

      
      // TÜM Din Kültürü kayıtlarını sil
      let totalDeleted = 0;
      
      // Query ile sil
      for (const docSnap of snapshot.docs) {

        await deleteDoc(doc(db, 'odevler', docSnap.id));
        totalDeleted++;
      }
      
      // Manuel tarama ile sil
      for (const docSnap of allSnapshot.docs) {
        const data = docSnap.data();
        if (data.ders === 'din-kulturu' || data.ders === 'din_kulturu' || 
            (typeof data.ders === 'string' && data.ders.toLowerCase().includes('din'))) {

          await deleteDoc(doc(db, 'odevler', docSnap.id));
          totalDeleted++;
        }
      }
      


      
      // TÜM cache'i temizle
      setGecmisKayitlar([]);
      setOdevDurumlar({});
      setDirtyStates({});
      setSelectedSinif('');
      setSelectedDers('');
      
      // Local storage'ı da temizle
      if (typeof window !== 'undefined') {
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('odev') || key.includes('odevTakibi') || key.includes('din')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      const silinenDetay = dinKulturuKayitlari.map(k => `${k.sinif} - ${k.ders} - ${k.tarih}`).join('\n');
      alert(`🔥 TAMAMEN TEMİZLEDİM!\n\n${totalDeleted} adet Din Kültürü kaydı silindi:\n${silinenDetay}\n\n🧹 Tüm cache temizlendi\n🔄 Sayfayı yenileyin (F5)\n\nDin Kültürü artık 0 gösterecek!`);
      
      // Tüm cache'i ve state'i temizle
      setGecmisKayitlar([]);
      setOdevDurumlar({});
      setDirtyStates({});
      setSelectedSinif('');
      setSelectedDers('');
      
      // Sayfayı yenilemeyi öner
      alert('✅ Din Kültürü verileri Firebase\'den silindi!\n\n💡 Cache sorunu olabileceği için sayfayı yenileyin:\n- F5 tuşuna basın VEYA\n- Ctrl+F5 tuşlarına basın (hard refresh)');
      
    } catch (error) {
      console.error('❌ Firebase silme hatası:', error);
      alert('❌ Firebase\'den silme sırasında hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Geçmiş kaydı düzenle
  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    setSelectedSinif(record.sinif);
    setSelectedDers(record.ders);
    setTarih(record.tarih);
    
    // O kayıttaki durumları yükle
    const recordDurumlar: {[key: string]: string} = {};
    record.ogrenciler.forEach((item: any) => {
      recordDurumlar[item.ogrenciId] = item.durum;
    });
    setOdevDurumlar(recordDurumlar);
    setDirtyStates({});
  };

  // Geçmiş kaydı sil
  const handleDeleteRecord = async (record: any) => {
    const kayitBilgi = `${record.ders} - ${record.sinif} - ${new Date(record.tarih).toLocaleDateString('tr-TR')}`;
    
    if (!confirm(`⚠️ Bu kaydı silmek istediğinize emin misiniz?\n\n📝 Kayıt: ${kayitBilgi}\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    setLoading(true);
    try {
      const { deleteOdev } = await import('../../firebase');
      
      // Önce Firebase'den sil
      await deleteOdev(record.id);
      
      // Local state'i güncelle
      setGecmisKayitlar(prev => prev.filter(kayit => kayit.id !== record.id));
      
      // Öğrenci dashboard'ını güncelle
      if (onDataUpdate) onDataUpdate();
      
      alert(`✅ Kayıt başarıyla silindi!\n\n📝 ${kayitBilgi}`);
      
      // Geçmiş kayıtları yeniden yükle
      loadGecmisKayitlar();
    } catch (error) {
      console.error('Kayıt silme hatası:', error);
      alert('❌ Kayıt silme sırasında hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // İstatistikler
  const istatistikler = {
    toplamOgrenci: seciliSinifOgrencileri.length,
    yapildi: seciliSinifOgrencileri.filter(student => odevDurumlar[student.id] === 'yapildi').length,
    eksikYapildi: seciliSinifOgrencileri.filter(student => odevDurumlar[student.id] === 'eksikYapildi').length,
    yapilmadi: seciliSinifOgrencileri.filter(student => odevDurumlar[student.id] === 'yapilmadi').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2">📝 Ödev Takibi</h2>
        <p className="text-blue-100">Günlük ödev durumlarını takip edin ve yönetin</p>
      </div>

      {/* Tab Seçenekleri */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveOdevTab('yeni')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeOdevTab === 'yeni'
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            ✏️ Yeni Ödev Kontrolü
          </button>
          <button
            onClick={() => setActiveOdevTab('rapor')}
            className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
              activeOdevTab === 'rapor'
                ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            📊 Ödev Raporu
          </button>
        </div>
      </div>



      {/* Tab İçeriği */}
      {activeOdevTab === 'yeni' && (
        <>


          {/* Filtreler - Yeni ödev kontrolü için */}
          <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sınıf Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏫 Sınıf Seçin:
            </label>
            <select
              value={selectedSinif}
              onChange={(e) => {
                setSelectedSinif(e.target.value);
                setSelectedDers('');
                setOdevDurumlar({});
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sınıf seçiniz...</option>
              {siniflar.map((sinif) => (
                <option key={sinif} value={sinif}>{sinif}</option>
              ))}
            </select>
          </div>

          {/* Ders Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📚 Ders Seçin:
            </label>
            <select
              value={selectedDers}
              onChange={(e) => setSelectedDers(e.target.value)}
              disabled={!selectedSinif}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Ders seçiniz...</option>
              {dersler.map((ders) => (
                <option key={ders.key} value={ders.key}>{ders.label}</option>
              ))}
            </select>
          </div>

          {/* Tarih Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Tarih Seçin:
            </label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Öğrenci Listesi */}
      {selectedDers && selectedSinif && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              📋 Öğrenci Listesi - {dersler.find(d => d.key === selectedDers)?.label} ({selectedSinif})
            </h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSaveAllChanges}
                disabled={Object.keys(dirtyStates).length === 0 || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? '⏳' : '💾'} {Object.keys(dirtyStates).length > 0 ? `Kaydet (${Object.keys(dirtyStates).length})` : 'Kaydet'}
              </button>
              

            </div>
          </div>

          {/* İstatistikler - sadece kayıt varsa göster */}
          {Object.keys(odevDurumlar).length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{istatistikler.toplamOgrenci}</div>
                <div className="text-sm text-green-700">Toplam Öğrenci</div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{istatistikler.yapildi}</div>
                <div className="text-sm text-blue-700">✅ Yapıldı</div>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{istatistikler.eksikYapildi}</div>
                <div className="text-sm text-yellow-700">⚠️ Eksik Yapıldı</div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{istatistikler.yapilmadi}</div>
                <div className="text-sm text-red-700">❌ Yapılmadı</div>
              </div>
            </div>
          )}

          {/* Öğrenci Tablosu - daima göster */}
          <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-left">Öğrenci</th>
                    <th className="p-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {seciliSinifOgrencileri.map((student) => (
                  <tr key={student.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{student.name}</td>
                    <td className="p-3">
                      <div className="flex justify-center space-x-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`odev-${student.id}`}
                            value="yapildi"
                            checked={odevDurumlar[student.id] === 'yapildi'}
                            onChange={(e) => handleOdevDurumu(student.id, e.target.value)}
                            className="sr-only"
                          />
                          <div className={`px-3 py-2 rounded-lg border-2 transition-all ${
                            odevDurumlar[student.id] === 'yapildi' 
                              ? 'bg-green-100 border-green-500 text-green-700' 
                              : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-green-300'
                          }`}>
                            ✅ Yapıldı
                          </div>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`odev-${student.id}`}
                            value="eksikYapildi"
                            checked={odevDurumlar[student.id] === 'eksikYapildi'}
                            onChange={(e) => handleOdevDurumu(student.id, e.target.value)}
                            className="sr-only"
                          />
                          <div className={`px-3 py-2 rounded-lg border-2 transition-all ${
                            odevDurumlar[student.id] === 'eksikYapildi' 
                              ? 'bg-yellow-100 border-yellow-500 text-yellow-700' 
                              : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-yellow-300'
                          }`}>
                            ⚠️ Eksik Yapıldı
                          </div>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`odev-${student.id}`}
                            value="yapilmadi"
                            checked={odevDurumlar[student.id] === 'yapilmadi'}
                            onChange={(e) => handleOdevDurumu(student.id, e.target.value)}
                            className="sr-only"
                          />
                          <div className={`px-3 py-2 rounded-lg border-2 transition-all ${
                            odevDurumlar[student.id] === 'yapilmadi' 
                              ? 'bg-red-100 border-red-500 text-red-700' 
                              : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-red-300'
                          }`}>
                            ❌ Yapılmadı
                          </div>
                        </label>
                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Eğer hiç durum seçilmemişse bilgilendirici not */}
            {Object.keys(odevDurumlar).length === 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center text-blue-700">
                  <span className="text-xl mr-2">ℹ️</span>
                  <p className="text-sm">
                    Bu tarihte henüz ödev kontrolü yapılmamış. Yukarıdaki öğrencilerin durumlarını işaretleyip kaydedebilirsiniz.
                  </p>
                </div>
              </div>
            )}


        </div>
      )}

          {/* Geçmiş Kontroller - Sadece yeni kontrol tabında */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">📊 Geçmiş Kontroller</h3>
            
            {/* Filtre Alanı */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏫 Sınıf Filtresi:
                </label>
                <select
                  value={gecmisFilterSinif}
                  onChange={(e) => setGecmisFilterSinif(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Sınıflar</option>
                  {siniflar.map((sinif) => (
                    <option key={sinif} value={sinif}>{sinif}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📚 Ders Filtresi:
                </label>
                <select
                  value={gecmisFilterDers}
                  onChange={(e) => setGecmisFilterDers(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Dersler</option>
                  {dersler.map((ders) => (
                    <option key={ders.key} value={ders.key}>{ders.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setGecmisFilterSinif('');
                    setGecmisFilterDers('');
                  }}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  🔄 Filtreleri Temizle
                </button>
              </div>
            </div>
            
            {loading && gecmisKayitlar.length === 0 ? (
              <div className="text-center py-8 text-gray-500">⏳ Geçmiş kayıtlar yükleniyor...</div>
            ) : (() => {
              // Filtreleme mantığı
              const filteredKayitlar = gecmisKayitlar.filter(kayit => {
                // Sınıf filtresi
                if (gecmisFilterSinif && kayit.sinif !== gecmisFilterSinif) return false;
                // Ders filtresi
                if (gecmisFilterDers && kayit.ders !== gecmisFilterDers) return false;
                // Sadece verisi olan kayıtları göster
                return kayit.yapildi + kayit.eksikYapildi + kayit.yapilmadi > 0;
              });
              
              const dinKulturuKayitlar = gecmisKayitlar.filter(kayit => kayit.ders === 'din-kulturu');
              const bosKayitlar = gecmisKayitlar.filter(kayit => kayit.yapildi + kayit.eksikYapildi + kayit.yapilmadi === 0);
              

              
              return filteredKayitlar.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500">📝 Henüz hiç ödev kontrolü yapılmamış.</div>
                  

                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left">Tarih</th>
                      <th className="p-3 text-left">Sınıf</th>
                      <th className="p-3 text-left">Ders</th>
                      <th className="p-3 text-center">Yapıldı</th>
                      <th className="p-3 text-center">Eksik Yapıldı</th>
                      <th className="p-3 text-center">Yapılmadı</th>
                      <th className="p-3 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKayitlar
                      .map((kayit) => {
                        const yapildiCount = kayit.ogrenciler.filter((o: any) => o.durum === 'yapildi').length;
                        const eksikYapildiCount = kayit.ogrenciler.filter((o: any) => o.durum === 'eksikYapildi').length;
                        const yapilmadiCount = kayit.ogrenciler.filter((o: any) => o.durum === 'yapilmadi').length;
                        
                        return (
                          <tr key={`${kayit.tarih}-${kayit.ders}-${kayit.sinif}`} className="border-t hover:bg-gray-50">
                            <td className="p-3 font-medium">{new Date(kayit.tarih).toLocaleDateString('tr-TR')}</td>
                            <td className="p-3">{kayit.sinif}</td>
                            <td className="p-3">{dersler.find(d => d.key === kayit.ders)?.label || kayit.ders}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">{yapildiCount}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">{eksikYapildiCount}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">{yapilmadiCount}</span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEditRecord(kayit)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                >
                                  ✏️ Düzenle
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(kayit)}
                                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                                >
                                  🗑️ Sil
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Ödev Raporu Tab */}
      {activeOdevTab === 'rapor' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-6">📊 Ödev Raporu</h3>
          
          {/* Rapor Filtreleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Sınıf Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏫 Sınıf Seçin:
              </label>
              <select
                value={raporSinif}
                onChange={(e) => {
                  setRaporSinif(e.target.value);
                  setRaporOgrenci('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Sınıf seçiniz...</option>
                {siniflar.map((sinif) => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>

            {/* Ders Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📚 Ders Seçin (Opsiyonel):
              </label>
              <select
                value={raporDers}
                onChange={(e) => setRaporDers(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tüm Dersler</option>
                {dersler.map((ders) => (
                  <option key={ders.key} value={ders.key}>{ders.label}</option>
                ))}
              </select>
            </div>

            {/* Öğrenci Seçimi - Sadece sınıf seçildiyse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Öğrenci Seçin (Opsiyonel):
              </label>
              <select
                value={raporOgrenci}
                onChange={(e) => setRaporOgrenci(e.target.value)}
                disabled={!raporSinif}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Tüm öğrenciler</option>
                {raporSinif && students.filter(s => s.class === raporSinif).map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rapor İçeriği */}
          {raporSinif ? (
            <div className="space-y-6">
              {/* Genel Özet */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-800 mb-4">
                  📈 {raporSinif} Sınıfı Ödev Özeti
                  {raporOgrenci && ` - ${students.find(s => s.id === raporOgrenci)?.name}`}
                  {raporDers && ` - ${dersler.find(d => d.key === raporDers)?.label}`}
                </h4>
                
                {/* Ders Bazında İstatistikler */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dersler.map((ders) => {
                    // Ders filtresi varsa sadece o dersi göster
                    if (raporDers && ders.key !== raporDers) return null;
                    
                    const dersKayitlari = gecmisKayitlar.filter(kayit => 
                      kayit.ders === ders.key && 
                      kayit.sinif === raporSinif &&
                      (raporOgrenci ? kayit.ogrenciler.some((o: any) => o.ogrenciId === raporOgrenci) : true)
                    );
                    
                    const toplamKontrol = dersKayitlari.length;
                    

                    const toplamYapildi = dersKayitlari.reduce((acc, kayit) => acc + kayit.yapildi, 0);
                    const toplamEksik = dersKayitlari.reduce((acc, kayit) => acc + kayit.eksikYapildi, 0);
                    const toplamYapilmadi = dersKayitlari.reduce((acc, kayit) => acc + kayit.yapilmadi, 0);
                    

                    
                    // Eğer hiç kayıt yoksa bu dersi gösterme
                    if (toplamKontrol === 0) return null;
                    
                    const basariOrani = toplamKontrol > 0 && (toplamYapildi + toplamEksik + toplamYapilmadi) > 0 ? 
                      Math.round((toplamYapildi / (toplamYapildi + toplamEksik + toplamYapilmadi)) * 100) : 0;
                    


                    return (
                      <div key={ders.key} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center mb-3">
                          <span className="text-2xl mr-2">{ders.label.split(' ')[0]}</span>
                          <h5 className="font-semibold text-gray-800">{ders.label.split(' ').slice(1).join(' ')}</h5>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Toplam Kontrol:</span>
                            <span className="font-medium">{toplamKontrol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>✅ Başarılı:</span>
                            <span className="font-medium text-green-600">{toplamYapildi}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>⚠️ Eksik:</span>
                            <span className="font-medium text-yellow-600">{toplamEksik}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>❌ Başarısız:</span>
                            <span className="font-medium text-red-600">{toplamYapilmadi}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">Başarı Oranı:</span>
                            <span className={`font-bold ${basariOrani >= 80 ? 'text-green-600' : basariOrani >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              %{isNaN(basariOrani) ? 0 : basariOrani}
                            </span>
                          </div>
                          

                          

                        </div>
                      </div>
                    );
                  })}
                </div>
                
              {/* Öğrenci Bazında Detaylı Özet */}
              {(() => {
                // Öğrenci filtresi - raporOgrenci seçildiyse sadece o öğrenci
                let raporOgrencileri: any[] = [];
                if (raporSinif) {
                  if (raporOgrenci) {
                    // Belirli öğrenci seçildi
                    const student = students.find(s => s.id === raporOgrenci && s.class === raporSinif);
                    if (student) raporOgrencileri = [student];
                  } else {
                    // Tüm öğrenciler
                    raporOgrencileri = students.filter(s => s.class === raporSinif);
                  }
                }
                
                if (raporOgrencileri.length === 0) return null;
                
                // Her öğrenci için ödev istatistikleri hesapla
                const ogrenciIstatistikleri = raporOgrencileri.map(student => {
                  const ogrenciKayitlari = gecmisKayitlar.filter(kayit => 
                    kayit.sinif === raporSinif &&
                    kayit.ogrenciler.some((o: any) => o.ogrenciId === student.id)
                  );
                  
                  // Ders bazında istatistikler
                  const dersIstatistikleri = dersler.map(ders => {
                    const dersKayitlari = ogrenciKayitlari.filter(kayit => 
                      kayit.ders === ders.key
                    );
                    
                    // Ders bazında tarih detayları
                    const tarihDetaylari = dersKayitlari.map(kayit => {
                      const ogrenciKayit = kayit.ogrenciler.find((o: any) => o.ogrenciId === student.id);
                      return {
                        tarih: kayit.tarih,
                        durum: ogrenciKayit?.durum || 'yapilmadi'
                      };
                    }); // Tüm durumları göster (yapıldı, eksik, yapılmadı)
                    
                    const toplamYapildi = dersKayitlari.reduce((acc, kayit) => {
                      const ogrenciKayit = kayit.ogrenciler.find((o: any) => o.ogrenciId === student.id);
                      return acc + (ogrenciKayit?.durum === 'yapildi' ? 1 : 0);
                    }, 0);
                    
                    const toplamEksik = dersKayitlari.reduce((acc, kayit) => {
                      const ogrenciKayit = kayit.ogrenciler.find((o: any) => o.ogrenciId === student.id);
                      return acc + (ogrenciKayit?.durum === 'eksikYapildi' ? 1 : 0);
                    }, 0);
                    
                    const toplamYapilmadi = dersKayitlari.reduce((acc, kayit) => {
                      const ogrenciKayit = kayit.ogrenciler.find((o: any) => o.ogrenciId === student.id);
                      return acc + (ogrenciKayit?.durum === 'yapilmadi' ? 1 : 0);
                    }, 0);
                    
                    const toplamKontrol = toplamYapildi + toplamEksik + toplamYapilmadi;
                    const basariOrani = toplamKontrol > 0 ? Math.round((toplamYapildi / toplamKontrol) * 100) : 0;
                    
                    return {
                      ders: ders.label,
                      dersKey: ders.key,
                      toplamYapildi,
                      toplamEksik,
                      toplamYapilmadi,
                      toplamKontrol,
                      basariOrani,
                      tarihDetaylari
                    };
                  }).filter(ders => ders.toplamKontrol > 0); // Sadece veri olan dersleri göster
                  
                  // Genel istatistikler
                  const genelYapildi = dersIstatistikleri.reduce((acc, ders) => acc + ders.toplamYapildi, 0);
                  const genelEksik = dersIstatistikleri.reduce((acc, ders) => acc + ders.toplamEksik, 0);
                  const genelYapilmadi = dersIstatistikleri.reduce((acc, ders) => acc + ders.toplamYapilmadi, 0);
                  const genelToplam = genelYapildi + genelEksik + genelYapilmadi;
                  const genelBasariOrani = genelToplam > 0 ? Math.round((genelYapildi / genelToplam) * 100) : 0;
                  
                  return {
                    student,
                    dersIstatistikleri,
                    genelYapildi,
                    genelEksik,
                    genelYapilmadi,
                    genelToplam,
                    genelBasariOrani
                  };
                }).filter(ogrenci => ogrenci.genelToplam > 0); // Sadece veri olan öğrencileri göster
                
                if (ogrenciIstatistikleri.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-4">👥</div>
                      <p>Seçili sınıf için henüz ödev kontrolü verisi bulunmamaktadır.</p>
                    </div>
                  );
                }
                
                return (
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {raporOgrenci 
                        ? `👤 ${students.find(s => s.id === raporOgrenci)?.name} - Detaylı Performans Özeti`
                        : `👥 ${raporSinif} Sınıfı - Öğrenci Bazında Detaylı Performans Özeti`
                      }
                    </h4>
                    
                    <div className="space-y-4">
                      {ogrenciIstatistikleri.map(({ student, dersIstatistikleri, genelYapildi, genelEksik, genelYapilmadi, genelToplam, genelBasariOrani }) => (
                        <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-semibold text-gray-800">{student.name}</h5>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{genelYapildi} ✅</span>
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{genelEksik} ⚠️</span>
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded">{genelYapilmadi} ❌</span>
                              <span className={`font-bold px-2 py-1 rounded ${
                                genelBasariOrani >= 80 ? 'bg-green-100 text-green-800' :
                                genelBasariOrani >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>
                                %{genelBasariOrani}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dersIstatistikleri.map(ders => (
                              <div key={ders.dersKey} className="bg-gray-50 p-3 rounded border">
                                <div className="font-medium text-sm text-gray-700 mb-2">{ders.ders}</div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span>✅ Yapıldı:</span>
                                    <span className="font-medium text-green-600">{ders.toplamYapildi}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>⚠️ Eksik:</span>
                                    <span className="font-medium text-yellow-600">{ders.toplamEksik}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>❌ Yapılmadı:</span>
                                    <span className="font-medium text-red-600">{ders.toplamYapilmadi}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-1 mt-2">
                                    <span className="font-medium">Başarı:</span>
                                    <span className={`font-bold ${
                                      ders.basariOrani >= 80 ? 'text-green-600' :
                                      ders.basariOrani >= 60 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      %{ders.basariOrani}
                                    </span>
                                  </div>
                                  
                                  {/* Tarih Detayları - Sadece veri varsa göster */}
                                  {ders.tarihDetaylari && ders.tarihDetaylari.length > 0 && (
                                    <div className="border-t pt-2 mt-2">
                                      <div className="font-medium text-xs text-gray-600 mb-1">📅 Kontrol Tarihleri:</div>
                                      <div className="space-y-1 max-h-20 overflow-y-auto">
                                        {ders.tarihDetaylari.map((detay, index) => (
                                          <div key={index} className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500">{detay.tarih}</span>
                                            <span className={`px-1 py-0.5 rounded text-xs ${
                                              detay.durum === 'yapildi' 
                                                ? 'bg-green-100 text-green-700' 
                                                : detay.durum === 'eksikYapildi'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'
                                            }`}>
                                              {detay.durum === 'yapildi' ? '✅' : 
                                               detay.durum === 'eksikYapildi' ? '⚠️' : '❌'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📊</div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Ödev Raporu Görüntüleme</h4>
              <p className="text-gray-500">Sınıf seçerek başlayın. Öğrenci seçerseniz sadece o öğrencinin özeti gösterilir.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// 📊 Deneme Değerlendirme Tab Component
const DenemeDegerlendirmeTab = ({ students, onDataUpdate }: { 
  students: any[]; 
  onDataUpdate: () => void;
}) => {
  const [selectedSinif, setSelectedSinif] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [evaluationText, setEvaluationText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);

  // Sınıf listesi
  const siniflar = Array.from(new Set(students.map(s => s.class))).sort();

  // Sınıf değiştiğinde öğrenciyi temizle
  useEffect(() => {
    setSelectedStudent('');
    setSelectedExam('');
    setEvaluationText('');
    setStudentExams([]);
    setExamResults([]);
  }, [selectedSinif]);

  // Öğrenci değiştiğinde denemeleri yükle
  useEffect(() => {
    if (selectedStudent) {
      loadStudentExams();
    }
  }, [selectedStudent]);

  // Sınıfın katıldığı denemeleri yükle - BASİT YAKLAŞIM
  const loadStudentExams = async () => {
    setLoading(true);
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      const { db } = await import('../../firebase');

      // TÜM denemeleri al
      const examsSnapshot = await getDocs(collection(db, 'exams'));
      const allExams = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // TÜM sonuçları al  
      const resultsSnapshot = await getDocs(collection(db, 'results'));
      const allResults = resultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('🔍 DEBUG - Toplam deneme:', allExams.length);
      console.log('🔍 DEBUG - Toplam sonuç:', allResults.length);
      
      // Bu öğrencinin sonuçlarını bul
      const studentResults = allResults.filter((result: any) => 
        result.studentId === selectedStudent || 
        result.student_id === selectedStudent
      );
      
      console.log('🔍 DEBUG - Öğrenci sonuçları:', studentResults.length);
      console.log('🔍 DEBUG - Öğrenci sonuç örneği:', studentResults[0]);
      
      // Bu öğrencinin girdiği denemeleri bul
      const studentExamIds = new Set(studentResults.map((result: any) => result.examId));
      const studentExams = allExams.filter(exam => studentExamIds.has(exam.id));
      
      console.log('🔍 DEBUG - Eşleşen denemeler:', studentExams.length);
      
      setStudentExams(studentExams);
      setExamResults(studentResults);
    } catch (error) {
      console.error('Deneme verilerini yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Deneme değerlendirme kaydetme
  const saveDenemeDegerlendirme = async () => {
    if (!selectedStudent || !selectedExam || !evaluationText.trim()) {
      alert("Lütfen öğrenci, deneme seçin ve değerlendirme yazın.");
      return;
    }

    setLoading(true);
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('../../firebase');

      const selectedExamData = studentExams.find(exam => exam.id === selectedExam) || 
                               examResults.find(result => result.id === selectedExam);

      await addDoc(collection(db, 'denemeDegerlendirmeleri'), {
        studentId: selectedStudent,
        studentName: students.find(s => s.id === selectedStudent)?.name || '',
        examId: selectedExam,
        examName: selectedExamData?.name || selectedExamData?.examName || 'Bilinmeyen Deneme',
        evaluationText: evaluationText.trim(),
        createdAt: new Date()
      });

      // Form'u temizle
      setSelectedSinif('');
      setSelectedStudent('');
      setSelectedExam('');
      setEvaluationText('');
      setStudentExams([]);
      setExamResults([]);
      onDataUpdate();

      alert("Deneme değerlendirmesi başarıyla kaydedildi!");
    } catch (error) {
      console.error('Deneme değerlendirme kaydetme hatası:', error);
      alert('Kaydetme sırasında bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Seçili öğrenci
  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="p-4 space-y-4">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-1">📊 Deneme Değerlendirme</h2>
        <p className="text-purple-100 text-sm">Öğrencilerin deneme performanslarını değerlendirin</p>
      </div>

      {/* Değerlendirme Formu */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">📝 Yeni Değerlendirme Ekle</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sınıf Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏫 Sınıf Seçin:
            </label>
            <select
              value={selectedSinif}
              onChange={(e) => {
                setSelectedSinif(e.target.value);
                setSelectedStudent('');
                setSelectedExam('');
                setEvaluationText('');
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sınıf seçiniz...</option>
              {siniflar.map((sinif) => (
                <option key={sinif} value={sinif}>{sinif}</option>
              ))}
            </select>
          </div>

          {/* Öğrenci Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Öğrenci Seçin:
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={!selectedSinif}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
            >
              <option value="">Öğrenci seçiniz...</option>
              {selectedSinif && students.filter(s => s.class === selectedSinif).map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Deneme Seçimi */}
        {selectedStudent && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📚 Deneme Seçin:
            </label>
            
            {loading ? (
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-3"></div>
                <span className="text-gray-600">Denemeler yükleniyor...</span>
              </div>
            ) : studentExams.length > 0 ? (
              <select
                value={selectedExam}
                onChange={(e) => {
                  setSelectedExam(e.target.value);
                  setEvaluationText('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Deneme seçiniz...</option>
                {studentExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} - {new Date(exam.date).toLocaleDateString('tr-TR')}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>⚠️ Bilgi:</strong> Bu öğrencinin henüz deneme sonucu bulunmuyor.
                </p>
                <p className="text-yellow-700 text-xs mt-2">
                  Toplam {examResults.length} sonuç bulundu, {studentExams.length} deneme listelendi.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 📊 Deneme Sonucu Detayları */}
        {selectedExam && examResults.length > 0 && (() => {
          const result = examResults.find((r: any) => r.examId === selectedExam || r.id === selectedExam);
          if (!result) return null;
          
          // Veri debug bilgileri - gerçek veri yapısını görmek için
          // console.log('🔍 DEBUG - Seçilen sonuç:', result);
          // console.log('🔍 DEBUG - Nets:', result.nets);
          // console.log('🔍 DEBUG - Scores:', result.scores);
          // console.log('🔍 DEBUG - Scores.turkce:', result.scores?.turkce);
          // console.log('🔍 DEBUG - Scores.matematik:', result.scores?.matematik);
          // console.log('🔍 DEBUG - Scores.fen:', result.scores?.fen);
          
          const subjects = [
            { key: 'turkce', name: 'Türkçe', icon: '📖' },
            { key: 'matematik', name: 'Matematik', icon: '🔢' },
            { key: 'fen', name: 'Fen', icon: '🔬' },
            { key: 'sosyal', name: 'Sosyal', icon: '🌍' },
            { key: 'din', name: 'Din Kültürü', icon: '🕌' },
            { key: 'ingilizce', name: 'İngilizce', icon: '🗣️' }
          ];
          
          const getScore = (subject: string) => {
            // Scores objesi içindeki D/Y/B/N değerleri
            const scoreFromScores = result.scores?.[subject];
            const netsFromScores = result.nets?.[subject];
            
            let D = 0, Y = 0, B = 0, net = 0;
            
            // Eğer scores objesi içinde D/Y/B varsa onu kullan
            if (scoreFromScores && typeof scoreFromScores === 'object') {
              D = scoreFromScores.D || 0;
              Y = scoreFromScores.Y || 0;
              B = scoreFromScores.B || 0;
              
              // Net hesaplama: Net = D - Y/3 (kullanıcıya göre)
              net = parseFloat((D - (Y / 3)).toFixed(1));
            }
            // Eğer sadece nets varsa, onu kullan
            else if (netsFromScores !== undefined) {
              net = typeof netsFromScores === 'string' ? parseFloat(netsFromScores) : netsFromScores;
              
              // Nets varsa ama D/Y/B yoksa tahmin et
              D = Math.round(Math.max(0, net * 4));
              Y = Math.max(0, Math.round(net * 4) - Math.round(net * 5));
              B = Math.max(0, 20 - D - Y);
            }
            
            return { D, Y, B, net };
          };
          
          // Basit D/Y/B/N tablosu
          
          // Debug: console.log(`🔍 DEBUG - Student puan: ${studentTotalPuan}`);
          // console.log(`🔍 DEBUG - Sınıf puan ortalaması: ${sinifPuanOrtalamasi}`);
          // console.log(`🔍 DEBUG - Sınıf net ortalaması: ${sinifNetOrtalamasi}`);
          // console.log(`🔍 DEBUG - Genel puan ortalaması: ${genelPuanOrtalamasi}`);
          // console.log(`🔍 DEBUG - Genel net ortalaması: ${genelNetOrtalamasi}`);
          
          // Debug toplam hesaplamaları
          // console.log(`🔍 DEBUG - Toplam Net: ${totals.totalNet}`);
          // console.log(`🔍 DEBUG - Toplam Puan: ${totals.totalPuan}`);
          // console.log(`🔍 DEBUG - Subjects length: ${subjects.length}`);
          
          return (
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
                <h3 className="text-lg font-semibold">📊 Deneme Sonucu Detayları</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ders</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Doğru</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Yanlış</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Boş</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => {
                      const score = getScore(subject.key);
                      return (
                        <tr key={subject.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{subject.icon}</span>
                              <span className="font-medium text-gray-900">{subject.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {score.D}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {score.Y}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {score.B}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              score.net >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {score.net >= 0 ? '+' : ''}{score.net}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Sadece basit toplam net gösterimi */}
              <div className="p-4 bg-gray-50 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {subjects.reduce((acc, s) => {
                      const score = getScore(s.key);
                      return acc + score.net;
                    }, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Toplam Net</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Değerlendirme Kutusu */}
        {selectedExam && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💬 Öğrenci Değerlendirmesi:
            </label>
            <textarea
              value={evaluationText}
              onChange={(e) => setEvaluationText(e.target.value)}
              placeholder="Bu deneme ile ilgili öğrencinin performansını, güçlü ve zayıf yönlerini, çalışma önerilerini yazın..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={5}
            />
          </div>
        )}

        {/* Kaydet Butonu */}
        {selectedExam && evaluationText.trim() && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={saveDenemeDegerlendirme}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center font-medium"
            >
              {loading ? '⏳ Kaydediliyor...' : '💾 Değerlendirmeyi Kaydet'}
            </button>
          </div>
        )}
      </div>

      {/* Yardım Bilgileri */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
          <span className="text-purple-600 mr-3">💡</span>
          Nasıl Kullanılır?
        </h3>
        
        <div className="space-y-3 text-purple-800">
          <div className="flex items-start">
            <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
            <div>
              <p className="font-medium">Sınıf ve Öğrenci Seçin</p>
              <p className="text-sm">Hangi sınıftan hangi öğrencinin değerlendirmesini yapacağınızı belirleyin.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
            <div>
              <p className="font-medium">Deneme Sonucunu İnceleyin</p>
              <p className="text-sm">Öğrencinin girdiği denemeyi seçin ve mevcut sonuçlarını görüntüleyin.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
            <div>
              <p className="font-medium">Değerlendirme Yazın</p>
              <p className="text-sm">Öğrencinin performansı hakkında detaylı değerlendirme ve önerilerinizi yazın.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-purple-200 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
            <div>
              <p className="font-medium">Kaydedin ve Takip Edin</p>
              <p className="text-sm">Değerlendirmeyi kaydedin ve öğrencinin gelişimini takip edin.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-100 rounded-lg">
          <p className="text-purple-900 text-sm">
            <strong>📌 Not:</strong> Deneme değerlendirmeleri öğrencinin dashboard'ında görünecektir. 
            Öğrenci öğretmenin değerlendirmelerini okuyabilir ve çalışma önerilerini takip edebilir.
          </p>
        </div>
      </div>
    </div>
  );
};

// 📝 Ödev Takibi Tab Component


// 📚 OKUMA SINAVI TAB COMPONENT
const OkumaSinaviTab = ({ students }: { students: any[] }) => {
  const [activeSubTab, setActiveSubTab] = useState<'yeni' | 'gecmis' | 'analiz'>('yeni');
  const [analysisView, setAnalysisView] = useState<'performans' | 'ortalama' | 'grafik'>('performans');
  const [selectedSinif, setSelectedSinif] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentWpm, setStudentWpm] = useState<{ [studentId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [savedExams, setSavedExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [selectedFilterSinif, setSelectedFilterSinif] = useState<string>('');
  const [selectedFilterStudent, setSelectedFilterStudent] = useState<string>('');

  // Sadece 2-A, 3-A, 4-A sınıfları
  const siniflar = ['2-A', '3-A', '4-A'];

  // Seçilen sınıfa ait öğrenciler
  const filteredStudents = selectedSinif 
    ? students.filter(s => s.class === selectedSinif).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Filtrelenmiş sınavlar (Geçmiş Sınavlar sekmesi için)
  const filteredExams = savedExams.filter(exam => {
    const matchSinif = !selectedFilterSinif || exam.class === selectedFilterSinif;
    const matchStudent = !selectedFilterStudent || exam.studentName === selectedFilterStudent;
    return matchSinif && matchStudent;
  });

  // Grafik verileri - tarihe göre gruplandırılmış
  const chartData = useMemo(() => {
    if (!selectedFilterSinif) return [];
    
    console.log('🎯 DEBUG - Grafik hesaplanıyor...');
    console.log('🎯 DEBUG - Seçilen sınıf:', selectedFilterSinif);
    console.log('🎯 DEBUG - Toplam sınav:', savedExams.length);
    
    // Seçilen sınıfın sınavlarını tarihe göre grupla
    const classExams = savedExams.filter(e => e.class === selectedFilterSinif);
    console.log('🎯 DEBUG - Sınıf sınavları sayısı:', classExams.length);
    console.log('🎯 DEBUG - Sınıf sınavları örnek:', classExams.slice(0, 3));
    
    const dateGroups = classExams.reduce((acc, exam) => {
      const date = exam.date;
      if (!acc[date]) acc[date] = { exams: [], studentExams: [] };
      acc[date].exams.push(exam);
      if (selectedFilterStudent && exam.studentName === selectedFilterStudent) {
        acc[date].studentExams.push(exam);
      }
      return acc;
    }, {} as any);
    
    console.log('🎯 DEBUG - Tarih grupları:', Object.keys(dateGroups));
    
    // Tarihe göre sırala
    const sortedDates = Object.keys(dateGroups).sort();
    
    const result = sortedDates.map(date => {
      const group = dateGroups[date];
      const classWpmSum = group.exams.reduce((sum: number, e: any) => sum + (Number(e.wpm) || 0), 0);
      const classAvg = group.exams.length > 0 ? classWpmSum / group.exams.length : 0;
      const studentWpm = group.studentExams.length > 0 
        ? group.studentExams.reduce((sum: number, e: any) => sum + (Number(e.wpm) || 0), 0) / group.studentExams.length 
        : null;
      
      console.log(`🎯 DEBUG - ${date}: Toplam WPM=${classWpmSum}, Sayı=${group.exams.length}, Ortalama=${classAvg}`);
      
      return {
        date,
        sinifOrtalamasi: Math.round(classAvg),
        ogrenci: studentWpm !== null ? Math.round(studentWpm) : null
      };
    });
    
    console.log('🎯 DEBUG - Grafik verileri:', result);
    return result;
  }, [savedExams, selectedFilterSinif, selectedFilterStudent]);

  // Sınıf genel ortalaması
  const classOverallAverage = useMemo(() => {
    if (!selectedFilterSinif) return 0;
    const classExams = savedExams.filter(e => e.class === selectedFilterSinif);
    if (classExams.length === 0) return 0;
    const sum = classExams.reduce((acc, e) => acc + e.wpm, 0);
    return sum / classExams.length;
  }, [savedExams, selectedFilterSinif]);

  // Öğrenci genel ortalaması
  const studentOverallAverage = useMemo(() => {
    if (!selectedFilterStudent) return 0;
    const studentExams = savedExams.filter(e => e.studentName === selectedFilterStudent);
    if (studentExams.length === 0) return 0;
    const sum = studentExams.reduce((acc, e) => acc + e.wpm, 0);
    return sum / studentExams.length;
  }, [savedExams, selectedFilterStudent]);

  // Geçmiş sınavları yükle
  useEffect(() => {
    loadSavedExams();
  }, []);

  const loadSavedExams = async () => {
    try {
      const { getDocs, query, collection, orderBy } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      
      const q = query(
        collection(db, 'okumaSinavlari'),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const exams = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('🎯 DEBUG - Firestore verisi:', doc.id, data);
        return {
          id: doc.id,
          ...data,
          // Tarihi düzgün formatla
          date: data.date || data.date || '',
          class: data.class || data.classId || ''
        };
      });
      
      console.log('📚 Yüklenen sınav sayısı:', exams.length);
      console.log('📚 Sınıf alanları:', exams.map(e => ({ id: e.id, class: e.class, date: e.date })));
      setSavedExams(exams);
    } catch (error) {
      console.error('Geçmiş sınavları yükleme hatası:', error);
    }
  };

  // Sınav sonuçlarını yükle
  const loadExamResults = async (classId: string, date: string) => {
    try {
      const { getOkumaSinavlariByClassAndDate } = await import('../../firebase');
      const results = await getOkumaSinavlariByClassAndDate(classId, date);
      setExamResults(results);
      
      // Öğrenci WPM değerlerini doldur
      const wpmMap: { [studentId: string]: number } = {};
      results.forEach(r => {
        wpmMap[r.studentId] = r.wpm;
      });
      setStudentWpm(prev => ({ ...prev, ...wpmMap }));
    } catch (error) {
      console.error('Sınav sonuçlarını yükleme hatası:', error);
    }
  };

  // Sınıf veya tarih değiştiğinde sonuçları yükle
  useEffect(() => {
    if (selectedSinif && selectedDate) {
      loadExamResults(selectedSinif, selectedDate);
    }
  }, [selectedSinif, selectedDate]);

  // WPM değişikliği
  const handleWpmChange = (studentId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStudentWpm(prev => ({
      ...prev,
      [studentId]: numValue
    }));
  };

  // Sınavı kaydet
  const saveExam = async () => {
    if (!selectedSinif || !selectedDate) {
      alert('Lütfen sınıf ve tarih seçin!');
      return;
    }

    setLoading(true);
    try {
      const { addBulkOkumaSinavlari } = await import('../../firebase');
      
      const results = filteredStudents
        .filter(student => studentWpm[student.id] > 0)
        .map(student => ({
          classId: selectedSinif,
          date: selectedDate,
          studentId: student.id,
          studentName: student.name,
          wpm: studentWpm[student.id]
        }));

      if (results.length === 0) {
        alert('Lütfen en az bir öğrenci için kelime sayısı girin!');
        setLoading(false);
        return;
      }

      await addBulkOkumaSinavlari(results);
      
      alert(`✅ ${results.length} öğrencinin okuma sınavı başarıyla kaydedildi!`);
      
      // Formu temizle ve verileri yenile
      setStudentWpm({});
      
      // Verileri yeniden yükle
      await loadSavedExams();
      await loadExamResults(selectedSinif, selectedDate);
    } catch (error) {
      console.error('Sınav kaydetme hatası:', error);
      alert('Sınav kaydedilirken bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Sınavı sil
  const deleteExam = async (id: string) => {
    if (!confirm('Bu sınav sonucunu silmek istediğinize emin misiniz?')) return;
    
    try {
      const { deleteOkumaSinavi } = await import('../../firebase');
      await deleteOkumaSinavi(id);
      loadSavedExams();
      loadExamResults(selectedSinif, selectedDate);
    } catch (error) {
      console.error('Sınav silme hatası:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">📚 Okuma Sınavı Yönetimi</h2>
        <p className="text-green-100 text-lg">
          2-A, 3-A ve 4-A sınıfları için okuma hızı takibi
        </p>
      </div>

      {/* Alt Sekmeler */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex space-x-2">
          {[
            { key: 'yeni', label: '📝 Yeni Sınav' },
            { key: 'gecmis', label: '📋 Geçmiş Sınavlar' },
            { key: 'analiz', label: '📊 Analiz' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeSubTab === tab.key
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* YENİ SINAV EKLE */}
      {activeSubTab === 'yeni' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">📝 Yeni Okuma Sınavı Ekle</h3>
          
          {/* Sınıf ve Tarih Seçimi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏫 Sınıf Seçin
              </label>
              <select
                value={selectedSinif}
                onChange={(e) => {
                  setSelectedSinif(e.target.value);
                  setStudentWpm({});
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Sınıf seçin...</option>
                {siniflar.map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Sınav Tarihi
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Öğrenci Listesi */}
          {selectedSinif && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-700">
                  👨‍🎓 {selectedSinif} Sınıfı Öğrencileri
                </h4>
                <span className="text-sm text-gray-500">
                  {filteredStudents.length} öğrenci
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="border border-gray-200 p-3 text-left">Öğrenci Adı</th>
                      <th className="border border-gray-200 p-3 text-center w-32">Okuma Hızı (kelime/dakika)</th>
                      <th className="border border-gray-200 p-3 text-center w-24">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const wpm = studentWpm[student.id] || 0;
                      const hasResult = examResults.find(r => r.studentId === student.id);
                      
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-3">
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">No: {student.number}</div>
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={wpm || ''}
                              onChange={(e) => handleWpmChange(student.id, e.target.value)}
                              placeholder="0"
                              className="w-24 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            {wpm > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                                ✓ Girildi
                              </span>
                            ) : hasResult ? (
                              <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                                ⚠ Mevcut
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm">
                                -
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
          )}

          {/* Kaydet Butonu */}
          {selectedSinif && filteredStudents.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={saveExam}
                disabled={loading}
                className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center"
              >
                {loading ? '⏳ Kaydediliyor...' : '💾 Sınavı Kaydet'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* GEÇMİŞ SINAVLAR */}
      {activeSubTab === 'gecmis' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">📋 Geçmiş Okuma Sınavları</h3>
            <button
              onClick={() => loadSavedExams()}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              🔄 Yenile
            </button>
          </div>
          
          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏫 Sınıf Filtresi
              </label>
              <select
                value={selectedFilterSinif}
                onChange={(e) => {
                  setSelectedFilterSinif(e.target.value);
                  setSelectedFilterStudent('');
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Tüm Sınıflar</option>
                {siniflar.map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Öğrenci Filtresi
              </label>
              <select
                value={selectedFilterStudent}
                onChange={(e) => setSelectedFilterStudent(e.target.value)}
                disabled={!selectedFilterSinif}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              >
                <option value="">Tüm Öğrenciler</option>
                {selectedFilterSinif && students
                  .filter(s => s.class === selectedFilterSinif)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(student => (
                    <option key={student.id} value={student.name}>{student.name}</option>
                  ))}
              </select>
            </div>
          </div>
          
          {filteredExams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📝</div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Henüz Sınav Yok</h4>
              <p>Yeni okuma sınavı ekleyerek başlayın.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tarihe göre grupla */}
              {Object.entries(filteredExams.reduce((acc, exam) => {
                const key = `${exam.date}-${exam.class}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(exam);
                return acc;
              }, {} as any)).map(([key, exams]) => {
                const [date, className] = key.split('-');
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          📅 {new Date(date).toLocaleDateString('tr-TR')} - {className}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {(exams as any[]).length} öğrenci sınava alındı
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round((exams as any[]).reduce((sum, e) => sum + e.wpm, 0) / (exams as any[]).length)}
                        </div>
                        <div className="text-xs text-gray-500">Ortalama D/K</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {(exams as any[]).map(exam => (
                        <div key={exam.id} className="bg-gray-50 p-2 rounded text-center">
                          <div className="font-medium text-sm text-gray-800 truncate">{exam.studentName}</div>
                          <div className="text-lg font-bold text-green-600">{exam.wpm}</div>
                          <button
                            onClick={() => deleteExam(exam.id)}
                            className="text-xs text-red-500 hover:text-red-700 mt-1"
                          >
                            Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ANALİZ */}
      {activeSubTab === 'analiz' && (
        <div className="space-y-6">
          {/* Sınıf Ortalamaları - Üstte Göster */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Sınıf Bazlı Genel Ortalamalar</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {siniflar.map(sinif => {
                const sinavlar = savedExams.filter(e => e.class === sinif);
                const wpms = sinavlar.map(e => e.wpm);
                const average = wpms.length > 0 ? wpms.reduce((a, b) => a + b, 0) / wpms.length : 0;
                const filteredSinavlar = selectedFilterSinif ? sinavlar : sinavlar;
                const filteredWpms = filteredSinavlar.map(e => e.wpm);
                const filteredAverage = filteredWpms.length > 0 ? filteredWpms.reduce((a, b) => a + b, 0) / filteredWpms.length : 0;
                
                return (
                  <div key={sinif} className={`p-4 rounded-lg border ${
                    selectedFilterSinif === sinif 
                      ? 'bg-green-100 border-green-300' 
                      : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium text-green-700">{sinif} Sınıfı</div>
                      {selectedFilterSinif === sinif && (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">Filtrelenmiş</span>
                      )}
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {selectedFilterSinif ? (filteredAverage > 0 ? Math.round(filteredAverage) : '-') : (average > 0 ? Math.round(average) : '-')}
                    </div>
                    <div className="text-xs text-green-600">Ortalama D/K</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {selectedFilterSinif ? filteredWpms.length : sinavlar.length} sınav kaydı
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Görünüm Seçimi */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setAnalysisView('performans')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    analysisView === 'performans'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🏆 En İyi Performanslar
                </button>
                <button
                  onClick={() => setAnalysisView('ortalama')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    analysisView === 'ortalama'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 Ortalama D/K Tablosu
                </button>
                <button
                  onClick={() => setAnalysisView('grafik')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    analysisView === 'grafik'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📈 Gelişim Grafiği
                </button>
              </div>
              
              <button
                onClick={() => loadSavedExams()}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                🔄 Yenile
              </button>
            </div>
          </div>
          
          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏫 Sınıf Filtresi
              </label>
              <select
                value={selectedFilterSinif}
                onChange={(e) => {
                  setSelectedFilterSinif(e.target.value);
                  setSelectedFilterStudent('');
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Tüm Sınıflar</option>
                {siniflar.map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Öğrenci Filtresi (Grafik için gerekli)
              </label>
              <select
                value={selectedFilterStudent}
                onChange={(e) => setSelectedFilterStudent(e.target.value)}
                disabled={!selectedFilterSinif}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              >
                <option value="">Öğrenci seçin...</option>
                {selectedFilterSinif && students
                  .filter(s => s.class === selectedFilterSinif)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(student => (
                    <option key={student.id} value={student.name}>{student.name}</option>
                  ))}
              </select>
            </div>
          </div>
          
          {/* EN İYİ PERFORMANSLAR GÖRÜNÜMÜ */}
          {analysisView === 'performans' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">🏆 En İyi Performanslar</h3>
              
              {filteredExams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Veri Yok</h4>
                  <p>Filtrelere uygun sınav verisi bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredExams
                    .sort((a, b) => b.wpm - a.wpm)
                    .slice(0, 20)
                    .map((exam, index) => (
                      <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                            index === 0 ? 'bg-yellow-400 text-white' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-300 text-white' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{exam.studentName}</div>
                            <div className="text-sm text-gray-500">{exam.class} - {new Date(exam.date).toLocaleDateString('tr-TR')}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{exam.wpm} D/K</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          
          {/* ORTALAMA D/K TABLOSU GÖRÜNÜMÜ */}
          {analysisView === 'ortalama' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">📊 Ortalama D/K Tablosu</h3>
              
              {filteredExams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Veri Yok</h4>
                  <p>Filtrelere uygun sınav verisi bulunamadı.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-green-50">
                        <th className="border border-gray-200 p-3 text-left">Sıra</th>
                        <th className="border border-gray-200 p-3 text-left">Öğrenci Adı</th>
                        <th className="border border-gray-200 p-3 text-center">Sınıf</th>
                        <th className="border border-gray-200 p-3 text-center">Sınav Sayısı</th>
                        <th className="border border-gray-200 p-3 text-center">Ortalama D/K</th>
                        <th className="border border-gray-200 p-3 text-center">En Yüksek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Öğrenci bazlı istatistikler
                        const studentStats = filteredExams.reduce((acc, exam) => {
                          const key = exam.studentName;
                          if (!acc[key]) {
                            acc[key] = {
                              name: exam.studentName,
                              class: exam.class,
                              exams: [],
                              wpmSum: 0,
                              count: 0,
                              maxWpm: 0
                            };
                          }
                          acc[key].exams.push(exam);
                          acc[key].wpmSum += exam.wpm;
                          acc[key].count += 1;
                          acc[key].maxWpm = Math.max(acc[key].maxWpm, exam.wpm);
                          return acc;
                        }, {} as any);
                        
                        // Ortalamaya göre sırala
                        const sortedStats = Object.values(studentStats)
                          .map((s: any) => ({
                            ...s,
                            average: s.count > 0 ? s.wpmSum / s.count : 0
                          }))
                          .sort((a: any, b: any) => b.average - a.average);
                        
                        return sortedStats.map((stat: any, index: number) => (
                          <tr key={stat.name} className="hover:bg-gray-50">
                            <td className="border border-gray-200 p-3">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0 ? 'bg-yellow-400 text-white' :
                                index === 1 ? 'bg-gray-300 text-gray-700' :
                                index === 2 ? 'bg-orange-300 text-white' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="border border-gray-200 p-3 font-medium text-gray-900">{stat.name}</td>
                            <td className="border border-gray-200 p-3 text-center text-gray-600">{stat.class}</td>
                            <td className="border border-gray-200 p-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                {stat.count}
                              </span>
                            </td>
                            <td className="border border-gray-200 p-3 text-center">
                              <span className="text-lg font-bold text-green-600">{Math.round(stat.average)}</span>
                            </td>
                            <td className="border border-gray-200 p-3 text-center">
                              <span className="text-green-600 font-medium">{stat.maxWpm}</span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* GELİŞİM GRAFİĞİ GÖRÜNÜMÜ */}
          {analysisView === 'grafik' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">📈 Gelişim Grafiği</h3>
              
              {!selectedFilterSinif ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">📈</div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Sınıf Seçin</h4>
                  <p>Grafiği görüntülemek için lütfen bir sınıf seçin.</p>
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Veri Yok</h4>
                  <p>Seçilen sınıf için sınav verisi bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grafik */}
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'D/K', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sinifOrtalamasi" 
                          name="Sınıf Ortalaması" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        {selectedFilterStudent && (
                          <Line 
                            type="monotone" 
                            dataKey="ogrenci" 
                            name={selectedFilterStudent} 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Grafik Açıklaması */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">Sınıf Ortalaması</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Seçilen sınıfın her sınav tarihindeki ortalama D/K değerini gösterir.
                      </p>
                    </div>
                    {selectedFilterStudent && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-blue-800">{selectedFilterStudent}</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Seçilen öğrencinin zaman içindeki D/K gelişimini gösterir.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Özet İstatistikler */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Sınıf Genel Ortalaması</div>
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(classOverallAverage)}
                      </div>
                    </div>
                    {selectedFilterStudent && (
                      <>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Öğrenci Genel Ortalaması</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round(studentOverallAverage)}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Gelişim Farkı</div>
                          <div className={`text-2xl font-bold ${studentOverallAverage >= classOverallAverage ? 'text-green-600' : 'text-red-600'}`}>
                            {studentOverallAverage >= classOverallAverage ? '+' : ''}{Math.round(studentOverallAverage - classOverallAverage)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Yardım Bilgileri */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
          <span className="text-green-600 mr-3">💡</span>
          Nasıl Kullanılır?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
          <div className="flex items-start">
            <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
            <div>
              <p className="font-medium">Yeni Sınav Ekle</p>
              <p className="text-sm">Sınıf ve tarih seçip öğrencilerin okuma hızlarını girin.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
            <div>
              <p className="font-medium">Kaydet</p>
              <p className="text-sm">Tüm verileri kaydedip geçmişe aktarın.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
            <div>
              <p className="font-medium">Geçmiş İzle</p>
              <p className="text-sm">Geçmiş sınavları görüntüleyin ve karşılaştırın.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="bg-green-200 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
            <div>
              <p className="font-medium">Analiz Et</p>
              <p className="text-sm">Sınıf bazlı istatistikleri inceleyin.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 📝 BRANS DENEMESİ TAB COMPONENT
const BransDenemesiTab = ({ students }: { students: any[] }) => {
  const [activeSubTab, setActiveSubTab] = useState<'ekle' | 'listele'>('ekle');
  const [denemeAdi, setDenemeAdi] = useState<string>('');
  const [selectedDers, setSelectedDers] = useState<string>('');
  const [soruSayisi, setSoruSayisi] = useState<number>(20);
  const [tarih, setTarih] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSinif, setSelectedSinif] = useState<string>('');
  const [studentScores, setStudentScores] = useState<{ [studentId: string]: { dogru: number; yanlis: number } }>({});
  const [loading, setLoading] = useState(false);
  const [savedExams, setSavedExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  // Ders seçenekleri (8. sınıf için LGS dersleri)
  const dersler = [
    { key: 'turkce', name: 'Türkçe', color: '#10B981' },
    { key: 'matematik', name: 'Matematik', color: '#F59E0B' },
    { key: 'fen', name: 'Fen Bilimleri', color: '#3B82F6' },
    { key: 'sosyal', name: 'Sosyal Bilgiler', color: '#8B5CF6' },
    { key: 'ingilizce', name: 'İngilizce', color: '#EF4444' },
    { key: 'din', name: 'Din Kültürü', color: '#F97316' }
  ];

  // 5, 6, 7, 8. sınıf seçenekleri
  const siniflar = ['5-A', '6-A', '7-A', '8-A'];

  // Seçilen sınıfa ait öğrenciler (alfabetik sıralı)
  const filteredStudents = selectedSinif
    ? students.filter(s => s.class === selectedSinif).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Kayıtlı denemeleri yükle
  useEffect(() => {
    loadSavedExams();
  }, []);

  const loadSavedExams = async () => {
    try {
      const { getBransDenemeleri } = await import('../../firebase');
      const exams = await getBransDenemeleri();
      setSavedExams(exams);
    } catch (error) {
      console.error('Denemeleri yükleme hatası:', error);
    }
  };

  // Seçilen denemenin sonuçlarını yükle
  const loadExamResults = async (examId: string) => {
    try {
      const { getBransDenemesiSonuclari } = await import('../../firebase');
      const results = await getBransDenemesiSonuclari(examId);
      setExamResults(results);

      // Öğrenci skorlarını doldur
      const scoresMap: { [studentId: string]: { dogru: number; yanlis: number; bos: number } } = {};
      results.forEach(r => {
        scoresMap[r.studentId] = { dogru: r.dogru, yanlis: r.yanlis, bos: r.bos };
      });
      setStudentScores(prev => ({ ...prev, ...scoresMap }));
    } catch (error) {
      console.error('Deneme sonuçlarını yükleme hatası:', error);
    }
  };

  // Deneme seçildiğinde sonuçları yükle
  useEffect(() => {
    if (selectedExam) {
      loadExamResults(selectedExam.id);
    }
  }, [selectedExam]);

  // Skor değişikliği (boş ve net otomatik hesaplanır)
  const handleScoreChange = (studentId: string, field: 'dogru' | 'yanlis', value: string) => {
    const numValue = parseInt(value) || 0;
    setStudentScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue
      }
    }));
  };

  // Boş hesaplama fonksiyonu: Toplam Soru - Doğru - Yanlış = Boş
  const calculateBos = (dogru: number, yanlis: number) => {
    return soruSayisi - dogru - yanlis;
  };

  // Net hesaplama fonksiyonu (3 yanlış = 1 doğruyu götürür)
  const calculateNet = (dogru: number, yanlis: number) => {
    const net = dogru - (yanlis / 3);
    return Math.round(net * 10) / 10; // 1 decimal basamak
  };

  // Denemeyi kaydet
  const saveExam = async () => {
    if (!denemeAdi || !selectedDers || !selectedSinif || !tarih) {
      alert('Lütfen tüm alanları doldurun!');
      return;
    }

    const studentsWithScores = filteredStudents.filter(s => studentScores[s.id] &&
      (studentScores[s.id].dogru > 0 || studentScores[s.id].yanlis > 0));

    if (studentsWithScores.length === 0) {
      alert('Lütfen en az bir öğrenci için skor girin!');
      return;
    }

    setLoading(true);
    try {
      const { addBransDenemesi, addBulkBransDenemesiSonuclari } = await import('../../firebase');

      // Önce denemeyi oluştur
      const denemeId = await addBransDenemesi({
        ders: selectedDers,
        soruSayisi,
        tarih,
        sinif: selectedSinif,
        ad: denemeAdi // Deneme adını da kaydet
      });

      // Sonra sonuçları ekle
      const results = studentsWithScores.map(student => {
        const scores = studentScores[student.id];
        const net = calculateNet(scores.dogru, scores.yanlis);
        const bos = calculateBos(scores.dogru, scores.yanlis);
        return {
          denemeId,
          studentId: student.id,
          studentName: student.name,
          studentClass: student.class,
          dogru: scores.dogru,
          yanlis: scores.yanlis,
          bos: bos,
          net,
          tarih
        };
      });

      await addBulkBransDenemesiSonuclari(results);

      alert(`✅ ${results.length} öğrencinin branş denemesi başarıyla kaydedildi!`);

      // Formu temizle
      setDenemeAdi('');
      setSelectedDers('');
      setSelectedSinif('');
      setStudentScores({});

      // Verileri yenile
      await loadSavedExams();
    } catch (error) {
      console.error('Deneme kaydetme hatası:', error);
      alert('Deneme kaydedilirken bir hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Deneme silme
  const deleteExam = async (examId: string) => {
    if (!confirm('Bu denemeyi ve tüm sonuçlarını silmek istediğinize emin misiniz?')) return;

    try {
      const { deleteBransDenemesi } = await import('../../firebase');
      await deleteBransDenemesi(examId);
      await loadSavedExams();
      setSelectedExam(null);
      setExamResults([]);
    } catch (error) {
      console.error('Deneme silme hatası:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">📝 Branş Denemesi Yönetimi</h2>
        <p className="text-indigo-100 text-lg">
          8. sınıf öğrencileri için branş denemeleri oluşturun ve sonuçlarını takip edin
        </p>
      </div>

      {/* Alt Sekmeler */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveSubTab('ekle')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeSubTab === 'ekle'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ➕ Branş Denemesi Ekle
          </button>
          <button
            onClick={() => setActiveSubTab('listele')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeSubTab === 'listele'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Branş Denemesi Listele
          </button>
        </div>
      </div>

      {/* BRANŞ DENEMESİ EKLE */}
      {activeSubTab === 'ekle' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">➕ Yeni Branş Denemesi Ekle</h3>

          {/* Ders, Soru Sayısı, Tarih ve Sınıf Seçimi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Deneme Adı
              </label>
              <input
                type="text"
                value={denemeAdi}
                onChange={(e) => setDenemeAdi(e.target.value)}
                placeholder="Örn: 1. Deneme"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📚 Ders Seçin
              </label>
              <select
                value={selectedDers}
                onChange={(e) => setSelectedDers(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Ders seçin...</option>
                {dersler.map(ders => (
                  <option key={ders.key} value={ders.key}>{ders.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Soru Sayısı
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={soruSayisi}
                onChange={(e) => setSoruSayisi(parseInt(e.target.value) || 20)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Sınav Tarihi
              </label>
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏫 Sınıf Seçin
              </label>
              <select
                value={selectedSinif}
                onChange={(e) => {
                  setSelectedSinif(e.target.value);
                  setStudentScores({});
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sınıf seçin...</option>
                {siniflar.map(sinif => (
                  <option key={sinif} value={sinif}>{sinif}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Öğrenci Listesi */}
          {selectedSinif && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-700">
                  👨‍🎓 {selectedSinif} Sınıfı Öğrencileri
                </h4>
                <span className="text-sm text-gray-500">
                  {filteredStudents.length} öğrenci
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-indigo-50">
                      <th className="border border-gray-200 p-3 text-left">Öğrenci Adı</th>
                      <th className="border border-gray-200 p-3 text-center w-24">Doğru</th>
                      <th className="border border-gray-200 p-3 text-center w-24">Yanlış</th>
                      <th className="border border-gray-200 p-3 text-center w-24">Boş</th>
                      <th className="border border-gray-200 p-3 text-center w-28">Net</th>
                      <th className="border border-gray-200 p-3 text-center w-24">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const scores = studentScores[student.id] || { dogru: 0, yanlis: 0 };
                      const net = calculateNet(scores.dogru, scores.yanlis);
                      const bos = calculateBos(scores.dogru, scores.yanlis);
                      const hasAnyScore = scores.dogru > 0 || scores.yanlis > 0 || bos > 0;

                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 p-3">
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">No: {student.number}</div>
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={soruSayisi}
                              value={scores.dogru || ''}
                              onChange={(e) => handleScoreChange(student.id, 'dogru', e.target.value)}
                              placeholder="0"
                              className="w-20 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={soruSayisi}
                              value={scores.yanlis || ''}
                              onChange={(e) => handleScoreChange(student.id, 'yanlis', e.target.value)}
                              placeholder="0"
                              className="w-20 p-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            <span className="text-lg font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded">
                              {bos}
                            </span>
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            <span className={`text-lg font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {hasAnyScore ? net : '-'}
                            </span>
                          </td>
                          <td className="border border-gray-200 p-3 text-center">
                            {hasAnyScore ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                                ✓ Girildi
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm">
                                -
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
          )}

          {/* Kaydet Butonu */}
          {selectedSinif && filteredStudents.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={saveExam}
                disabled={loading}
                className="px-8 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center"
              >
                {loading ? '⏳ Kaydediliyor...' : '💾 Denemeyi Kaydet'}
              </button>
            </div>
          )}

        </div>
      )}

      {/* BRANŞ DENEMESİ LİSTELE */}
      {activeSubTab === 'listele' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">📋 Kayıtlı Branş Denemeleri</h3>
            <button
              onClick={() => loadSavedExams()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
            >
              🔄 Yenile
            </button>
          </div>

          {savedExams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📝</div>
              <h4 className="text-lg font-semibold text-gray-600 mb-2">Henüz Deneme Yok</h4>
              <p>Yeni branş denemesi ekleyerek başlayın.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedExams.map(exam => {
                const examDers = dersler.find(d => d.key === exam.ders);
                return (
                  <div key={exam.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: examDers?.color || '#6366f1' }}
                          >
                            {examDers?.name?.charAt(0) || 'B'}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800">
                              {examDers?.name || exam.ders} 
                              {exam.ad && <span className="text-indigo-600"> - {exam.ad}</span>} Branş Denemesi
                            </h4>
                            <p className="text-sm text-gray-500">
                              {exam.sinif} • {new Date(exam.tarih).toLocaleDateString('tr-TR')} • {exam.soruSayisi} soru
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedExam(selectedExam?.id === exam.id ? null : exam)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          {selectedExam?.id === exam.id ? 'Kapat' : 'Sonuçları Gör'}
                        </button>
                        <button
                          onClick={() => deleteExam(exam.id)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          Sil
                        </button>
                      </div>
                    </div>

                    {/* Sonuçlar */}
                    {selectedExam?.id === exam.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium text-gray-700 mb-3">📊 Sonuçlar</h5>
                        {examResults.length === 0 ? (
                          <p className="text-gray-500 text-sm">Bu deneme için henüz sonuç girilmemiş.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 p-2 text-left">Öğrenci</th>
                                  <th className="border border-gray-300 p-2 text-center">Doğru</th>
                                  <th className="border border-gray-300 p-2 text-center">Yanlış</th>
                                  <th className="border border-gray-300 p-2 text-center">Boş</th>
                                  <th className="border border-gray-300 p-2 text-center">Net</th>
                                </tr>
                              </thead>
                              <tbody>
                                {examResults.sort((a, b) => b.net - a.net).map((result, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 p-2">{result.studentName}</td>
                                    <td className="border border-gray-300 p-2 text-center text-green-600 font-medium">{result.dogru}</td>
                                    <td className="border border-gray-300 p-2 text-center text-red-600">{result.yanlis}</td>
                                    <td className="border border-gray-300 p-2 text-center text-gray-500">{result.bos}</td>
                                    <td className="border border-gray-300 p-2 text-center font-bold text-indigo-600">
                                      {result.net.toFixed(1)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Yardım Bilgileri */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
          <span className="text-indigo-600 mr-3">💡</span>
          Nasıl Kullanılır?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-indigo-800">
          <div className="flex items-start">
            <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
            <div>
              <p className="font-medium">Deneme Oluştur</p>
              <p className="text-sm">Ders, soru sayısı, tarih ve sınıf seçin.</p>
            </div>
          </div>

          <div className="flex items-start">
            <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
            <div>
              <p className="font-medium">Skorları Girin</p>
              <p className="text-sm">Her öğrenci için doğru, yanlış ve boş sayılarını girin.</p>
            </div>
          </div>

          <div className="flex items-start">
            <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
            <div>
              <p className="font-medium">Net Hesaplama</p>
              <p className="text-sm">Sistem otomatik olarak netleri hesaplar (3 yanlış = 1 doğru).</p>
            </div>
          </div>

          <div className="flex items-start">
            <span className="bg-indigo-200 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
            <div>
              <p className="font-medium">Takip Edin</p>
              <p className="text-sm">Öğrenciler kendi panellerinden sonuçları görebilir.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



// 🏆 Başarı Rozetleri Tab Component
const BasariRozetleriTab = ({ students, results, exams }: { students: any[], results: any[], exams: any[] }) => {
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [rankings, setRankings] = useState<any>({});

  useEffect(() => {
    calculateRankings();
  }, [students, results, exams, selectedClass]);

  const calculateRankings = () => {
    setLoading(true);
    
    // Sınavları tarihe göre sırala
    const sortedExams = [...exams].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sortedExams.length < 2) {
      setLoading(false);
      return;
    }

    // Her öğrenci için sonuçları analiz et
    const studentAnalysis = students.map(student => {
      const studentResults = results
        .filter(r => r.studentId === student.id)
        .sort((a, b) => {
          const examA = sortedExams.find(e => e.id === a.examId);
          const examB = sortedExams.find(e => e.id === b.examId);
          if (!examA || !examB) return 0;
          return new Date(examA.date).getTime() - new Date(examB.date).getTime();
        });

      if (studentResults.length < 2) return null;

      const firstResult = studentResults[0];
      const lastResult = studentResults[studentResults.length - 1];
      const previousResult = studentResults[studentResults.length - 2];

      // İlk ve son deneme arası değişim
      const netChange = (lastResult.nets?.total || 0) - (firstResult.nets?.total || 0);
      const scoreChange = (lastResult.puan || lastResult.scores?.puan || 0) - (firstResult.puan || firstResult.scores?.puan || 0);

      // Son ve bir önceki deneme arası değişim
      const lastNetChange = (lastResult.nets?.total || 0) - (previousResult.nets?.total || 0);
      const lastScoreChange = (lastResult.puan || lastResult.scores?.puan || 0) - (previousResult.puan || previousResult.scores?.puan || 0);

      return {
        student,
        firstNet: firstResult.nets?.total || 0,
        lastNet: lastResult.nets?.total || 0,
        firstScore: firstResult.puan || firstResult.scores?.puan || 0,
        lastScore: lastResult.puan || lastResult.scores?.puan || 0,
        netChange,
        scoreChange,
        lastNetChange,
        lastScoreChange,
        totalExams: studentResults.length,
        examDates: {
          first: sortedExams.find(e => e.id === firstResult.examId)?.date,
          last: sortedExams.find(e => e.id === lastResult.examId)?.date,
          previous: sortedExams.find(e => e.id === previousResult.examId)?.date
        }
      };
    }).filter(Boolean);

    // Sınıfa göre filtrele
    const filteredStudents = selectedClass === 'all' 
      ? studentAnalysis 
      : studentAnalysis.filter((s: any) => s.student.class === selectedClass);

    // 1. Son denemeye göre en fazla net arttıran (girmeyenler hariç)
    const topNetIncreasers = [...filteredStudents]
      .filter((s: any) => s.lastNetChange > 0)
      .sort((a: any, b: any) => b.lastNetChange - a.lastNetChange)
      .slice(0, 10);

    // 2. Son denemeye göre en fazla puan arttıran
    const topScoreIncreasers = [...filteredStudents]
      .filter((s: any) => s.lastScoreChange > 0)
      .sort((a: any, b: any) => b.lastScoreChange - a.lastScoreChange)
      .slice(0, 10);

    // 3. İlk denemeden son denemeye kadar en fazla net arttıran
    const topOverallNetImprovers = [...filteredStudents]
      .filter((s: any) => s.netChange > 0)
      .sort((a: any, b: any) => b.netChange - a.netChange)
      .slice(0, 10);

    // 4. İlk denemeden son denemeye kadar en fazla puan arttıran
    const topOverallScoreImprovers = [...filteredStudents]
      .filter((s: any) => s.scoreChange > 0)
      .sort((a: any, b: any) => b.scoreChange - a.scoreChange)
      .slice(0, 10);

    // 5. Her sınıf için en yüksek puanlı 5 öğrenci
    const classTopStudents: { [key: string]: any[] } = {};
    const uniqueClasses = Array.from(new Set(students.map(s => s.class)));
    
    uniqueClasses.forEach(cls => {
      const classStudents = filteredStudents.filter((s: any) => s.student.class === cls);
      classTopStudents[cls] = [...classStudents]
        .sort((a: any, b: any) => b.lastScore - a.lastScore)
        .slice(0, 5);
    });

    setRankings({
      topNetIncreasers,
      topScoreIncreasers,
      topOverallNetImprovers,
      topOverallScoreImprovers,
      classTopStudents
    });

    setLoading(false);
  };

  const getUniqueClasses = () => {
    return Array.from(new Set(students.map(s => s.class))).sort();
  };

  const RankCard = ({ title, emoji, data, type }: { title: string, emoji: string, data: any[], type: 'net' | 'score' }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
        <span className="mr-2">{emoji}</span> {title}
      </h3>
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">Yeterli veri yok</p>
      ) : (
        <div className="space-y-2">
          {data.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-400 text-yellow-900' :
                  index === 1 ? 'bg-gray-300 text-gray-700' :
                  index === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.student.name}</p>
                  <p className="text-xs text-gray-500">{item.student.class} - {item.student.number}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {type === 'net' 
                    ? `+${(item.lastNetChange || item.netChange).toFixed(1)} net`
                    : `+${(item.lastScoreChange || item.scoreChange).toFixed(0)} puan`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {item.lastNet?.toFixed(1) || item.lastScore?.toFixed(0)} net/puan
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">🏆 Başarı Rozetleri</h1>
        <p className="text-yellow-100 text-sm">
          Öğrencilerin deneme performanslarına göre başarı sıralamaları
        </p>
      </div>

      {/* Sınıf Filtresi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedClass('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedClass === 'all' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tüm Sınıflar
          </button>
          {getUniqueClasses().map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedClass === cls 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Sıralamalar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankCard 
          title="Son Denemede En Fazla Net Artış" 
          emoji="📈" 
          data={rankings.topNetIncreasers || []} 
          type="net" 
        />
        <RankCard 
          title="Son Denemede En Fazla Puan Artış" 
          emoji="⭐" 
          data={rankings.topScoreIncreasers || []} 
          type="score" 
        />
        <RankCard 
          title="İlkdeneme → Sondene En Fazla Net Artışı" 
          emoji="🚀" 
          data={rankings.topOverallNetImprovers || []} 
          type="net" 
        />
        <RankCard 
          title="İlkdeneme → Sondene En Fazla Puan Artışı" 
          emoji="💪" 
          data={rankings.topOverallScoreImprovers || []} 
          type="score" 
        />
      </div>

      {/* Sınıf Bazlı En Başarılılar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">👑</span> Her Sınıfın En Başarılı 5 Öğrencisi
        </h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(rankings.classTopStudents || {}).map(([className, classStudents]: [string, any]) => (
              <div key={className} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <h4 className="text-sm font-semibold text-blue-600 mb-3">{className}</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {classStudents.map((item: any, index: number) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                      index === 1 ? 'bg-gray-50 border border-gray-200' :
                      index === 2 ? 'bg-amber-50 border border-amber-200' :
                      'bg-white border border-gray-100'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-800 truncate">{item.student.name}</p>
                      <p className="text-xs font-bold text-green-600">{item.lastScore.toFixed(0)} puan</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Açıklama */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h4 className="text-sm font-bold text-blue-800 mb-2">📋 Nasıl Hesaplanıyor?</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>Net Artış:</strong> Son deneme ile bir önceki deneme arasındaki net farkı</li>
          <li>• <strong>Puan Artış:</strong> Son deneme ile bir önceki deneme arasındaki puan farkı</li>
          <li>• <strong>Genel İyileşme:</strong> İlk denemeden son denemeye kadar toplam net/puan değişimi</li>
          <li>• <strong>Sınıf Sıralaması:</strong> Her sınıfın en yüksek puanlı öğrencileri</li>
        </ul>
      </div>
    </div>
  );
};
