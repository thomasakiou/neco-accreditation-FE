import React, { useState } from 'react';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    Filter,
    Calendar,
    ChevronRight,
    PieChart,
    Target,
    Users,
    School,
    Map,
    Loader2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import DataService from '../../api/services/data.service';

export default function HeadOfficeReports() {
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async (type: 'schools' | 'states' | 'lgas') => {
        try {
            setIsExporting(type);
            setError(null);
            let blob: Blob;

            switch (type) {
                case 'schools': blob = await DataService.exportSchools(); break;
                case 'states': blob = await DataService.exportStates(); break;
                case 'lgas': blob = await DataService.exportLGAs(); break;
                default: throw new Error('Invalid export type');
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(`Failed to export ${type} report. Please try again.`);
        } finally {
            setIsExporting(null);
        }
    };

    const reportCards = [
        {
            id: 'schools',
            title: 'Schools Accreditation Report',
            description: 'Comprehensive list of all schools with their current accreditation status, center codes, and location details.',
            icon: School,
            color: 'bg-emerald-500'
        },
        {
            id: 'states',
            title: 'State Performance Summary',
            description: 'Analytics on school registration and accreditation progress broken down by states and geographical zones.',
            icon: Map,
            color: 'bg-blue-500'
        },
        {
            id: 'lgas',
            title: 'LGA Distribution Data',
            description: 'Detailed breakdown of local government areas and the density of accredited centers within each jurisdiction.',
            icon: Target,
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-emerald-600" />
                        Reporting & Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Export system data and generate detailed performance insights.</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Last 30 Days</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 rotate-90" />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 animate-in shake">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-xs font-black uppercase tracking-widest">Clear</button>
                </div>
            )}

            {/* Main Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Schools', value: '1,284', trend: '+5.2%', icon: School, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Accredited', value: '842', trend: '+8.1%', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'State Offices', value: '37', trend: '0%', icon: Map, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    { label: 'Avg Process Time', value: '14 Days', trend: '-2.4%', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-[64px] flex items-center justify-end p-4 opacity-50`}>
                            <stat.icon className={`w-8 h-8 ${stat.color}`} />
                        </div>
                        <div className="relative z-10 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                            <p className={`text-[11px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-500' : stat.trend === '0%' ? 'text-slate-400' : 'text-red-500'}`}>
                                {stat.trend} <span className="text-slate-400 font-medium">from last cycle</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Report Cards Grid */}
            <h2 className="text-lg font-bold text-slate-900 dark:text-white px-2 mt-8">Exportable Data Entities</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reportCards.map((report) => (
                    <div key={report.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm group hover:border-emerald-500/50 transition-all flex flex-col">
                        <div className={`h-24 ${report.color} p-6 flex items-center justify-between relative`}>
                            <report.icon className="w-12 h-12 text-white opacity-20 absolute -right-4 -top-4 w-24 h-24 rotate-12" />
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
                                <report.icon className="w-6 h-6" />
                            </div>
                            <FileSpreadsheet className="w-5 h-5 text-white/50" />
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight">{report.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">
                                {report.description}
                            </p>

                            <button
                                onClick={() => handleExport(report.id as any)}
                                disabled={isExporting !== null}
                                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 rounded-2xl text-sm font-bold hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-all disabled:opacity-50"
                            >
                                {isExporting === report.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Generating Excel...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        <span>Download (.xlsx)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary Analytics Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                    <PieChart className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5 opacity-50" />
                    <div>
                        <h4 className="text-white/60 text-xs font-black uppercase tracking-widest mb-4">State Distribution</h4>
                        <p className="text-2xl font-bold leading-tight max-w-[200px]">80% of schools are concentrated in 6 states.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(n => <div key={n} className="w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">L{n}</div>)}
                        </div>
                        <p className="text-xs text-white/40 font-medium">Top performing state coordinators</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 rounded-[40px] shadow-sm flex flex-col justify-between min-h-[300px]">
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <Users className="w-8 h-8 text-emerald-600" />
                            <button className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">Weekly Audit</button>
                        </div>
                        <h4 className="text-slate-900 dark:text-white text-xl font-black mb-2 leading-tight">State User Engagement</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Engagement among state-level portal users has increased by 14% since the last update.</p>
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: 'Active Sessions', val: '92%', color: 'bg-emerald-500' },
                            { label: 'Report Submissions', val: '74%', color: 'bg-emerald-400' }
                        ].map((bar, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                    <span>{bar.label}</span>
                                    <span>{bar.val}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${bar.color}`} style={{ width: bar.val }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
