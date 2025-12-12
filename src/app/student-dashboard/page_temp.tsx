// Lise Tercih Önerileri Tab Komponenti - Hedef Takibi için
function LiseTercihOnerileriTab({ reportData, studentTargets, latestNet, latestScore }: {
  reportData: ReportData;
  studentTargets: {[subject: string]: number};
  latestNet: number;
  latestScore: number;
}) {
  const currentStudentScore = latestScore || 0;
  
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">🏫 Lise Tercih Önerileri</h3>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">📊 Mevcut Durumunuz</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentStudentScore > 0 ? `${Math.round(currentStudentScore)} puan` : 'Puan bulunamadı'}
              </div>
              <div className="text-sm text-blue-700">Son Deneme Puanınız</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{latestNet.toFixed(1)} net</div>
              <div className="text-sm text-green-700">Son Deneme Net'iniz</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{reportData.examResults.length}</div>
              <div className="text-sm text-purple-700">Toplam Deneme Sayınız</div>
            </div>
          </div>
        </div>

        {currentStudentScore === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Puan Bilgisi Bulunamadı</h4>
            <p className="text-gray-600">
              Lise tercih önerilerini görebilmek için en az bir deneme puanınız olmalıdır.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎓</div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Tercih Önerileri</h4>
            <p className="text-gray-600">
              Öğrenci puanınız: {Math.round(currentStudentScore)} puan
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
