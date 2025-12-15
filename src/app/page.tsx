"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Student, Exam, getStudents, getExams } from "../firebase";

// Deneme Zamanlayıcısı Modal Component
function ExamTimerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSession, setSelectedSession] = useState<{
    name: string;
    duration: number; // dakika
  } | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const sessions = [
    { name: "Sözel Oturum", duration: 75 },
    { name: "Sayısal Oturum", duration: 80 }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Süre bitince sesli uyarı (tarayıcı destekliyorsa)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Deneme Zamanlayıcısı', {
                body: `${selectedSession?.name} süresi doldu!`,
                icon: '/favicon.ico'
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, selectedSession]);

  // Tarih ve saati güncelle
  useEffect(() => {
    const updateDateTime = () => {
      setCurrentDateTime(new Date());
    };
    
    updateDateTime(); // İlk güncelleme
    const dateInterval = setInterval(updateDateTime, 1000); // Her saniye güncelle
    
    return () => clearInterval(dateInterval);
  }, []);

  // Türkçe tarih formatı
  const formatTurkishDate = (date: Date) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    return {
      dayName,
      dateString: `${day} ${month} ${year}`,
      time
    };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (session: { name: string; duration: number }) => {
    setSelectedSession(session);
    setTimeLeft(session.duration * 60);
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setIsRunning(true);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setSelectedSession(null);
  };

  const stopTimer = () => {
    resetTimer();
    onClose();
  };

  if (!isOpen) return null;

  const { dayName, dateString, time } = formatTurkishDate(currentDateTime);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center z-50">
      <div className="w-full h-full flex flex-col justify-center items-center text-white p-8">
        {/* Tarih ve Saat Bilgisi */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-blue-300 mb-2">
            {dayName}
          </div>
          <div className="text-xl text-blue-200 mb-2">
            {dateString}
          </div>
          <div className="text-3xl font-bold text-white">
            {time}
          </div>
        </div>

        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold mb-4">⏱️ Deneme Zamanlayıcısı</h3>
          <p className="text-xl text-blue-200">Deneme sınavınız için süre takibi yapın</p>
        </div>

        {!selectedSession ? (
          // Oturum Seçimi
          <div className="space-y-8 w-full max-w-2xl">
            <h4 className="text-2xl font-bold text-center mb-8">Oturum Seçin</h4>
            {sessions.map((session, index) => (
              <button
                key={index}
                onClick={() => startTimer(session)}
                className="w-full p-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-3xl transition-all duration-300 hover:scale-105 flex items-center justify-between shadow-2xl"
              >
                <div className="text-left">
                  <div className="text-3xl font-bold mb-2">{session.name}</div>
                  <div className="text-xl opacity-90">{session.duration} Dakika</div>
                </div>
                <div className="text-6xl">
                  {session.name.includes('Sözel') ? '📝' : '🔢'}
                </div>
              </button>
            ))}
          </div>
        ) : (
          // Zamanlayıcı
          <div className="text-center w-full max-w-4xl">
            {/* Tarih ve Saat Bilgisi - Zamanlayıcı Modunda */}
            <div className="text-center mb-6">
              <div className="text-xl font-bold text-blue-300 mb-1">
                {dayName}
              </div>
              <div className="text-lg text-blue-200 mb-1">
                {dateString}
              </div>
              <div className="text-2xl font-bold text-white">
                {time}
              </div>
            </div>

            <div className="mb-12">
              <h4 className="text-4xl font-bold mb-8">{selectedSession.name}</h4>
              <div className={`text-8xl sm:text-9xl md:text-[12rem] lg:text-[14rem] font-bold mb-8 leading-none ${timeLeft <= 300 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                {formatTime(timeLeft)}
              </div>
              {timeLeft <= 300 && timeLeft > 0 && (
                <div className="text-red-400 text-2xl font-bold animate-bounce">
                  ⚠️ Son 5 dakika!
                </div>
              )}
              {timeLeft === 0 && (
                <div className="text-green-400">
                  <div className="text-6xl font-bold mb-4">🎉</div>
                  <div className="text-4xl font-bold mb-2">Başarılar!</div>
                  <div className="text-2xl">Deneme süreniz tamamlandı!</div>
                </div>
              )}
            </div>

            {timeLeft > 0 && (
              <div className="flex gap-4 justify-center">
                {!isRunning ? (
                  <button
                    onClick={resumeTimer}
                    className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-colors text-xl font-bold flex items-center gap-3"
                  >
                    ▶️ Devam
                  </button>
                ) : (
                  <button
                    onClick={pauseTimer}
                    className="px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl transition-colors text-xl font-bold flex items-center gap-3"
                  >
                    ⏸️ Duraklat
                  </button>
                )}
                
                <button
                  onClick={resetTimer}
                  className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white rounded-2xl transition-colors text-xl font-bold flex items-center gap-3"
                >
                  🔄 Sıfırla
                </button>
              </div>
            )}

            {timeLeft === 0 && (
              <div className="mt-8">
                <button
                  onClick={resetTimer}
                  className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl transition-colors text-xl font-bold flex items-center gap-3 mx-auto"
                >
                  🔄 Yeni Deneme Başlat
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-12">
          <button
            onClick={stopTimer}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 text-xl flex items-center gap-3 mx-auto"
          >
            ❌ Zamanlayıcıyı Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  useEffect(() => {
    // Firebase'den veri oku
    const loadData = async () => {
      try {
        const [studentsData, examsData] = await Promise.all([
          getStudents(),
          getExams()
        ]);

        setStudents(studentsData);
        setExams(examsData);
      } catch (error) {
        console.error('Ana sayfa veri okuma hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // İstatistikler
  const totalStudents = students.length;
  const totalExams = exams.length;
  const totalViews = students.reduce((sum, student) => sum + (student.viewCount || 0), 0);
  const activeStudents = students.filter(student => (student.viewCount || 0) > 0).length;
  const averageViews = totalStudents > 0 ? Math.round(totalViews / totalStudents) : 0;

  // Sınıf bazlı detaylı istatistikler
  const detailedClassStats = students.reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = {
        studentCount: 0,
        activeStudents: 0,
        totalViewCount: 0,
        totalExams: 0
      };
    }
    acc[student.class].studentCount++;
    acc[student.class].totalViewCount += student.viewCount || 0;
    if ((student.viewCount || 0) > 0) {
      acc[student.class].activeStudents++;
    }

    // Her sınıf için toplam deneme sayısı (basitleştirilmiş)
    acc[student.class].totalExams = Math.max(acc[student.class].totalExams, totalExams);

    return acc;
  }, {} as Record<string, {
    studentCount: number;
    activeStudents: number;
    totalViewCount: number;
    totalExams: number;
  }>);

  const totalClasses = Object.keys(detailedClassStats).length;

  // En aktif 10 öğrenci
  const topActiveStudents = students
    .filter(student => (student.viewCount || 0) > 0)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 10);

  // Renk paleti
  const colors = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600'
  ];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 font-sans relative overflow-hidden">
      {/* Dekoratif arka plan elemanları */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>

      <div className="relative z-10 max-w-7xl mx-auto py-8">
        {/* Başlık ve Logo */}
        <div className="text-center mb-8">
          <img
            src="/projelogo.png"
            alt="LGS Portalı"
            className="w-36 h-36 mx-auto mb-4 hover:scale-110 transition-transform duration-300 drop-shadow-xl"
          />
          <h1 className="text-xs sm:text-sm font-black tracking-tight text-center mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            LGS Portalı
          </h1>
          <p className="text-center text-xs text-gray-600 leading-relaxed max-w-lg mx-auto mb-6">
            Öğrenciler başarılarını takip edebilir, öğretmenler sınıf performanslarını anlık olarak görebilir.
          </p>


        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Toplam Öğrenci</p>
                <p className="text-xs font-bold">{totalStudents}</p>
              </div>
              <div className="text-xs">👥</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium">Toplam Sınıf</p>
                <p className="text-xs font-bold">{totalClasses}</p>
              </div>
              <div className="text-xs">🏫</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs font-medium">Toplam Deneme</p>
                <p className="text-xs font-bold">{totalExams}</p>
              </div>
              <div className="text-xs">📝</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs font-medium">Toplam Görüntülenme</p>
                <p className="text-xs font-bold">{totalViews.toLocaleString()}</p>
              </div>
              <div className="text-xs">👁️</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-xs font-medium">Aktif Öğrenci</p>
                <p className="text-xs font-bold">{activeStudents}</p>
              </div>
              <div className="text-xs">⚡</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-xs font-medium">Ort. Görüntülenme</p>
                <p className="text-xs font-bold">{averageViews}</p>
              </div>
              <div className="text-xs">📊</div>
            </div>
          </div>
        </div>

        {/* Sınıf Bazlı Detaylı İstatistikler */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-800 mb-4 text-center">Sınıf Bazlı Detaylı İstatistikler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(detailedClassStats).map(([className, stats], index) => (
              <div key={className} className={`bg-gradient-to-br ${colors[index % colors.length]} rounded-2xl p-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
                <div className="text-center">
                  <h3 className="text-xs font-bold mb-4">{className}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Öğrenci:</span>
                      <span className="font-bold">{stats.studentCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Aktif:</span>
                      <span className="font-bold">{stats.activeStudents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Deneme:</span>
                      <span className="font-bold">{stats.totalExams}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs opacity-90">Toplam Görüntülenme:</span>
                      <span className="font-bold">{stats.totalViewCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* En Aktif 10 Öğrenci */}
        {topActiveStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-800 mb-4 text-center">En Aktif 10 Öğrenci</h2>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold">Sıra</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Ad Soyad</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Sınıf</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Numara</th>
                      <th className="px-3 py-2 text-left text-xs font-bold">Görüntülenme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topActiveStudents.map((student, index) => (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white font-bold text-xs ${index === 0 ? 'bg-yellow-500' :
                              index === 1 ? 'bg-gray-400' :
                                index === 2 ? 'bg-orange-500' :
                                  'bg-blue-500'
                            }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{student.name}</td>
                        <td className="px-3 py-2 text-gray-600">{student.class}</td>
                        <td className="px-3 py-2 text-gray-600">{student.number}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.viewCount} görüntülenme
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



        {/* Giriş Butonları */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <Link href="/ogrenci">
            <button className="px-8 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-blue-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2">
              <span className="text-xs">🎓</span>
              <span>Öğrenci Girişi</span>
            </button>
          </Link>
          <Link href="/panel">
            <button className="px-8 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:scale-105 hover:shadow-emerald-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2">
              <span className="text-xs">📚</span>
              <span>Öğretmen Paneli</span>
            </button>
          </Link>

          {/* Deneme Zamanlayıcısı Butonu */}
          <button
            onClick={() => setIsTimerModalOpen(true)}
            className="px-6 py-2.5 rounded-2xl text-white text-xs font-bold shadow-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 hover:scale-105 hover:shadow-orange-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span className="text-xs">⏱️</span>
            <span>Deneme Zamanlayıcısı</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => {
                const modal = document.getElementById('contact-modal');
                if (modal) modal.classList.remove('hidden');
              }}
              className="px-8 py-3 rounded-2xl text-white text-xs font-bold shadow-2xl bg-gradient-to-r from-purple-500 via-pink-600 to-rose-600 hover:from-purple-600 hover:to-pink-700 hover:scale-105 hover:shadow-pink-500/50 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span className="text-xs">📧</span>
              <span>İletişim</span>
            </button>
            
            {/* İletişim Modal */}
            <div id="contact-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">📧</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Geliştiriciye Ulaşın</h3>
                  <p className="text-gray-600 text-sm">
                    Sorularınız, önerileriniz veya teknik destek için geliştiriciye ulaşabilirsiniz.
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-center">Geliştiriciye ulaşmak için aşağıdaki mail adresinden iletinizi gönderebilirsiniz:</h4>
                  <a 
                    href="mailto:uysal.mu07@gmail.com" 
                    className="block w-full text-center bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    uysal.mu07@gmail.com
                  </a>
                </div>
                
                <button 
                  onClick={() => {
                    const modal = document.getElementById('contact-modal');
                    if (modal) modal.classList.add('hidden');
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Deneme Zamanlayıcısı Modal */}
        <ExamTimerModal 
          isOpen={isTimerModalOpen} 
          onClose={() => setIsTimerModalOpen(false)} 
        />

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} LGS Portalı | Developed by Murat UYSAL
        </footer>
      </div>
    </main>
  );
}
