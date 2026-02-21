import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    History,
    FileText,
    Loader2,
    ExternalLink,
    MessageSquare
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import { components } from '../../api/types';

type School = components['schemas']['School'];

interface PendingSchool extends School {
    submittedAt: string;
    appliedBy: string;
}

export default function HeadOfficeFinalApproval() {
    const [pendingSchools, setPendingSchools] = useState<PendingSchool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const fetchPendingApprovals = async () => {
        try {
            setIsLoading(true);
            // Backend doesn't have an applications table yet, so we mock pending data 
            // based on existing schools but with added application metadata for UI demonstration
            const schools = await DataService.getSchools();

            const mockedPending: PendingSchool[] = schools.map((s, idx) => ({
                ...s,
                status: idx % 3 === 0 ? 'pending' : 'active',
                submittedAt: new Date(Date.now() - (idx * 86400000) - 3600000).toISOString(),
                appliedBy: idx % 2 === 0 ? 'Lagos State Office' : 'Kano State Office'
            })).filter(s => s.status === 'pending');

            setPendingSchools(mockedPending);
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = (id: string, action: 'approve' | 'reject') => {
        if (window.confirm(`Are you sure you want to ${action} this application?`)) {
            setPendingSchools(prev => prev.filter(s => s.code !== id));
            // In a real app, this would call an API like DataService.approveSchool(id)
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                        Final Approval
                    </h1>
                    <p className="text-slate-700 dark:text-slate-400 font-medium">Review and grant final accreditation status to verified school applications.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-300 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setActiveTab('approved')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'approved' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setActiveTab('rejected')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'rejected' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-700 hover:text-slate-900 dark:hover:text-slate-300'}`}
                    >
                        Rejected
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-300 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 bg-slate-200 dark:bg-slate-900/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Search by school name or center number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium outline-none"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-300 dark:border-slate-700 text-sm font-bold">
                        <Filter className="w-4 h-4" />
                        <span>Advanced Filters</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-200 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">School & Submitter</th>
                                <th className="px-6 py-4">Submitted Date</th>
                                <th className="px-6 py-4">State Level Verification</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                                            <p className="text-slate-700 font-bold">Crunching application data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : pendingSchools.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </div>
                                            <h3 className="text-slate-950 dark:text-white font-bold text-lg">Queue Clear!</h3>
                                            <p className="text-slate-700 dark:text-slate-400 text-sm font-medium">No school applications are currently awaiting final approval.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pendingSchools.map((school) => (
                                    <tr key={school.code} className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-950 dark:text-white underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4 cursor-pointer hover:decoration-emerald-500 transition-all">
                                                        {school.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-700 dark:text-slate-400 font-bold">
                                                        Sent by {school.appliedBy}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-950 dark:text-slate-300">
                                                    {new Date(school.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-tighter">
                                                    {new Date(school.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden">
                                                    <div className="w-full h-full bg-emerald-500" />
                                                </div>
                                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">VERIFIED</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAction(school.code, 'approve')}
                                                    className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-all"
                                                    title="Approve"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(school.code, 'reject')}
                                                    className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-all"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && pendingSchools.length > 0 && (
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <History className="w-4 h-4" />
                            <span>Queue Last Refreshed: {new Date().toLocaleTimeString()}</span>
                        </div>
                        <button onClick={fetchPendingApprovals} className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">Refresh Applications</button>
                    </div>
                )}
            </div>

            {/* Side Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <CheckCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-500/50" />
                    <div className="relative z-10 space-y-2">
                        <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider">Approved this month</p>
                        <h3 className="text-4xl font-black">142</h3>
                        <div className="flex items-center gap-1 text-xs text-emerald-100 font-medium pt-2">
                            <span className="bg-emerald-500/50 px-1.5 py-0.5 rounded">+12%</span>
                            <span>vs last month</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 shadow-inner border border-amber-200 dark:border-amber-900/50">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">Pending</p>
                        <h3 className="text-2xl font-black text-slate-950 dark:text-white">{pendingSchools.length}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-emerald-500/50 transition-all">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 shadow-inner group-hover:text-emerald-500 transition-colors border border-slate-300 dark:border-slate-700">
                        <MessageSquare className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">Feedback</p>
                        <h3 className="text-2xl font-black text-slate-950 dark:text-white">8</h3>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </div>
    );
}
