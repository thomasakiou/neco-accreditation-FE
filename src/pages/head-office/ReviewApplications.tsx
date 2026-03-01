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
    FileText
} from 'lucide-react';
import { cn } from '../../components/layout/DashboardLayout';
import DataService from '../../api/services/data.service';
import ExportService from '../../api/services/export.service';
import { components } from '../../api/types';

type School = components['schemas']['School'];
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
    const [isExporting, setIsExporting] = React.useState<string | null>(null);

    React.useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schoolsData, beceSchoolsData, statesData, zonesData, lgas, custodians] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates(),
                DataService.getZones(),
                DataService.getLGAs(),
                DataService.getCustodians()
            ]);
            // Merge SSCE and BECE schools
            setSchools([...schoolsData, ...beceSchoolsData]);
            setStates(statesData);
            setZones(zonesData);
            setAllLgas(lgas);
            setCustodians(custodians);
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
            const matchesState = !selectedStateFilter || school.state_code === selectedStateFilter;
            const matchesPayment = !selectedPaymentFilter ||
                (selectedPaymentFilter === 'Paid' && !!school.payment_url) ||
                (selectedPaymentFilter === 'Unpaid' && !school.payment_url);
            const matchesAccr = !selectedAccrFilter || school.accreditation_status === selectedAccrFilter;
            
            return isDue && matchesSearch && matchesState && matchesPayment && matchesAccr;
        });
    }, [schools, searchQuery, selectedStateFilter, selectedPaymentFilter, selectedAccrFilter]);

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
        const paid = schools.filter(s => !!s.payment_url).length;
        const unpaid = total - paid;
        const paymentRate = total > 0 ? Math.round((paid / total) * 100) : 0;
        return { total, paid, unpaid, paymentRate };
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Schools Due for Accreditation</h1>
                    <p className="text-slate-500 dark:text-slate-400">Schools organized by state with payment statistics</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleExportExcel()}
                        disabled={isExporting !== null}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                        title="Download as Excel"
                    >
                        {isExporting === 'xlsx' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Excel
                    </button>
                    <button
                        onClick={() => handleExportCSV()}
                        disabled={isExporting !== null}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                        title="Download as CSV"
                    >
                        {isExporting === 'csv' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        CSV
                    </button>
                    <button
                        onClick={() => handleExportPDF()}
                        disabled={isExporting !== null}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                        title="Download as PDF"
                    >
                        {isExporting === 'pdf' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        PDF
                    </button>
                </div>
            </div>

            {/* Search Bar */}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* State Filter */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">State</label>
                        <select
                            value={selectedStateFilter}
                            onChange={(e) => setSelectedStateFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All States</option>
                            {states.map(state => (
                                <option key={state.code} value={state.code}>{state.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 translate-y-5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Payment Status Filter */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Payment Status</label>
                        <select
                            value={selectedPaymentFilter}
                            onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
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
            {!loading && schoolsByState.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">States with Due Schools</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{schoolsByState.length}</p>
                            </div>
                            <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Due for Accreditation</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{dueSchools.length}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400 opacity-20" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Schools with Payment Proof</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{dueSchools.filter(s => !!s.payment_url).length}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 opacity-20" />
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
            ) : schoolsByState.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-slate-400" />
                    <p className="text-slate-500 text-center max-w-sm">
                        {dueSchools.length === 0
                            ? 'No schools are currently due for accreditation within the next 6 months.'
                            : 'No schools match your search criteria.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {schoolsByState.map(({ stateCode, stateName, schools: stateSchools }) => {
                        const stats = getStateStats(stateSchools);
                        const isExpanded = expandedStates[stateCode];

                        return (
                            <div key={stateCode} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 shadow-sm overflow-hidden">
                                {/* State Header */}
                                <button
                                    onClick={() => toggleState(stateCode)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={cn(
                                            "w-6 h-6 flex items-center justify-center rounded transition-transform",
                                            isExpanded ? "rotate-90" : ""
                                        )}>
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{stateName}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <SchoolIcon className="w-4 h-4" />
                                                    {stats.total} school{stats.total !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* State Stats */}
                                    <div className="flex items-center gap-6 ml-4">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Paid</p>
                                            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.paid}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Unpaid</p>
                                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.unpaid}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Payment Rate</p>
                                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.paymentRate}%</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Schools List */}
                                {isExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium border-t border-slate-200 dark:border-slate-800">
                                                    <th className="px-6 py-3">School Name</th>
                                                    <th className="px-6 py-3">Code</th>
                                                    <th className="px-6 py-3">Accreditation</th>
                                                    <th className="px-6 py-3">Accredited Date</th>
                                                    <th className="px-6 py-3">Payment Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {stateSchools.map((school) => (
                                                    <tr key={school.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <span className="font-medium text-slate-900 dark:text-white">{school.name}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{school.code}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {getStatusBadge(school.accreditation_status)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-slate-600 dark:text-slate-400">
                                                                {school.accredited_date
                                                                    ? new Date(school.accredited_date).toLocaleDateString()
                                                                    : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {school.payment_url ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Paid
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Unpaid
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
