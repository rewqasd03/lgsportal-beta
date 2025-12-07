'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateStudent } from '../../firebase';

const StudentLoginPage: React.FC = () => {
  const [studentClass, setStudentClass] = useState('');
  const [schoolNumber, setSchoolNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sınıf ve Okul Numarası ile giriş
      const student = await authenticateStudent(studentClass, schoolNumber);

      if (student) {
        // Öğrenci dashboard'a yönlendir
        router.push(`/student-dashboard?studentId=${student.id}`);
      } else {
        setError('Sınıf veya Okul Numarası hatalı');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <img 
            src="/projelogo.png" 
            alt="LGS Portalı" 
            className="w-20 h-20 mx-auto mb-4 hover:scale-110 transition-transform duration-300 drop-shadow-xl"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Öğrenci Portalı</h1>
          <p className="text-gray-600">LGS Başarı Takip Sistemi</p>
          <p className="text-sm text-blue-600 mt-2">Sınıf ve Okul Numarası ile giriş</p>
        </div>

        {/* Kart Tasarımı */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🏫 Sınıf
              </label>
              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Sınıfınızı seçiniz</option>
                <option value="2-A">2-A</option>
                <option value="3-A">3-A</option>
                <option value="4-A">4-A</option>
                <option value="5-A">5-A</option>
                <option value="6-A">6-A</option>
                <option value="7-A">7-A</option>
                <option value="8-A">8-A</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔢 Okul Numarası
              </label>
              <input
                type="text"
                value={schoolNumber}
                onChange={(e) => setSchoolNumber(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Okul Numaranız"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Giriş yapılıyor...' : '🚀 Giriş Yap'}
            </button>
          </form>

          {/* Alt bilgi */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Öğrenciler okul tarafından sisteme kaydedilir.<br />
              Giriş için sınıf ve okul numaranızı kullanın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentLoginPage;