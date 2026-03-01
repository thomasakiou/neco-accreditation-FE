import React, { useState, useEffect, useMemo } from 'react';
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
    Image as ImageIcon
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import { clearStaticCache } from '../../api/services/data.service';
import { baseURL } from '../../api/client';
import { components } from '../../api/types';
import SearchableSelect from '../../components/common/SearchableSelect';

type School = components['schemas']['School'];
type State = components['schemas']['State'];

export default function HeadOfficeFinalApproval() {
    const [schools, setSchools] = useState<School[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStateFilter, setSelectedStateFilter] = useState('');
    const [selectedAccrFilter, setSelectedAccrFilter] = useState('');
    const [selectedProofFilter, setSelectedProofFilter] = useState('');
    const [selectedDueFilter, setSelectedDueFilter] = useState('');
    const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

    // Review modal
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accrType, setAccrType] = useState<'Full' | 'Partial' | 'Failed'>('Full');
    const [accrDate, setAccrDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [schoolsData, beceSchoolsData, statesData] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates()
            ]);
            // Merge SSCE and BECE schools
            setSchools([...schoolsData, ...beceSchoolsData]);
            setStates(statesData);
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

    const filteredSchools = useMemo(() => {
        return schools.filter(school => {
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
                (selectedProofFilter === 'Pending' && !!school.payment_url && (!school.accreditation_status || ['Pending', 'Unaccredited'].includes(school.accreditation_status)));

            const isDue = () => {
                if (!school.accredited_date || !['Full', 'Partial', 'Failed'].includes(school.accreditation_status || '')) return false;
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

            const matchesDue = !selectedDueFilter ||
                (selectedDueFilter === 'Due' && isDue()) ||
                (selectedDueFilter === 'Not Due' && !isDue());

            return matchesSearch && matchesState && matchesAccr && matchesProof && matchesDue;
        });
    }, [schools, searchTerm, selectedStateFilter, selectedAccrFilter, selectedProofFilter, selectedDueFilter]);

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
            await DataService.updateSchool(selectedSchool.code, {
                accreditation_status: accrType,
                accredited_date: accrDate
            });
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

    // Stats
    const totalSchools = schools.length;
    const accreditedCount = schools.filter(s => s.accreditation_status === 'Full' || s.accreditation_status === 'Partial').length;
    const pendingCount = schools.filter(s => !s.accreditation_status || s.accreditation_status === 'Pending').length;
    const proofCount = schools.filter(s => !!s.payment_url).length;

    const dueCount = schools.filter(s => {
        if (!s.accredited_date || !['Full', 'Partial', 'Failed'].includes(s.accreditation_status || '')) return false;
        const accreditedDate = new Date(s.accredited_date);
        let yearsToAdd = 5; // Default for Full
        if (s.accreditation_status === 'Partial') yearsToAdd = 2;
        else if (s.accreditation_status === 'Failed') yearsToAdd = 1;

        const expiryDate = new Date(accreditedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);

        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);

        return expiryDate <= sixMonthsFromNow;
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                        Final Approval
                    </h1>
                    <p className="text-slate-700 dark:text-slate-400 font-medium">Review proof of payment and grant accreditation status. Schools are grouped by State.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Schools</p>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">{totalSchools}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Due for Accreditation</p>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">{dueCount}</h3>
                </div>
                <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg font-bold">
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Accredited</p>
                    <h3 className="text-2xl font-black">{accreditedCount}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Pending</p>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">{pendingCount}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Proof Uploaded</p>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">{proofCount}</h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by school name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-slate-200"
                        />
                    </div>
                    <SearchableSelect
                        value={selectedStateFilter}
                        onChange={setSelectedStateFilter}
                        options={states.map(s => ({ value: s.code, label: s.name }))}
                        placeholder="All States"
                        icon={<Filter className="w-4 h-4 text-slate-500" />}
                        containerClassName="flex-1"
                    />
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl">
                        <Shield className="w-4 h-4 text-slate-500" />
                        <select value={selectedAccrFilter} onChange={(e) => setSelectedAccrFilter(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200">
                            <option value="">Accre. Status</option>
                            <option value="Accredited">Accredited</option>
                            <option value="Unaccredited">Unaccredited</option>
                            <option value="Full">Full</option>
                            <option value="Partial">Partial</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <select value={selectedProofFilter} onChange={(e) => setSelectedProofFilter(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200">
                            <option value="">Proof Status</option>
                            <option value="Proof">Proof Uploaded</option>
                            <option value="Pending">Pending Approval</option>
                            <option value="No Proof">No Proof</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <select value={selectedDueFilter} onChange={(e) => setSelectedDueFilter(e.target.value)} className="bg-transparent border-none text-xs font-black uppercase tracking-wider w-full outline-none dark:text-slate-200 cursor-pointer [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200">
                            <option value="">Accre. Due</option>
                            <option value="Due">Due</option>
                            <option value="Not Due">Not Due</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Schools Table Grouped by State */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 p-20 flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                        <p className="text-slate-700 dark:text-slate-400 font-bold">Loading schools...</p>
                    </div>
                ) : schoolsByState.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 p-20 flex flex-col items-center gap-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        <h3 className="text-slate-950 dark:text-white font-bold text-lg">No Results</h3>
                        <p className="text-slate-500 text-sm">No schools match the current filters.</p>
                    </div>
                ) : (
                    schoolsByState.map(([stateCode, stateSchools]) => (
                        <div key={stateCode} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden">
                            {/* State Header - Collapsible */}
                            <button
                                onClick={() => toggleState(stateCode)}
                                className="w-full flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedStates[stateCode] ? (
                                        <ChevronDown className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        {getStateName(stateCode)}
                                    </h2>
                                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[12px] font-black rounded-lg">
                                        {stateSchools.length} school{stateSchools.length !== 1 ? 's' : ''}
                                    </span>
                                    {/* Pending Approvals Badge */}
                                    {(() => {
                                        const pendingInState = stateSchools.filter(school => {
                                            return school.payment_url && (
                                                !school.accreditation_status ||
                                                school.accreditation_status === 'Pending' ||
                                                // school.accreditation_status === 'Failed' ||
                                                school.accreditation_status === 'Unaccredited'
                                            );
                                        }).length;
                                        if (pendingInState > 0) {
                                            return (
                                                <span className="px-2.5 py-1 bg-amber-400 text-black text-[10px] font-black rounded-lg animate-pulse" title={`${pendingInState} schools pending final approval`}>
                                                    {pendingInState} Pending
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="flex items-center gap-3 text-[12px] font-bold text-slate-500">
                                    <span className="text-emerald-600">{stateSchools.filter(s => s.accreditation_status === 'Full').length} Full</span>
                                    <span>•</span>
                                    <span className="text-emerald-700">{stateSchools.filter(s => s.accreditation_status === 'Partial').length} Partial</span>
                                    <span>•</span>
                                    <span className="text-red-500">{stateSchools.filter(s => s.accreditation_status === 'Failed').length} failed</span>
                                    <span>•</span>
                                    <span className="text-blue-300">{stateSchools.filter(s => !!s.payment_url).length} Paid</span>
                                </div>
                            </button>

                            {/* Schools Table */}
                            {expandedStates[stateCode] && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">S/N</th>
                                                <th className="px-6 py-3">Center Code</th>
                                                <th className="px-6 py-3">School Name</th>
                                                <th className="px-6 py-3">Category</th>
                                                <th className="px-6 py-3">Proof of Payment</th>
                                                <th className="px-6 py-3">Accreditation</th>
                                                <th className="px-6 py-3">Accrd. Date</th>
                                                <th className="px-6 py-3">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {stateSchools.map((school, idx) => (
                                                <tr key={school.code} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                    <td className="px-6 py-3 text-xs font-mono font-black text-slate-700 dark:text-slate-300">{school.code}</td>
                                                    <td className="px-6 py-3">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{school.name}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-xs font-bold text-slate-500">
                                                        {school.category === 'PUB' ? 'Public' : 'Private'}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {school.payment_url ? (
                                                            <a
                                                                href={school.payment_url.startsWith('http') ? school.payment_url : `${baseURL}${school.payment_url}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View Proof
                                                            </a>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                No Proof
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {getAccreditationBadge(school.accreditation_status)}
                                                    </td>
                                                    <td className="px-6 py-3 text-xs font-bold text-slate-500">
                                                        {school.accredited_date ? new Date(school.accredited_date).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <button
                                                            onClick={() => openReviewModal(school)}
                                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Review / Accreditation Modal */}
            {showReviewModal && selectedSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">Final Accreditation Review</h2>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{selectedSchool.name} ({selectedSchool.code})</p>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row h-[500px]">
                            {/* Proof View */}
                            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 overflow-y-auto border-r border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Proof of Payment</span>
                                {selectedSchool.payment_url ? (
                                    <div className="space-y-4">
                                        <div className="relative group rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800">
                                            <img
                                                src={selectedSchool.payment_url.startsWith('http') ? selectedSchool.payment_url : `${baseURL}${selectedSchool.payment_url}`}
                                                alt="Payment Proof"
                                                className="w-full object-contain bg-white dark:bg-slate-900"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            <div className="hidden flex-col items-center justify-center p-8 text-slate-400 gap-3">
                                                <FileText className="w-12 h-12" />
                                                <p className="font-bold text-sm">Document uploaded (not an image)</p>
                                                <a
                                                    href={selectedSchool.payment_url.startsWith('http') ? selectedSchool.payment_url : `${baseURL}${selectedSchool.payment_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Open Document
                                                </a>
                                            </div>
                                            <a
                                                href={selectedSchool.payment_url.startsWith('http') ? selectedSchool.payment_url : `${baseURL}${selectedSchool.payment_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg shadow-sm text-slate-600 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                        <AlertCircle className="w-12 h-12" />
                                        <p className="font-bold text-sm tracking-tight">No proof of payment uploaded.</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions & Settings */}
                            <div className="w-full md:w-[350px] p-8 space-y-6 overflow-y-auto bg-white dark:bg-slate-900">
                                {/* Accreditation Type */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Accreditation Type</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { id: 'Full', label: 'Full', desc: 'Accredited (5 Years)', colorBg: 'bg-emerald-50 dark:bg-emerald-900/10', colorBorder: 'border-emerald-500', colorText: 'text-emerald-600 dark:text-emerald-400', colorCheck: 'text-emerald-500' },
                                            { id: 'Partial', label: 'Partial', desc: 'Accredited (1 Year)', colorBg: 'bg-amber-50 dark:bg-amber-900/10', colorBorder: 'border-amber-500', colorText: 'text-amber-600 dark:text-amber-400', colorCheck: 'text-amber-500' },
                                            { id: 'Failed', label: 'Fail', desc: 'Unaccredited — Must Re-apply', colorBg: 'bg-red-50 dark:bg-red-900/10', colorBorder: 'border-red-500', colorText: 'text-red-600 dark:text-red-400', colorCheck: 'text-red-500' }
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setAccrType(type.id as any)}
                                                className={`p-4 rounded-2xl border-2 text-left transition-all ${accrType === type.id
                                                    ? `${type.colorBorder} ${type.colorBg}`
                                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-sm font-black uppercase tracking-tight ${accrType === type.id ? type.colorText : 'text-slate-950 dark:text-slate-300'}`}>
                                                        {type.label}
                                                    </span>
                                                    {accrType === type.id && <CheckCircle2 className={`w-4 h-4 ${type.colorCheck}`} />}
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter leading-none">{type.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Accreditation Date */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Accreditation Date</label>
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            value={accrDate}
                                            onChange={(e) => setAccrDate(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none w-full"
                                        />
                                    </div>
                                </div>

                                {/* Warning & Submit */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-100 dark:border-blue-900/30">
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-relaxed">
                                            <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                                            THIS ACTION WILL UPDATE THE SCHOOL STATUS ACROSS ALL DEPARTMENTS AND STATE OFFICES IMMEDIATELY.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleApprove}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-slate-950 dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Grant Approval'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
