import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    Search,
    Filter,
    CheckCircle2,
    FileText,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronRight,
    Upload,
    Shield,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    Calendar,
    Image as ImageIcon,
    Printer,
    RefreshCw,
    GraduationCap,
    BookOpen,
    Library,
    Clock
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { clearStaticCache } from '../../api/services/data.service';
import { baseURL } from '../../api/client';
import { components } from '../../api/types';
import SearchableSelect from '../../components/common/SearchableSelect';
import { useFilterContext } from '../../context/FilterContext';
import { cn } from '../../lib/utils';

type School = components['schemas']['School'] & { school_type?: 'SSCE' | 'BECE' };
type State = components['schemas']['State'];

export default function HeadOfficeFinalApproval() {
    const [schools, setSchools] = useState<School[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [zones, setZones] = useState<components['schemas']['Zone'][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchoolType, setSelectedSchoolType] = useState<'SSCE' | 'BECE'>('SSCE');
    const [selectedStateFilter, setSelectedStateFilter] = useState('');
    const [selectedAccrFilter, setSelectedAccrFilter] = useState('');
    const [selectedProofFilter, setSelectedProofFilter] = useState('');
    const [selectedDueFilter, setSelectedDueFilter] = useState('');
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
    const [currentUser, setCurrentUser] = useState<any>(null);

    const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();

    // Review modal
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accrType, setAccrType] = useState<'Full' | 'Partial' | 'Failed'>('Full');
    const [accrDate, setAccrDate] = useState(new Date().toISOString().split('T')[0]);

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyingSchool, setVerifyingSchool] = useState<School | null>(null);

    // Track if we've initialized the default year
    const hasInitializedYear = useRef(false);

    useEffect(() => {
        fetchData();
        return () => {
            // Reset header filter on unmount
            setHeaderAvailableYears([]);
            setHeaderYearFilter('');
            hasInitializedYear.current = false;
        };
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [schoolsData, beceSchoolsData, statesData, zonesData, userData] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates(),
                DataService.getZones(),
                AuthService.getCurrentUser()
            ]);
            setCurrentUser(userData);
            // Merge SSCE and BECE schools and add type for identification
            setSchools([
                ...schoolsData.map(s => ({ ...s, school_type: 'SSCE' as const })),
                ...beceSchoolsData.map(s => ({ ...s, school_type: 'BECE' as const }))
            ]);
            setStates(statesData);
            setZones(zonesData);
            // Collapse all states by default for faster rendering
            setExpandedStates({});
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStateName = (code: string) => {
        return states.find(s => s.code === code)?.name || code;
    };

    useEffect(() => {
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
            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            setHeaderAvailableYears(sortedYears);

            // Default to current year or previous year on initial load
            if (!hasInitializedYear.current && sortedYears.length > 0) {
                const currentYear = new Date().getFullYear().toString();
                const prevYear = (new Date().getFullYear() - 1).toString();

                if (sortedYears.includes(currentYear)) {
                    setHeaderYearFilter(currentYear);
                } else if (sortedYears.includes(prevYear)) {
                    setHeaderYearFilter(prevYear);
                } else {
                    setHeaderYearFilter(sortedYears[0]);
                }
                hasInitializedYear.current = true;
            }
        }
    }, [schools, setHeaderAvailableYears, setHeaderYearFilter]);

    const filteredSchools = useMemo(() => {
        return schools.filter(school => {
            const matchesType = school.school_type === selectedSchoolType;
            if (!matchesType) return false;

            const matchesSearch = !searchTerm ||
                school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                school.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesState = !selectedStateFilter || school.state_code === selectedStateFilter;
            const matchesAccr = !selectedAccrFilter ||
                (selectedAccrFilter === 'Accredited' && (school.accreditation_status === 'Full' || school.accreditation_status === 'Partial')) ||
                (selectedAccrFilter === 'Unaccredited' && (!school.accreditation_status || school.accreditation_status === 'Pending' || school.accreditation_status === 'Failed')) ||
                (selectedAccrFilter === school.accreditation_status);
            const matchesProof = !selectedProofFilter ||
                (selectedProofFilter === 'Proof' && !!school.payment_url) ||
                (selectedProofFilter === 'No Proof' && !school.payment_url) ||
                (selectedProofFilter === 'Pending' && !!school.payment_url && (!school.accreditation_status || ['Pending', 'Unaccredited'].includes(school.accreditation_status))) ||
                (selectedProofFilter === 'Approved' && school.approval_status === 'Approved') ||
                (selectedProofFilter === 'Unapproved' && !!school.payment_url && school.approval_status !== 'Approved');

            const isDue = () => {
                if (school.accreditation_status === 'Failed') return true;
                if (!school.accredited_date || !['Full', 'Partial'].includes(school.accreditation_status || '')) return false;
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

            const matchesDue = !selectedDueFilter ||
                (selectedDueFilter === 'Due' && isDue()) ||
                (selectedDueFilter === 'Not Due' && !isDue());

            const schoolYear = school.accrd_year || (school.accredited_date ? new Date(school.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;

            // Debug log to trace what year string is being checked
            if (schoolYear && headerYearFilter) {
                // console.log(`Comparing school year ${schoolYear} with header filter ${headerYearFilter}`);
            }

            return matchesSearch && matchesState && matchesAccr && matchesProof && matchesDue && matchesYear;
        });
    }, [schools, searchTerm, selectedStateFilter, selectedAccrFilter, selectedProofFilter, selectedDueFilter, headerYearFilter, selectedSchoolType]);

    // Group filtered schools by state
    const schoolsByState = useMemo(() => {
        const grouped: Record<string, School[]> = {};
        filteredSchools.forEach(school => {
            const stateCode = school.state_code || 'Unknown';
            if (!grouped[stateCode]) grouped[stateCode] = [];
            grouped[stateCode].push(school);
        });
        // Sort by state name
        const sortedEntries = Object.entries(grouped).sort((a, b) => {
            const nameA = getStateName(a[0]);
            const nameB = getStateName(b[0]);
            return nameA.localeCompare(nameB);
        });
        return sortedEntries;
    }, [filteredSchools, states]);

    const toggleState = (stateCode: string) => {
        setExpandedStates(prev => ({ ...prev, [stateCode]: !prev[stateCode] }));
    };

    const getAccreditationBadge = (status: string) => {
        switch (status) {
            case 'Full':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Full (5 Yrs)
                    </span>
                );
            case 'Partial':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Partial (1 Yr)
                    </span>
                );
            case 'Failed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                        <ShieldX className="w-3.5 h-3.5" />
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <Shield className="w-3.5 h-3.5" />
                        Pending
                    </span>
                );
        }
    };

    const handleApprove = async () => {
        if (!selectedSchool) return;
        try {
            setIsSubmitting(true);
            if (selectedSchool.school_type === 'BECE') {
                await DataService.updateBeceSchool(selectedSchool.code, {
                    accreditation_status: accrType,
                    accredited_date: accrDate
                }, selectedSchool.accrd_year);
            } else {
                await DataService.updateSchool(selectedSchool.code, {
                    accreditation_status: accrType,
                    accredited_date: accrDate
                }, selectedSchool.accrd_year);
            }
            // Clear schools cache to force fresh fetch after update
            clearStaticCache();
            await fetchData();
            setShowReviewModal(false);
            setSelectedSchool(null);
        } catch (err) {
            console.error('Failed to update accreditation:', err);
            alert('Update failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openReviewModal = (school: School) => {
        setSelectedSchool(school);
        setAccrType((school.accreditation_status as any) || 'Full');
        setAccrDate(school.accredited_date || new Date().toISOString().split('T')[0]);
        setShowReviewModal(true);
    };

    // Stats - Scoped to selected school type AND year filter
    const stats = useMemo(() => {
        const yearFilteredSchools = schools.filter(s => {
            const matchesType = s.school_type === selectedSchoolType;
            const schoolYear = s.accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : '');
            const matchesYear = !headerYearFilter || schoolYear === headerYearFilter;
            return matchesType && matchesYear;
        });

        const totalSchools = yearFilteredSchools.length;
        const accreditedCount = yearFilteredSchools.filter(s => s.accreditation_status === 'Full' || s.accreditation_status === 'Partial').length;
        const pendingCount = yearFilteredSchools.filter(s => !s.accreditation_status || s.accreditation_status === 'Pending').length;
        const proofCount = yearFilteredSchools.filter(s => !!s.payment_url).length;
        const approvedPayments = yearFilteredSchools.filter(s => s.approval_status === 'Approved').length;
        const unapprovedPayments = yearFilteredSchools.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;

        const dueCount = yearFilteredSchools.filter(s => {
            if (s.accreditation_status === 'Failed') return true;
            if (!s.accredited_date || !['Full', 'Partial'].includes(s.accreditation_status || '')) return false;
            const accreditedDate = new Date(s.accredited_date);
            let yearsToAdd = 5; // Default for Full

            // Check if school is in a foreign zone
            const schoolState = states.find(st => st.code === s.state_code);
            const zone = zones.find(z => z.code === schoolState?.zone_code);
            const isForeign = zone?.name.toLowerCase().includes('foreign') || zone?.name.toLowerCase().includes('foriegn');

            if (isForeign) {
                yearsToAdd = 10;
            } else if (s.accreditation_status === 'Partial') {
                yearsToAdd = 1;
            }

            const expiryDate = new Date(accreditedDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);

            const today = new Date();
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(today.getMonth() + 6);

            return expiryDate <= sixMonthsFromNow;
        }).length;

        return {
            totalSchools,
            accreditedCount,
            pendingCount,
            proofCount,
            approvedPayments,
            unapprovedPayments,
            dueCount
        };
    }, [schools, selectedSchoolType, headerYearFilter, states, zones]);

    const { totalSchools, accreditedCount, proofCount, approvedPayments, unapprovedPayments, dueCount } = stats;

    return (
        <div className="space-y-8 pb-10">
            {/* Dynamic Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 shadow-2xl border border-slate-700/50">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 text-emerald-500/10 rotate-12 pointer-events-none">
                    <ShieldCheck className="w-64 h-64" />
                </div>
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-widest mb-4">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live System
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                            Approval & Accreditation
                        </h1>
                        <p className="text-slate-300 font-medium text-sm lg:text-base max-w-xl">
                            Review proofs of payment and grant accreditation status. Ensure all details are verified before proceeding with final approvals.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 shrink-0">
                        <button
                            onClick={() => fetchData()}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all backdrop-blur-md active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Sync Data
                        </button>
                    </div>
                </div>
            </div>

            {/* School Type Segmented Control */}
            <div className="flex justify-center">
                <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-inner backdrop-blur-sm">
                    <button
                        onClick={() => setSelectedSchoolType('SSCE')}
                        className={`relative flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${selectedSchoolType === 'SSCE'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-md transform scale-100'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95 hover:scale-100'
                            }`}
                    >
                        <GraduationCap className="w-4 h-4" />
                        SSCE Schools
                    </button>
                    <button
                        onClick={() => setSelectedSchoolType('BECE')}
                        className={`relative flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${selectedSchoolType === 'BECE'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-md transform scale-100'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 scale-95 hover:scale-100'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        BECE Schools
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Total Schools */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                            <Library className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">{totalSchools.toLocaleString()}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Schools</p>
                </div>

                {/* 2. Total Due */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">{dueCount.toLocaleString()}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Due</p>
                </div>

                {/* 3. Total Paid */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">{proofCount.toLocaleString()}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid</p>
                </div>

                {/* 4. Total Verified */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">{approvedPayments.toLocaleString()}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Verified</p>
                </div>

                {/* 5. Total Yet to Pay */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">{(dueCount - proofCount > 0 ? dueCount - proofCount : 0).toLocaleString()}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yet to Pay</p>
                </div>

                {/* 6. Upload Statistics Card (Kept as requested) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                                <Upload className="w-4 h-4" />
                            </div>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md uppercase tracking-wider">{proofCount} Proofs</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                            <span className="text-emerald-600 dark:text-emerald-400">Verified</span>
                            <span className="text-slate-900 dark:text-white">{approvedPayments}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${proofCount > 0 ? (approvedPayments / proofCount) * 100 : 0}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight pt-0.5">
                            <span className="text-slate-400">Rate</span>
                            <span className="text-slate-900 dark:text-white">{proofCount > 0 ? Math.round((approvedPayments / proofCount) * 100) : 0}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sleek Filter Bar */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-3 sticky top-4 z-30">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by school name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-0 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex flex-wrap lg:flex-nowrap gap-3">
                        <div className="relative min-w-[160px] flex-1 lg:flex-none">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Filter className="w-4 h-4 text-slate-400" />
                            </div>
                            <select
                                value={selectedStateFilter}
                                onChange={(e) => setSelectedStateFilter(e.target.value)}
                                className="w-full h-full pl-10 pr-8 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-0 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200"
                            >
                                <option value="">All States</option>
                                {states.map(state => (
                                    <option key={state.code} value={state.code}>{state.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative min-w-[150px] flex-1 lg:flex-none">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Shield className="w-4 h-4 text-slate-400" />
                            </div>
                            <select
                                value={selectedAccrFilter}
                                onChange={(e) => setSelectedAccrFilter(e.target.value)}
                                className="w-full h-full pl-10 pr-8 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-0 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200"
                            >
                                <option value="">All Status</option>
                                <option value="Accredited">Accredited</option>
                                <option value="Unaccredited">Unaccredited</option>
                                <option value="Full">Full</option>
                                <option value="Partial">Partial</option>
                                <option value="Failed">Failed</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative min-w-[150px] flex-1 lg:flex-none">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Upload className="w-4 h-4 text-slate-400" />
                            </div>
                            <select
                                value={selectedProofFilter}
                                onChange={(e) => setSelectedProofFilter(e.target.value)}
                                className="w-full h-full pl-10 pr-8 py-3 bg-slate-100/50 dark:bg-slate-800/50 border-0 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200"
                            >
                                <option value="">All Proofs</option>
                                <option value="Proof">Proof Uploaded</option>
                                <option value="Approved">Approved</option>
                                <option value="Unapproved">Unapproved</option>
                                <option value="Pending">Pending Accred.</option>
                                <option value="No Proof">No Proof</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>

                        <button
                            onClick={() => setSelectedDueFilter(prev => prev === 'Due' ? '' : 'Due')}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all duration-300 font-black uppercase tracking-widest text-xs",
                                selectedDueFilter === 'Due'
                                    ? "bg-amber-500/10 border-amber-500/50 text-amber-600 shadow-lg shadow-amber-500/5"
                                    : "bg-slate-100/50 dark:bg-slate-800/50 border-transparent text-slate-400 hover:border-amber-500/30"
                            )}
                        >
                            <ShieldAlert className={cn("w-4 h-4", selectedDueFilter === 'Due' ? "text-amber-500" : "text-slate-400")} />
                            <span>Only Due</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Schools Table Grouped by State */}
            <div className="space-y-6 relative z-10">
                {isLoading ? (
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-24 flex flex-col items-center gap-4 shadow-sm">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing School Records...</p>
                    </div>
                ) : schoolsByState.length === 0 ? (
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-24 flex flex-col items-center gap-4 shadow-sm">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <CheckCircle2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-slate-900 dark:text-white font-black text-xl">No Results Found</h3>
                        <p className="text-slate-500 text-sm font-medium">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    schoolsByState.map(([stateCode, stateSchools]) => (
                        <div key={stateCode} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden group/accordion">
                            {/* State Header - Collapsible */}
                            <button
                                onClick={() => toggleState(stateCode)}
                                className="w-full flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 bg-transparent transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl transition-all ${expandedStates[stateCode] ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/accordion:text-emerald-500'}`}>
                                        {expandedStates[stateCode] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight text-left">
                                            {getStateName(stateCode)}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-md uppercase tracking-wider">
                                                {stateSchools.length} {stateSchools.length !== 1 ? 'Schools' : 'School'}
                                            </span>
                                            {(() => {
                                                const pendingInState = stateSchools.filter(school => {
                                                    return school.payment_url && (!school.accreditation_status || school.accreditation_status === 'Pending' || school.accreditation_status === 'Unaccredited');
                                                }).length;
                                                if (pendingInState > 0) {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-black rounded-md uppercase tracking-wider animate-pulse border border-amber-200 dark:border-amber-700/50">
                                                            {pendingInState} Action Required
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-6 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                                    <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Full</p>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{stateSchools.filter(s => s.accreditation_status === 'Full').length}</p>
                                    </div>
                                    <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3" /> Partial</p>
                                        <p className="text-lg font-black text-amber-600 dark:text-amber-400 leading-none">{stateSchools.filter(s => s.accreditation_status === 'Partial').length}</p>
                                    </div>
                                    <div className="text-center px-3 border-r border-slate-200 dark:border-slate-800">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1"><ShieldX className="w-3 h-3" /> Failed</p>
                                        <p className="text-lg font-black text-red-600 dark:text-red-400 leading-none">{stateSchools.filter(s => s.accreditation_status === 'Failed').length}</p>
                                    </div>
                                    <div className="text-center px-3">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</p>
                                        <p className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{stateSchools.filter(s => s.approval_status === 'Approved').length}</p>
                                    </div>
                                </div>
                            </button>

                            {/* Schools Data Grid */}
                            {expandedStates[stateCode] && (
                                <div className="border-t border-slate-100 dark:border-slate-800 p-2">
                                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                <tr>
                                                    <th className="px-5 py-4 pl-6 w-12">#</th>
                                                    <th className="px-5 py-4 w-32">Center Code</th>
                                                    <th className="px-5 py-4">School Details</th>
                                                    <th className="px-5 py-4">Proof of Payment</th>
                                                    <th className="px-5 py-4">Status & Date</th>
                                                    <th className="px-5 py-4 pr-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {stateSchools.map((school, idx) => (
                                                    <tr key={school.accrd_year ? `${school.code}-${school.accrd_year}` : school.code} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200">
                                                        <td className="px-5 py-4 pl-6 text-[11px] font-black text-slate-400 w-12">{idx + 1}</td>
                                                        <td className="px-5 py-4 w-32">
                                                            <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                                                                {school.code}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{school.name}</span>
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                                                    {school.category === 'PUB' ? 'Public' : school.category === 'FED' ? 'Federal' : school.category === 'PRI' || school.category === 'PRV' ? 'Private' : school.category || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {school.payment_url ? (
                                                                <a
                                                                    href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}${school.payment_url}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    View Proof
                                                                </a>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    No Proof
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex flex-col items-start gap-1.5">
                                                                {getAccreditationBadge(school.accreditation_status)}
                                                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No Date'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 pr-6">
                                                            <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 group-hover:opacity-100 transition-opacity">
                                                                {school.approval_status !== 'Approved' && school.payment_url && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setVerifyingSchool(school);
                                                                            setShowVerifyModal(true);
                                                                        }}
                                                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
                                                                    >
                                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                                        Verify
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => openReviewModal(school)}
                                                                    disabled={school.approval_status !== 'Approved'}
                                                                    className="px-3 py-2 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-slate-900/10 flex items-center gap-1.5 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    Accredit
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>


            {/* Review / Accreditation Modal */}
            {showReviewModal && selectedSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl w-full max-w-5xl rounded-[2rem] shadow-2xl shadow-slate-900/20 border border-white/50 dark:border-slate-700/50 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex flex-shrink-0 items-center justify-between p-6 sm:px-8 sm:py-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Final Accreditation Review</h2>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    <span className="text-emerald-600 dark:text-emerald-400">{selectedSchool.code}</span>
                                    <span className="mx-2">•</span>
                                    {selectedSchool.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[400px]">
                            {/* Proof View */}
                            <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/30 p-6 sm:p-8 overflow-y-auto border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block flex-shrink-0">Proof of Payment Document</span>
                                {selectedSchool.payment_url ? (
                                    <div className="flex-1 relative group rounded-3xl overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800/50 bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center min-h-[300px]">
                                        <img
                                            src={selectedSchool.payment_url.startsWith('http') ? selectedSchool.payment_url : `${baseURL}${selectedSchool.payment_url}`}
                                            alt="Payment Proof"
                                            className="max-w-full max-h-full object-contain rounded-2xl p-2 transition-transform duration-500 group-hover:scale-[1.02]"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                        <div className="hidden flex-col items-center justify-center p-8 text-slate-500 gap-4 w-full h-full">
                                            <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                                <FileText className="w-12 h-12 text-slate-400" />
                                            </div>
                                            <p className="font-bold text-sm text-center">Document uploaded<br /><span className="text-xs font-medium text-slate-400">PDF or external file format</span></p>
                                            <a
                                                href={selectedSchool.payment_url.startsWith('http') ? selectedSchool.payment_url : `${baseURL}${selectedSchool.payment_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 px-6 py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 flex items-center gap-2 transition-all"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Open Document in New Tab
                                            </a>
                                        </div>
                                        <a
                                            href={selectedSchool.payment_url.startsWith('http') ? selectedSchool.payment_url : `${baseURL}${selectedSchool.payment_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-xl shadow-lg text-slate-600 hover:text-emerald-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                                            title="Open Original"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20 text-slate-400 gap-4 min-h-[300px]">
                                        <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                            <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="font-bold text-sm tracking-tight text-slate-500">No proof of payment available.</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions & Settings */}
                            <div className="w-full md:w-[380px] p-6 sm:p-8 space-y-8 overflow-y-auto bg-white/50 dark:bg-slate-900/50 flex-shrink-0">
                                {/* Accreditation Type */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        Accreditation Status
                                    </label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'Full', label: 'Full Approval', desc: '5 Years Validity', colorBg: 'bg-emerald-50 dark:bg-emerald-900/20', colorBorder: 'border-emerald-500', colorText: 'text-emerald-700 dark:text-emerald-400', colorCheck: 'text-emerald-500 text-emerald-500', icon: CheckCircle2 },
                                            { id: 'Partial', label: 'Partial Approval', desc: '1 Year Validity', colorBg: 'bg-amber-50 dark:bg-amber-900/20', colorBorder: 'border-amber-500', colorText: 'text-amber-700 dark:text-amber-400', colorCheck: 'text-amber-500 text-amber-500', icon: ShieldAlert },
                                            { id: 'Failed', label: 'Reject / Fail', desc: 'Must Re-apply', colorBg: 'bg-red-50 dark:bg-red-900/20', colorBorder: 'border-red-500', colorText: 'text-red-700 dark:text-red-400', colorCheck: 'text-red-500 text-red-500', icon: ShieldX }
                                        ].map((type) => {
                                            const Icon = type.icon;
                                            return (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setAccrType(type.id as any)}
                                                    className={`relative p-4 rounded-2xl border-2 text-left transition-all overflow-hidden group ${accrType === type.id
                                                        ? `${type.colorBorder} ${type.colorBg} shadow-sm`
                                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                                        }`}
                                                >
                                                    {accrType === type.id && (
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 dark:to-white/5 pointer-events-none" />
                                                    )}
                                                    <div className="relative flex items-start justify-between z-10">
                                                        <div className="flex gap-3">
                                                            <div className={`mt-0.5 ${accrType === type.id ? type.colorCheck : 'text-slate-400'}`}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <span className={`block text-sm font-black uppercase tracking-tight ${accrType === type.id ? type.colorText : 'text-slate-700 dark:text-slate-300'}`}>
                                                                    {type.label}
                                                                </span>
                                                                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                                                    {type.desc}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${accrType === type.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                                            {accrType === type.id && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Accreditation Date */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Approval Date
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Calendar className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <input
                                            type="date"
                                            value={accrDate}
                                            onChange={(e) => setAccrDate(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Warning & Submit */}
                                <div className="pt-6 mt-6 border-t border-slate-200/50 dark:border-slate-800/50 space-y-4">
                                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-slate-500 mt-0.5" />
                                            <span>This action immediately updates the school's status system-wide and notifies state offices.</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleApprove}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" />
                                                Confirm Decision
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Modal */}
            {showVerifyModal && verifyingSchool && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl w-full max-w-4xl rounded-[2rem] shadow-2xl shadow-slate-900/20 border border-white/50 dark:border-slate-700/50 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex flex-shrink-0 items-center justify-between p-6 sm:px-8 sm:py-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-blue-500" />
                                    Verify Payment Receipt
                                </h2>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    <span className="text-blue-600 dark:text-blue-400">{verifyingSchool.code}</span>
                                    <span className="mx-2">•</span>
                                    {verifyingSchool.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowVerifyModal(false)}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[400px]">
                            {/* Proof View */}
                            <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/30 p-6 sm:p-8 overflow-y-auto border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col">
                                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Submitted Receipt</span>
                                    <button
                                        onClick={() => window.open(verifyingSchool.payment_url?.startsWith('http') ? verifyingSchool.payment_url : `${baseURL}${verifyingSchool.payment_url}`, '_blank')}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        Pop-out
                                    </button>
                                </div>
                                <div className="flex-1 relative rounded-3xl overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800/50 bg-slate-100/50 dark:bg-slate-900/50 flex items-center justify-center min-h-[300px]">
                                    <img
                                        src={verifyingSchool.payment_url?.startsWith('http') ? verifyingSchool.payment_url : `${baseURL}${verifyingSchool.payment_url}`}
                                        alt="Payment Proof"
                                        className="max-w-full max-h-full object-contain rounded-2xl p-2"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="w-full md:w-[340px] p-6 sm:p-8 space-y-6 overflow-y-auto bg-white/50 dark:bg-slate-900/50 flex flex-col flex-shrink-0">
                                <div className="flex-1 space-y-6">
                                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/50 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                            <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Verification Steps</h4>
                                        </div>
                                        <ul className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80 space-y-2 list-disc list-inside">
                                            <li>Match school name and center code.</li>
                                            <li>Verify correct payment amount.</li>
                                            <li>Check payment date and reference.</li>
                                        </ul>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/50 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl mt-1">
                                                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
                                                Approval enables the final accreditation step. Ensure the receipt is legible and valid before proceeding.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
                                    <button
                                        onClick={async () => {
                                            try {
                                                setIsSubmitting(true);
                                                if (verifyingSchool.school_type === 'BECE') {
                                                    await DataService.approveBeceSchool(verifyingSchool.code, verifyingSchool.accrd_year);
                                                } else {
                                                    await DataService.approveSchool(verifyingSchool.code, verifyingSchool.accrd_year);
                                                }
                                                // Clear cache and refetch
                                                clearStaticCache();
                                                await fetchData();
                                                setShowVerifyModal(false);
                                                setVerifyingSchool(null);
                                            } catch (err) {
                                                console.error('Failed to verify payment:', err);
                                                alert('Verification failed. Please try again.');
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        {isSubmitting ? 'Processing...' : 'Approve Receipt'}
                                    </button>
                                    <button
                                        onClick={() => setShowVerifyModal(false)}
                                        className="w-full py-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
