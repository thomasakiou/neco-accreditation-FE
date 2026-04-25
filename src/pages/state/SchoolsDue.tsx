import React, { useMemo } from 'react';
import {
    Search,
    ChevronDown,
    ChevronRight,
    School as SchoolIcon,
    GraduationCap,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { useFilterContext } from '../../context/FilterContext';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { Trash2 } from 'lucide-react';
import { components } from '../../api/types';

type School = components['schemas']['School'] & { school_type?: 'SSCE' | 'BECE' };
type State = components['schemas']['State'];

export default function StateSchoolsDue() {
    const [schools, setSchools] = React.useState<School[]>([]);
    const [userState, setUserState] = React.useState<State | null>(null);
    const [zones, setZones] = React.useState<components['schemas']['Zone'][]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedStates, setExpandedStates] = React.useState<Record<string, boolean>>({});
    const [selectedPaymentFilter, setSelectedPaymentFilter] = React.useState<string>('');
    const [selectedAccrFilter, setSelectedAccrFilter] = React.useState<string>('');
    const [activeTab, setActiveTab] = React.useState<'SSCE' | 'BECE'>('SSCE');
    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
    const [selectedSchools, setSelectedSchools] = React.useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = React.useState({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        variant: 'primary' as 'primary' | 'danger',
        onConfirm: () => { },
    });

    React.useEffect(() => {
        fetchData();
    }, []);

    React.useEffect(() => {
        if (schools.length > 0) {
            const years = Array.from(new Set(schools
                .filter(s => (s as any).school_type === activeTab)
                .map(s => (s as any).accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : ''))
                .filter(Boolean)
            )).sort((a, b) => (b as string).localeCompare(a as string));

            setHeaderAvailableYears(years);

            if (!headerYearFilter && years.length > 0) {
                const currentYear = new Date().getFullYear().toString();
                const prevYear = (new Date().getFullYear() - 1).toString();
                if (years.includes(currentYear)) setHeaderYearFilter(currentYear);
                else if (years.includes(prevYear)) setHeaderYearFilter(prevYear);
                else setHeaderYearFilter(years[0]);
            }
        }
    }, [schools, activeTab]);

    React.useEffect(() => {
        return () => {
            setHeaderAvailableYears([]);
            setHeaderYearFilter('');
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const user = await AuthService.getCurrentUser();
            if (!user?.state_code) {
                setLoading(false);
                return;
            }

            const [schoolsData, beceSchoolsData, statesData, zonesData] = await Promise.all([
                DataService.getSchools({ state_code: user.state_code }),
                DataService.getBeceSchools({ state_code: user.state_code }),
                DataService.getStates(),
                DataService.getZones()
            ]);

            setZones(zonesData);

            // Merge SSCE and BECE schools and add type for identification
            setSchools([
                ...schoolsData.map(s => ({ ...s, school_type: 'SSCE' as const })),
                ...beceSchoolsData.map(s => ({ ...s, school_type: 'BECE' as const }))
            ]);

            // Get current state info
            const currentState = statesData.find(s => s.code === user.state_code);
            setUserState(currentState || null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
            setSelectedSchools(new Set());
        }
    };

    const toggleSelectSchool = (schoolCode: string, accrdYear?: string | number) => {
        const rowId = accrdYear ? `${schoolCode}-${accrdYear}` : String(schoolCode);
        const newSelected = new Set(selectedSchools);
        if (newSelected.has(rowId)) {
            newSelected.delete(rowId);
        } else {
            newSelected.add(rowId);
        }
        setSelectedSchools(newSelected);
    };

    const toggleSelectAll = (filteredSchools: School[]) => {
        const allFilteredIds = filteredSchools.map(s => s.accrd_year ? `${s.code}-${s.accrd_year}` : String(s.code));
        const allSelected = allFilteredIds.every(id => selectedSchools.has(id));

        if (allSelected && allFilteredIds.length > 0) {
            const newSelected = new Set(selectedSchools);
            allFilteredIds.forEach(id => newSelected.delete(id));
            setSelectedSchools(newSelected);
        } else {
            const newSelected = new Set(selectedSchools);
            allFilteredIds.forEach(id => newSelected.add(id));
            setSelectedSchools(newSelected);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedSchools.size === 0) return;

        setConfirmDialog({
            isOpen: true,
            title: `Delete Selected ${activeTab} Schools`,
            message: `Are you sure you want to delete the ${selectedSchools.size} selected schools? This action cannot be undone.`,
            confirmLabel: 'Delete Selected',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    setIsDeleting(true);
                    setError(null);
                    const idsToDelete: string[] = Array.from(selectedSchools);

                    for (const id of idsToDelete) {
                        const [code, accrd_year] = id.includes('-') ? id.split('-') : [id, undefined];
                        if (activeTab === 'SSCE') {
                            await DataService.deleteSchool(code, accrd_year);
                        } else {
                            await DataService.deleteBeceSchool(code, accrd_year);
                        }
                    }

                    await fetchData();
                    setSelectedSchools(new Set());
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    setError(`Failed to delete some selected schools. Please refresh and try again.`);
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    // Determine if a school is due for accreditation
    const isDueForAccreditation = (school: School): boolean => {
        if (school.accreditation_status === 'Failed') return true;
        if (!school.accredited_date || !['Full', 'Partial'].includes(school.accreditation_status || '')) {
            return false;
        }
        const accreditedDate = new Date(school.accredited_date);
        let yearsToAdd = 5;

        // Check if school is in a foreign zone
        const schoolState = userState || { code: school.state_code, zone_code: '' };
        const zone = zones.find(z => z.code === (schoolState as any).zone_code);
        const isForeign = zone?.name.toLowerCase().includes('foreign') || zone?.name.toLowerCase().includes('foriegn');

        if (isForeign) {
            yearsToAdd = 10;
        } else if (school.accreditation_status === 'Partial') {
            yearsToAdd = 1;
        }

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
            const matchesType = school.school_type === activeTab;
            if (!matchesType) return false;

            const isDue = isDueForAccreditation(school);
            const matchesSearch = !searchQuery ||
                school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                school.code.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPayment = !selectedPaymentFilter ||
                (selectedPaymentFilter === 'Paid' && school.approval_status === 'Approved') ||
                (selectedPaymentFilter === 'Pending' && !!school.payment_url && school.approval_status !== 'Approved') ||
                (selectedPaymentFilter === 'Unpaid' && !school.payment_url);
            const matchesAccr = !selectedAccrFilter || school.accreditation_status === selectedAccrFilter;

            const schoolYear = (school as any).accrd_year || (school.accredited_date ? new Date(school.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;

            return isDue && matchesSearch && matchesPayment && matchesAccr && matchesYear;
        });
    }, [schools, searchQuery, selectedPaymentFilter, selectedAccrFilter, activeTab, headerYearFilter]);

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
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Partial (1 Yr)</span>;
            case 'Failed':
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Failed</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Pending</span>;
        }
    };

    const stats = getStats(dueSchools);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Action Required</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Schools Due <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">for Accreditation</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                            {userState ? `Reviewing accreditation cycles and payment statuses for schools in ${userState.name}.` : 'Comprehensive overview of schools requiring immediate accreditation updates.'}
                        </p>
                    </div>

                    <button
                        onClick={() => fetchData()}
                        disabled={loading}
                        className="group/btn relative flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/50 transition-all shadow-lg hover:shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-4 h-4 transition-transform duration-500 group-hover/btn:rotate-180", loading && "animate-spin")} />
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Type Switcher */}
                <div className="p-1.5 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-inner flex items-center gap-1">
                    {[
                        { id: 'SSCE' as const, label: 'SSCE', icon: SchoolIcon },
                        { id: 'BECE' as const, label: 'BECE', icon: GraduationCap }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20 scale-105"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4 transition-transform", activeTab === tab.id && "scale-110")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filters Glass Card */}
                <div className="w-full lg:w-auto flex flex-wrap items-center gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-xl">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent border-none rounded-xl text-sm font-medium focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                        />
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <select
                            value={selectedPaymentFilter}
                            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                            className="px-4 py-2 bg-transparent border-none text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer hover:text-emerald-600 transition-colors"
                        >
                            <option value="" className="dark:bg-slate-900">All Payments</option>
                            <option value="Paid" className="dark:bg-slate-900">Verified Only</option>
                            <option value="Pending" className="dark:bg-slate-900">Pending Only</option>
                            <option value="Unpaid" className="dark:bg-slate-900">Unpaid Only</option>
                        </select>
                        <select
                            value={selectedAccrFilter}
                            onChange={(e) => setSelectedAccrFilter(e.target.value)}
                            className="px-4 py-2 bg-transparent border-none text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer hover:text-emerald-600 transition-colors"
                        >
                            <option value="" className="dark:bg-slate-900">All Accr.</option>
                            <option value="Full" className="dark:bg-slate-900">Full (5yr)</option>
                            <option value="Partial" className="dark:bg-slate-900">Partial (1yr)</option>
                            <option value="Failed" className="dark:bg-slate-900">Failed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Stats Grid */}
            {!loading && dueSchools.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Due', value: stats.total, icon: Clock, color: 'emerald', bg: 'emerald' },
                        { label: 'Verified Paid', value: stats.paid, icon: CheckCircle2, color: 'emerald', bg: 'emerald' },
                        { label: 'Pending Approval', value: stats.pending, icon: AlertCircle, color: 'amber', bg: 'amber' },
                        { label: 'Payment Rate', value: `${stats.paymentRate}%`, icon: RefreshCw, color: 'blue', bg: 'blue' }
                    ].map((stat, i) => (
                        <div key={i} className="group relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg p-6 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-xl transition-all hover:-translate-y-1">
                            <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-${stat.bg}-500/10 rounded-full blur-3xl group-hover:bg-${stat.bg}-500/20 transition-all duration-500`}></div>
                            <div className="relative flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                                </div>
                                <div className={`p-4 rounded-2xl bg-${stat.bg}-500/10 border border-${stat.bg}-500/20`}>
                                    <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main Content Area */}
            <div className="relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <SchoolIcon className="w-6 h-6 text-emerald-600 animate-pulse" />
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-xs">Synchronizing Records...</p>
                    </div>
                ) : dueSchools.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl text-center p-8">
                        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
                            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xl font-black text-slate-900 dark:text-white">All Clear</p>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                                {schools.length === 0
                                    ? 'No schools found for this region. Verify synchronization settings.'
                                    : 'No schools are currently due for accreditation in the upcoming 6-month cycle.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden">
                        {/* List Actions */}
                        <div className="px-8 py-5 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-800/20">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={dueSchools.length > 0 && dueSchools.every(s => selectedSchools.has(s.accrd_year ? `${s.code}-${s.accrd_year}` : String(s.code)))}
                                            onChange={() => toggleSelectAll(dueSchools)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-700 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all duration-300"></div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Select All</span>
                                </label>

                                <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700"></div>

                                <button
                                    onClick={toggleAllStates}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
                                >
                                    {Object.keys(expandedStates).length === 0 ? 'Expand Details' : 'Collapse Details'}
                                </button>
                            </div>

                            {selectedSchools.size > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={isDeleting}
                                    className="group flex items-center gap-3 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
                                >
                                    <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    Delete Selection ({selectedSchools.size})
                                </button>
                            )}
                        </div>

                        {/* Modernized Schools List */}
                        <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                            {dueSchools.map((school) => {
                                const rowId = school.accrd_year ? `${school.code}-${school.accrd_year}` : school.code;
                                const isSelected = selectedSchools.has(rowId);

                                return (
                                    <div key={rowId} className={cn(
                                        "group relative flex items-center transition-all duration-300",
                                        isSelected ? "bg-emerald-500/5" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                    )}>
                                        {/* Selection Indicator */}
                                        <div className="pl-8 py-6">
                                            <label className="relative cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectSchool(school.code, school.accrd_year)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-700 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all duration-300"></div>
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                            </label>
                                        </div>

                                        <div className="flex-1 px-8 py-6">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                                {/* School Name & Code */}
                                                <div className="md:col-span-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-inner">
                                                            <SchoolIcon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-emerald-600 transition-colors">{school.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{school.code}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{school.lga_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Accreditation Status Badge */}
                                                <div className="md:col-span-2">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Level</span>
                                                        {getStatusBadge(school.accreditation_status)}
                                                    </div>
                                                </div>

                                                {/* Date Info */}
                                                <div className="md:col-span-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Accredited</span>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                            {school.accredited_date
                                                                ? new Date(school.accredited_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                                : 'Not Recorded'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Payment Status */}
                                                <div className="md:col-span-3 text-right">
                                                    <div className="inline-flex flex-col items-end gap-1.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Status</span>
                                                        {school.approval_status === 'Approved' ? (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Verified Payment</span>
                                                            </div>
                                                        ) : school.payment_url ? (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Verification</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">No Proof Uploaded</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
        </div>
    );
}
