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
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        📊 Öğrenci Rapor Sistemi
      </h2>

      {/* Rapor Tipi Seçimi */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Rapor Tipi</h3>
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
            <span className="text-gray-700">👨‍🎓 Öğrenci Raporu</span>
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
            <span className="text-gray-700">🏫 Sınıf Raporu</span>
          </label>
        </div>
      </div>

      {/* Sınıf Seçimi */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Sınıf Seçimi</h3>
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
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Öğrenci Seçimi</h3>
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

      {/* Rapor Bilgileri */}
      {reportType === 'student' && selectedStudent && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          {(() => {
            const student = students.find(s => s.id === selectedStudent);
            return (
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">📋 Seçilen Öğrenci</h4>
                <p><strong>Ad Soyad:</strong> {student?.name}</p>
                <p><strong>Sınıf:</strong> {student?.class}</p>
                <p><strong>Numara:</strong> {student?.number}</p>
                <p><strong>Katıldığı Deneme Sayısı:</strong> {results.filter(r => r.studentId === selectedStudent).length}</p>
              </div>
            );
          })()}
        </div>
      )}

      {reportType === 'class' && selectedClass && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">🏫 Seçilen Sınıf</h4>
          <p><strong>Sınıf:</strong> {selectedClass}</p>
          <p><strong>Toplam Öğrenci:</strong> {filteredStudents.length}</p>
          <p><strong>Mevcut Denemeler:</strong> {exams.length}</p>
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
          `📊 ${reportType === 'student' ? 'Öğrenci' : 'Sınıf'} Raporu Oluştur`
        )}
      </button>
    </div>
  );
};

export default ReportSelector;