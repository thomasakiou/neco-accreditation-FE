import React, { useState } from 'react';
import { Copy, AlertTriangle, CheckCircle2, Loader2, Settings, AlertCircle, ShieldAlert } from 'lucide-react';
import AuthService from '../../api/services/auth.service';
import DataService from '../../api/services/data.service';
import { cn } from '../../components/layout/DashboardLayout';

export default function HeadOfficeSettings() {
    const [fromYear, setFromYear] = useState('');
    const [toYear, setToYear] = useState('');
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await AuthService.getCurrentUser();
                setCurrentUser(user);
            } finally {
                setIsLoadingUser(false);
            }
        };
        fetchUser();
    }, []);

    const isSuperAdmin = currentUser?.email === 'admin@neco.gov.ng';

    const handleDuplicate = async () => {
        if (!fromYear || !toYear) {
            setMessage({ type: 'error', text: 'Please provide both source and target years.' });
            return;
        }

        if (fromYear === toYear) {
            setMessage({ type: 'error', text: 'Source and target years must be different.' });
            return;
        }

        if (!window.confirm(`Are you sure you want to duplicate all schools from ${fromYear} to ${toYear}? This will create new records for ${toYear} with the same school details but unaccredited status.`)) {
            return;
        }

        try {
            setIsDuplicating(true);
            setMessage(null);
            await DataService.duplicateSchoolsForYear(toYear, fromYear);
            setMessage({
                type: 'success',
                text: `Successfully duplicated schools from ${fromYear} to ${toYear}. You can now view them in the Schools page filtered by ${toYear}.`
            });
            setFromYear('');
            setToYear('');
        } catch (err: any) {
            console.error('Duplication error:', err);
            setMessage({
                type: 'error',
                text: err.response?.data?.detail || err.message || 'Failed to duplicate schools. Please try again.'
            });
        } finally {
            setIsDuplicating(false);
        }
    };

    if (isLoadingUser) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="max-w-4xl mx-auto mt-20 p-12 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Access Restricted</h2>
                <p className="text-slate-600 dark:text-slate-400 font-bold max-w-md mx-auto">
                    You do not have sufficient permissions to access the System Settings. 
                    Only <strong>admin@neco.gov.ng</strong> can manage global parameters.
                </p>
                <div className="pt-4">
                    <button 
                        onClick={() => window.history.back()}
                        className="px-8 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-black uppercase tracking-widest transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black text-slate-950 dark:text-white flex items-center gap-3 uppercase tracking-tight">
                    <Settings className="w-8 h-8 text-emerald-600" />
                    System Settings
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-bold mt-1">Configure global system parameters and administrative utilities.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Data Management Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <Copy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Data Migration Utility</h2>
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Carry over school records between academic years.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-4 text-amber-900 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-black uppercase tracking-wider mb-1">Important Note</p>
                                <p className="font-bold opacity-80">This action will create new database entries for all schools found in the source year. Existing records for the target year will NOT be overwritten, but duplicates may be created if valid composite keys (Code + Year) don't already exist.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Source Year (Copy From)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2024"
                                    value={fromYear}
                                    onChange={e => setFromYear(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Target Year (Copy To)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2025"
                                    value={toYear}
                                    onChange={e => setToYear(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleDuplicate}
                                disabled={isDuplicating || !fromYear || !toYear}
                                className={cn(
                                    "px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                                )}
                            >
                                {isDuplicating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Copy className="w-5 h-5" />}
                                Duplicate Schools for {toYear || '...'}
                            </button>
                        </div>

                        {message && (
                            <div className={cn(
                                "p-4 rounded-xl flex items-center gap-4 text-sm font-bold animate-in slide-in-from-top-2",
                                message.type === 'success'
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                            )}>
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                                <span>{message.text}</span>
                                <button onClick={() => setMessage(null)} className="ml-auto text-xs uppercase hover:underline opacity-50">Dismiss</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
