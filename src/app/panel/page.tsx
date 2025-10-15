"use client";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const provider = new GoogleAuthProvider();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      router.push("/panel"); // giriş başarılı → panel sayfasına yönlendir
    } catch (error) {
      console.error("Giriş hatası:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold mb-6">Öğretmen Girişi</h1>
      <button
        onClick={handleLogin}
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Google ile Giriş Yap
      </button>
    </div>
  );
}