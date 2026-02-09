'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Türkçe karakterler için font kaydetme
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
      fontWeight: 400,
    },
  ],
});

// PDF Stilleri
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 15,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  cardValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#3B82F6',
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableCellHeader: {
    backgroundColor: '#EFF6FF',
    fontWeight: 'bold',
  },
  chartContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
});

// Ana PDF Dokümanı
const StudentReportPDF = ({ reportData }) => {
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
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            <Text style={styles.title}>LGS Portalı - Öğrenci Raporu</Text>
            {'\n'}
            <Text style={styles.subtitle}>{student.name} - {student.class}</Text>
          </Text>
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
              <Text style={[styles.statValue, { color: improvement >= 0 ? '#10B981' : '#EF4444' }]}>
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
              <Text style={styles.cardLabel}>Ortalama Net (Sınıf)</Text>
              <Text style={styles.cardValue}>{(classAverageNet || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Ortalama Puan (Öğrenci)</Text>
              <Text style={styles.cardValue}>{(studentAverageScore || 0).toFixed(0)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Ortalama Puan (Sınıf)</Text>
              <Text style={styles.cardValue}>{(classAverageScore || 0).toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Deneme Geçmişi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Deneme Geçmişi</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '40%', borderTopLeftRadius: 4 }]}>Deneme</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>Net</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>Sınıf Ort.</Text>
              <Text style={[styles.tableCell, { width: '20%', borderTopRightRadius: 4 }]}>Genel Ort.</Text>
            </View>
            {/* Table Rows */}
            {examResults.slice(0, 15).map((item, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.tableCell, { width: '40%' }]}>{item.exam.title}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {item.studentTotalNet > 0 ? item.studentTotalNet.toFixed(1) : '-'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{item.classAverage.toFixed(1)}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{item.generalAverage.toFixed(1)}</Text>
              </View>
            ))}
          </View>
          {examResults.length > 15 && (
            <Text style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>
              ...ve {examResults.length - 15} deneme daha
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          LGS Portalı - Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
        </Text>
      </Page>

      {/* İkinci Sayfa - Ders Bazında Gelişim */}
      {examResults.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              <Text style={styles.title}>📚 Ders Bazında Gelişim</Text>
              {'\n'}
              <Text style={styles.subtitle}>{student.name} - {student.class}</Text>
            </Text>
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

              return (
                <View style={styles.card} key={subject} break={false}>
                  <View style={styles.cardRow}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }}>{subject}</Text>
                    <Text style={[styles.cardValue, { fontSize: 14 }]}>
                      {avgScore.toFixed(1)} net (Ortalama)
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min((avgScore / 20) * 100, 100)}%`,
                          backgroundColor: avgScore >= avgClass ? '#10B981' : '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                    <Text style={{ fontSize: 9, color: '#6B7280' }}>Sınıf Ortalaması: {avgClass.toFixed(1)}</Text>
                    <Text style={{ fontSize: 9, color: '#6B7280' }}>
                      {avgScore >= avgClass ? '📈 Üstünde' : '📉 Altında'}
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
      )}

      {/* Üçüncü Sayfa - Hedefler ve Lise Önerileri */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerText}>
            <Text style={styles.title}>🎯 Hedef Takibi & Lise Önerileri</Text>
            {'\n'}
            <Text style={styles.subtitle}>{student.name} - {student.class}</Text>
          </Text>
        </View>

        {/* Hedef Durumu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Hedefleriniz</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Hedef Puanınız</Text>
              <Text style={[styles.cardValue, { fontSize: 16, color: '#3B82F6' }]}>450 Puan</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Son Puanınız</Text>
              <Text style={[styles.cardValue, { fontSize: 16, color: '#10B981' }]}>~{latestScore.toFixed(0)} Puan</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Durum</Text>
              <Text style={[styles.cardValue, { color: latestScore >= 400 ? '#10B981' : '#F59E0B' }]}>
                {latestScore >= 450 ? '🎉 Hedefe Ulaştınız!' : latestScore >= 400 ? '🔥 Çok Yaklaştınız!' : '💪 Gelişmeye Devam!'}
              </Text>
            </View>
          </View>
        </View>

        {/* Lise Önerileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎓 Lise Önerileri</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '50%', borderTopLeftRadius: 4 }]}>Lise Adı</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>Tür</Text>
              <Text style={[styles.tableCell, { width: '25%', borderTopRightRadius: 4 }]}>Taban Puan</Text>
            </View>
            {[
              { name: 'Van Türk Telekom Fen Lisesi', type: 'Fen', score: '460.91' },
              { name: 'İpekyolu Borsa İstanbul Fen Lisesi', type: 'Fen', score: '441.61' },
              { name: 'Tuşba TOBB Fen Lisesi', type: 'Fen', score: '422.90' },
              { name: 'Niyazi Türkmenoğlu Anadolu Lisesi', type: 'Anadolu', score: '416.75' },
              { name: 'Erciş Fen Lisesi', type: 'Fen', score: '402.18' },
            ].map((lise, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={[styles.tableCell, { width: '50%' }]}>{lise.name}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{lise.type}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{lise.score}</Text>
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
