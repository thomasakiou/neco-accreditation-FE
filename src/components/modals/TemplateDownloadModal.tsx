import React from 'react';
import { X, Download, FileSpreadsheet, Info } from 'lucide-react';
import DataService from '../../api/services/data.service';

interface TemplateDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const templates = [
    { id: 'zones', name: 'Zones Template', description: 'Template for uploading school zones' },
    { id: 'states', name: 'States Template', description: 'Template for uploading state offices' },
    { id: 'lgas', name: 'LGAs Template', description: 'Template for uploading local government areas' },
    { id: 'custodians', name: 'Custodians Template', description: 'Template for uploading school custodians' },
    { id: 'schools', name: 'SSCE Schools Template', description: 'Template for uploading SSCE schools' },
    { id: 'bece_schools', name: 'BECE Schools Template', description: 'Template for uploading BECE schools' },
];

export default function TemplateDownloadModal({ isOpen, onClose }: TemplateDownloadModalProps) {
    const [downloading, setDownloading] = React.useState<string | null>(null);

    if (!isOpen) return null;

    const handleDownload = async (id: string) => {
        setDownloading(id);
        try {
            await DataService.downloadTemplate(id);
        } catch (err) {
            console.error('Failed to download template:', err);
            alert('Failed to download template. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Download Templates</h2>
                            <p className="text-sm text-slate-500">Select a template to download for bulk upload.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-3">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                        {template.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {template.description}
                                    </p>
                                </div>
                                <button
                                    disabled={!!downloading}
                                    onClick={() => handleDownload(template.id)}
                                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-sm"
                                    title="Download"
                                >
                                    {downloading === template.id ? (
                                        <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Download className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border-t border-slate-300 dark:border-slate-800 flex gap-3">
                    <Info className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                        Use these templates to ensure your data is formatted correctly before uploading.
                        <strong> Do not change the column headers.</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}
