import React, { useMemo, useState, useEffect } from 'react';
import {
    Search,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Calendar,
    User,
    Activity,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';

interface AuditLog {
    id: number;
    user_id: number;
    user_role: string;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    details?: string | null;
    timestamp: string;
    ip_address?: string | null;
}

interface FilterState {
    searchTerm: string;
    days: number;
    limit: number;
}

interface AuthUser {
    id?: number;
    email?: string;
    role?: string;
}

export default function AuditLogs() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        searchTerm: '',
        days: 30,
        limit: 100,
    });
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [selectedResourceType, setSelectedResourceType] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const isAdmin = user?.role === 'admin';
    const canView = isAdmin || user?.role === 'hq';

    // Fetch user and logs on mount
    useEffect(() => {
        const initPage = async () => {
            try {
                const currentUser = await AuthService.getCurrentUser();
                setUser(currentUser);
                if (currentUser?.role === 'admin' || currentUser?.role === 'hq') {
                    await fetchLogs();
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load page');
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };
        initPage();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await DataService.getAuditLogs({
                days: filters.days,
                limit: filters.limit,
            });
            setLogs(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch audit logs');
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = !filters.searchTerm ||
                log.user_id.toString().includes(filters.searchTerm) ||
                log.action.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                log.resource_type.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                (log.resource_id && log.resource_id.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
                (log.details && log.details.toLowerCase().includes(filters.searchTerm.toLowerCase()));

            const matchesAction = !selectedAction || log.action === selectedAction;
            const matchesResourceType = !selectedResourceType || log.resource_type === selectedResourceType;

            return matchesSearch && matchesAction && matchesResourceType;
        });
    }, [logs, filters, selectedAction, selectedResourceType]);

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLogs, currentPage, itemsPerPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, selectedAction, selectedResourceType]);

    // Get unique actions and resource types for filters
    const uniqueActions = useMemo(() => [...new Set(logs.map(log => log.action))].sort(), [logs]);
    const uniqueResourceTypes = useMemo(() => [...new Set(logs.map(log => log.resource_type))].sort(), [logs]);

    // Handle selection
    const toggleLogSelection = (logId: number) => {
        const newSelected = new Set(selectedLogs);
        if (newSelected.has(logId)) {
            newSelected.delete(logId);
        } else {
            newSelected.add(logId);
        }
        setSelectedLogs(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedLogs.size === filteredLogs.length) {
            setSelectedLogs(new Set());
        } else {
            setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
        }
    };

    // Delete handlers
    const handleDeleteLog = async (logId: number) => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;

        setIsDeleting(true);
        try {
            await DataService.deleteAuditLog(logId);
            setLogs(logs.filter(log => log.id !== logId));
            setSelectedLogs(prev => {
                const newSet = new Set(prev);
                newSet.delete(logId);
                return newSet;
            });
        } catch (err: any) {
            setError(err.message || 'Failed to delete log');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLogs.size === 0) {
            setError('Please select at least one log to delete');
            return;
        }

        if (!window.confirm(`Delete ${selectedLogs.size} selected log(s)? This action cannot be undone.`)) return;

        setIsDeleting(true);
        try {
            await DataService.bulkDeleteAuditLogs(Array.from(selectedLogs));
            setLogs(logs.filter(log => !selectedLogs.has(log.id)));
            setSelectedLogs(new Set());
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete logs');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteAll = async () => {
        if (filteredLogs.length === 0) {
            setError('No logs to delete');
            return;
        }

        if (!window.confirm(`Delete all ${filteredLogs.length} visible log(s)? This action cannot be undone.`)) return;

        setIsDeleting(true);
        try {
            await DataService.bulkDeleteAuditLogs(filteredLogs.map(log => log.id));
            setLogs(logs.filter(log => !filteredLogs.map(fl => fl.id).includes(log.id)));
            setSelectedLogs(new Set());
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete logs');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-slate-600 dark:text-slate-400 text-center">
                    You do not have permission to view audit logs. Only Admin and HQ users can access this page.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
                    <p className="text-slate-500 dark:text-slate-400">System activity and user actions</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-2">
                        {selectedLogs.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                Delete Selected ({selectedLogs.size})
                            </button>
                        )}
                        <button
                            onClick={handleDeleteAll}
                            disabled={isDeleting || filteredLogs.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                        >
                            {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Delete All ({filteredLogs.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by user ID, action, resource type, ID, or details..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Days */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Days</label>
                        <select
                            value={filters.days}
                            onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 translate-y-5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Action Filter */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Action</label>
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 translate-y-5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Resource Type Filter */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Resource Type</label>
                        <select
                            value={selectedResourceType}
                            onChange={(e) => setSelectedResourceType(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Resources</option>
                            {uniqueResourceTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 translate-y-5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Result Count */}
                    <div className="flex items-end">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                            Showing <span className="font-bold text-slate-900 dark:text-white">{paginatedLogs.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> logs
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                    <p className="text-slate-500 font-medium">Loading audit logs...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-slate-400" />
                    <p className="text-slate-500 text-center max-w-sm">
                        {logs.length === 0 ? 'No audit logs found.' : 'No logs match your search filters.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                                    {isAdmin && (
                                        <th className="px-6 py-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={filteredLogs.length > 0 && selectedLogs.size === filteredLogs.length}
                                                onChange={toggleSelectAll}
                                                className="rounded cursor-pointer"
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Action</th>
                                    <th className="px-6 py-4">Resource</th>
                                    <th className="px-6 py-4">Resource ID</th>
                                    <th className="px-6 py-4">Details</th>
                                    <th className="px-6 py-4">IP Address</th>
                                    {isAdmin && <th className="px-6 py-4 text-right">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {paginatedLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {isAdmin && (
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLogs.has(log.id)}
                                                    onChange={() => toggleLogSelection(log.id)}
                                                    className="rounded cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.user_id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                                {log.user_role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                {log.resource_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.resource_id || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-xs" title={log.details || ''}>
                                                {log.details || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{log.ip_address || '-'}</span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    disabled={isDeleting}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-red-700 dark:text-red-400 rounded text-xs font-medium transition-colors"
                                                    title="Delete this log"
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredLogs.length > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-600 dark:text-slate-400">Rows per page:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
