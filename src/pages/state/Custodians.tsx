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
    Filter
} from 'lucide-react';
import DataService, { Custodian, State, LGA } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import ConfirmDialog from '../../components/modals/ConfirmDialog';

export default function StateCustodians() {
    const [custodians, setCustodians] = useState<Custodian[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
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

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const user = await AuthService.getCurrentUser();
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
                DataService.getCustodians({ state_code: stateCode }),
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
    }, []);

    const handleAddCustodian = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await DataService.createCustodian(newCustodian);
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
            await DataService.updateCustodian(editingCustodian.code, editingCustodian);
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
                    await DataService.deleteCustodian(code);
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
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-emerald-600" />
                            Custodians ({userState?.name || userState?.code || 'State'})
                        </h1>
                        <p className="text-slate-700 dark:text-slate-400 mt-1 font-medium">Manage school custodians in your state.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Custodian</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="text-xs font-bold uppercase hover:underline">Dismiss</button>
                    </div>
                )}

                {/* Modals */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Add New Custodian</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddCustodian} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-600 tracking-widest">Custodian Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. John Doe"
                                            value={newCustodian.name}
                                            onChange={e => setNewCustodian({ ...newCustodian, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian Code</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. CUST001"
                                            value={newCustodian.code}
                                            onChange={e => setNewCustodian({ ...newCustodian, code: e.target.value.toUpperCase() })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">LGA</label>
                                        <select
                                            required
                                            value={newCustodian.lga_code}
                                            onChange={e => setNewCustodian({ ...newCustodian, lga_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="">Select LGA</option>
                                            {modalLgas.map(lga => (
                                                <option key={lga.code} value={lga.code}>{lga.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Town/Area</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Central Area"
                                            value={newCustodian.town}
                                            onChange={e => setNewCustodian({ ...newCustodian, town: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Create Custodian
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditModal && editingCustodian && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Custodian: {editingCustodian.name}</h2>
                                <button onClick={() => { setShowEditModal(false); setEditingCustodian(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateCustodian} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingCustodian.name}
                                            onChange={e => setEditingCustodian({ ...editingCustodian, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Custodian Code</label>
                                        <input
                                            type="text"
                                            required
                                            disabled
                                            value={editingCustodian.code}
                                            className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 outline-none cursor-not-allowed font-mono uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">LGA</label>
                                        <select
                                            required
                                            value={editingCustodian.lga_code || ''}
                                            onChange={e => setEditingCustodian({ ...editingCustodian, lga_code: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        >
                                            <option value="">Select LGA</option>
                                            {modalLgas.map(lga => (
                                                <option key={lga.code} value={lga.code}>{lga.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Town/Area</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Central Area"
                                            value={editingCustodian.town || ''}
                                            onChange={e => setEditingCustodian({ ...editingCustodian, town: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Status</label>
                                        <select
                                            required
                                            value={editingCustodian.status || 'active'}
                                            onChange={e => setEditingCustodian({ ...editingCustodian, status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditModal(false); setEditingCustodian(null); }}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Content Container */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between bg-slate-200 dark:bg-slate-900/50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Search custodians..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-1 max-w-sm ml-4">
                            <div className="relative flex-1">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={selectedLga}
                                    onChange={(e) => { setSelectedLga(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">All LGAs</option>
                                    {lgas.map(l => (
                                        <option key={l.code} value={l.code}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rows:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold py-1.5 pl-2 pr-6 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                            >
                                {[10, 20, 50].map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <button
                                onClick={() => DataService.exportCustodians('excel')}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                title="Export Excel"
                            >
                                <Download className="w-4 h-4 text-emerald-600" />
                                EXCEL
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Custodian Name</th>
                                    <th className="px-6 py-4">LGA</th>
                                    <th className="px-6 py-4">Town</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : paginatedCustodians.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <ShieldCheck className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                                                <p className="text-slate-500 dark:text-slate-400 font-medium">No custodians found in your state</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustodians.map((custodian) => (
                                        <tr key={custodian.code} className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-400 text-xs font-mono font-black">
                                                    {custodian.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-slate-950 dark:text-white group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
                                                    {custodian.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    {lgas.find(l => l.code === custodian.lga_code)?.name || custodian.lga_code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                                                    {custodian.town || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(custodian)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all"
                                                        title="Edit Custodian"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCustodian(custodian.code, custodian.name)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                        title="Delete Custodian"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1.5">
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

                    {!isLoading && filteredCustodians.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                            <p className="font-medium">
                                Showing <span className="font-black text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
                                <span className="font-black text-slate-900 dark:text-white">
                                    {Math.min(startIndex + rowsPerPage, filteredCustodians.length)}
                                </span> of{' '}
                                <span className="font-black text-slate-900 dark:text-white">{filteredCustodians.length}</span> custodians
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        if (
                                            totalPages <= 5 ||
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all ${currentPage === pageNum
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            pageNum === currentPage - 2 ||
                                            pageNum === currentPage + 2
                                        ) {
                                            return <span key={pageNum} className="px-1 text-slate-400 font-black">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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
