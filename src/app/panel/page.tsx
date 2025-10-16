"use client";

import { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import AddStudent from "./AddStudent";

type Screen = "summary" | "addStudent" | "listStudents" | "dataEntry" | "reports";

export default function PanelPage() {
  const [activeScreen, setActiveScreen] = useState<Screen>("summary");

  // Form state
  const [fullName, setFullName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [schoolNumber, setSchoolNumber] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  // Data state
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState(false);

  // Placeholder deneme/rapor sayıları (ileride Firestore'dan çekilecek)
  const examCount = 0;
  const reportCount = 0;

  const fetchStudents = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, "students"));
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStudents(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async () => {
    if (!fullName.trim() || !studentClass.trim() || !schoolNumber.trim()) return;

    // Adı Soyadı tek kutu: soyadı otomatik büyük
    const parts = fullName.trim().split(" ");
    const lastName = (parts.pop() || "").toUpperCase();
    const firstName = parts.join(" ");
    const formattedName = `${firstName} ${lastName}`.trim();

    await addDoc(collection(db, "students"), {
      fullName: formattedName,
      class: studentClass.trim(),
      schoolNumber: schoolNumber.trim(),
      createdAt: new Date(),
    });

    setFullName("");
    setStudentClass("");
    setSchoolNumber("");
    await fetchStudents();

    // Başarı mesajı göster (1 sn)
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-black">
      {/* Üst Menü */}
      <nav className="bg-white shadow-md px-6 py-4 flex gap-8 justify-center">
        <button
          onClick={() => setActiveScreen("summary")}
          className={`font-medium ${activeScreen === "summary" ? "text-blue-600" : "text-gray-700"}`}
        >
          Ana Ekran
        </button>
        <button
          onClick={() => setActiveScreen("addStudent")}
          className={`font-medium ${activeScreen === "addStudent" ? "text-blue-600" : "text-gray-700"}`}
        >
          Öğrenci Ekle
        </button>
        <button
          onClick={() => setActiveScreen("listStudents")}
          className={`font-medium ${activeScreen === "listStudents" ? "text-blue-600" : "text-gray-700"}`}
        >
          Öğrenci Listesi
        </button>
        <button
          onClick={() => setActiveScreen("dataEntry")}
          className={`font-medium ${activeScreen === "dataEntry" ? "text-blue-600" : "text-gray-700"}`}
        >
          Veri Gir
        </button>
        <button
          onClick={() => setActiveScreen("reports")}
          className={`font-medium ${activeScreen === "reports" ? "text-blue-600" : "text-gray-700"}`}
        >
          Raporlar
        </button>
      </nav>

      {/* Orta İçerik */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl relative">
          {/* Özet */}
          {activeScreen === "summary" && (
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-6">Hoşgeldiniz 👋</h1>
              <p className="text-gray-600 mb-8">
                Bu panelden öğrencilerinizi yönetebilir, yeni kayıtlar ekleyebilir ve raporları görüntüleyebilirsiniz.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-100 text-blue-800 rounded-lg p-4 shadow">
                  <h2 className="text-lg font-semibold">Öğrenci Sayısı</h2>
                  <p className="text-2xl font-bold">{loading ? "…" : students.length}</p>
                </div>
                <div className="bg-green-100 text-green-800 rounded-lg p-4 shadow">
                  <h2 className="text-lg font-semibold">Deneme Sayısı</h2>
                  <p className="text-2xl font-bold">{examCount}</p>
                </div>
                <div className="bg-purple-100 text-purple-800 rounded-lg p-4 shadow">
                  <h2 className="text-lg font-semibold">Raporlar</h2>
                  <p className="text-2xl font-bold">{reportCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Öğrenci ekle */}
          {activeScreen === "addStudent" && (
            <div> {activeScreen === "addStudent" && (
  <AddStudent
    fetchStudents={fetchStudents}
    fullName={fullName}
    setFullName={setFullName}
    studentClass={studentClass}
    setStudentClass={setStudentClass}
    schoolNumber={schoolNumber}
    setSchoolNumber={setSchoolNumber}
    success={success}
    editId={editId}
    setEditId={setEditId}
  />
)}
              </div> )
            }
              {/* Başarı bildirimi */}
              <div
                className={`absolute top-4 right-4 transition-all duration-500 transform ${
                  success ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                }`}
              >
                <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded shadow-md flex items-center gap-2">
                  <span className="text-xl">✔</span>
                  <span className="font-semibold">Öğrenci başarıyla eklendi!</span>
                </div>
              </div>
            </div>
          

          {/* Öğrenci listesi */}
          {activeScreen === "listStudents" && (
            <div>
              <h1 className="text-xl font-bold mb-4 text-center">Öğrenci Listesi</h1>
              {loading ? (
                <div className="text-gray-600 text-center py-4">Yükleniyor…</div>
              ) : (
                <ul className="divide-y divide-gray-200 text-black">
                  {students.length === 0 ? (
                    <li className="text-gray-600 text-center py-4">Henüz öğrenci eklenmedi</li>
                  ) : (
                    students.map((s) => (
                      <li key={s.id} className="py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-medium">{s.fullName}</span>
                          <span className="text-gray-600">
                            {s.class} • No: {s.schoolNumber}
                          </span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Veri gir */}
          {activeScreen === "dataEntry" && (
            <div>
              <h1 className="text-xl font-bold mb-4 text-center">Veri Gir (Deneme)</h1>
              <p className="text-gray-600 mb-4 text-center">Burada öğrenciler listeleniyor:</p>
              {loading ? (
                <div className="text-gray-600 text-center py-4">Yükleniyor…</div>
              ) : (
                <ul className="divide-y divide-gray-200 text-black">
                  {students.length === 0 ? (
                    <li className="text-gray-600 text-center py-4">Henüz öğrenci eklenmedi</li>
                  ) : (
                    students.map((s) => (
                      <li key={s.id} className="py-3">
                        {s.fullName} — {s.class} — {s.schoolNumber}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Raporlar */}
          {activeScreen === "reports" && (
            <div className="text-center">
              <h1 className="text-xl font-bold mb-4">Raporlar</h1>
              <p className="text-gray-600">Raporlama fonksiyonları burada olacak.</p>
            </div>
          )}

      </main>

      {/* Alt Credit */}
      <footer className="bg-white text-center py-4 text-sm text-gray-500 shadow-inner">
        © {new Date().getFullYear()} Geliştiren: Murat UYSAL
      </footer>
    </div>
  );
}