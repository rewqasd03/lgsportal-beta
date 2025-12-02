'use client';

import React, { useState, useEffect } from 'react';
import { Student, Exam, Result } from '../../firebase';
// import { toast } from 'react-hot-toast'; // Commented out - using local state

interface ReportSelectorProps {
  students: Student[];
  exams: Exam[];
  results: Result[];
}

const ReportSelector: React.FC<ReportSelectorProps> = ({
  students,
  exams,
  results
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [reportType, setReportType] = useState<'student' | 'class'>('student');
  const [loading, setLoading] = useState(false);

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

  // Sınıf listesini al
  const classes = Array.from(new Set(students.map(s => s.class))).sort();

  // Seçilen sınıfa göre öğrencileri filtrele
  const filteredStudents = selectedClass
    ? students.filter(s => s.class === selectedClass)
    : [];

  const handleGenerateReport = async () => {
    if (reportType === 'student' && !selectedStudent) {
      toast.error('Lütfen bir öğrenci seçin');
      return;
    }

    if (reportType === 'class' && !selectedClass) {
      toast.error('Lütfen bir sınıf seçin');
      return;
    }

    setLoading(true);

    try {
      // Rapor URL'ini oluştur
      const params = new URLSearchParams();
      if (reportType === 'student') {
        params.set('type', 'student');
        params.set('studentId', selectedStudent);
      } else {
        params.set('type', 'class');
        params.set('classId', selectedClass);
      }

      window.open(`/panel/student-report?${params.toString()}`, '_blank');

    } catch (error) {
      console.error('Rapor oluşturma hatası:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 📊 Reports Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
        <h1 className="text-sm font-bold mb-2">📊 Raporlar</h1>
        <p className="text-blue-100">
          Öğrenci ve sınıf raporlarını PDF olarak çıkarın
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Rapor Oluştur
        </h2>

        {/* Rapor Tipi Seçimi */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">Rapor Türü</h3>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="student"
                checked={reportType === 'student'}
                onChange={(e) => {
                  setReportType(e.target.value as 'student' | 'class');
                  setSelectedStudent('');
                }}
                className="mr-2"
              />
              <span className="text-gray-700">Öğrenci Raporu</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="class"
                checked={reportType === 'class'}
                onChange={(e) => {
                  setReportType(e.target.value as 'student' | 'class');
                  setSelectedStudent('');
                }}
                className="mr-2"
              />
              <span className="text-gray-700">Sınıf Raporu</span>
            </label>
          </div>
        </div>

        {/* Sınıf Seçimi */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">Sınıf Seçimi</h3>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedStudent('');
            }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sınıf Seçin</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        {/* Öğrenci Seçimi - Sadece öğrenci raporu için */}
        {reportType === 'student' && selectedClass && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Öğrenci Seçimi</h3>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Öğrenci Seçin</option>
              {filteredStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} - {student.number}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Seçili Rapor Bilgisi */}
        {((reportType === 'student' && selectedStudent) || (reportType === 'class' && selectedClass)) && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg border">
            {reportType === 'student' && selectedStudent && (
              (() => {
                const student = students.find(s => s.id === selectedStudent);
                return (
                  <div>
                    <h4 className="font-medium text-gray-800">Öğrenci: {student?.name} - {student?.class}</h4>
                    <p className="text-sm text-gray-600">Deneme sayısı: {results.filter(r => r.studentId === selectedStudent).length}</p>
                  </div>
                );
              })()
            )}
            {reportType === 'class' && selectedClass && (
              <div>
                <h4 className="font-medium text-gray-800">Sınıf: {selectedClass}</h4>
                <p className="text-sm text-gray-600">Öğrenci sayısı: {filteredStudents.length}</p>
              </div>
            )}
          </div>
        )}

        {/* Rapor Oluştur Butonu */}
        <button
          onClick={handleGenerateReport}
          disabled={loading || (reportType === 'student' && !selectedStudent) || (reportType === 'class' && !selectedClass)}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${loading || (reportType === 'student' && !selectedStudent) || (reportType === 'class' && !selectedClass)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Rapor Oluşturuluyor...
            </span>
          ) : (
            `Rapor Oluştur (${reportType === 'student' ? 'Öğrenci' : 'Sınıf'})`
          )}
        </button>
      </div>
    </div>
  );
};

export default ReportSelector;
