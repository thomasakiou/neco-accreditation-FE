import React, { useState, useEffect } from 'react';
import {
    Map,
    Plus,
    Upload,
    Search,
    Filter,
    MoreVertical,
    Trash2,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle2,
    X,
    Edit2,
    Lock,
    Unlock
} from 'lucide-react';
import DataService, { Zone } from '../../api/services/data.service';
import { components } from '../../api/types';
import ConfirmDialog from '../../components/modals/ConfirmDialog';

type State = components['schemas']['State'];

export default function HeadOfficeStates() {
    const [states, setStates] = useState<State[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedZone, setSelectedZone] = useState<string>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingState, setEditingState] = useState<State | null>(null);
    const [uploadProgress, setUploadProgress] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [newState, setNewState] = useState({
        name: '',
        code: '',
        capital: '',
        zone_code: '',
        email: '',
        status: 'active'
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        variant?: 'danger' | 'warning';
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setIsLoading(true);
            const [statesData, zonesData] = await Promise.all([
                DataService.getStates(),
                DataService.getZones()
            ]);
            setStates(statesData);
            setZones(zonesData);
        } catch (err: any) {
            setError('Failed to load data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const getZoneName = (zoneCode: string) => {
        const zone = zones.find(z => z.code === zoneCode);
        return zone ? zone.name : zoneCode;
    };

    const handleAddState = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newState.name || !newState.code || !newState.zone_code) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await DataService.createState({
                ...newState,
                email: newState.email || null
            });
            setShowAddModal(false);
            setNewState({ name: '', code: '', capital: '', zone_code: '', email: '', status: 'active' });
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to create state. The code might already exist.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (state: State) => {
        setEditingState(state);
        setShowEditModal(true);
    };

    const handleUpdateState = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingState) return;

        try {
            setIsSubmitting(true);
            setError(null);
            await DataService.updateState(editingState.code, {
                name: editingState.name,
                capital: editingState.capital,
                zone_code: editingState.zone_code,
                email: editingState.email || null,
                status: editingState.status,
                is_locked: editingState.is_locked
            });
            setShowEditModal(false);
            setEditingState(null);
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to update state.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadProgress('uploading');
            await DataService.uploadStates(file);
            setUploadProgress('success');
            fetchAllData();
            setTimeout(() => setUploadProgress('idle'), 3000);
        } catch (err: any) {
            setUploadProgress('error');
            setError('Failed to upload states. Ensure the file format is correct.');
        }
    };

    const handleDeleteAll = async () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete All States',
            message: 'Are you sure you want to delete all states? This action cannot be undone. All associated LGAs, custodians, and schools will be permanently removed.',
            confirmLabel: 'Delete All',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    await DataService.deleteAllStates();
                    setStates([]);
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError('Failed to delete states.');
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const handleDeleteState = async (code: string, name: string) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete State',
            message: `Are you sure you want to delete "${name}"? All associated LGAs, custodians, and schools will be affected.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    await DataService.deleteState(code);
                    fetchAllData();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError('Failed to delete state.');
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const handleToggleLock = async (stateCode: string, currentLocked: boolean) => {
        try {
            setIsSubmitting(true);
            if (currentLocked) {
                await DataService.unlockStates({ state_code: stateCode });
            } else {
                await DataService.lockStates({ state_code: stateCode });
            }
            fetchAllData();
        } catch (err: any) {
            setError(`Failed to ${currentLocked ? 'unlock' : 'lock'} state.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLockAll = async (lock: boolean) => {
        setConfirmDialog({
            isOpen: true,
            title: lock ? 'Lock All States' : 'Unlock All States',
            message: `Are you sure you want to ${lock ? 'lock' : 'unlock'} all states? ${lock ? 'State users will not be able to make changes.' : 'State users will regain editing access.'}`,
            confirmLabel: lock ? 'Lock All' : 'Unlock All',
            variant: 'warning',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    if (lock) {
                        await DataService.lockStates({ state_code: null });
                    } else {
                        await DataService.unlockStates({ state_code: null });
                    }
                    fetchAllData();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError(`Failed to ${lock ? 'lock' : 'unlock'} all states.`);
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const filteredStates = states
        .filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.capital?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getZoneName(s.zone_code).toLowerCase().includes(searchTerm.toLowerCase());

            const matchesZone = selectedZone === 'all' || s.zone_code === selectedZone;

            return matchesSearch && matchesZone;
        })
        .sort((a, b) => a.code.localeCompare(b.code));

    // Pagination logic
    const totalPages = Math.ceil(filteredStates.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedStates = filteredStates.slice(startIndex, startIndex + rowsPerPage);

    // Reset to page 1 when search term, selectedZone or rowsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedZone, rowsPerPage]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">States Management</h1>
                        <p className="text-slate-700 dark:text-slate-400 font-medium">View and manage all registered states in the federation.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-slate-200 text-sm font-bold shadow-sm">
                            <Upload className="w-4 h-4" />
                            <span>Upload States</span>
                            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleUpload} />
                        </label>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleLockAll(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs font-bold border border-slate-300 dark:border-slate-700"
                                title="Lock All States"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Lock All</span>
                            </button>
                            <button
                                onClick={() => handleLockAll(false)}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs font-bold border border-slate-300 dark:border-slate-700"
                                title="Unlock All States"
                            >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock All</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add State</span>
                        </button>

                        <button
                            onClick={handleDeleteAll}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete All States"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modals */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Add New State</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleAddState} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-600 tracking-widest">State Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Lagos"
                                        value={newState.name}
                                        onChange={e => setNewState({ ...newState, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Capital City</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ikeja"
                                        value={newState.capital}
                                        onChange={e => setNewState({ ...newState, capital: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">State Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. LA"
                                        value={newState.code}
                                        onChange={e => setNewState({ ...newState, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Official Email</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. lagos@neco.gov.ng"
                                        value={newState.email}
                                        onChange={e => setNewState({ ...newState, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                    <p className="text-[10px] text-slate-500 font-medium">State account credentials will be sent here.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Zone</label>
                                    <select
                                        required
                                        value={newState.zone_code}
                                        onChange={e => setNewState({ ...newState, zone_code: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="">Select a Zone</option>
                                        {zones.map(zone => (
                                            <option key={zone.code} value={zone.code}>{zone.name}</option>
                                        ))}
                                    </select>
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
                                        Create State
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditModal && editingState && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit State: {editingState.name}</h2>
                                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateState} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">State Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Lagos"
                                        value={editingState.name}
                                        onChange={e => setEditingState({ ...editingState, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Capital City</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Ikeja"
                                        value={editingState.capital || ''}
                                        onChange={e => setEditingState({ ...editingState, capital: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Official Email</label>
                                    <input
                                        type="email"
                                        placeholder="e.g. lagos@neco.gov.ng"
                                        value={editingState.email || ''}
                                        onChange={e => setEditingState({ ...editingState, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Zone</label>
                                    <select
                                        required
                                        value={editingState.zone_code}
                                        onChange={e => setEditingState({ ...editingState, zone_code: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="">Select a Zone</option>
                                        {zones.map(zone => (
                                            <option key={zone.code} value={zone.code}>{zone.name}</option>
                                        ))}
                                    </select>
                                </div>


                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
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
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {uploadProgress === 'uploading' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm font-medium">Uploading states data... Please wait.</p>
                    </div>
                )}

                {uploadProgress === 'success' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3 text-emerald-700 dark:text-emerald-400 animate-in fade-in slide-in-from-top-4">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="text-sm font-medium">States data uploaded successfully!</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-xs font-bold uppercase tracking-wider">Dismiss</button>
                    </div>
                )}

                {/* States Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Search states by name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Zone:</span>
                                <select
                                    value={selectedZone}
                                    onChange={(e) => setSelectedZone(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="all">All Zones</option>
                                    {zones.map(zone => (
                                        <option key={zone.code} value={zone.code}>{zone.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rows per page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                                >
                                    {[10, 20, 50].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    onClick={() => DataService.exportStates('excel')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                    title="Export Excel"
                                >
                                    <Download className="w-4 h-4 text-emerald-600" />
                                    EXCEL
                                </button>
                                <button
                                    onClick={() => DataService.exportStates('csv')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                    title="Export CSV"
                                >
                                    <Download className="w-4 h-4 text-blue-600" />
                                    CSV
                                </button>
                                <button
                                    onClick={() => DataService.exportStates('dbf')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                    title="Export DBF (FoxPro)"
                                >
                                    <Download className="w-4 h-4 text-orange-600" />
                                    DBF
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-200 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">State</th>
                                    <th className="px-6 py-4">Capital</th>
                                    <th className="px-6 py-4">Zone</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                                            <p className="text-slate-400 text-sm">Retrieving states data...</p>
                                        </td>
                                    </tr>
                                ) : filteredStates.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Map className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="text-slate-900 dark:text-white font-medium">No states found</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your search or upload a new database.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedStates.map((state) => (
                                        <tr key={state.code} className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-400 text-sm font-mono font-bold">
                                                    {state.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-base font-bold text-slate-950 dark:text-white">{state.name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-900 dark:text-slate-400 font-medium">{state.capital}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-900 dark:text-slate-400 font-medium">{getZoneName(state.zone_code)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {state.is_locked ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                        <Lock className="w-3 h-3" />
                                                        Locked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                        <Unlock className="w-3 h-3" />
                                                        Unlocked
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleLock(state.code, !!state.is_locked)}
                                                        className={`p-1.5 rounded-lg transition-all ${state.is_locked ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}`}
                                                        title={state.is_locked ? "Unlock State" : "Lock State"}
                                                    >
                                                        {state.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(state)}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all"
                                                        title="Edit State"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteState(state.code, state.name)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                        title="Delete State"
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

                    {!isLoading && filteredStates.length > 0 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <p>
                                Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    {Math.min(startIndex + rowsPerPage, filteredStates.length)}
                                </span> of{' '}
                                <span className="font-semibold text-slate-900 dark:text-white">{filteredStates.length}</span> states
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                                >
                                    Previous
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        // Basic pagination logic: show first, last, and current ± 1
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all font-bold text-xs ${currentPage === page
                                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (
                                            (page === currentPage - 2 && page > 1) ||
                                            (page === currentPage + 2 && page < totalPages)
                                        ) {
                                            return <span key={page} className="px-1 text-slate-300 dark:text-slate-600">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
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
