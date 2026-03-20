import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export default function AlertModal({
    isOpen,
    title,
    message,
    onClose,
}: AlertModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" 
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                {/* Close icon button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    {/* Icon & Title */}
                    <div className="flex flex-col items-center text-center space-y-4 pt-4">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800 shadow-inner">
                            <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {title}
                        </h3>
                    </div>

                    {/* Message */}
                    <p className="mt-6 text-slate-600 dark:text-slate-400 font-bold text-center leading-relaxed">
                        {message}
                    </p>

                    {/* Action */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-950/20"
                        >
                            Got it, thanks
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
