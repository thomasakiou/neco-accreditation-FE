import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    MoreVertical,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    X,
    Edit2,
    Download,
    Trash2,
    Filter,
    GraduationCap,
    RefreshCw,
    ChevronDown,
    FileSpreadsheet
} from 'lucide-react';
import DataService, { Custodian, State, LGA } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import SearchableSelect from '../../components/common/SearchableSelect';
import { cn } from '../../lib/utils';

export default function StateCustodians() {
    const [custodians, setCustodians] = useState<Custodian[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'SSCE' | 'BECE'>('SSCE');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustodian, setEditingCustodian] = useState<Custodian | null>(null);
    const [userState, setUserState] = useState<State | null>(null);
    const [lgas, setLgas] = useState<LGA[]>([]);
    const [modalLgas, setModalLgas] = useState<LGA[]>([]);
    const [isLoadingLgas, setIsLoadingLgas] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCustodian, setNewCustodian] = useState({
        name: '',
        code: '',
        state_code: '',
        lga_code: '',
        town: '',
        status: 'active'
    });

    const [selectedLga, setSelectedLga] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; message: string; confirmLabel?: string;
        variant?: 'danger' | 'warning'; onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const isSuperAdmin = currentUser?.email === 'admin@neco.gov.ng';

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const user = await AuthService.getCurrentUser();
            setCurrentUser(user);
            const stateCode = user?.state_code;

            if (!stateCode) {
                setError('State code not found for user.');
                setIsLoading(false);
                return;
            }

            // Fetch state details if possible, or just use the code
            const statesData = await DataService.getStates();
            const currentState = statesData.find(s => s.code === stateCode);
            setUserState(currentState || { code: stateCode, name: stateCode } as State);

            const [custodiansData, lgasData] = await Promise.all([
                activeTab === 'SSCE'
                    ? DataService.getCustodians({ state_code: stateCode })
                    : DataService.getBeceCustodians({ state_code: stateCode }),
                DataService.getLGAs({ state_code: stateCode })
            ]);

            setCustodians(custodiansData);
            setLgas(lgasData);
            setModalLgas(lgasData);

            setNewCustodian(prev => ({ ...prev, state_code: stateCode }));
        } catch (err: any) {
            setError('Failed to fetch data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [activeTab]);

    const handleAddCustodian = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...newCustodian, state_code: userState?.code || '' };
            if (activeTab === 'SSCE') {
                await DataService.createCustodian(payload);
            } else {
                await DataService.createBeceCustodian(payload);
            }
            setShowAddModal(false);
            setNewCustodian({
                name: '',
                code: '',
                state_code: userState?.code || '',
                lga_code: '',
                town: '',
                status: 'active'
            });
            fetchInitialData();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to create custodian.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (custodian: Custodian) => {
        setEditingCustodian(custodian);
        setShowEditModal(true);
    };

    const handleUpdateCustodian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustodian) return;

        try {
            setIsSubmitting(true);
            if (activeTab === 'SSCE') {
                await DataService.updateCustodian(editingCustodian.code, editingCustodian);
            } else {
                await DataService.updateBeceCustodian(editingCustodian.code, editingCustodian);
            }
            setShowEditModal(false);
            setEditingCustodian(null);
            fetchInitialData();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to update custodian.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCustodian = async (code: string, name: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Custodian',
            message: `Are you sure you want to delete "${name}"? All associated schools will be affected.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    if (activeTab === 'SSCE') {
                        await DataService.deleteCustodian(code);
                    } else {
                        await DataService.deleteBeceCustodian(code);
                    }
                    fetchInitialData();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError('Failed to delete custodian.');
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const { filteredCustodians, totalPages, startIndex, paginatedCustodians } = React.useMemo(() => {
        const filtered = custodians.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLga = !selectedLga || c.lga_code === selectedLga;
            return matchesSearch && matchesLga;
        });

        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        const startIndex = (currentPage - 1) * rowsPerPage;
        const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

        return {
            filteredCustodians: filtered,
            totalPages,
            startIndex,
            paginatedCustodians: paginated
        };
    }, [custodians, searchTerm, selectedLga, currentPage, rowsPerPage]);

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Custodian Management</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {userState?.name} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Custodians</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                                Manage {activeTab === 'BECE' ? 'BECE' : 'SSCE'} Custodian points in your state.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={() => fetchInitialData()}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                                Synchronize
                            </button>

                            {isSuperAdmin && (
                                <div className="relative group/export">
                                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95">
                                        <Download className="w-4 h-4" />
                                        Export Data
                                    </button>
                                    <div className="absolute right-0 top-full pt-3 w-48 opacity-0 translate-y-2 pointer-events-none group-hover/export:opacity-100 group-hover/export:translate-y-0 group-hover/export:pointer-events-auto transition-all z-50">
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                            <button
                                                onClick={() => activeTab === 'SSCE'
                                                    ? DataService.exportCustodians('excel', { state_code: userState?.code })
                                                    : DataService.exportBeceCustodians('excel', { state_code: userState?.code })}
                                                className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 transition-colors text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800"
                                            >
                                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                                Excel Spreadsheet
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="flex justify-center">
                    <div className="inline-flex p-1.5 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-inner">
                        {[
                            { id: 'SSCE', label: 'SSCE Custodians', icon: GraduationCap },
                            { id: 'BECE', label: 'BECE Custodians', icon: ShieldCheck }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'SSCE' | 'BECE')}
                                className={cn(
                                    "flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 active:scale-95",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-emerald-500" : "text-slate-400")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-[10px] font-black uppercase hover:underline">Dismiss</button>
                    </div>
                )}

                {/* Filters Bar */}
                <div className="flex flex-wrap items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-xl">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by custodian name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    <div className="flex items-center flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <SearchableSelect
                                value={selectedLga}
                                onChange={(val) => { setSelectedLga(val); setCurrentPage(1); }}
                                options={lgas.map(l => ({ value: l.code, label: l.name }))}
                                placeholder="All LGAs"
                                containerClassName="w-[180px]"
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-600 dark:text-slate-300"
                            />
                        </div>

                        <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></div>

                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Limit:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none text-slate-900 dark:text-slate-200 cursor-pointer"
                            >
                                {[10, 20, 50, 100].map(size => (
                                    <option key={size} value={size} className="dark:bg-slate-900">{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Data Section */}
                <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Custodian Code</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Custodian Name</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Town</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-8 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                                                        <div className="h-3 bg-slate-100 dark:bg-slate-800/50 rounded w-1/2"></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : paginatedCustodians.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <Search className="w-10 h-10 text-slate-400" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No Custodians Found</h3>
                                                    <p className="text-sm font-medium text-slate-500">Try adjusting your filters or search terms.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustodians.map((custodian) => (
                                        <tr key={custodian.code} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
                                            <td className="px-8 py-6">
                                                <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-emerald-400 text-[10px] font-black tracking-widest border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    {custodian.code}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                                                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                                                            {custodian.name}
                                                        </div>
                                                        {/* <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">
                                                            {custodian.lga}
                                                        </div> */}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                                        {lgas.find(l => l.code === custodian.lga_code)?.name || custodian.lga_code}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {custodian.town || 'Unspecified Town'}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditClick(custodian)}
                                                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 rounded-xl transition-all shadow-sm active:scale-90"
                                                        title="Modify Record"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCustodian(custodian.code, custodian.name)}
                                                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 rounded-xl transition-all shadow-sm active:scale-90"
                                                        title="Purge Record"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && filteredCustodians.length > 0 && (
                        <div className="p-8 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    Showing <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{startIndex + 1}</span> — <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{Math.min(startIndex + rowsPerPage, filteredCustodians.length)}</span> of <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{filteredCustodians.length}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {(() => {
                                        const pages = [];
                                        for (let i = 1; i <= totalPages; i++) {
                                            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                                                pages.push(i);
                                            } else if (i === currentPage - 2 || i === currentPage + 2) {
                                                pages.push('...');
                                            }
                                        }
                                        return [...new Set(pages)].map((p, i) => (
                                            typeof p === 'number' ? (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl text-xs font-black transition-all active:scale-90 shadow-sm",
                                                        currentPage === p
                                                            ? "bg-slate-900 dark:bg-emerald-600 text-white shadow-emerald-500/20"
                                                            : "bg-white dark:bg-slate-800 text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-slate-700"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ) : (
                                                <span key={i} className="px-2 text-slate-300">...</span>
                                            )
                                        ));
                                    })()}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm active:scale-90"
                                >
                                    <ChevronDown className="w-4 h-4 -rotate-90" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Redesigned Modals */}
            {showAddModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/20 dark:border-slate-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden scale-in animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-800/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <Plus className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">New Custodian</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Register security-sensitive personnel</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCustodian} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Custodian Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter legal name..."
                                        value={newCustodian.name}
                                        onChange={e => setNewCustodian({ ...newCustodian, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Unique Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="CUST-000"
                                        value={newCustodian.code}
                                        onChange={e => setNewCustodian({ ...newCustodian, code: e.target.value.toUpperCase() })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono font-bold text-sm uppercase"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Local Govt Area</label>
                                    <select
                                        required
                                        value={newCustodian.lga_code}
                                        onChange={e => setNewCustodian({ ...newCustodian, lga_code: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    >
                                        <option value="">Select LGA</option>
                                        {modalLgas.map(lga => (
                                            <option key={lga.code} value={lga.code}>{lga.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Town / Catchment Area</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Central Metropolitan"
                                        value={newCustodian.town}
                                        onChange={e => setNewCustodian({ ...newCustodian, town: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-8 py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-8 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Create Custodian
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingCustodian && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-white/20 dark:border-slate-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] w-full max-w-lg overflow-hidden scale-in animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between bg-white/40 dark:bg-slate-800/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <Edit2 className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Update Record</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modifying: {editingCustodian.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowEditModal(false); setEditingCustodian(null); }}
                                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateCustodian} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Custodian Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingCustodian.name}
                                        onChange={e => setEditingCustodian({ ...editingCustodian, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">ID Code (Read Only)</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={editingCustodian.code}
                                        className="w-full px-5 py-4 bg-slate-100/50 dark:bg-slate-800/20 border-2 border-transparent rounded-2xl text-slate-400 font-mono font-bold text-sm uppercase cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Local Govt Area</label>
                                    <select
                                        required
                                        value={editingCustodian.lga_code || ''}
                                        onChange={e => setEditingCustodian({ ...editingCustodian, lga_code: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    >
                                        <option value="">Select LGA</option>
                                        {modalLgas.map(lga => (
                                            <option key={lga.code} value={lga.code}>{lga.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Town / Area</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Central Area"
                                        value={editingCustodian.town || ''}
                                        onChange={e => setEditingCustodian({ ...editingCustodian, town: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Logistics Status</label>
                                    <select
                                        required
                                        value={editingCustodian.status || 'active'}
                                        onChange={e => setEditingCustodian({ ...editingCustodian, status: e.target.value })}
                                        className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-black text-sm uppercase tracking-widest"
                                    >
                                        <option value="active">Operational (Active)</option>
                                        <option value="inactive">Non-Operational</option>
                                        <option value="suspended">Restricted / Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditingCustodian(null); }}
                                    className="flex-1 px-8 py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-[2] px-8 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    Apply Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                variant={confirmDialog.variant}
                isLoading={isDeleting}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
}
