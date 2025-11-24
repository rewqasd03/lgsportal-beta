"use client";

import React, { useEffect, useState, Suspense } from 'react';
import StudentReport from '../student-report';
import { Student, Exam, Result } from '../../../firebase';
import { getStudents, getExams, getResults } from '../../../firebase';

// Suspense boundary için ayrı bileşen
function StudentReportContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
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
        console.error('Student Report veri yükleme hatası:', error);
        alert('Veriler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rapor verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return <StudentReport students={students} exams={exams} results={results} />;
}

export default function StudentReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Rapor sayfası yükleniyor...</p>
        </div>
      </div>
    }>
      <StudentReportContent />
    </Suspense>
  );
}