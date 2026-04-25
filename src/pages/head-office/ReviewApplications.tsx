import React, { useMemo } from 'react';
import {
    Search,
    ChevronDown,
    ChevronRight,
    School as SchoolIcon,
    Loader2,
    AlertCircle,
    TrendingUp,
    CheckCircle2,
    Clock,
    MapPin,
    Download,
    FileText,
    RefreshCw,
    ShieldAlert,
    ShieldX,
    GraduationCap,
    Filter,
    Shield,
    Calendar
} from 'lucide-react';
import { cn } from '../../lib/utils';
import DataService from '../../api/services/data.service';
import ExportService from '../../api/services/export.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';
import { useFilterContext } from '../../context/FilterContext';

type School = components['schemas']['School'] & { school_type?: 'SSCE' | 'BECE' };
type State = components['schemas']['State'];
type Zone = components['schemas']['Zone'];
type LGA = components['schemas']['LGA'];
type Custodian = components['schemas']['Custodian'];

export default function ReviewApplications() {
    const [schools, setSchools] = React.useState<School[]>([]);
    const [states, setStates] = React.useState<State[]>([]);
    const [zones, setZones] = React.useState<Zone[]>([]);
    const [custodians, setCustodians] = React.useState<Custodian[]>([]);
    const [allLgas, setAllLgas] = React.useState<LGA[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [expandedStates, setExpandedStates] = React.useState<Record<string, boolean>>({});
    const [selectedStateFilter, setSelectedStateFilter] = React.useState<string>('');
    const [selectedPaymentFilter, setSelectedPaymentFilter] = React.useState<string>('');
    const [selectedAccrFilter, setSelectedAccrFilter] = React.useState<string>('');
    const [activeTab, setActiveTab] = React.useState<'SSCE' | 'BECE'>('SSCE');
    const [isExporting, setIsExporting] = React.useState<string | null>(null);
    const [currentUser, setCurrentUser] = React.useState<any>(null);
    const isSuperAdmin = currentUser?.email === 'admin@neco.gov.ng';

    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();

    React.useEffect(() => {
        fetchData();
        return () => {
            // Reset header filter on unmount
            setHeaderAvailableYears([]);
            setHeaderYearFilter('');
        };
    }, []);

    React.useEffect(() => {
        if (schools.length > 0) {
            const years = new Set<string>();
            schools.forEach(school => {
                if (school.accrd_year) {
                    years.add(school.accrd_year.toString());
                } else if (school.accredited_date) {
                    const date = new Date(school.accredited_date);
                    if (!isNaN(date.getFullYear())) {
                        years.add(date.getFullYear().toString());
                    }
                }
            });
            setHeaderAvailableYears(Array.from(years).sort((a, b) => b.localeCompare(a)));
        }
    }, [schools]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schoolsData, beceSchoolsData, statesData, zonesData, lgas, custodians, userData] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates(),
                DataService.getZones(),
                DataService.getLGAs(),
                DataService.getCustodians(),
                AuthService.getCurrentUser()
            ]);
            // Merge SSCE and BECE schools and add type for identification
            setSchools([
                ...schoolsData.map(s => ({ ...s, school_type: 'SSCE' as const })),
                ...beceSchoolsData.map(s => ({ ...s, school_type: 'BECE' as const }))
            ]);
            setStates(statesData);
            setZones(zonesData);
            setAllLgas(lgas);
            setCustodians(custodians);
            setCurrentUser(userData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
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
        const schoolState = states.find(s => s.code === school.state_code);
        const zone = zones.find(z => z.code === schoolState?.zone_code);
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
            const matchesState = !selectedStateFilter || school.state_code === selectedStateFilter;
            const matchesPayment = !selectedPaymentFilter ||
                (selectedPaymentFilter === 'Paid' && school.approval_status === 'Approved') ||
                (selectedPaymentFilter === 'Pending' && !!school.payment_url && school.approval_status !== 'Approved') ||
                (selectedPaymentFilter === 'Unpaid' && !school.payment_url);
            const matchesAccr = !selectedAccrFilter || school.accreditation_status === selectedAccrFilter;
            const schoolYear = school.accrd_year || (school.accredited_date ? new Date(school.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;

            // Debug log to trace what year string is being checked
            if (schoolYear && headerYearFilter) {
                // console.log(`Comparing school year ${schoolYear} with header filter ${headerYearFilter}`);
            }

            return isDue && matchesSearch && matchesState && matchesPayment && matchesAccr && matchesYear;
        });
    }, [schools, searchQuery, selectedStateFilter, selectedPaymentFilter, selectedAccrFilter, activeTab, headerYearFilter]);

    // Group due schools by state
    const schoolsByState = useMemo(() => {
        const grouped: Record<string, School[]> = {};
        dueSchools.forEach(school => {
            const stateCode = school.state_code || 'Unknown';
            if (!grouped[stateCode]) grouped[stateCode] = [];
            grouped[stateCode].push(school);
        });

        // Sort by state name and only include states with due schools
        const sortedEntries = Object.entries(grouped)
            .map(([stateCode, schoolList]) => {
                const stateName = states.find(s => s.code === stateCode)?.name || stateCode;
                return { stateCode, stateName, schools: schoolList };
            })
            .sort((a, b) => a.stateName.localeCompare(b.stateName));

        return sortedEntries;
    }, [dueSchools, states]);

    // Calculate statistics per state
    const getStateStats = (schools: School[]) => {
        const total = schools.length;
        const paid = schools.filter(s => s.approval_status === 'Approved').length;
        const pending = schools.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;
        const unpaid = total - paid - pending;
        const paymentRate = total > 0 ? Math.round((paid / total) * 100) : 0;
        return { total, paid, pending, unpaid, paymentRate };
    };

    const toggleState = (stateCode: string) => {
        setExpandedStates(prev => ({
            ...prev,
            [stateCode]: !prev[stateCode]
        }));
    };

    const handleExportExcel = async (state?: string) => {
        setIsExporting('xlsx');
        try {
            const result = await ExportService.exportSchoolsDue(
                dueSchools,
                states,
                zones,
                allLgas,
                custodians,
                state || null,
                'xlsx'
            );
            if (!result.success) {
                console.error(result.message);
            }
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportCSV = async (state?: string) => {
        setIsExporting('csv');
        try {
            const result = await ExportService.exportSchoolsDue(
                dueSchools,
                states,
                zones,
                allLgas,
                custodians,
                state || null,
                'csv'
            );
            if (!result.success) {
                console.error(result.message);
            }
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportPDF = async (state?: string) => {
        setIsExporting('pdf');
        try {
            const result = await ExportService.exportSchoolsDue(
                dueSchools,
                states,
                zones,
                allLgas,
                custodians,
                state || null,
                'pdf'
            );
            if (!result.success) {
                console.error(result.message);
            }
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportSummaryReport = async () => {
        setIsExporting('summary');
        try {
            const result = await ExportService.exportSummaryDueReport(
                schools,
                states,
                zones
            );
            if (!result.success) {
                console.error(result.message);
            }
        } catch (err) {
            console.error('Summary report error:', err);
        } finally {
            setIsExporting(null);
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        switch (status) {
            case 'Full':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50"><CheckCircle2 className="w-3 h-3" /> Full (5 Yrs)</span>;
            case 'Partial':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50"><ShieldAlert className="w-3 h-3" /> Partial (1 Yr)</span>;
            case 'Failed':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/50"><ShieldX className="w-3 h-3" /> Failed</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative z-0 pb-12">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
            <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                        <Clock className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Schools Due for Accreditation</h1>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Review & Verify Renewals</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => fetchData()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        {isSuperAdmin && (
                            <>
                                <button
                                    onClick={() => handleExportExcel()}
                                    disabled={isExporting !== null}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm shadow-blue-600/20 hover:shadow-blue-600/40"
                                    title="Download as Excel"
                                >
                                    {isExporting === 'xlsx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    Excel
                                </button>
                                <button
                                    onClick={() => handleExportCSV()}
                                    disabled={isExporting !== null}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm shadow-emerald-600/20 hover:shadow-emerald-600/40"
                                    title="Download as CSV"
                                >
                                    {isExporting === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    CSV
                                </button>
                                <button
                                    onClick={() => handleExportPDF()}
                                    disabled={isExporting !== null}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-400 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm shadow-red-600/20 hover:shadow-red-600/40"
                                    title="Download as PDF"
                                >
                                    {isExporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                    PDF
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => handleExportSummaryReport()}
                            disabled={isExporting !== null}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-lg disabled:opacity-50"
                            title="Download Summary Report"
                        >
                            {isExporting === 'summary' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                            Summary Report
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Side: Summary Stats & Filters */}
                <div className="w-full xl:w-80 flex-shrink-0 space-y-6">
                    {/* School Type Tabs */}
                    <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-300/50 dark:border-slate-700/50 shadow-inner">
                        <button
                            onClick={() => setActiveTab('SSCE')}
                            className={cn(
                                "flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                activeTab === 'SSCE'
                                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-md shadow-slate-200/50 dark:shadow-black/20 scale-[1.02]"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <SchoolIcon className="w-4 h-4" />
                            SSCE
                        </button>
                        <button
                            onClick={() => setActiveTab('BECE')}
                            className={cn(
                                "flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                activeTab === 'BECE'
                                    ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-md shadow-slate-200/50 dark:shadow-black/20 scale-[1.02]"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <GraduationCap className="w-4 h-4" />
                            BECE
                        </button>
                    </div>

                    {/* Summary Stats */}
                    {!loading && schoolsByState.length > 0 && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg transition-all p-5">
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">States Impacted</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-0.5">{schoolsByState.length}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg transition-all p-5">
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-800">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Schools Due</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-0.5">{dueSchools.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg transition-all p-5">
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Verified Payment</p>
                                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-0.5">{dueSchools.filter(s => s.approval_status === 'Approved').length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter Sidebar */}
                    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-700/50 shadow-sm p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Filter className="w-4 h-4 text-emerald-600" />
                                Filters
                            </h3>
                        </div>

                        {/* Search Bar */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Details</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="School name, code..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none"
                                />
                            </div>
                        </div>

                        {/* State Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State Office</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    value={selectedStateFilter}
                                    onChange={(e) => setSelectedStateFilter(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">All States</option>
                                    {states.map(state => (
                                        <option key={state.code} value={state.code}>{state.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Payment Status Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    value={selectedPaymentFilter}
                                    onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Paid">Paid (Verified)</option>
                                    <option value="Pending">Pending Approval</option>
                                    <option value="Unpaid">No Proof Uploaded</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Accreditation Status Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Accreditation Status</label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <select
                                    value={selectedAccrFilter}
                                    onChange={(e) => setSelectedAccrFilter(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3.5 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Full">Full (5 Years)</option>
                                    <option value="Partial">Partial (1 Year)</option>
                                    <option value="Failed">Failed (Immediately Due)</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Data Area */}
                <div className="flex-1 min-w-0">
                    {/* Content */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-700/50">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading schools data...</p>
                        </div>
                    ) : schoolsByState.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-700/50">
                            <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black text-slate-900 dark:text-white">No Schools Found</p>
                                <p className="text-sm font-bold text-slate-500 mt-1 max-w-sm">
                                    {dueSchools.length === 0
                                        ? 'No schools are currently due for accreditation within the next 6 months.'
                                        : 'No schools match your search criteria.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 relative z-10">
                            {schoolsByState.map(({ stateCode, stateName, schools: stateSchools }) => {
                                const stats = getStateStats(stateSchools);
                                const isExpanded = expandedStates[stateCode];

                                return (
                                    <div key={stateCode} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                                        {/* State Header */}
                                        <button
                                            onClick={() => toggleState(stateCode)}
                                            className="w-full px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white dark:hover:bg-slate-800 transition-colors group"
                                        >
                                            <div className="flex items-center gap-5 flex-1">
                                                <div className={cn(
                                                    "w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600",
                                                    isExpanded ? "rotate-90 bg-blue-50 dark:bg-blue-900/30 text-blue-600" : ""
                                                )}>
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{stateName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                            <SchoolIcon className="w-3 h-3" />
                                                            {stats.total} School{stats.total !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* State Stats */}
                                            <div className="flex items-center gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                                                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Paid</p>
                                                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.paid}</p>
                                                </div>
                                                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pending</p>
                                                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none">{stats.pending}</p>
                                                </div>
                                                <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Unpaid</p>
                                                    <p className="text-lg font-black text-red-600 dark:text-red-400 leading-none">{stats.unpaid}</p>
                                                </div>
                                                <div className="text-center px-3">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rate</p>
                                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{stats.paymentRate}%</p>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Schools List */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-950/30 p-2 sm:p-4">
                                                <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 shadow-sm">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead>
                                                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800/50">
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">School Name</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Accreditation</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Accredited</th>
                                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Payment</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                            {stateSchools.map((school) => (
                                                                <tr key={school.accrd_year ? `${school.code}-${school.accrd_year}` : school.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                                                                <SchoolIcon className="w-4 h-4" />
                                                                            </div>
                                                                            <span className="font-bold text-slate-900 dark:text-white">{school.name}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="font-mono text-[11px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-400 tracking-wider">{school.code}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {getStatusBadge(school.accreditation_status)}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                                            <Calendar className="w-4 h-4 text-slate-400" />
                                                                            {school.accredited_date
                                                                                ? new Date(school.accredited_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                                                                                : '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        {school.approval_status === 'Approved' ? (
                                                                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                                Verified
                                                                            </span>
                                                                        ) : school.payment_url ? (
                                                                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                Pending
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                                Unpaid
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
