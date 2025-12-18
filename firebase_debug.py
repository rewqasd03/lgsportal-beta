#!/usr/bin/env python3
"""
Firebase Debug Script - Eksik Deneme Kaydı Sorunu Analizi
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

def debug_exam_data_inconsistency():
    print('🔍 Firebase Debug: Eksik Deneme Kaydı Sorunu Analizi')
    print('=' * 60)
    
    try:
        # Firebase'i initialize et (eğer zaten initialize edilmemişse)
        if not firebase_admin._apps:
            # Firebase Admin SDK için service account key gerekli
            # Public API key ile sadece client-side işlemler yapılabilir
            print('❌ Firebase Admin SDK için service account key gerekli')
            print('🔧 Alternatif yöntem: Web browser üzerinden analiz yapılacak')
            return
        
        db = firestore.client()
        
        # 1. Exams tablosundaki tüm verileri al
        print('\n📊 1. Exams Tablosu Analizi:')
        exams_ref = db.collection('exams')
        exams_docs = exams_ref.get()
        exams_data = []
        for doc in exams_docs:
            exam_data = doc.to_dict()
            exam_data['id'] = doc.id
            exams_data.append(exam_data)
        
        print(f'   Toplam Exam Kaydı: {len(exams_data)}')
        print('   Exam ID\'leri:')
        for i, exam in enumerate(exams_data, 1):
            title = exam.get('title', 'Başlık yok')
            date = exam.get('date', 'Tarih yok')
            print(f'   {i}. {exam["id"]} - {title} ({date})')
        
        # 2. Results tablosundaki tüm verileri al
        print('\n📊 2. Results Tablosu Analizi:')
        results_ref = db.collection('results')
        results_docs = results_ref.get()
        results_data = []
        for doc in results_docs:
            result_data = doc.to_dict()
            result_data['id'] = doc.id
            results_data.append(result_data)
        
        print(f'   Toplam Result Kaydı: {len(results_data)}')
        
        # 3. Hangi examId'lerin results tablosunda bulunduğunu bul
        result_exam_ids = list(set(r['examId'] for r in results_data))
        print('\n📊 3. Results Tablosundaki ExamId\'ler:')
        print(f'   Toplam Benzersiz ExamId: {len(result_exam_ids)}')
        for i, exam_id in enumerate(result_exam_ids, 1):
            exam_results = [r for r in results_data if r['examId'] == exam_id]
            print(f'   {i}. {exam_id} ({len(exam_results)} sonuç)')
        
        # 4. Hangi examId'lerin eksik olduğunu bul
        available_exam_ids = [e['id'] for e in exams_data]
        missing_exam_ids = [eid for eid in result_exam_ids if eid not in available_exam_ids]
        
        print('\n⚠️ 4. EKSİK EXAM KAYITLARI:')
        if not missing_exam_ids:
            print('   ✅ Tüm exam kayıtları mevcut - Sorun başka yerde olabilir')
        else:
            print(f'   ❌ {len(missing_exam_ids)} adet eksik exam kaydı bulundu:')
            for i, missing_id in enumerate(missing_exam_ids, 1):
                related_results = [r for r in results_data if r['examId'] == missing_id]
                student_ids = [r['studentId'] for r in related_results[:5]]
                print(f'   {i}. {missing_id}')
                print(f'      - Results tablosunda {len(related_results)} kayıt bulunuyor')
                print(f'      - İlk birkaç studentId: {", ".join(student_ids)}')
        
        # 5. Sınıf bazında analiz
        print('\n📊 5. Sınıf Bazında Analiz:')
        students_ref = db.collection('students')
        students_docs = students_ref.get()
        students_data = []
        for doc in students_docs:
            student_data = doc.to_dict()
            student_data['id'] = doc.id
            students_data.append(student_data)
        
        print(f'   Toplam Öğrenci: {len(students_data)}')
        
        # 8-A sınıfını örnek alalım
        sinif_8a = [s for s in students_data if s.get('class') == '8-A']
        print(f'   8-A Sınıfı Öğrenci Sayısı: {len(sinif_8a)}')
        
        if sinif_8a:
            sinif_8a_results = [r for r in results_data if any(s['id'] == r['studentId'] for s in sinif_8a)]
            sinif_8a_exam_ids = list(set(r['examId'] for r in sinif_8a_results))
            
            print('\n   8-A Sınıfı Exam Durumu:')
            for exam_id in sinif_8a_exam_ids:
                exam_exists = exam_id in available_exam_ids
                exam = next((e for e in exams_data if e['id'] == exam_id), None)
                has_results = [r for r in sinif_8a_results if r['examId'] == exam_id]
                
                status = '✅ Mevcut' if exam_exists else '❌ Eksik'
                print(f'   - {exam_id}: {status} ({len(has_results)} sonuç)')
                if exam:
                    print(f'     Başlık: {exam.get("title", "Başlık yok")}')
        
        # 6. Eksik kayıtlar için detaylı analiz
        if missing_exam_ids:
            print('\n🔍 6. Eksik Kayıtlar İçin Detaylı Analiz:')
            
            for missing_id in missing_exam_ids:
                print(f'\n   ExamId: {missing_id}')
                related_results = [r for r in results_data if r['examId'] == missing_id]
                
                print(f'   - Toplam Sonuç: {len(related_results)}')
                student_ids = [r['studentId'] for r in related_results[:10]]
                print(f'   - Öğrenci ID\'leri: {", ".join(student_ids)}')
                
                # İlk sonucun detaylarını göster
                if related_results:
                    first_result = related_results[0]
                    print(f'   - İlk Sonuç Detayı:')
                    print(f'     * StudentId: {first_result["studentId"]}')
                    print(f'     * ExamId: {first_result["examId"]}')
                    print(f'     * Nets: {json.dumps(first_result.get("nets", {}), ensure_ascii=False)}')
                    print(f'     * Scores: {json.dumps(first_result.get("scores", {}), ensure_ascii=False)}')
                    print(f'     * CreatedAt: {first_result.get("createdAt", "Yok")}')
        
        print('\n' + '=' * 60)
        print('🎯 SONUÇ:')
        if missing_exam_ids:
            print(f'❌ {len(missing_exam_ids)} adet exam kaydı eksik. Bu "Eksik Deneme Kaydı" sorununun nedeni.')
            print('🔧 ÇÖZÜM ÖNERİLERİ:')
            print('1. Bu examId\'ler için eksik exam kayıtları oluştur')
            print('2. Ya da results tablosundaki bu kayıtları sil')
            print('3. Ya da examId\'leri mevcut exam kayıtlarıyla eşleştir')
        else:
            print('✅ Exams tablosunda sorun bulunamadı. Sorun başka yerde olabilir.')
        
        # Sonuçları JSON dosyasına kaydet
        analysis_result = {
            'timestamp': datetime.now().isoformat(),
            'total_exams': len(exams_data),
            'total_results': len(results_data),
            'missing_exam_ids': missing_exam_ids,
            'analysis_summary': {
                'missing_count': len(missing_exam_ids),
                'problem_identified': len(missing_exam_ids) > 0
            }
        }
        
        with open('/workspace/firebase_analysis_result.json', 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, ensure_ascii=False, indent=2)
        
        print(f'\n📄 Analiz sonucu firebase_analysis_result.json dosyasına kaydedildi')
        
    except Exception as error:
        print(f'❌ Firebase bağlantı hatası: {error}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_exam_data_inconsistency()