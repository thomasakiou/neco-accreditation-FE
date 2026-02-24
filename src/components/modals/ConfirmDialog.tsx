import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'danger',
    isLoading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            iconColor: 'text-red-600 dark:text-red-400',
            confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            border: 'border-red-200 dark:border-red-800',
        },
        warning: {
            iconBg: 'bg-amber-100 dark:bg-amber-900/30',
            iconColor: 'text-amber-600 dark:text-amber-400',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
            border: 'border-amber-200 dark:border-amber-800',
        },
        info: {
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            border: 'border-blue-200 dark:border-blue-800',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" />

            {/* Dialog */}
            <div
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6">
                    {/* Icon */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${styles.iconBg} ${styles.border} border`}>
                            {variant === 'danger' ? (
                                <Trash2 className={`w-6 h-6 ${styles.iconColor}`} />
                            ) : (
                                <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {title}
                            </h3>
                        </div>
                    </div>

                    {/* Message */}
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed pl-[68px]">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg ${styles.confirmBtn}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
