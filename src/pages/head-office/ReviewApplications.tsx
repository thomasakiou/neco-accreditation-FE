import React from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    Search,
    School as SchoolIcon,
    MessageSquare,
    Eye,
    FileText,
    AlertTriangle
} from 'lucide-react';
import { cn } from '../../components/layout/DashboardLayout';
import DataService from '../../api/services/data.service';

export default function ReviewApplications() {
    const [applications, setApplications] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState<'All' | 'Pending' | 'Passed' | 'Partial' | 'Failed'>('Pending');
    const [viewingApp, setViewingApp] = React.useState<any | null>(null);
    const [processing, setProcessing] = React.useState(false);

    React.useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await DataService.getApplications();
            setApplications(data);
        } catch (err) {
            console.error('Failed to fetch applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (appId: number, status: 'Passed' | 'Partial' | 'Failed') => {
        setProcessing(true);
        try {
            await DataService.approveApplication(appId, status);
            setViewingApp(null);
            fetchData();
        } catch (err) {
            console.error('Failed to approve application:', err);
            alert('Failed to update status.');
        } finally {
            setProcessing(false);
        }
    };

    const filteredApps = applications.filter(app => {
        const matchesSearch = app.school_code.includes(searchQuery) || app.state_code.includes(searchQuery);
        const matchesFilter = filterStatus === 'All' || app.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Passed': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'Partial': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review Applications</h1>
                    <p className="text-slate-500 dark:text-slate-400">Verify payment proofs and award accreditation status.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-300 dark:border-slate-800 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by school code or state..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        {['All', 'Pending', 'Passed', 'Partial', 'Failed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status as any)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                                    filterStatus === status
                                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium">
                                <th className="px-6 py-4">Submission ID</th>
                                <th className="px-6 py-4">School & State</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading applications...</td>
                                </tr>
                            ) : filteredApps.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No applications found in this category</td>
                                </tr>
                            ) : filteredApps.map((app) => (
                                <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{app.id.toString().padStart(5, '0')}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900 dark:text-white">{app.school_code}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-widest">{app.state_code} State</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {app.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                            getStatusColor(app.status)
                                        )}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setViewingApp(app)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Proofs
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {viewingApp && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                    Review Payment Proof
                                </h2>
                                <p className="text-sm text-slate-500">School: {viewingApp.school_code} | {viewingApp.state_code} State</p>
                            </div>
                            <button
                                onClick={() => setViewingApp(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Image Gallery */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">Uploaded Evidence</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {JSON.parse(viewingApp.proof_urls).map((url: string, idx: number) => (
                                            <div key={idx} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                                                <img
                                                    src={`${window.location.protocol}//${window.location.hostname}:8000${url}`}
                                                    alt={`Proof ${idx + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                                <a
                                                    href={`${window.location.protocol}//${window.location.hostname}:8000${url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <span className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                                                        <ExternalLink className="w-4 h-4" />
                                                        Open Full Size
                                                    </span>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Selection */}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Adjudication Result</h3>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handleApprove(viewingApp.id, 'Passed')}
                                                disabled={processing}
                                                className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                                    <div>
                                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">Passed / Accredited</p>
                                                        <p className="text-xs text-emerald-600/70">Meets all requirements and payment verified.</p>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => handleApprove(viewingApp.id, 'Partial')}
                                                disabled={processing}
                                                className="w-full flex items-center justify-between p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                                                    <div>
                                                        <p className="font-bold text-amber-700 dark:text-amber-400">Partial Accreditation</p>
                                                        <p className="text-xs text-amber-600/70">Minor issues or incomplete payment.</p>
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => handleApprove(viewingApp.id, 'Failed')}
                                                disabled={processing}
                                                className="w-full flex items-center justify-between p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <XCircle className="w-6 h-6 text-red-600" />
                                                    <div>
                                                        <p className="font-bold text-red-700 dark:text-red-400">Failed / Rejected</p>
                                                        <p className="text-xs text-red-600/70">Invalid proof or serious deficiencies.</p>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-4 flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                                            <strong>Note:</strong> Approving as "Passed" will automatically update the school's accreditation status and set the approval date.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-300 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setViewingApp(null)}
                                className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold shadow-sm"
                            >
                                Close Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
