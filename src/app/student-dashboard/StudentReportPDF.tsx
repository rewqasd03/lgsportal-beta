'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// Türkçe karakterler için Open Sans fontu kaydetme
Font.register({
  family: 'Open Sans',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObjxOVQA-O.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObjxOVQA-O.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObjxOVQA-O.woff2',
      fontWeight: 'bold',
    },
  ],
});

// PDF Stilleri - Geliştirilmiş Okunabilirlik ve Profesyonel Görünüm
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 35,
    fontFamily: 'Open Sans',
    fontSize: 11,
    lineHeight: 1.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderBottomWidth: 3,
    borderBottomColor: '#1E40AF',
    paddingBottom: 15,
  },
  logoContainer: {
    width: 55,
    height: 55,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoText: {
    fontSize: 24,
    color: '#1E40AF',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#555555',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#BFDBFE',
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cardRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  cardLabel: {
    fontSize: 11,
    color: '#555555',
  },
  cardValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  statLabel: {
    fontSize: 10,
    color: '#555555',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#1E40AF',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#1E40AF',
  },
  tableHeaderCell: {
    padding: 12,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableCell: {
    padding: 10,
    fontSize: 10,
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    textAlign: 'center',
  },
  tableCellFirst: {
    textAlign: 'left',
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 9,
    color: '#666666',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  chartImage: {
    width: '100%',
    height: 220,
    marginVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Yeni eklenen stiller
  infoBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  infoText: {
    fontSize: 10,
    color: '#92400E',
  },
  subjectCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  subjectScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  subjectProgress: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subjectLabel: {
    fontSize: 9,
    color: '#555555',
  },
  subjectStatus: {
    fontSize: 9,
    fontWeight: 'bold',
  },
});

// Ana PDF Dokümanı
const StudentReportPDF = ({ reportData, chartImage }) => {
  if (!reportData) return null;

  const { student, examResults } = reportData;

  // İstatistik hesaplamaları
  const examResultsWithScores = examResults.filter(item => item.studentTotalNet > 0);
  const totalNet = examResultsWithScores.reduce((sum, item) => sum + item.studentTotalNet, 0);
  const avgNet = examResultsWithScores.length > 0 ? totalNet / examResultsWithScores.length : 0;
  
  const latestNet = examResultsWithScores.length > 0 
    ? examResultsWithScores[examResultsWithScores.length - 1]?.studentTotalNet || 0 
    : 0;
  const previousNet = examResultsWithScores.length > 1 
    ? examResultsWithScores[examResultsWithScores.length - 2]?.studentTotalNet || 0 
    : 0;
  const improvement = latestNet - previousNet;

  const classAverageNet = examResults.length > 0 
    ? examResults.reduce((sum, item) => sum + (item.classAverage || 0), 0) / examResults.length
    : 0;

  const studentAverageScore = examResultsWithScores.length > 0
    ? examResultsWithScores.reduce((sum, item) => sum + (item.studentTotalScore || 0), 0) / examResultsWithScores.length
    : 0;

  const classAverageScore = examResults.length > 0
    ? examResults.reduce((sum, item) => sum + (item.classAverageScore || 0), 0) / examResults.length
    : 0;

  // Son puanı hesapla
  const calculateLatestStudentScore = () => {
    if (!examResults || examResults.length === 0) return 0;
    
    const sortedResults = [...examResults].sort((a, b) => 
      new Date(b.exam.date).getTime() - new Date(a.exam.date).getTime()
    );
    
    const latestResult = sortedResults[0];
    const studentResult = latestResult.studentResults[0];
    
    if (!studentResult) return 0;
    
    let totalScore = studentResult.puan;
    if (totalScore && typeof totalScore === 'string') {
      totalScore = parseFloat(totalScore);
    }
    if (!totalScore && studentResult.scores?.puan) {
      totalScore = studentResult.scores.puan;
      if (typeof totalScore === 'string') {
        totalScore = parseFloat(totalScore);
      }
    }
    if (!totalScore && studentResult.totalScore) {
      totalScore = studentResult.totalScore;
      if (typeof totalScore === 'string') {
        totalScore = parseFloat(totalScore);
      }
    }
    if (!totalScore && studentResult.nets?.total) {
      totalScore = studentResult.nets.total * 5;
    }
    
    return Math.round(totalScore || 0);
  };

  const latestScore = calculateLatestStudentScore();

  return (
    <Document>
      {/* SAYFA 1 - Genel Performans */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>📊</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>LGS Portalı - Öğrenci Raporu</Text>
            <Text style={styles.subtitle}>{student.name} - {student.class}</Text>
          </View>
        </View>

        {/* Özet Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Genel Performans Özeti</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.statValue}>{(avgNet || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Ortalama Net</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.statValue}>{(latestNet || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Son Net</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.statValue, { color: improvement >= 0 ? '#16A34A' : '#DC2626' }]}>
                {(improvement || 0) >= 0 ? '+' : ''}{(improvement || 0).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Değişim</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.statValue}>{examResults.length}</Text>
              <Text style={styles.statLabel}>Toplam Deneme</Text>
            </View>
          </View>
        </View>

        {/* Karşılaştırma */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Sınıf Karşılaştırması</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Ortalama Net (Sınıf Ortalaması)</Text>
              <Text style={styles.cardValue}>{(classAverageNet || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Ortalama Puan (Sizin)</Text>
              <Text style={styles.cardValue}>{(studentAverageScore || 0).toFixed(0)}</Text>
            </View>
            <View style={[styles.cardRow, styles.cardRowLast]}>
              <Text style={styles.cardLabel}>Ortalama Puan (Sınıf)</Text>
              <Text style={styles.cardValue}>{(classAverageScore || 0).toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Grafik */}
        {chartImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Net Gelişim Trendi</Text>
            <Image src={chartImage} style={styles.chartImage} />
          </View>
        )}

        {/* Deneme Geçmişi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Deneme Geçmişi</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableHeaderCell, { width: '40%', textAlign: 'left', paddingLeft: 12 }]}>Deneme Adı</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Netiniz</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Sınıf Ort.</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Genel Ort.</Text>
            </View>
            {/* Table Rows */}
            {examResults.slice(0, 10).map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.tableCell, { width: '40%', textAlign: 'left', paddingLeft: 12 }]}>{item.exam.title}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {item.studentTotalNet > 0 ? item.studentTotalNet.toFixed(1) : '-'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{item.classAverage.toFixed(1)}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{item.generalAverage.toFixed(1)}</Text>
              </View>
            ))}
          </View>
          {examResults.length > 10 && (
            <Text style={{ fontSize: 10, color: '#666666', textAlign: 'center', marginTop: 8 }}>
              ...ve {examResults.length - 10} deneme daha
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          LGS Portalı - Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
        </Text>
      </Page>

      {/* SAYFA 2 - Ders Bazında Gelişim */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>📖</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>📚 Ders Bazında Gelişim</Text>
            <Text style={styles.subtitle}>{student.name} - {student.class}</Text>
          </View>
        </View>

        {/* Ders Performansı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Ders Bazında Net Ortalamaları</Text>
          {['Türkçe', 'Matematik', 'Fen', 'Sosyal', 'Din', 'İngilizce'].map((subject) => {
            const subjectScores = examResults
              .filter(item => item.studentResults[0]?.nets?.[subject.toLowerCase()] > 0)
              .map(item => ({
                title: item.exam.title,
                score: item.studentResults[0]?.nets?.[subject.toLowerCase()] || 0,
                classAvg: item.exam.subjectAverages?.[subject.toLowerCase()] || 0
              }));
            
            if (subjectScores.length === 0) return null;
            
            const avgScore = subjectScores.reduce((sum, s) => sum + s.score, 0) / subjectScores.length;
            const avgClass = subjectScores.reduce((sum, s) => sum + s.classAvg, 0) / subjectScores.length;
            const percentage = Math.min((avgScore / 20) * 100, 100);
            const isAbove = avgScore >= avgClass;

            return (
              <View style={styles.subjectCard} key={subject}>
                <View style={styles.subjectHeader}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <Text style={styles.subjectScore}>{avgScore.toFixed(1)} net</Text>
                </View>
                <View style={styles.subjectProgress}>
                  <View
                    style={[
                      styles.subjectProgressFill,
                      {
                        width: `${percentage}%`,
                        backgroundColor: isAbove ? '#16A34A' : '#F59E0B',
                      },
                    ]}
                  />
                </View>
                <View style={styles.subjectFooter}>
                  <Text style={styles.subjectLabel}>Sınıf Ortalaması: {avgClass.toFixed(1)}</Text>
                  <Text style={[styles.subjectStatus, { color: isAbove ? '#16A34A' : '#F59E0B' }]}>
                    {isAbove ? '📈 Ortalamanın Üstünde' : '📉 Ortalamanın Altında'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          LGS Portalı - Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
        </Text>
      </Page>

      {/* SAYFA 3 - Hedefler ve Lise Önerileri */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🎯</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>🎯 Hedef Takibi & Lise Önerileri</Text>
            <Text style={styles.subtitle}>{student.name} - {student.class}</Text>
          </View>
        </View>

        {/* Hedef Durumu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Hedefleriniz</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Hedef Puanınız</Text>
              <Text style={[styles.cardValue, { fontSize: 18, color: '#1E40AF' }]}>450 Puan</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Son Puanınız (Yaklaşık)</Text>
              <Text style={[styles.cardValue, { fontSize: 18, color: '#16A34A' }]}>{latestScore} Puan</Text>
            </View>
            <View style={[styles.cardRow, styles.cardRowLast]}>
              <Text style={styles.cardLabel}>Durumunuz</Text>
              <Text style={[styles.cardValue, { fontSize: 14, color: latestScore >= 450 ? '#16A34A' : latestScore >= 400 ? '#F59E0B' : '#6B7280' }]}>
                {latestScore >= 450 ? '🎉 Hedefe Ulaştınız!' : latestScore >= 400 ? '🔥 Çok Yaklaştınız!' : '💪 Gelişmeye Devam!'}
              </Text>
            </View>
          </View>
        </View>

        {/* Lise Önerileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎓 Önerilen Liseler (Taban Puanları)</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableHeaderCell, { width: '55%', textAlign: 'left', paddingLeft: 12 }]}>Lise Adı</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Tür</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Taban Puan</Text>
            </View>
            {[
              { name: 'Van Türk Telekom Fen Lisesi', type: 'Fen', score: '460.91' },
              { name: 'İpekyolu Borsa İstanbul Fen Lisesi', type: 'Fen', score: '441.61' },
              { name: 'Tuşba TOBB Fen Lisesi', type: 'Fen', score: '422.90' },
              { name: 'Niyazi Türkmenoğlu Anadolu Lisesi', type: 'Anadolu', score: '416.75' },
              { name: 'Erciş Fen Lisesi', type: 'Fen', score: '402.18' },
              { name: 'Kazım Karabekir Anadolu Lisesi', type: 'Anadolu', score: '400.23' },
            ].map((lise, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.tableCell, { width: '55%', textAlign: 'left', paddingLeft: 12 }]}>{lise.name}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{lise.type}</Text>
                <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>{lise.score}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          LGS Portalı - Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
        </Text>
      </Page>
    </Document>
  );
};

export default StudentReportPDF;
