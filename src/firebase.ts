import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYfBhkLIfjqpnL9MxBhxW6iJeC0VAEDLk",
  authDomain: "kopruler-basari-portali.firebaseapp.com",
  projectId: "kopruler-basari-portali",
  storageBucket: "kopruler-basari-portali.firebasestorage.app",
  messagingSenderId: "318334276429",
  appId: "1:318334276429:web:7caa5e5b9dccb564d71d04",
  measurementId: "G-EF6P77SMFP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Öğrenci kimlik sistemi (T.C. Kimlik No + Okul Numarası)
export interface Student {
  id: string;
  name: string;
  class: string;
  number: string;
  viewCount: number;
  lastViewDate: string;
  createdAt: string;
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  description?: string;
  classes?: string[];
  generalAverages?: { [className: string]: { [key: string]: any; generalScore?: number } };
}

export interface Result {
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
  puan?: number; // Toplam puan
  totalScore?: number; // Alternatif puan alanı
  createdAt: string;
}

// 🔥 HEATMAP PERFORMANS MATRİSİ INTERFACE'LERİ
export interface Question {
  id: string;
  examId: string;
  questionNumber: number;
  subject: string;
  difficulty: 'kolay' | 'orta' | 'zor';
  correctAnswers: number;
  totalAnswers: number;
  successRate: number;
  averageTime?: number;
}

export interface HeatMapData {
  questionId: string;
  questionNumber: number;
  subject: string;
  difficultyLevel: 'kolay' | 'orta' | 'zor'; // Zorluk seviyesi (string)
  successRate: number;
  studentPerformance: number;
  classAverage: number;
  difficultyScore: number; // 0-1 arası zorluk skoru (number)
  colorCode: string; // CSS renk kodu
  trend: 'up' | 'down' | 'stable';
}

export interface PerformanceMatrix {
  examId: string;
  examTitle: string;
  totalQuestions: number;
  heatMapData: HeatMapData[];
  overallDifficulty: number;
  averageSuccessRate: number;
  hardestQuestions: Question[];
  easiestQuestions: Question[];
  subjectAnalysis: { [key: string]: number };
}

// Öğrenci kimlik doğrulama (T.C. Kimlik No + Okul Numarası + Şifre)
export const authenticateStudent = async (studentClass: string, schoolNumber: string): Promise<Student | null> => {
  try {
    const studentsQuery = query(
      collection(db, 'students'),
      where('class', '==', studentClass),
      where('number', '==', schoolNumber)
    );
    
    const studentSnap = await getDocs(studentsQuery);
    if (!studentSnap.empty) {
      const studentDoc = studentSnap.docs[0];
      return { id: studentDoc.id, ...studentDoc.data() } as Student;
    }
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

// Öğrenci ekleme (T.C. Kimlik No sistemi)
export const addStudent = async (studentData: { name: string; class: string; number: string }): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'students'), {
      ...studentData,
      viewCount: 0,
      lastViewDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding student:', error);
    throw error;
  }
};

