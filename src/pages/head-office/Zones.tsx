import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Download,
    Upload,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Layers,
    X,
    Edit2
} from 'lucide-react';
import DataService, { Zone } from '../../api/services/data.service';

export default function Zones() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [newZone, setNewZone] = useState({
        name: '',
        code: '',
        description: '',
        status: 'active'
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            setIsLoading(true);
            const data = await DataService.getZones();
            setZones(data);
        } catch (err: any) {
            setError('Failed to fetch zones. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddZone = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await DataService.createZone(newZone);
            setShowAddModal(false);
            setNewZone({ name: '', code: '', description: '', status: 'active' });
            fetchZones();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to create zone.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (zone: Zone) => {
        setEditingZone(zone);
        setShowEditModal(true);
    };

    const handleUpdateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingZone) return;

        try {
            setIsSubmitting(true);
            await DataService.updateZone(editingZone.code, editingZone);
            setShowEditModal(false);
            setEditingZone(null);
            fetchZones();
        } catch (err: any) {
            setError(err.response?.data?.detail?.[0]?.msg || 'Failed to update zone.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredZones = zones.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.code.localeCompare(b.code));

    // Pagination logic
    const totalPages = Math.ceil(filteredZones.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedZones = filteredZones.slice(startIndex, startIndex + rowsPerPage);

    // Reset to page 1 when search term or rowsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, rowsPerPage]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-3">
                        <Layers className="w-8 h-8 text-emerald-600" />
                        Geopolitical Zones
                    </h1>
                    <p className="text-slate-700 dark:text-slate-400 mt-1 font-medium">Manage National Geopolitical Zones and their regions.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Zone</span>
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
                            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Add New Zone</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddZone} className="p-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-600 tracking-widest">Zone Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. North Central"
                                        value={newZone.name}
                                        onChange={e => setNewZone({ ...newZone, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Zone Code</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. NC"
                                        value={newZone.code}
                                        onChange={e => setNewZone({ ...newZone, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Description</label>
                                    <textarea
                                        placeholder="Optional description..."
                                        value={newZone.description}
                                        onChange={e => setNewZone({ ...newZone, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
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
                                    Create Zone
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingZone && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Zone: {editingZone.name}</h2>
                            <button onClick={() => { setShowEditModal(false); setEditingZone(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateZone} className="p-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Zone Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingZone.name}
                                        onChange={e => setEditingZone({ ...editingZone, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Zone Code</label>
                                    <input
                                        type="text"
                                        required
                                        disabled
                                        value={editingZone.code}
                                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 outline-none cursor-not-allowed uppercase"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Description</label>
                                    <textarea
                                        value={editingZone.description || ''}
                                        onChange={e => setEditingZone({ ...editingZone, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-black uppercase text-slate-400 tracking-widest">Status</label>
                                    <select
                                        required
                                        value={editingZone.status}
                                        onChange={e => setEditingZone({ ...editingZone, status: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditingZone(null); }}
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
                <div className="p-4 border-b border-slate-300 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-200 dark:bg-slate-900/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input
                            type="text"
                            placeholder="Search zones..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                        />
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
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-200 dark:bg-slate-800/80 text-slate-700 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Zone Code</th>
                                <th className="px-6 py-4">Zone Name</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={3} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedZones.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Layers className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                                            <p className="text-slate-500 dark:text-slate-400 font-medium">No zones found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedZones.map((zone) => (
                                    <tr key={zone.code} className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-400 text-sm font-mono font-bold">
                                                {zone.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-base font-bold text-slate-950 dark:text-white group-hover:text-emerald-600 transition-colors">
                                                {zone.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(zone)}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-all"
                                                    title="Edit Zone"
                                                >
                                                    <Edit2 className="w-4 h-4" />
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

                {!isLoading && filteredZones.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <p>
                            Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">
                                {Math.min(startIndex + rowsPerPage, filteredZones.length)}
                            </span> of{' '}
                            <span className="font-semibold text-slate-900 dark:text-white">{filteredZones.length}</span> zones
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
    );
}
