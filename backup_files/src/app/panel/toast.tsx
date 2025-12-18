"use client";

import React from "react";

export type ToastItem = {
    id: number;
    title: string;
    description: string;
    type?: "success" | "error" | "info";
};

type ToastProps = {
    toasts: ToastItem[];
    onRemoveToast: (id: number) => void;
};

export default function Toast({ toasts, onRemoveToast }: ToastProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="flex flex-col gap-4 max-w-md w-full mx-4">
                {toasts.map((t) => {
                    const isSuccess = t.type === "success";
                    const isError = t.type === "error";
                    const isInfo = t.type === "info";

                    return (
                        <div
                            key={t.id}
                            className={`
                                w-full flex items-center gap-4 p-6 rounded-2xl shadow-2xl
                                backdrop-blur-md border-2 transform
                                animate-fade-in-up
                                hover:scale-105 hover:shadow-3xl
                                transition-all duration-500
                                ${isSuccess ? "bg-gradient-to-r from-emerald-500 to-green-600 border-green-300" : ""}
                                ${isError ? "bg-gradient-to-r from-red-500 to-rose-600 border-red-300" : ""}
                                ${isInfo ? "bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-300" : ""}
                            `}
                        >
                            {/* İkon */}
                            <div className="flex-shrink-0">
                                {isSuccess && (
                                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                {isError && (
                                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                )}
                                {isInfo && (
                                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Metin */}
                            <div className="flex-1 text-white">
                                <div className="font-bold text-lg mb-1">{t.title}</div>
                                <div className="text-sm opacity-95 leading-relaxed">{t.description}</div>
                            </div>

                            {/* Kapatma İkonu */}
                            <button
                                className="flex-shrink-0 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                                onClick={() => onRemoveToast(t.id)}
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}