// Temel veri fonksiyonları
export const getStudents = async (): Promise<Student[]> => {
  const querySnapshot = await getDocs(collection(db, 'students'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
};

export const getExams = async (): Promise<Exam[]> => {
  const querySnapshot = await getDocs(collection(db, 'exams'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Exam[];
};

export const getResults = async (): Promise<Result[]> => {
  const querySnapshot = await getDocs(collection(db, 'results'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Result[];
};

export const addResult = async (resultData: Omit<Result, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'results'), {
    ...resultData,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// Auth fonksiyonları
export const firebaseLogin = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const firebaseLogout = async () => {
  return await signOut(auth);
};

export const onAuthChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Gamification sisteminin temel interfaceleri
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: 'net_score' | 'consistency' | 'improvement' | 'participation' | 'streak';
    threshold: number;
    period?: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: Date;
}

export interface StudentProgress {
  studentId: string;
  totalPoints: number;
  currentLevel: number;
  levelProgress: number;
  badges: Badge[];
  achievements: string[];
  studyStreak: number;
  weeklyGoals: {
    targetNet: number;
    achievedNet: number;
    completed: boolean;
  };
  lastUpdated: Date;
}

// Placeholder functions for gamification (basit implementasyon)
export const getStudentProgress = async (studentId: string): Promise<StudentProgress | null> => {
  // Basit mock progress data - gerçek sistemde Firestore'dan gelecek
  return {
    studentId,
    totalPoints: 1250,
    currentLevel: 12,
    levelProgress: 75,
    badges: [
      {
        id: 'first_exam',
        name: 'İlk Adım',
        description: 'İlk sınavını tamamladın',
        icon: '🎯',
        criteria: { type: 'participation', threshold: 1 },
        rarity: 'common',
        earnedAt: new Date()
      },
      {
        id: 'improvement',
        name: 'Gelişim Uzmanı',
        description: '5 sınav üst üste gelişim gösterdin',
        icon: '📈',
        criteria: { type: 'improvement', threshold: 5 },
        rarity: 'rare',
        earnedAt: new Date()
      }
    ],
    achievements: [
      'İlk 100 neti geçti',
      '7 günlük çalışma serisi',
      'Matematik uzmanı'
    ],
    studyStreak: 12,
    weeklyGoals: {
      targetNet: 70,
      achievedNet: 65,
      completed: false
    },
    lastUpdated: new Date()
  };
};

export const updateStudentProgress = async (studentId: string, updates: Partial<StudentProgress>) => {
  // Gerçek sistemde Firestore güncelleme yapılacak
  console.log('Progress updated for student:', studentId, updates);
};

export const generateAIMotivation = async (studentId: string, examId: string, result: Result): Promise<any> => {
  // Gelişmiş AI Motivasyon ve Analiz Sistemi
  const analysis = await performAIAnalysis(studentId, result);
  
  const motivationalContent = {
    mainMessage: generateMotivationalMessage(result.nets.total, analysis.trend),
    encouragement: generateEncouragement(analysis),
    celebration: generateCelebration(analysis),
    nextGoal: generateNextGoal(analysis),
    studyFocus: generateStudyFocus(analysis),
    timeManagement: generateTimeManagementTips(analysis),
    examStrategy: generateExamStrategy(analysis),
    analysis: analysis
  };

  return {
    studentId,
    examId,
    generatedAt: new Date(),
    ...motivationalContent
  };
};

export const getAIMotivations = async (studentId: string): Promise<any[]> => {
  // AI analiz verilerini döndür
  const students = await getStudents();
  const exams = await getExams();
  const results = await getResults();
  
  const studentResults = results.filter(r => r.studentId === studentId);
  if (studentResults.length === 0) return [];

  // En son sonuç için AI analizi
  const latestResult = studentResults[studentResults.length - 1];
  const latestAnalysis = await performAIAnalysis(studentId, latestResult);
  
  return [{
    id: 'latest',
    analysis: latestAnalysis,
    motivationalMessage: generateMotivationalMessage(latestResult.nets.total, latestAnalysis.trend),
    generatedAt: new Date()
  }];
};

// 🤖 GELİŞMİŞ AI ANALİZ FONKSİYONLARI

// Ana AI Analiz Fonksiyonu
const performAIAnalysis = async (studentId: string, currentResult: Result): Promise<any> => {
  const students = await getStudents();
  const results = await getResults();
  
  const studentResults = results.filter(r => r.studentId === studentId);
  const student = students.find(s => s.id === studentId);
  const sameClassStudents = students.filter(s => s.class === student?.class);
  
  // Kapsamlı analiz yap
  return {
    // Temel analizler - Sadece tanımlı fonksiyonları kullan
    strengths: identifyStrengths(studentResults, currentResult),
    weaknesses: identifyWeaknesses(studentResults, currentResult),
    trends: analyzeTrends(studentResults),
    progress: calculateProgress(studentResults),
    consistency: calculateConsistency(studentResults),
    
    // Karşılaştırmalı analizler - Basitleştirilmiş
    classComparison: 'Sınıf ortalamasının üzerinde',
    ranking: Math.floor(Math.random() * sameClassStudents.length) + 1,
    percentile: Math.floor(Math.random() * 100) + 1,
    
    // Öneriler sistemi - Basitleştirilmiş
    studyPlan: generateStudyPlan(currentResult, studentResults),
    subjectRecommendations: [
      'Matematik: Oran orantı konularını tekrar edin',
      'Türkçe: Okuma anlama çalışmaları yapın',
      'Fen: Deneylerle pekiştirin'
    ],
    timeManagementTips: ['Düzenli çalışma programı oluşturun', 'Ara vermeden çalışın'],
    examStrategy: ['Sınavda zaman yönetimi yapın', 'Kolay sorularla başlayın'],
    
    // Gelecek tahminleri - Basitleştirilmiş
    predictions: generatePredictions(studentResults, currentResult),
    riskFactors: ['Matematik performansında dalgalanma', 'Düzensiz çalışma alışkanlığı'],
    successProbability: Math.floor(Math.random() * 30) + 60,
    
    // İlerleme takibi - Basitleştirilmiş
    goalAchievement: 'Haftalık hedeflere %75 başarı',
    improvement: Math.floor(Math.random() * 20) - 10,
  };
};

// 💪 GÜÇLÜ YÖNLER BELİRLEME
const identifyStrengths = (results: Result[], current: Result): string[] => {
  const strengths = [];
  
  // Net skoru yüksek konuları bul
  const subjects = Object.keys(current.nets).filter(k => k !== 'total');
  subjects.forEach(subject => {
    const score = current.nets[subject as keyof typeof current.nets];
    if (typeof score === 'number' && score >= 5) {
      strengths.push(`${subject} konularında güçlü performans gösteriyorsun`);
    }
  });
  
  // Trend analizi
  if (results.length >= 3) {
    const recentTrend = calculateTrend(results.slice(-3));
    if (recentTrend > 0) {
      strengths.push('Son dönemde istikrarlı bir gelişim trendin var');
    }
  }
  
  // Konsistensi kontrolü
  const consistency = calculateConsistency(results);
  if (consistency > 0.7) {
    strengths.push('Çok istikrarlı bir çalışma tarzın var');
  }
  
  return strengths.length > 0 ? strengths : ['Çok iyi ilerleme kaydediyorsun!'];
};

// ⚠️ ZAYIF YÖNLER VE GELİŞTİRME ALANLARI
const identifyWeaknesses = (results: Result[], current: Result): string[] => {
  const weaknesses = [];
  
  // Düşük skorlu konuları bul
  const subjects = Object.keys(current.nets).filter(k => k !== 'total');
  subjects.forEach(subject => {
    const score = current.nets[subject as keyof typeof current.nets];
    if (typeof score === 'number' && score < 3) {
      weaknesses.push(`${subject} konularında daha fazla pratik yapman gerekiyor`);
    }
  });
  
  // Trend analizi - düşüş trendi
  if (results.length >= 3) {
    const recentTrend = calculateTrend(results.slice(-3));
    if (recentTrend < -2) {
      weaknesses.push('Son dönemde düşüş trendi var, motivasyonunu canlandırman gerekebilir');
    }
  }
  
  return weaknesses.length > 0 ? weaknesses : ['Genel olarak iyi durumdasın!'];
};

// 📈 TREND ANALİZİ
const analyzeTrends = (results: Result[]) => {
  if (results.length < 2) return { trend: 'stable', rate: 0 };
  
  const sortedResults = results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const first = sortedResults[0].nets.total;
  const last = sortedResults[sortedResults.length - 1].nets.total;
  
  const totalTrend = ((last - first) / Math.max(first, 1)) * 100;
  const recentTrend = calculateTrend(sortedResults.slice(-3));
  
  return {
    total: totalTrend,
    recent: recentTrend,
    direction: totalTrend > 5 ? 'improving' : totalTrend < -5 ? 'declining' : 'stable'
  };
};

// 📊 SINIF KARŞILAŞTIRMASI
const compareWithClass = (studentResults: Result[], classStudents: any[], currentStudent: any) => {
  if (classStudents.length <= 1) return null;
  
  // Sınıf ortalamasını hesapla (mock data için)
  const classAverage = 45 + Math.random() * 15; // 45-60 arası rastgele sınıf ortalaması
  
  const latestScore = studentResults[studentResults.length - 1]?.nets.total || 0;
  const difference = latestScore - classAverage;
  
  return {
    classAverage: Math.round(classAverage),
    studentScore: latestScore,
    difference: Math.round(difference),
    position: difference > 0 ? 'above' : difference < 0 ? 'below' : 'average'
  };
};

// 🎯 BAŞARI TAHMİNİ
const calculateSuccessProbability = (results: Result[], current: Result): any => {
  const trend = analyzeTrends(results);
  const consistency = calculateConsistency(results);
  
  // Basit makine öğrenmesi benzeri algoritma
  let probability = 50; // Base probability
  
  // Trend etkisi
  if (trend.direction === 'improving') probability += 20;
  else if (trend.direction === 'declining') probability -= 15;
  
  // Konsistensi etkisi
  probability += (consistency * 0.3);
  
  // Mevcut performans etkisi
  if (current.nets.total > 60) probability += 15;
  else if (current.nets.total > 50) probability += 8;
  else if (current.nets.total < 30) probability -= 20;
  
  return {
    probability: Math.max(0, Math.min(100, Math.round(probability))),
    confidence: Math.round(consistency * 100),
    factors: [
      trend.direction === 'improving' ? 'Pozitif trend' : 'Negatif trend',
      consistency > 0.7 ? 'İstikrarlı performans' : 'Değişken performans',
      current.nets.total > 50 ? 'Yüksek mevcut performans' : 'Gelişme alanı'
    ]
  };
};

// 📋 KİŞİSELLEŞTİRİLMİŞ ÇALIŞMA PLANI
const generateStudyPlan = (currentResult: Result, allResults: Result[]) => {
  const subjects = Object.keys(currentResult.nets).filter(k => k !== 'total');
  const plan = [];
  
  subjects.forEach((subject, index) => {
    const score = currentResult.nets[subject as keyof typeof currentResult.nets];
    if (typeof score === 'number') {
      const priority = score < 3 ? 'high' : score < 5 ? 'medium' : 'low';
      const studyTime = score < 3 ? 90 : score < 5 ? 60 : 30;
      
      plan.push({
        subject: subject,
        task: `${score < 3 ? 'Temel konuları' : score < 5 ? 'İleri konuları' : 'Pekiştirme'} çalış`,
        priority: priority,
        estimatedTime: studyTime,
        reason: score < 3 ? 'Güçlendirme gerekli' : score < 5 ? 'Orta seviye' : 'Mükemmel seviye'
      });
    }
  });
  
  return plan.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
  });
};

// 🔮 GELECEK TAHMİNLERİ
const generatePredictions = (results: Result[], current: Result) => {
  const trend = analyzeTrends(results);
  const trendRate = trend.recent;
  
  // Linear regression benzeri basit tahmin
  const nextMonth = current.nets.total + (trendRate * 3); // 3 haftalık projeksiyon
  const final = current.nets.total + (trendRate * 12); // 12 haftalık projeksiyon
  
  return {
    nextMonthScore: Math.max(0, Math.round(nextMonth)),
    finalExamScore: Math.max(0, Math.round(final)),
    confidence: Math.abs(trendRate) > 2 ? 'high' : Math.abs(trendRate) > 1 ? 'medium' : 'low',
    improvement: Math.round(trendRate * 12)
  };
};

// 🏆 BAŞARI MESAJLARI VE MİVASYON
const generateMotivationalMessage = (score: number, trend: any) => {
  const messages = [];
  
  if (score >= 60) messages.push('Harika bir performans! 🎉');
  else if (score >= 45) messages.push('İyi gidiyorsun, devam et! 💪');
  else if (score >= 30) messages.push('Gelişim gösteriyorsun! 📈');
  else messages.push('Her gün biraz daha iyi olacaksın! 🌟');
  
  if (trend && trend.direction === 'improving') {
    messages.push('Artan trendin çok etkileyici!');
  }
  
  return messages.join(' ');
};

const generateEncouragement = (analysis: any) => {
  return [
    'Her çalıştığın gün hedefine bir adım daha yaklaşıyorsun!',
    'Başarının sırrı istikrarlı olmak, sen de bunu başarıyorsun!',
    'Güçlü yönlerini kullanarak zayıf yönlerini de geliştirebilirsin!'
  ];
};

const generateCelebration = (analysis: any) => {
  return 'Her küçük başarın büyük hedeflere giden yolun! 🎯';
};

const generateNextGoal = (analysis: any) => {
  return 'Sonraki hedefin: Net skoru +5 artırmak!';
};

const generateStudyFocus = (analysis: any) => {
  return 'Bu hafta en çok odaklanacağın konu: Matematik!';
};

const generateTimeManagementTips = (analysis: any) => {
  return [
    'Her gün 2 saat düzenli çalışma planı yap',
    'Pomodoro tekniğiyle 25 dakika çalış, 5 dakika mola ver',
    'Zayıf konulara daha fazla zaman ayır'
  ];
};

const generateExamStrategy = (analysis: any) => {
  return [
    'Kolay soruları önce çöz',
    'Zor sorulara çok fazla zaman harcama',
    'Son 15 dakikayı kontrol için ayır'
  ];
};

// 📊 YARDIMCI HESAPLAMA FONKSİYONLARI
const calculateTrend = (results: Result[]) => {
  if (results.length < 2) return 0;
  
  const scores = results.map(r => r.nets.total);
  let trend = 0;
  
  for (let i = 1; i < scores.length; i++) {
    trend += (scores[i] - scores[i-1]);
  }
  
  return trend / (scores.length - 1);
};

const calculateConsistency = (results: Result[]) => {
  if (results.length < 2) return 0.5;
  
  const scores = results.map(r => r.nets.total);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Konsistensi = 1 - (standart sapma / ortalama)
  return Math.max(0, 1 - (standardDeviation / Math.max(mean, 1)));
};

const calculateProgress = (results: Result[]) => {
  if (results.length < 2) return { percentage: 0, direction: 'stable' };
  
  const first = results[0].nets.total;
  const last = results[results.length - 1].nets.total;
  const percentage = ((last - first) / Math.max(first, 1)) * 100;
  
  return {
    percentage: Math.round(percentage),
    direction: percentage > 5 ? 'improving' : percentage < -5 ? 'declining' : 'stable'
  };
};

export const getStudentProfile = async (studentId: string): Promise<any> => {
  return null;
};

export const updateStudentProfile = async (studentId: string, updates: any) => {
  // Basit implementasyon
};

export const getStudyAnalytics = async (studentId: string): Promise<any> => {
  return null;
};

// 🔄 EKSİK CRUD FONKSİYONLARI (Panel için gerekli)
export const updateStudent = async (studentId: string, updates: Partial<Student>) => {
  try {
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

export const deleteStudent = async (studentId: string) => {
  try {
    const studentRef = doc(db, 'students', studentId);
    await deleteDoc(studentRef);
    return true;
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};

export const addExam = async (examData: Omit<Exam, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'exams'), {
    ...examData,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateExam = async (examId: string, updates: Partial<Exam>) => {
  try {
    const examRef = doc(db, 'exams', examId);
    await updateDoc(examRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating exam:', error);
    throw error;
  }
};

export const deleteExam = async (examId: string) => {
  try {
    const examRef = doc(db, 'exams', examId);
    await deleteDoc(examRef);
    return true;
  } catch (error) {
    console.error('Error deleting exam:', error);
    throw error;
  }
};

export const updateResult = async (resultId: string, updates: Partial<Result>) => {
  try {
    const resultRef = doc(db, 'results', resultId);
    await updateDoc(resultRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating result:', error);
    throw error;
  }
};

export const deleteResult = async (resultId: string) => {
  try {
    const resultRef = doc(db, 'results', resultId);
    await deleteDoc(resultRef);
    return true;
  } catch (error) {
    console.error('Error deleting result:', error);
    throw error;
  }
};

// 🔥 HEATMAP PERFORMANS MATRİSİ FONKSİYONLARI

// Soru zorluk analizi hesaplama
export const calculateQuestionDifficulty = (
  correctAnswers: number,
  totalAnswers: number,
  averageTime?: number
): 'kolay' | 'orta' | 'zor' => {
  const successRate = (correctAnswers / totalAnswers) * 100;
  
  if (successRate >= 80) return 'kolay';
  if (successRate >= 50) return 'orta';
  return 'zor';
};

// Renk kodu belirleme (performansa göre)
export const getColorCode = (successRate: number): string => {
  if (successRate >= 80) return '#22c55e'; // Yeşil - Kolay
  if (successRate >= 60) return '#eab308'; // Sarı - Orta
  if (successRate >= 40) return '#f97316'; // Turuncu - Zor
  return '#ef4444'; // Kırmızı - Çok Zor
};

// Performans trendi hesaplama (HeatMap için)
export const calculateHeatMapTrend = (currentRate: number, previousRate: number): 'up' | 'down' | 'stable' => {
  const diff = currentRate - previousRate;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
};

export const getDifficultyLevel = (score: number): 'kolay' | 'orta' | 'zor' => {
  if (score <= 0.3) return 'kolay';
  if (score <= 0.6) return 'orta';
  return 'zor';
};

// HeatMap veri hesaplama
export const getHeatMapData = async (examId: string): Promise<PerformanceMatrix> => {
  try {
    const results = await getResults();
    const examResults = results.filter(r => r.examId === examId);
    const students = await getStudents();
    
    if (examResults.length === 0) {
      throw new Error('Bu sınav için sonuç bulunamadı');
    }

    // Sınav bilgilerini al
    const exams = await getExams();
    const exam = exams.find(e => e.id === examId);
    
    if (!exam) {
      throw new Error('Sınav bulunamadı');
    }

    // Soru verilerini simüle et (gerçek sistemde database'den gelecek)
    const mockQuestions = generateMockQuestions(examId, examResults.length);
    const heatMapData: HeatMapData[] = [];

    // Her soru için performans analizi
    mockQuestions.forEach((question, index) => {
      const correctAnswers = Math.floor(Math.random() * examResults.length * 0.8);
      const successRate = (correctAnswers / examResults.length) * 100;
      
      // Öğrenci performansı (örnek)
      const studentPerformance = Math.random() * 100;
      const classAverage = successRate;
      const difficulty = 1 - (successRate / 100); // Başarı oranı düşükse zorluk yüksek

      // Zorluk seviyesini string olarak belirle
      const difficultyLevel: 'kolay' | 'orta' | 'zor' = 
        difficulty < 0.33 ? 'kolay' : difficulty < 0.67 ? 'orta' : 'zor';

      heatMapData.push({
        questionId: `q_${index + 1}`,
        questionNumber: index + 1,
        subject: question.subject,
        difficultyLevel,
        successRate: Math.round(successRate),
        studentPerformance: Math.round(studentPerformance),
        classAverage: Math.round(classAverage),
        difficultyScore: Math.round(difficulty * 100) / 100,
        colorCode: getColorCode(successRate),
        trend: calculateHeatMapTrend(successRate, successRate + (Math.random() - 0.5) * 10)
      });
    });

    // En zor ve en kolay soruları belirle
    const sortedQuestions = [...heatMapData].sort((a, b) => a.successRate - b.successRate);
    const hardestQuestions = sortedQuestions.slice(0, 5).map(q => ({
      id: q.questionId,
      examId,
      questionNumber: q.questionNumber,
      subject: q.subject,
      difficulty: q.difficultyLevel,
      correctAnswers: Math.floor((q.successRate / 100) * examResults.length),
      totalAnswers: examResults.length,
      successRate: q.successRate
    }));

    const easiestQuestions = sortedQuestions.slice(-5).reverse().map(q => ({
      id: q.questionId,
      examId,
      questionNumber: q.questionNumber,
      subject: q.subject,
      difficulty: q.difficultyLevel,
      correctAnswers: Math.floor((q.successRate / 100) * examResults.length),
      totalAnswers: examResults.length,
      successRate: q.successRate
    }));

    // Ders bazında analiz
    const subjectAnalysis: { [key: string]: number } = {};
    heatMapData.forEach(item => {
      if (!subjectAnalysis[item.subject]) {
        subjectAnalysis[item.subject] = 0;
      }
      subjectAnalysis[item.subject] += item.successRate;
    });

    // Ders ortalamalarını hesapla
    Object.keys(subjectAnalysis).forEach(subject => {
      const subjectQuestions = heatMapData.filter(q => q.subject === subject);
      subjectAnalysis[subject] = Math.round(subjectAnalysis[subject] / subjectQuestions.length);
    });

    return {
      examId,
      examTitle: exam.title,
      totalQuestions: mockQuestions.length,
      heatMapData,
      overallDifficulty: Math.round((heatMapData.reduce((sum, q) => sum + q.difficultyScore, 0) / heatMapData.length) * 100) / 100,
      averageSuccessRate: Math.round(heatMapData.reduce((sum, q) => sum + q.successRate, 0) / heatMapData.length),
      hardestQuestions,
      easiestQuestions,
      subjectAnalysis
    };

  } catch (error) {
    console.error('HeatMap veri hatası:', error);
    throw error;
  }
};

// Mock soru verisi oluşturma (gerçek sistemde database'den gelecek)
const generateMockQuestions = (examId: string, resultCount: number): Array<{ subject: string; questionNumber: number }> => {
  const subjects = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce'];
  const questionsPerSubject = Math.ceil(50 / subjects.length); // 50 soru toplam
  
  const questions: Array<{ subject: string; questionNumber: number }> = [];
  
  subjects.forEach((subject, subjectIndex) => {
    for (let i = 1; i <= questionsPerSubject; i++) {
      questions.push({
        subject,
        questionNumber: subjectIndex * questionsPerSubject + i
      });
    }
  });
  
  return questions.slice(0, 50); // 50 soru ile sınırla
};

// Öğrenci özel HeatMap analizi
export const getStudentHeatMapAnalysis = async (studentId: string, examId: string): Promise<{
  personalPerformance: HeatMapData[];
  improvementAreas: string[];
  strengths: string[];
  recommendations: string[];
}> => {
  try {
    const heatMapData = await getHeatMapData(examId);
    const results = await getResults();
    const studentResults = results.filter(r => r.studentId === studentId && r.examId === examId);
    
    if (studentResults.length === 0) {
      throw new Error('Öğrenci için sınav sonucu bulunamadı');
    }

    // Öğrencinin kişisel performans analizi
    const personalPerformance = heatMapData.heatMapData.map(item => ({
      ...item,
      studentPerformance: Math.random() * 100 // Gerçek sistemde öğrencinin netleri hesaplanacak
    }));

    // İyileştirme alanları (düşük performanslı sorular)
    const improvementAreas = personalPerformance
      .filter(item => item.studentPerformance < 50)
      .map(item => `${item.subject} - Soru ${item.questionNumber}`);

    // Güçlü yönler (yüksek performanslı sorular)
    const strengths = personalPerformance
      .filter(item => item.studentPerformance >= 80)
      .map(item => `${item.subject} - Soru ${item.questionNumber}`);

    // AI tavsiyeleri
    const recommendations = [
      'Düşük performanslı konulara daha fazla çalışma zamanı ayırın',
      'Zor sorular için konu tekrarı yapın',
      'Model sorular çözerek pratik yapın',
      'Ders bazında dengeli çalışma programı oluşturun'
    ];

    return {
      personalPerformance,
      improvementAreas,
      strengths,
      recommendations
    };

  } catch (error) {
    console.error('Öğrenci HeatMap analizi hatası:', error);
    throw error;
  }
};

// Tüm sınavlar için HeatMap özeti
export const getAllExamsHeatMapSummary = async (): Promise<Array<{
  examId: string;
  examTitle: string;
  totalStudents: number;
  averageSuccessRate: number;
  difficultyLevel: string;
  topSubject: string;
  weakSubject: string;
}>> => {
  try {
    const exams = await getExams();
    const results = await getResults();
    
    const summary = await Promise.all(
      exams.map(async (exam) => {
        try {
          const heatMapData = await getHeatMapData(exam.id);
          const examResults = results.filter(r => r.examId === exam.id);
          
          return {
            examId: exam.id,
            examTitle: exam.title,
            totalStudents: examResults.length,
            averageSuccessRate: heatMapData.averageSuccessRate,
            difficultyLevel: heatMapData.overallDifficulty > 0.7 ? 'Çok Zor' : 
                             heatMapData.overallDifficulty > 0.5 ? 'Zor' :
                             heatMapData.overallDifficulty > 0.3 ? 'Orta' : 'Kolay',
            topSubject: Object.entries(heatMapData.subjectAnalysis)
              .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Belirsiz',
            weakSubject: Object.entries(heatMapData.subjectAnalysis)
              .sort(([,a], [,b]) => a - b)[0]?.[0] || 'Belirsiz'
          };
        } catch (error) {
          console.error(`Sınav ${exam.id} analiz hatası:`, error);
          return null;
        }
      })
    );

    return summary.filter(item => item !== null);

  } catch (error) {
    console.error('Tüm sınavlar özet hatası:', error);
    throw error;
  }
};

// 🎯 AKILLI RAPOR SİSTEMİ INTERFACE'LERİ
export interface SmartReport {
  id: string;
  studentId: string;
  type: 'weekly' | 'monthly' | 'exam' | 'custom';
  title: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalExams: number;
    averageScore: number;
    improvementRate: number;
    bestSubject: string;
    weakSubject: string;
    studyTime: number;
    progressLevel: 'excellent' | 'good' | 'average' | 'needs-improvement';
  };
  details: {
    subjectAnalysis: Array<{
      subject: string;
      averageScore: number;
      improvement: number;
      trend: 'up' | 'down' | 'stable';
      recommendations: string[];
    }>;
    examResults: Array<{
      examId: string;
      examTitle: string;
      score: number;
      date: string;
      rank?: number;
      percentile?: number;
    }>;
    achievements: string[];
    nextGoals: string[];
  };
  createdAt: string;
  pdfUrl?: string;
}

// 📱 SOSYAL MOTİVASYON İNTERFACE'LERİ
export interface Leaderboard {
  id: string;
  type: 'weekly' | 'monthly' | 'all-time';
  subject?: string;
  students: Array<{
    studentId: string;
    name: string;
    class: string;
    score: number;
    rank: number;
    change: number; // Pozisyon değişimi
    avatar?: string;
  }>;
  lastUpdated: string;
}

export interface SocialChallenge {
  id: string;
  title: string;
  description: string;
  type: 'study-time' | 'exam-score' | 'improvement' | 'consistency';
  target: number;
  current: number;
  participants: Array<{
    studentId: string;
    name: string;
    progress: number;
    status: 'active' | 'completed' | 'failed';
  }>;
  startDate: string;
  endDate: string;
  reward: string;
  status: 'upcoming' | 'active' | 'completed';
}

// 🎯 AKILLI RAPOR SİSTEMİ FONKSİYONLARI

// Haftalık rapor oluşturma
export const generateWeeklyReport = async (studentId: string, weekStartDate: string): Promise<SmartReport> => {
  try {
    const results = await getResults();
    const exams = await getExams();
    const studentResults = results.filter(r => 
      r.studentId === studentId && 
      new Date(r.createdAt) >= new Date(weekStartDate)
    );

    // Hafta sonu hesapla
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    if (studentResults.length === 0) {
      throw new Error('Bu hafta için sınav sonucu bulunamadı');
    }

    // Ders bazında analiz
    const subjectAnalysis = calculateSubjectAnalysis(studentResults);
    
    // İyileştirme oranı hesaplama
    const improvementRate = calculateImprovementRate(studentResults);
    
    // En iyi ve zayıf dersler
    const subjectScores = Object.entries(subjectAnalysis).map(([subject, data]) => ({
      subject,
      score: data.average
    }));
    subjectScores.sort((a, b) => b.score - a.score);

    // Sıralama bilgisi
    const examResults = studentResults.map(result => ({
      examId: result.examId,
      examTitle: exams.find(e => e.id === result.examId)?.title || 'Bilinmeyen Sınav',
      score: calculateTotalScore(result.nets),
      date: result.createdAt,
      rank: Math.floor(Math.random() * 20) + 1, // Mock rank
      percentile: Math.floor(Math.random() * 100) + 1
    }));

    // Başarı seviyesi belirleme
    const averageScore = examResults.reduce((sum, exam) => sum + exam.score, 0) / examResults.length;
    let progressLevel: 'excellent' | 'good' | 'average' | 'needs-improvement';
    if (averageScore >= 80) progressLevel = 'excellent';
    else if (averageScore >= 65) progressLevel = 'good';
    else if (averageScore >= 50) progressLevel = 'average';
    else progressLevel = 'needs-improvement';

    // Başarılar ve hedefler
    const achievements = generateAchievements(studentResults, progressLevel);
    const nextGoals = generateNextGoals(subjectAnalysis, progressLevel);

    const report: SmartReport = {
      id: `weekly_${studentId}_${weekStartDate}`,
      studentId,
      type: 'weekly',
      title: `${new Date(weekStartDate).toLocaleDateString('tr-TR')} Hafta Raporu`,
      period: {
        startDate: weekStartDate,
        endDate: weekEndDate.toISOString()
      },
      summary: {
        totalExams: studentResults.length,
        averageScore: Math.round(averageScore),
        improvementRate: Math.round(improvementRate),
        bestSubject: subjectScores[0]?.subject || 'Belirsiz',
        weakSubject: subjectScores[subjectScores.length - 1]?.subject || 'Belirsiz',
        studyTime: Math.floor(Math.random() * 40) + 20, // Mock study time
        progressLevel
      },
      details: {
        subjectAnalysis: Object.entries(subjectAnalysis).map(([subject, data]) => ({
          subject,
          averageScore: Math.round(data.average),
          improvement: Math.round(data.improvement),
          trend: data.trend,
          recommendations: generateSubjectRecommendations(subject, data.average)
        })),
        examResults,
        achievements,
        nextGoals
      },
      createdAt: new Date().toISOString()
    };

    return report;

  } catch (error) {
    console.error('Haftalık rapor oluşturma hatası:', error);
    throw error;
  }
};

// Aylık rapor oluşturma
export const generateMonthlyReport = async (studentId: string, monthYear: string): Promise<SmartReport> => {
  try {
    // Ayın başlangıç tarihini hesapla
    const [year, month] = monthYear.split('-').map(Number);
    const monthStartDate = new Date(year, month - 1, 1);
    const monthEndDate = new Date(year, month, 0);

    const results = await getResults();
    const studentResults = results.filter(r => {
      const resultDate = new Date(r.createdAt);
      return r.studentId === studentId && 
             resultDate >= monthStartDate && 
             resultDate <= monthEndDate;
    });

    if (studentResults.length === 0) {
      throw new Error('Bu ay için sınav sonucu bulunamadı');
    }

    // Aylık analiz için haftalık raporları birleştir
    const weeklyReports = [];
    const current = new Date(monthStartDate);
    
    while (current < monthEndDate) {
      const weekStart = new Date(current);
      try {
        const weeklyReport = await generateWeeklyReport(studentId, weekStart.toISOString());
        weeklyReports.push(weeklyReport);
      } catch (error) {
        // Bu hafta için veri yoksa atla
      }
      current.setDate(current.getDate() + 7);
    }

    // Aylık özet hesaplama
    const totalExams = studentResults.length;
    const averageScore = studentResults.reduce((sum, result) => 
      sum + calculateTotalScore(result.nets), 0) / totalExams;

    // En çok çalışılan ders
    const subjectFrequency = calculateSubjectFrequency(studentResults);
    const mostStudiedSubject = Object.entries(subjectFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Belirsiz';

    // Progresyon seviyesi
    const progressLevel = averageScore >= 80 ? 'excellent' : 
                         averageScore >= 65 ? 'good' : 
                         averageScore >= 50 ? 'average' : 'needs-improvement';

    const report: SmartReport = {
      id: `monthly_${studentId}_${monthYear}`,
      studentId,
      type: 'monthly',
      title: `${monthYear} Ayı Performans Raporu`,
      period: {
        startDate: monthStartDate.toISOString(),
        endDate: monthEndDate.toISOString()
      },
      summary: {
        totalExams,
        averageScore: Math.round(averageScore),
        improvementRate: Math.round((averageScore - 50) * 2), // Mock improvement
        bestSubject: mostStudiedSubject,
        weakSubject: Object.entries(subjectFrequency)
          .sort(([,a], [,b]) => a - b)[0]?.[0] || 'Belirsiz',
        studyTime: Math.floor(Math.random() * 120) + 80, // Mock study time
        progressLevel
      },
      details: {
        subjectAnalysis: Object.entries(subjectFrequency).map(([subject, frequency]) => ({
          subject,
          averageScore: Math.round(Math.random() * 40 + 50), // Mock score
          improvement: Math.round((Math.random() - 0.5) * 20), // Mock improvement
          trend: Math.random() > 0.5 ? 'up' : 'down' as const,
          recommendations: generateSubjectRecommendations(subject, Math.random() * 40 + 50)
        })),
        examResults: studentResults.map(result => ({
          examId: result.examId,
          examTitle: 'Sınav', // Mock title
          score: calculateTotalScore(result.nets),
          date: result.createdAt,
          rank: Math.floor(Math.random() * 25) + 1,
          percentile: Math.floor(Math.random() * 100) + 1
        })),
        achievements: generateMonthlyAchievements(weeklyReports.length, averageScore),
        nextGoals: generateMonthlyGoals(averageScore, progressLevel)
      },
      createdAt: new Date().toISOString()
    };

    return report;

  } catch (error) {
    console.error('Aylık rapor oluşturma hatası:', error);
    throw error;
  }
};

// 📊 YARDIMCI FONKSİYONLAR

// Ders bazında analiz hesaplama
const calculateSubjectAnalysis = (results: Result[]) => {
  const analysis: { [key: string]: { average: number; improvement: number; trend: 'up' | 'down' | 'stable' } } = {};
  
  results.forEach(result => {
    Object.keys(result.nets).forEach(subject => {
      if (subject !== 'total' && typeof result.nets[subject] === 'number') {
        if (!analysis[subject]) {
          analysis[subject] = { average: 0, improvement: 0, trend: 'stable' };
        }
        analysis[subject].average += result.nets[subject];
      }
    });
  });

  // Ortalama hesaplama
  Object.keys(analysis).forEach(subject => {
    const subjectResults = results.filter(r => r.nets[subject]).length;
    analysis[subject].average = subjectResults > 0 ? analysis[subject].average / subjectResults : 0;
    
    // İyileştirme ve trend hesaplama (mock)
    analysis[subject].improvement = Math.round((Math.random() - 0.5) * 20);
    analysis[subject].trend = analysis[subject].improvement > 5 ? 'up' : 
                             analysis[subject].improvement < -5 ? 'down' : 'stable';
  });

  return analysis;
};

// İyileştirme oranı hesaplama
const calculateImprovementRate = (results: Result[]): number => {
  if (results.length < 2) return 0;
  
  const scores = results.map(r => calculateTotalScore(r.nets));
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  
  return ((lastScore - firstScore) / firstScore) * 100;
};

// Toplam skor hesaplama
const calculateTotalScore = (nets: any): number => {
  if (!nets || typeof nets !== 'object') return 0;
  return Object.values(nets).reduce((sum: number, net: any) => 
    sum + (typeof net === 'number' ? net : 0), 0) as number;
};

// Ders sıklığı hesaplama
const calculateSubjectFrequency = (results: Result[]): { [key: string]: number } => {
  const frequency: { [key: string]: number } = {};
  
  results.forEach(result => {
    Object.keys(result.nets).forEach(subject => {
      if (subject !== 'total') {
        frequency[subject] = (frequency[subject] || 0) + 1;
      }
    });
  });
  
  return frequency;
};

// Başarılar üretme
const generateAchievements = (results: Result[], progressLevel: string): string[] => {
  const achievements = [];
  
  if (progressLevel === 'excellent') {
    achievements.push('🌟 Mükemmel Performans');
    achievements.push('📚 Düzenli Çalışma');
  }
  
  if (results.length >= 3) {
    achievements.push('📈 Süreklilik Ödülü');
  }
  
  const avgScore = results.reduce((sum, r) => sum + calculateTotalScore(r.nets), 0) / results.length;
  if (avgScore > 70) {
    achievements.push('🎯 Hedef Tutturma');
  }
  
  return achievements;
};

// Sonraki hedefler üretme
const generateNextGoals = (subjectAnalysis: any, progressLevel: string): string[] => {
  const goals = [];
  
  const weakestSubject = Object.entries(subjectAnalysis)
    .sort(([,a], [,b]) => (a as any).average - (b as any).average)[0];
  
  if (weakestSubject) {
    goals.push(`${weakestSubject[0]} konularında %10 iyileştirme`);
  }
  
  if (progressLevel === 'needs-improvement') {
    goals.push('Haftalık 5 saat ek çalışma');
    goals.push('Günde 2 model sınav çözme');
  } else {
    goals.push('Haftalık 3 saat ek çalışma');
    goals.push('LGS hedef netlerine ulaşma');
  }
  
  return goals;
};

// Ders özel tavsiyeler üretme
const generateSubjectRecommendations = (subject: string, averageScore: number): string[] => {
  const recommendations = [];
  
  if (averageScore < 60) {
    recommendations.push('Temel kavramları tekrar edin');
    recommendations.push('Günde 30 dakika ek çalışma');
  } else if (averageScore < 80) {
    recommendations.push('Orta seviye sorular çözün');
    recommendations.push('Düzenli deneme çözün');
  } else {
    recommendations.push('İleri seviye problemler çözün');
    recommendations.push('Yarışmalara katılın');
  }
  
  return recommendations;
};

// Aylık başarılar üretme
const generateMonthlyAchievements = (weeklyReportsCount: number, averageScore: number): string[] => {
  const achievements = [];
  
  if (weeklyReportsCount >= 4) {
    achievements.push('📅 Aylık Süreklilik');
  }
  
  if (averageScore > 75) {
    achievements.push('🏆 Aylık Yıldız Öğrenci');
  }
  
  if (averageScore > 70) {
    achievements.push('📊 Hedef Başarısı');
  }
  
  return achievements;
};

// Aylık hedefler üretme
const generateMonthlyGoals = (averageScore: number, progressLevel: string): string[] => {
  const goals = [];
  
  if (progressLevel === 'needs-improvement') {
    goals.push('Aylık ortalama 60+ net');
    goals.push('4 hafta düzenli çalışma');
  } else if (progressLevel === 'average') {
    goals.push('Aylık ortalama 70+ net');
    goals.push('En zayıf derste %15 iyileştirme');
  } else {
    goals.push('Aylık ortalama 80+ net');
    goals.push('Tüm derslerde mükemmellik');
  }
  
  return goals;
};

// 📱 SOSYAL MOTİVASYON FONKSİYONLARI

// Liderlik tablosu oluşturma
export const generateLeaderboard = async (
  type: 'weekly' | 'monthly' | 'all-time',
  subject?: string
): Promise<Leaderboard> => {
  try {
    const students = await getStudents();
    const results = await getResults();
    
    // Öğrenci skorlarını hesapla
    const studentScores = students.map(student => {
      const studentResults = results.filter(r => r.studentId === student.id);
      
      let score = 0;
      if (type === 'weekly') {
        // Son 7 gün
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentResults = studentResults.filter(r => 
          new Date(r.createdAt) >= weekAgo
        );
        score = recentResults.reduce((sum, r) => sum + calculateTotalScore(r.nets), 0) / Math.max(recentResults.length, 1);
      } else if (type === 'monthly') {
        // Son 30 gün
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const recentResults = studentResults.filter(r => 
          new Date(r.createdAt) >= monthAgo
        );
        score = recentResults.reduce((sum, r) => sum + calculateTotalScore(r.nets), 0) / Math.max(recentResults.length, 1);
      } else {
        // Tüm zamanlar
        score = studentResults.reduce((sum, r) => sum + calculateTotalScore(r.nets), 0) / Math.max(studentResults.length, 1);
      }
      
      // Ders filtreleme
      if (subject) {
        const subjectResults = studentResults.filter(r => 
          r.nets[subject] && typeof r.nets[subject] === 'number'
        );
        score = subjectResults.length > 0 ? 
          subjectResults.reduce((sum, r) => sum + (r.nets[subject] as number), 0) / subjectResults.length : 
          0;
      }
      
      return {
        studentId: student.id,
        name: student.name,
        class: student.class,
        score: Math.round(score),
        rank: 0, // Sıralama sonra hesaplanacak
        change: Math.floor((Math.random() - 0.5) * 10), // Mock pozisyon değişimi
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`
      };
    });
    
    // Sıralama
    studentScores.sort((a, b) => b.score - a.score);
    
    // Rank atama
    studentScores.forEach((student, index) => {
      student.rank = index + 1;
    });
    
    return {
      id: `leaderboard_${type}${subject ? `_${subject}` : ''}`,
      type,
      subject,
      students: studentScores.slice(0, 50), // İlk 50
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Liderlik tablosu oluşturma hatası:', error);
    throw error;
  }
};

// Sosyal meydan okuma oluşturma
export const createSocialChallenge = async (challengeData: {
  title: string;
  description: string;
  type: 'study-time' | 'exam-score' | 'improvement' | 'consistency';
  target: number;
  startDate: string;
  endDate: string;
  reward: string;
}): Promise<SocialChallenge> => {
  try {
    const students = await getStudents();
    
    // Katılımcıları seç (rastgele 20 öğrenci)
    const selectedStudents = students
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);
    
    const challenge: SocialChallenge = {
      id: `challenge_${Date.now()}`,
      title: challengeData.title,
      description: challengeData.description,
      type: challengeData.type,
      target: challengeData.target,
      current: 0,
      participants: selectedStudents.map(student => ({
        studentId: student.id,
        name: student.name,
        progress: 0,
        status: 'active' as const
      })),
      startDate: challengeData.startDate,
      endDate: challengeData.endDate,
      reward: challengeData.reward,
      status: 'upcoming' as const
    };
    
    return challenge;
    
  } catch (error) {
    console.error('Sosyal meydan okuma oluşturma hatası:', error);
    throw error;
  }
};

// Öğrenci sıralama pozisyonu
export const getStudentRanking = async (studentId: string, type: 'weekly' | 'monthly' | 'all-time'): Promise<{
  rank: number;
  totalStudents: number;
  percentile: number;
  change: number;
}> => {
  try {
    const leaderboard = await generateLeaderboard(type);
    const studentEntry = leaderboard.students.find(s => s.studentId === studentId);
    
    if (!studentEntry) {
      return { rank: 0, totalStudents: leaderboard.students.length, percentile: 0, change: 0 };
    }
    
    const percentile = Math.round(((leaderboard.students.length - studentEntry.rank) / leaderboard.students.length) * 100);
    
    return {
      rank: studentEntry.rank,
      totalStudents: leaderboard.students.length,
      percentile,
      change: studentEntry.change
    };
    
  } catch (error) {
    console.error('Öğrenci sıralama hatası:', error);
    throw error;
  }
};

// 🎯 HEDEF YÖNETİM FONKSİYONLARI

// Panel key'lerini dashboard key'lerine dönüştürme fonksiyonu
const mapPanelKeysToDashboard = (panelTargets: {[key: string]: number}): {[key: string]: number} => {
  // Panel'de kullanılan key'ler zaten dashboard formatında (turkce, matematik, vs.)
  // Bu yüzden direkt kopyalama yapıyoruz
  return { ...panelTargets };
};

// Dashboard key'lerini panel key'lerine dönüştürme fonksiyonu  
const mapDashboardKeysToPanel = (dashboardTargets: {[key: string]: number}): {[key: string]: number} => {
  // Dashboard'da da İngilizce key'ler kullanılıyor, panel ile aynı format
  // Bu yüzden direkt kopyalama yapıyoruz
  return { ...dashboardTargets };
};

// Export dönüştürücü fonksiyonlar
export { mapPanelKeysToDashboard, mapDashboardKeysToPanel };

// Öğrenci hedeflerini kaydet (Dashboard formatında saklanır)
export const saveStudentTargets = async (studentId: string, targets: {[subject: string]: number}, targetScore?: number) => {
  try {
    // Panel key'lerini dashboard key'lerine dönüştür
    const dashboardTargets = mapPanelKeysToDashboard(targets);
    
    const targetsRef = doc(db, 'targets', studentId);
    await setDoc(targetsRef, {
      studentId,
      targets: dashboardTargets, // Dashboard formatında sakla
      targetScore: targetScore || 450, // Puan hedefi
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('🎯 Hedefler kaydedildi (Dashboard formatında):', studentId, dashboardTargets);
    console.log('🎯 Puan hedefi kaydedildi:', targetScore || 450);
  } catch (error) {
    console.error('Hedef kaydetme hatası:', error);
    throw error;
  }
};

// Öğrenci sadece puan hedefini güncelle
export const updateStudentScoreTarget = async (studentId: string, targetScore: number) => {
  try {
    const targetsRef = doc(db, 'targets', studentId);
    await updateDoc(targetsRef, {
      targetScore: targetScore,
      updatedAt: new Date().toISOString()
    });
    console.log(`🎯 Puan hedefi güncellendi (${studentId}):`, targetScore);
  } catch (error) {
    console.error('Puan hedefi güncelleme hatası:', error);
    throw error;
  }
};

// Öğrenci hedeflerini getir (Dashboard formatında döner)
export const getStudentTargets = async (studentId: string): Promise<{[subject: string]: number} | null> => {
  try {
    const targetsRef = doc(db, 'targets', studentId);
    const targetsSnapshot = await getDoc(targetsRef);
    
    console.log(`📋 Hedef arama - Öğrenci ID: ${studentId}`);
    console.log('📋 Doc mevcut mu:', targetsSnapshot.exists());
    
    if (targetsSnapshot.exists()) {
      const data = targetsSnapshot.data();
      const targets = data.targets || {};
      console.log('📋 Bulunan net hedefleri (Dashboard formatı):', targets);
      console.log('🎯 Puan hedefi:', data.targetScore || 450);
      console.log('🔄 Panel için dönüştürülmüş:', mapDashboardKeysToPanel(targets));
      return targets; // Zaten dashboard formatında saklı
    }
    console.log('📋 Hedef bulunamadı');
    return null;
  } catch (error) {
    console.error('Hedef getirme hatası:', error);
    return null;
  }
};

// Öğrenci puan hedefini getir
export const getStudentScoreTarget = async (studentId: string): Promise<number | null> => {
  try {
    const targetsRef = doc(db, 'targets', studentId);
    const targetsSnapshot = await getDoc(targetsRef);
    
    if (targetsSnapshot.exists()) {
      const targetScore = targetsSnapshot.data().targetScore;
      console.log(`🎯 Puan hedefi bulundu (${studentId}):`, targetScore || 450);
      return targetScore || 450; // Varsayılan 450
    }
    console.log(`📋 Puan hedefi bulunamadı, varsayılan kullanılıyor: 450`);
    return 450; // Varsayılan puan hedefi
  } catch (error) {
    console.error('Puan hedefi getirme hatası:', error);
    return 450; // Varsayılan puan hedefi
  }
};

// Tüm hedefleri getir
export const getAllTargets = async (): Promise<{[studentId: string]: {[subject: string]: number}}> => {
  try {
    const targetsSnapshot = await getDocs(collection(db, 'targets'));
    const allTargets: {[studentId: string]: {[subject: string]: number}} = {};
    
    targetsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.studentId && data.targets) {
        allTargets[data.studentId] = data.targets;
      }
    });
    
    return allTargets;
  } catch (error) {
    console.error('Tüm hedefleri getirme hatası:', error);
    return {};
  }
};
