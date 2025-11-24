'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Student, Exam, Result,
  getStudentProgress, updateStudentProgress,
  generateAIMotivation, getAIMotivations,
  getStudentProfile, updateStudentProfile,
  getExams, getResults,
  getHeatMapData, getStudentHeatMapAnalysis,
  generateWeeklyReport, generateMonthlyReport,
  generateLeaderboard, getStudentRanking,
  SmartReport, Leaderboard
} from '../../firebase';

// Gelişmiş Charts
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StudentDashboardWithParams: React.FC = () => {
  const searchParams = useSearchParams();
  const studentId = searchParams?.get('studentId');

  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [motivations, setMotivations] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'motivation' | 'analytics' | 'reports'>('overview');

  // 🔥 HEATMAP STATE'LERİ
  const [selectedExamForHeatMap, setSelectedExamForHeatMap] = useState<string>('');
  const [heatMapData, setHeatMapData] = useState<any>(null);
  const [studentHeatMapAnalysis, setStudentHeatMapAnalysis] = useState<any>(null);
  const [heatMapLoading, setHeatMapLoading] = useState(false);

  // 📋 AKILLI RAPOR STATE'LERİ
  const [reports, setReports] = useState<SmartReport[]>([]);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [studentRanking, setStudentRanking] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const loadStudentData = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      // Temel verileri yükle
      const [examsData, resultsData] = await Promise.all([
        getExams(),
        getResults()
      ]);

      setExams(examsData);
      setResults(resultsData.filter(r => r.studentId === studentId));

      // Progress ve motivasyon verilerini yükle
      const progressData = await getStudentProgress(studentId);
      setProgress(progressData || createInitialProgress());

      const motivationData = await getAIMotivations(studentId);
      setMotivations(motivationData);

    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInitialProgress = () => ({
    studentId,
    totalPoints: 0,
    currentLevel: 1,
    levelProgress: 0,
    badges: [],
    achievements: [],
    studyStreak: 0,
    weeklyGoals: {
      targetNet: 70,
      achievedNet: 0,
      completed: false
    },
    motivationalMessages: [],
    lastUpdated: new Date()
  });

  // 🔥 HEATMAP VERİ YÜKLEME FONKSİYONLARI
  const loadHeatMapData = async (examId: string) => {
    if (!studentId || !examId) return;

    setHeatMapLoading(true);
    try {
      // HeatMap ana verilerini yükle
      const heatMapResult = await getHeatMapData(examId);
      setHeatMapData(heatMapResult);

      // Öğrenci özel analizini yükle
      const studentAnalysis = await getStudentHeatMapAnalysis(studentId, examId);
      setStudentHeatMapAnalysis(studentAnalysis);

    } catch (error) {
      console.error('HeatMap veri yükleme hatası:', error);
    } finally {
      setHeatMapLoading(false);
    }
  };

  // 📋 AKILLI RAPOR VERİ YÜKLEME FONKSİYONLARI
  const loadReportsData = async () => {
    if (!studentId) return;

    setReportsLoading(true);
    try {
      // Son hafta raporu
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      let weeklyReport;
      try {
        weeklyReport = await generateWeeklyReport(studentId, weekAgo.toISOString());
      } catch (error) {
        console.log('Haftalık rapor oluşturulamadı:', error);
      }

      // Bu ay raporu
      const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      let monthlyReport;
      try {
        monthlyReport = await generateMonthlyReport(studentId, thisMonth);
      } catch (error) {
        console.log('Aylık rapor oluşturulamadı:', error);
      }

      // Liderlik tablosu
      const leaderboardData = await generateLeaderboard('monthly');
      setLeaderboard(leaderboardData);

      // Öğrenci sıralaması
      const ranking = await getStudentRanking(studentId, 'monthly');
      setStudentRanking(ranking);

      // Raporları birleştir
      const allReports = [];
      if (weeklyReport) allReports.push(weeklyReport);
      if (monthlyReport) allReports.push(monthlyReport);
      setReports(allReports);

    } catch (error) {
      console.error('Rapor veri yükleme hatası:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  // Mock student data
  useEffect(() => {
    if (results.length > 0) {
      // Mock student - gerçek sistemde Firebase'den gelecek
      setStudent({
        id: studentId || '',
        name: 'Ahmet Yılmaz',
        class: '8-A',
        number: '123',
        viewCount: 15,
        lastViewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
  }, [results, studentId]);

  // 📋 REPORTS VERİ YÜKLEME  
  useEffect(() => {
    if (studentId && results.length > 0) {
      loadReportsData();
    }
  }, [studentId, results.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Öğrenci bulunamadı</p>
        </div>
      </div>
    );
  }

  const studentResults = results.filter(r => r.studentId === studentId);
  const latestResult = studentResults[studentResults.length - 1];
  const totalExams = studentResults.length;
  const averageNet = totalExams > 0
    ? studentResults.reduce((sum, r) => sum + (typeof r.nets.total === 'number' ? r.nets.total : 0), 0) / totalExams
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-4xl mr-4">🎓</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Hoşgeldin, {student.name}! 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  {student.class} • {totalExams} Deneme • Net Ort.: {averageNet.toFixed(1)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Seviye</p>
                <p className="text-2xl font-bold text-purple-600">{progress?.currentLevel || 1}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Puan</p>
                <p className="text-2xl font-bold text-blue-600">{progress?.totalPoints || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold text-green-600">{progress?.studyStreak || 0}🔥</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: '🏠 Genel Bakış', icon: '📊' },
              { id: 'progress', label: '📈 İlerleme', icon: '🎯' },
              { id: 'motivation', label: '🤖 Motivasyon', icon: '💪' },
              { id: 'analytics', label: '🔍 Analitik', icon: '📊' },
              { id: 'reports', label: '📋 Raporlar', icon: '📄' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'overview' && <OverviewTab
          student={student}
          progress={progress}
          results={studentResults}
          exams={exams}
          motivations={motivations}
        />}
        {activeTab === 'progress' && <ProgressTab
          progress={progress}
          results={studentResults}
          exams={exams}
        />}
        {activeTab === 'motivation' && <MotivationTab
          motivations={motivations}
          student={student}
          latestResult={latestResult}
        />}
        {activeTab === 'analytics' && <AnalyticsTab
          results={studentResults}
          exams={exams}
          studentId={studentId || ''}
          selectedExamForHeatMap={selectedExamForHeatMap}
          setSelectedExamForHeatMap={setSelectedExamForHeatMap}
          heatMapData={heatMapData}
          studentHeatMapAnalysis={studentHeatMapAnalysis}
          loadHeatMapData={loadHeatMapData}
          heatMapLoading={heatMapLoading}
        />}
        {activeTab === 'reports' && <ReportsTab
          studentId={studentId || ''}
          reports={reports}
          leaderboard={leaderboard}
          studentRanking={studentRanking}
          loadReportsData={loadReportsData}
          loading={reportsLoading}
        />}
      </div>
    </div>
  );
};

// 📊 GENEL BAKIŞ TAB
const OverviewTab: React.FC<{
  student: any;
  progress: any;
  results: Result[];
  exams: Exam[];
  motivations: any[];
}> = ({ student, progress, results, exams, motivations }) => {
  // Sonuçları zaman sırasına göre sırala
  const sortedResults = [...results].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const chartData = sortedResults.map((result, index) => ({
    name: `Deneme ${index + 1}`,
    net: result.nets.total,
    date: new Date(result.createdAt).toLocaleDateString('tr-TR')
  }));

  const latestScore = results[results.length - 1]?.nets.total || 0;
  const target = progress?.weeklyGoals?.targetNet || 70;
  const progressPercent = Math.min((latestScore / target) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Hızlı İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Son Net</p>
              <p className="text-3xl font-bold">{latestScore.toFixed(1)}</p>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Toplam Deneme</p>
              <p className="text-3xl font-bold">{results.length}</p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Hedef İlerlemesi</p>
              <p className="text-3xl font-bold">%{progressPercent.toFixed(0)}</p>
            </div>
            <div className="text-4xl">🚀</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Mevcut Seviye</p>
              <p className="text-3xl font-bold">{progress?.currentLevel || 1}</p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
        </div>
      </div>

      {/* Trend Grafiği */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 Net Trendi</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip
                labelFormatter={(label, payload) =>
                  `${label}: ${(payload?.[0]?.value as number || 0).toFixed(1)} net`
                }
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorNet)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Motivasyonel Mesaj */}
      {motivations.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-start space-x-4">
            <div className="text-3xl">🤖</div>
            <div>
              <h3 className="text-xl font-bold mb-2">AI Motivasyon</h3>
              <p className="text-lg">{motivations[0].analysis.motivationText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 🎯 İLERLEME TAB
const ProgressTab: React.FC<{
  progress: any;
  results: Result[];
  exams: Exam[];
}> = ({ progress, results, exams }) => {
  const levelProgress = progress?.levelProgress || 0;
  const nextLevelPoints = 1000 * (progress?.currentLevel || 1);
  const currentPoints = progress?.totalPoints || 0;

  return (
    <div className="space-y-6">
      {/* Seviye İlerlemesi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🏆 Seviye İlerlemesi</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Seviye {progress?.currentLevel || 1}</span>
            <span className="text-lg text-gray-600">{currentPoints} / {nextLevelPoints} puan</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(levelProgress, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            {nextLevelPoints - currentPoints} puan daha kazanarak Seviye {(progress?.currentLevel || 1) + 1}'e geçebilirsin!
          </p>
        </div>
      </div>

      {/* Rozetler */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🎖️ Rozetler</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'İlk Adım', desc: 'İlk denemen', icon: '🌟', earned: results.length > 0 },
            { name: 'Sabırlı', desc: '10 deneme', icon: '🏃‍♂️', earned: results.length >= 10 },
            { name: 'Matematik Ustası', desc: 'Matematik 10+', icon: '🧮', earned: results.some(r => r.nets.matematik >= 10) },
            { name: 'Türkçe Şampiyonu', desc: 'Türkçe 10+', icon: '📚', earned: results.some(r => r.nets.turkce >= 10) }
          ].map((badge, index) => (
            <div key={index} className={`text-center p-4 rounded-lg border-2 ${badge.earned ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'
              }`}>
              <div className="text-3xl mb-2">{badge.icon}</div>
              <h4 className={`font-semibold ${badge.earned ? 'text-yellow-700' : 'text-gray-500'}`}>
                {badge.name}
              </h4>
              <p className={`text-sm ${badge.earned ? 'text-yellow-600' : 'text-gray-400'}`}>
                {badge.desc}
              </p>
              {badge.earned && <div className="text-yellow-500 mt-2">✅</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Hedefler */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">🎯 Haftalık Hedefler</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Hedef Net: {progress?.weeklyGoals?.targetNet || 70}</span>
            <span>Gerçekleşen: {progress?.weeklyGoals?.achievedNet || 0}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  ((progress?.weeklyGoals?.achievedNet || 0) / (progress?.weeklyGoals?.targetNet || 70)) * 100,
                  100
                )}%`
              }}
            ></div>
          </div>
          <p className={`text-sm ${(progress?.weeklyGoals?.achievedNet || 0) >= (progress?.weeklyGoals?.targetNet || 70) ? 'text-green-600' : 'text-orange-600'}`}>
            {(progress?.weeklyGoals?.achievedNet || 0) >= (progress?.weeklyGoals?.targetNet || 70)
              ? '🎉 Hedef aşıldı! Harika!'
              : `${((progress?.weeklyGoals?.targetNet || 70) - (progress?.weeklyGoals?.achievedNet || 0)).toFixed(1)} net daha!`}
          </p>
        </div>
      </div>
    </div>
  );
};

// 💪 MOTİVASYON TAB
const MotivationTab: React.FC<{
  motivations: any[];
  student: any;
  latestResult: any;
}> = ({ motivations, student, latestResult }) => {
  return (
    <div className="space-y-6">
      {/* AI Motivasyon Ana Kartı */}
      {latestResult && (
        <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 rounded-lg p-8 text-white">
          <div className="flex items-start space-x-6">
            <div className="text-6xl">🤖</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3">AI Motivasyon Sistemi</h3>
              <p className="text-lg mb-4">
                {motivations[0]?.analysis.motivationText || "Devam et, başarıya çok yakınsın! 🚀"}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-sm opacity-90">Tahmin Edilen Puan</p>
                  <p className="text-2xl font-bold">{motivations[0]?.analysis.predictedScore || '70+'} net</p>
                </div>
                <div className="bg-white/20 rounded-lg p-3">
                  <p className="text-sm opacity-90">İyileşme Potansiyeli</p>
                  <p className="text-2xl font-bold">+{motivations[0]?.analysis.improvementPotential || 15} net</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Güçlü Yönler */}
      {motivations[0]?.analysis.strengths && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
            <span className="mr-2">💪</span> Güçlü Yönlerin
          </h3>
          <ul className="space-y-2">
            {motivations[0].analysis.strengths.map((strength: string, index: number) => (
              <li key={index} className="text-green-700 flex items-center">
                <span className="mr-2">✅</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Geliştirme Alanları */}
      {motivations[0]?.analysis.recommendations && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
            <span className="mr-2">📈</span> Geliştirme Önerilerin
          </h3>
          <ul className="space-y-2">
            {motivations[0].analysis.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-yellow-700 flex items-center">
                <span className="mr-2">💡</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Zaman Yönetimi İpuçları */}
      {motivations[0]?.analysis.timeManagementTips && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <span className="mr-2">⏰</span> Zaman Yönetimi İpuçları
          </h3>
          <ul className="space-y-2">
            {motivations[0].analysis.timeManagementTips.map((tip: string, index: number) => (
              <li key={index} className="text-blue-700 flex items-center">
                <span className="mr-2">🕐</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Çalışma Planı */}
      {motivations[0]?.analysis.studyPlan && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
            <span className="mr-2">📋</span> Kişisel Çalışma Planın
          </h3>
          <div className="space-y-3">
            {motivations[0].analysis.studyPlan.map((task: any, index: number) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${task.priority === 'high' ? 'bg-red-100 border border-red-200' :
                  task.priority === 'medium' ? 'bg-yellow-100 border border-yellow-200' :
                    'bg-gray-100 border border-gray-200'
                }`}>
                <div>
                  <p className="font-medium text-purple-800">{task.subject}</p>
                  <p className="text-sm text-purple-600">{task.task}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-600">{task.estimatedTime} dk</p>
                  <span className={`px-2 py-1 rounded text-xs ${task.priority === 'high' ? 'bg-red-200 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-gray-200 text-gray-800'
                    }`}>
                    {task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 🔍 ANALİTİK TAB
const AnalyticsTab: React.FC<{
  results: Result[];
  exams: Exam[];
  studentId: string;
  selectedExamForHeatMap: string;
  setSelectedExamForHeatMap: (examId: string) => void;
  heatMapData: any;
  studentHeatMapAnalysis: any;
  loadHeatMapData: (examId: string) => void;
  heatMapLoading: boolean;
}> = ({
  results,
  exams,
  studentId,
  selectedExamForHeatMap,
  setSelectedExamForHeatMap,
  heatMapData,
  studentHeatMapAnalysis,
  loadHeatMapData,
  heatMapLoading
}) => {
    // Ders bazlı analiz
    const subjectAnalysis = results.reduce((acc, result) => {
      Object.keys(result.nets).forEach(subject => {
        if (subject !== 'total') {
          if (!acc[subject]) {
            acc[subject] = { total: 0, count: 0, scores: [] };
          }
          acc[subject].total += result.nets[subject];
          acc[subject].count += 1;
          acc[subject].scores.push(result.nets[subject]);
        }
      });
      return acc;
    }, {} as any);

    const subjectData = Object.keys(subjectAnalysis).map(subject => ({
      subject,
      average: subjectAnalysis[subject].total / subjectAnalysis[subject].count,
      max: Math.max(...subjectAnalysis[subject].scores),
      min: Math.min(...subjectAnalysis[subject].scores)
    }));

    // Pie chart için veri
    const pieData = subjectData.map(item => ({
      name: item.subject,
      value: item.average,
      fill: getRandomColor()
    }));

    // Gelişmiş AI Analiz verilerini hazırla
    const latestResult = results[results.length - 1];
    const aiAnalysis = latestResult ? {
      successProbability: 75,
      classPosition: 'üst %20',
      nextMonthPrediction: 58,
      riskFactors: ['Matematik skorunda dalgalanma'],
      improvementAreas: ['Fen Bilimleri', 'Türkçe'],
      strengths: ['Sosyal Bilimler performansı', 'İstikrarlı çalışma'],
    } : null;

    return (
      <div className="space-y-6">
        {/* 🤖 AI ANALİZ ÖZETİ */}
        {aiAnalysis && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <span className="mr-3">🤖</span>
              AI Analiz Özeti
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-3xl font-bold">{aiAnalysis.successProbability}%</div>
                <div className="text-sm opacity-90">Başarı Olasılığı</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-3xl font-bold">{aiAnalysis.nextMonthPrediction}</div>
                <div className="text-sm opacity-90">Gelecek Ay Tahmini</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <div className="text-3xl font-bold">{aiAnalysis.classPosition}</div>
                <div className="text-sm opacity-90">Sınıf Pozisyonu</div>
              </div>
            </div>
          </div>
        )}

        {/* 📊 Ders Bazlı Performans */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Ders Bazlı Performans</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium mb-3">Ortalama Net Puanları</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-lg font-medium mb-3">Net Dağılımı</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performans Tablosu */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800">📋 Detaylı Analiz</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ortalama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">En Yüksek</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">En Düşük</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Değişkenlik</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjectData.map((item, index) => {
                  const variance = item.max - item.min;
                  const stability = variance <= 3 ? 'Stabil' : variance <= 6 ? 'Orta' : 'Değişken';
                  const stabilityColor = variance <= 3 ? 'text-green-600' : variance <= 6 ? 'text-yellow-600' : 'text-red-600';

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {item.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {item.average.toFixed(1)} net
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-600">
                        {item.max.toFixed(1)} net
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-red-600">
                        {item.min.toFixed(1)} net
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stabilityColor} bg-opacity-20`}>
                          {stability}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🤖 GELİŞMİŞ AI ANALİZ BÖLÜMÜ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Güçlü Yönler ve Zayıflıklar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">💪</span>
              AI Güçlü & Zayıf Yönler
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2">Güçlü Yönlerin</h4>
                <ul className="space-y-1">
                  <li className="text-sm text-green-600 flex items-center">
                    <span className="mr-2">✅</span>
                    Sosyal Bilimler'de yüksek performans
                  </li>
                  <li className="text-sm text-green-600 flex items-center">
                    <span className="mr-2">✅</span>
                    İstikrarlı çalışma serisi
                  </li>
                  <li className="text-sm text-green-600 flex items-center">
                    <span className="mr-2">✅</span>
                    Hızlı öğrenme yeteneği
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-orange-700 mb-2">Geliştirme Alanların</h4>
                <ul className="space-y-1">
                  <li className="text-sm text-orange-600 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Matematik'de dalgalanma
                  </li>
                  <li className="text-sm text-orange-600 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Fen Bilimleri pratik eksiği
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* AI Başarı Tahmini */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">🔮</span>
              AI Başarı Tahmini
            </h3>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">75%</div>
                <div className="text-sm text-gray-600">Başarı Olasılığı</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-blue-600">58</div>
                  <div className="text-xs text-gray-500">Gelecek Ay Tahmini</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">+3</div>
                  <div className="text-xs text-gray-500">Haftalık Artış</div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Tahmin Faktörleri:</strong> Pozitif trend, istikrarlı performans, güçlü konular
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 Kişiselleştirilmiş Öneriler */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            AI Kişiselleştirilmiş Öneriler
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">📚 Çalışma Planı</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Matematik: 60 dk/gün</li>
                <li>• Fen: 45 dk/gün</li>
                <li>• Türkçe: 30 dk/gün</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">⏰ Zaman Yönetimi</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• 25 dk çalış, 5 dk mola</li>
                <li>• Sabahları zor konular</li>
                <li>• Akşamları tekrar</li>
              </ul>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-2">🎯 Hedefler</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Bu hafta: 70 net</li>
                <li>• Bu ay: 75 net</li>
                <li>• LGS: 80+ net</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 🔥 HEATMAP PERFORMANS MATRİSİ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <span className="mr-2">🔥</span>
            HeatMap Performans Matrisi
          </h3>

          {/* Sınav Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analiz edilecek sınavı seçin:
            </label>
            <select
              value={selectedExamForHeatMap}
              onChange={(e) => {
                setSelectedExamForHeatMap(e.target.value);
                if (e.target.value) {
                  loadHeatMapData(e.target.value);
                }
              }}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sınav seçin...</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} - {new Date(exam.date).toLocaleDateString('tr-TR')}
                </option>
              ))}
            </select>
          </div>

          {heatMapLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">HeatMap verileri hesaplanıyor...</span>
            </div>
          )}

          {heatMapData && !heatMapLoading && (
            <div className="space-y-6">
              {/* HeatMap Özeti */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{heatMapData.totalQuestions}</div>
                    <div className="text-sm text-gray-600">Toplam Soru</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{heatMapData.averageSuccessRate}%</div>
                    <div className="text-sm text-gray-600">Ortalama Başarı</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{Math.round(heatMapData.overallDifficulty * 100)}%</div>
                    <div className="text-sm text-gray-600">Zorluk Seviyesi</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{Object.keys(heatMapData.subjectAnalysis).length}</div>
                    <div className="text-sm text-gray-600">Ders Sayısı</div>
                  </div>
                </div>
              </div>

              {/* HeatMap Grid */}
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  <div className="grid grid-cols-10 gap-1 text-xs">
                    {heatMapData.heatMapData.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="aspect-square rounded flex items-center justify-center text-white font-medium cursor-pointer hover:scale-110 transition-transform relative"
                        style={{ backgroundColor: item.colorCode }}
                        title={`Soru ${item.questionNumber}: ${item.subject} - ${item.successRate}% başarı`}
                      >
                        <span className="text-xs">{item.questionNumber}</span>

                        {/* Trend göstergesi */}
                        {item.trend === 'up' && (
                          <div className="absolute top-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-white"></div>
                        )}
                        {item.trend === 'down' && (
                          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-t-[6px] border-t-white"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* HeatMap Renk Açıklaması */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Renk Kodlaması:</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#22c55e' }}></div>
                    <span>Kolay (80%+)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#eab308' }}></div>
                    <span>Orta (60-79%)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#f97316' }}></div>
                    <span>Zor (40-59%)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#ef4444' }}></div>
                    <span>Çok Zor (&lt;40%)</span>
                  </div>
                </div>
              </div>

              {/* En Zor ve En Kolay Sorular */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center">
                    <span className="mr-2">🔴</span>
                    En Zor Sorular
                  </h4>
                  <div className="space-y-2">
                    {heatMapData.hardestQuestions.slice(0, 5).map((question: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{question.subject} - Soru {question.questionNumber}</span>
                        <span className="text-red-600 font-medium">{question.successRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center">
                    <span className="mr-2">🟢</span>
                    En Kolay Sorular
                  </h4>
                  <div className="space-y-2">
                    {heatMapData.easiestQuestions.slice(0, 5).map((question: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>{question.subject} - Soru {question.questionNumber}</span>
                        <span className="text-green-600 font-medium">{question.successRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ders Bazlı Analiz */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">Ders Bazlı Performans</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(heatMapData.subjectAnalysis).map(([subject, rate]: [string, any]) => (
                    <div key={subject} className="bg-white rounded p-3 text-center">
                      <div className="font-medium text-gray-800">{subject}</div>
                      <div className="text-lg font-bold text-blue-600">{rate}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Öğrenci Özel Analiz */}
              {studentHeatMapAnalysis && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                    <span className="mr-2">👤</span>
                    Sizin Performansınız
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-purple-700 mb-2">İyileştirme Alanları:</h5>
                      <ul className="text-sm text-purple-600 space-y-1">
                        {studentHeatMapAnalysis.improvementAreas.slice(0, 3).map((area: string, index: number) => (
                          <li key={index}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-purple-700 mb-2">Güçlü Yönler:</h5>
                      <ul className="text-sm text-purple-600 space-y-1">
                        {studentHeatMapAnalysis.strengths.slice(0, 3).map((strength: string, index: number) => (
                          <li key={index}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

// Utility fonksiyon - random renk üretici
const getRandomColor = () => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 📋 RAPORLAR TAB
const ReportsTab: React.FC<{
  studentId: string;
  reports: any[];
  leaderboard: any;
  studentRanking: any;
  loadReportsData: () => void;
  loading: boolean;
}> = ({ studentId, reports, leaderboard, studentRanking, loadReportsData, loading }) => {

  useEffect(() => {
    if (studentId) {
      loadReportsData();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Raporlar hazırlanıyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 Genel Özet */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-3">📋</span>
          Akıllı Rapor Özeti
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{reports.length}</div>
            <div className="text-sm opacity-90">Toplam Rapor</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{studentRanking?.rank || 'N/A'}</div>
            <div className="text-sm opacity-90">Sınıf Sıralaması</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{studentRanking?.percentile || 0}%</div>
            <div className="text-sm opacity-90">Yüzdelik Dilim</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold">{studentRanking?.change > 0 ? '+' : ''}{studentRanking?.change || 0}</div>
            <div className="text-sm opacity-90">Pozisyon Değişimi</div>
          </div>
        </div>
      </div>

      {/* 📈 Raporlar Listesi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📄</span>
          Oluşturulan Raporlar
        </h3>
        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">{report.title}</h4>
                    <p className="text-sm text-gray-600">{report.type} raporu</p>
                    <div className="mt-2 flex space-x-4 text-sm">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Ortalama: {report.summary.averageScore}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        İyileşme: %{report.summary.improvementRate}
                      </span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Seviye: {report.summary.progressLevel}
                      </span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                    PDF İndir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Henüz rapor oluşturulmamış.</p>
            <p className="text-sm">Raporlar otomatik olarak oluşturulacak.</p>
          </div>
        )}
      </div>

      {/* 🏆 Liderlik Tablosu */}
      {leaderboard && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Aylık Liderlik Tablosu
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Sıra</th>
                  <th className="text-left py-2">Öğrenci</th>
                  <th className="text-left py-2">Sınıf</th>
                  <th className="text-left py-2">Puan</th>
                  <th className="text-left py-2">Değişim</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.students.slice(0, 10).map((student: any, index: number) => (
                  <tr key={student.studentId} className={`border-b ${student.studentId === studentId ? 'bg-blue-50' : ''}`}>
                    <td className="py-2 font-medium">
                      {student.rank <= 3 ? '🥇🥈🥉'[student.rank - 1] : student.rank}
                    </td>
                    <td className="py-2">{student.name}</td>
                    <td className="py-2">{student.class}</td>
                    <td className="py-2 font-medium">{student.score}</td>
                    <td className={`py-2 ${student.change > 0 ? 'text-green-600' : student.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {student.change > 0 ? '+' : ''}{student.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📊 Ders Bazlı Analiz */}
      {reports.length > 0 && reports[0].details?.subjectAnalysis && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Ders Bazlı Performans
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports[0].details.subjectAnalysis.map((subject: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">{subject.subject}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Ortalama:</span>
                    <span className="font-medium">{subject.averageScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>İyileşme:</span>
                    <span className={`font-medium ${subject.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {subject.improvement >= 0 ? '+' : ''}{subject.improvement}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trend:</span>
                    <span className="font-medium">
                      {subject.trend === 'up' ? '📈 Artış' :
                        subject.trend === 'down' ? '📉 Azalış' : '➡️ Stabil'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 Hedefler ve Başarılar */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <span className="mr-2">🏅</span>
              Başarılar
            </h3>
            <ul className="space-y-2">
              {reports[0].details?.achievements?.map((achievement: string, index: number) => (
                <li key={index} className="text-green-700 flex items-center">
                  <span className="mr-2">✅</span>
                  {achievement}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">🎯</span>
              Sonraki Hedefler
            </h3>
            <ul className="space-y-2">
              {reports[0].details?.nextGoals?.map((goal: string, index: number) => (
                <li key={index} className="text-blue-700 flex items-center">
                  <span className="mr-2">🎯</span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <StudentDashboardWithParams />
    </Suspense>
  );
}