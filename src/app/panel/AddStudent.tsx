import { useState } from "react";
import { db } from "../../../firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

type Props = {
  fetchStudents: () => Promise<void>;
  fullName: string;
  setFullName: (val: string) => void;
  studentClass: string;
  setStudentClass: (val: string) => void;
  schoolNumber: string;
  setSchoolNumber: (val: string) => void;
  success: boolean;
  editId: string | null;
  setEditId: (val: string | null) => void;
};

export default function AddStudent({
  fetchStudents,
  fullName,
  setFullName,
  studentClass,
  setStudentClass,
  schoolNumber,
  setSchoolNumber,
  success,
  editId,
  setEditId,
}: Props) {
  const handleAddOrUpdate = async () => {
    if (!fullName.trim() || !studentClass.trim() || !schoolNumber.trim()) return;

    // Soyadı büyük yap
    const parts = fullName.trim().split(" ");
    const lastName = (parts.pop() || "").toUpperCase();
    const firstName = parts.join(" ");
    const formattedName = `${firstName} ${lastName}`.trim();

    if (editId) {
      // 🔄 Güncelleme
      const ref = doc(db, "students", editId);
      await updateDoc(ref, {
        fullName: formattedName,
        class: studentClass.trim(),
        schoolNumber: schoolNumber.trim(),
      });
      setEditId(null);
    } else {
      // ➕ Yeni ekleme
      await addDoc(collection(db, "students"), {
        fullName: formattedName,
        class: studentClass.trim(),
        schoolNumber: schoolNumber.trim(),
        createdAt: new Date(),
      });
    }

    setFullName("");
    setStudentClass("");
    setSchoolNumber("");
    await fetchStudents();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4 text-center">
        {editId ? "Öğrenciyi Güncelle" : "Öğrenci Ekle"}
      </h1>
      <div className="flex flex-col gap-3 mb-6">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Adı Soyadı (Soyadı otomatik büyük)"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />

        <select
          value={studentClass}
          onChange={(e) => setStudentClass(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        >
          <option value="">Sınıf Seçiniz</option>
          <option value="5/A">5/A</option>
          <option value="6/A">6/A</option>
          <option value="7/A">7/A</option>
          <option value="8/A">8/A</option>
        </select>

        <input
          type="text"
          value={schoolNumber}
          onChange={(e) => setSchoolNumber(e.target.value)}
          placeholder="Okul Numarası"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />

        <button
          onClick={handleAddOrUpdate}
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          {editId ? "Güncelle" : "Ekle"}
        </button>
      </div>

      {/* ✅ Başarı Mesajı */}
      <div
        className={`absolute top-4 right-4 transition-all duration-500 transform ${
          success ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
        }`}
      >
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-2 rounded shadow-md flex items-center gap-2">
          <span className="text-xl">✔</span>
          <span className="font-semibold">
            {editId ? "Öğrenci güncellendi!" : "Öğrenci eklendi!"}
          </span>
        </div>
      </div>
    </div>
  );
}