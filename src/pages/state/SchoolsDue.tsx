import React, { useMemo } from 'react';
import {
    Search,
    ChevronDown,
    ChevronRight,
    School as SchoolIcon,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { cn } from '../../components/layout/DashboardLayout';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';

type School = components['schemas']['School'];
type State = components['schemas']['State'];

export default function StateSchoolsDue() {
    const [schools, setSchools] = React.useState<School[]>([]);
    const [userState, setUserState] = React.useState<State | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedStates, setExpandedStates] = React.useState<Record<string, boolean>>({});
    const [selectedPaymentFilter, setSelectedPaymentFilter] = React.useState<string>('');
    const [selectedAccrFilter, setSelectedAccrFilter] = React.useState<string>('');

    React.useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const user = await AuthService.getCurrentUser();
            if (!user?.state_code) {
                setLoading(false);
                return;
            }

            const [schoolsData, beceSchoolsData, statesData] = await Promise.all([
                DataService.getSchools({ state_code: user.state_code }),
                DataService.getBeceSchools({ state_code: user.state_code }),
                DataService.getStates()
            ]);

            // Merge SSCE and BECE schools
            setSchools([...schoolsData, ...beceSchoolsData]);

            // Get current state info
            const currentState = statesData.find(s => s.code === user.state_code);
            setUserState(currentState || null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Determine if a school is due for accreditation
    const isDueForAccreditation = (school: School): boolean => {
        if (!school.accredited_date || !['Full', 'Partial', 'Failed'].includes(school.accreditation_status || '')) {
            return false;
        }
        const accreditedDate = new Date(school.accredited_date);
        let yearsToAdd = 5;
        if (school.accreditation_status === 'Partial') yearsToAdd = 2;
        else if (school.accreditation_status === 'Failed') yearsToAdd = 1;

        const expiryDate = new Date(accreditedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        return expiryDate <= sixMonthsFromNow;
    };

    // Filter schools that are due for accreditation
    const dueSchools = useMemo(() => {
        return schools.filter(school => {
            const isDue = isDueForAccreditation(school);
            const matchesSearch = !searchQuery ||
                school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                school.code.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPayment = !selectedPaymentFilter ||
                (selectedPaymentFilter === 'Paid' && school.approval_status === 'Approved') ||
                (selectedPaymentFilter === 'Pending' && !!school.payment_url && school.approval_status !== 'Approved') ||
                (selectedPaymentFilter === 'Unpaid' && !school.payment_url);
            const matchesAccr = !selectedAccrFilter || school.accreditation_status === selectedAccrFilter;

            return isDue && matchesSearch && matchesPayment && matchesAccr;
        });
    }, [schools, searchQuery, selectedPaymentFilter, selectedAccrFilter]);

    // Get statistics
    const getStats = (schoolsList: School[]) => {
        const total = schoolsList.length;
        const paid = schoolsList.filter(s => s.approval_status === 'Approved').length;
        const pending = schoolsList.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;
        const unpaid = total - paid - pending;
        const paymentRate = total > 0 ? Math.round((paid / total) * 100) : 0;
        return { total, paid, pending, unpaid, paymentRate };
    };

    const toggleAllStates = () => {
        if (Object.keys(expandedStates).length === 0 || !Object.values(expandedStates).every(v => v === true)) {
            const expanded: Record<string, boolean> = {};
            dueSchools.forEach(school => {
                expanded[school.state_code || 'Unknown'] = true;
            });
            setExpandedStates(expanded);
        } else {
            setExpandedStates({});
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'Full':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Full (5 Yrs)</span>;
            case 'Partial':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Partial (2 Yrs)</span>;
            case 'Failed':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Failed (1 Yr)</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Pending</span>;
        }
    };

    const stats = getStats(dueSchools);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schools Due for Accreditation</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {userState ? `Schools in ${userState.name} with payment statistics` : 'Schools with payment statistics'}
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search schools by name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm transition-all focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Payment Status Filter */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Payment Status</label>
                        <select
                            value={selectedPaymentFilter}
                            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="Paid">Paid (Verified)</option>
                            <option value="Pending">Pending Approval</option>
                            <option value="Unpaid">No Proof</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 translate-y-5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Accreditation Status Filter */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Accreditation Status</label>
                        <select
                            value={selectedAccrFilter}
                            onChange={(e) => setSelectedAccrFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="Full">Full (5 Years)</option>
                            <option value="Partial">Partial (2 Years)</option>
                            <option value="Failed">Failed (1 Year)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 translate-y-5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            {!loading && dueSchools.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Due for Accreditation</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 opacity-20" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Schools with Verified Payment</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.paid}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 opacity-20" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Schools with Unverified Payment</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 opacity-20" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Payment Rate</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.paymentRate}%</p>
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{stats.paymentRate}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                    <p className="text-slate-500 font-medium">Loading schools data...</p>
                </div>
            ) : dueSchools.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-slate-400" />
                    <p className="text-slate-500 text-center max-w-sm">
                        {schools.length === 0
                            ? 'No schools found. Contact your administrator if this is unexpected.'
                            : 'No schools are currently due for accreditation within the next 6 months.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
                        {/* Action Bar */}
                        <button
                            onClick={toggleAllStates}
                            className="w-full px-6 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800"
                        >
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                {Object.keys(expandedStates).length === 0 ? 'Expand All' : 'Collapse All'}
                            </span>
                        </button>

                        {/* Schools List */}
                        <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {dueSchools.length === 0 ? (
                                <div className="px-6 py-8 text-center text-slate-500">No schools match your filters</div>
                            ) : (
                                dueSchools.map((school) => (
                                    <div key={school.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="px-6 py-4">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{school.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{school.code}</p>
                                                </div>
                                                <div>
                                                    {getStatusBadge(school.accreditation_status)}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Accredited Date</p>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {school.accredited_date
                                                            ? new Date(school.accredited_date).toLocaleDateString()
                                                            : '-'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {school.approval_status === 'Approved' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Verified
                                                        </span>
                                                    ) : school.payment_url ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                            <Clock className="w-3 h-3" />
                                                            Pending
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Unpaid
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
