"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../../firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user) router.push("/panel");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="bg-white shadow-lg rounded-lg p-10 flex flex-col items-center w-[350px]">
        {/* Logo */}
        <img src="/logo.png" alt="Başarı Portalı" className="w-28 mb-6" />

        {/* Başlık */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Yetkili Öğretmen Girişi</h1>
        <p className="text-gray-600 text-center mb-6">
          Tanımlı Google hesabınızla giriş yaparak panele ulaşabilirsiniz
        </p>

        {/* Buton */}
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-md shadow-md transition"
        >
          <img
            src="https://www.svgrepo.com/show/355037/google.svg"
            alt="Google Logo"
            className="w-5 h-5"
          />
          Google Hesabın ile Giriş Yap
        </button>
      </div>
    </div>
  );
}