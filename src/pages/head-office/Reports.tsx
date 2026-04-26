import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    Map as LucideMap,
    Loader2,
    AlertCircle,
    CheckCircle,
    School as SchoolIcon,
    Calendar,
    ChevronRight,
    Users,
    ShieldCheck,
    Printer,
    RefreshCw
} from 'lucide-react';
import DataService, { School, BECESchool, State } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

type SchoolType = components['schemas']['School'];
type StateType = State;

export default function HeadOfficeReports() {
    const [ssceSchools, setSsceSchools] = useState<School[]>([]);
    const [beceSchools, setBeceSchools] = useState<BECESchool[]>([]);
    const [states, setStates] = useState<StateType[]>([]);
    const [zones, setZones] = useState<components['schemas']['Zone'][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [isPrintingSummary, setIsPrintingSummary] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'OVERALL' | 'SSCE' | 'BECE'>('OVERALL');
    const isSuperAdmin = currentUser?.email === 'admin@neco.gov.ng';

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [ssceData, beceData, stData, zData, userData] = await Promise.all([
                DataService.getSchools(),
                DataService.getBeceSchools(),
                DataService.getStates(),
                DataService.getZones(),
                AuthService.getCurrentUser()
            ]);
            setSsceSchools(ssceData);
            setBeceSchools(beceData);
            setStates(stData);
            setZones(zData);
            setCurrentUser(userData);
            setError(null);
        } catch (err) {
            console.error("Failed to load report data:", err);
            setError("Failed to load report data. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExport = async (type: 'schools' | 'states' | 'lgas' | 'custodians') => {
        try {
            setIsExporting(type);
            setError(null);
            switch (type) {
                case 'schools': await DataService.exportSchools('excel'); break;
                case 'states': await DataService.exportStates(); break;
                case 'lgas': await DataService.exportLGAs(); break;
                case 'custodians': await DataService.exportCustodians('excel'); break;
            }
        } catch (err) {
            setError(`Failed to export ${type} report. Please try again.`);
        } finally {
            setIsExporting(null);
        }
    };

    // Calculate aggregated stats
    const aggregatedStats = useMemo(() => {
        const schoolsToProcess = activeTab === 'OVERALL' 
            ? [...ssceSchools, ...beceSchools]
            : activeTab === 'SSCE' ? ssceSchools : beceSchools;

        if (!schoolsToProcess.length) return null;

        let totalAccredited = 0;
        let totalPartial = 0;
        let totalFailed = 0;
        let totalPending = 0;
        let totalPaid = 0;

        schoolsToProcess.forEach(s => {
            if (s.accreditation_status === 'Full') totalAccredited++;
            else if (s.accreditation_status === 'Partial') totalPartial++;
            else if (s.accreditation_status === 'Failed') totalFailed++;

            if (s.approval_status === 'Approved') {
                totalPaid++;
            } else if (s.payment_url) {
                totalPending++; // Awaiting Approval
            }
        });

        const total = schoolsToProcess.length;
        const completionRate = Math.round(((totalAccredited + totalPartial) / total) * 100) || 0;

        return {
            total,
            totalAccredited,
            totalPartial,
            totalFailed,
            totalPending,
            totalPaid,
            completionRate
        };
    }, [ssceSchools, beceSchools, activeTab]);

    // Determine if a school is due for accreditation
    const isDueForAccreditation = (school: any): boolean => {
        // A school is DUE if:
        // 1. Its status is explicitly 'Failed'
        // 2. It has NO accreditation date record
        // 3. Its status is 'Partial' (expires in 1 yr) or 'Full' (5/10 yrs) AND it's expired or expiring within 6 months

        if (school.accreditation_status === 'Failed') return true;

        if (!school.accredited_date || !['Full', 'Partial', 'Passed'].includes(school.accreditation_status || '')) {
            return true; // If no record exists yet, it's due
        }

        const accreditedDate = new Date(school.accredited_date);
        let yearsToAdd = 5;

        // Check if school is in a foreign zone
        const zone = zones.find(z => z.code === states.find(st => st.code === school.state_code)?.zone_code);
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

    // Calculate Summary Report Stats (matching report.png)
    const summaryReportStats = useMemo(() => {
        interface SummaryStat {
            code: string;
            name: string;
            ssceDue: number;
            sscePaid: number;
            beceDue: number;
            becePaid: number;
        }

        const map = new Map<string, SummaryStat>();

        states.forEach(state => {
            map.set(state.code, {
                code: state.code,
                name: state.name,
                ssceDue: 0,
                sscePaid: 0,
                beceDue: 0,
                becePaid: 0
            });
        });

        ssceSchools.forEach(s => {
            const sc = s.state_code || 'UNKNOWN';
            const stateData = map.get(sc);
            if (stateData && isDueForAccreditation(s)) {
                stateData.ssceDue++;
                if (s.approval_status === 'Approved') {
                    stateData.sscePaid++;
                }
            }
        });

        beceSchools.forEach(s => {
            const sc = s.state_code || 'UNKNOWN';
            const stateData = map.get(sc);
            if (stateData && isDueForAccreditation(s)) {
                stateData.beceDue++;
                if (s.approval_status === 'Approved') {
                    stateData.becePaid++;
                }
            }
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [ssceSchools, beceSchools, states, zones]);

    // Calculate state-by-state stats
    const stateStats = useMemo(() => {
        interface StateStat {
            code: string;
            name: string;
            total: number;
            full: number;
            partial: number;
            failed: number;
            paid: number;
            pending: number;
        }

        const map = new Map<string, StateStat>();

        // Initialize map with state names
        states.forEach(state => {
            map.set(state.code, {
                code: state.code,
                name: state.name,
                total: 0,
                full: 0,
                partial: 0,
                failed: 0,
                paid: 0,
                pending: 0
            });
        });

        const schoolsToProcess = activeTab === 'OVERALL' 
            ? [...ssceSchools, ...beceSchools]
            : activeTab === 'SSCE' ? ssceSchools : beceSchools;

        schoolsToProcess.forEach(school => {
            const sc = school.state_code || 'UNKNOWN';
            if (!map.has(sc)) {
                map.set(sc, { code: sc, name: sc, total: 0, full: 0, partial: 0, failed: 0, paid: 0, pending: 0 });
            }

            const stateData = map.get(sc)!;
            stateData.total++;

            if (school.approval_status === 'Approved') {
                stateData.paid++;
            } else if (school.payment_url) {
                stateData.pending++; // Awaiting Approval
            }

            if (school.accreditation_status === 'Full') {
                stateData.full++;
            } else if (school.accreditation_status === 'Partial') {
                stateData.partial++;
            } else if (school.accreditation_status === 'Failed') {
                stateData.failed++;
            }
        });

        return Array.from(map.values())
            .filter((s: StateStat) => s.total > 0)
            .sort((a: StateStat, b: StateStat) => b.total - a.total); // Sort by highest total schools
    }, [ssceSchools, beceSchools, states, activeTab]);

    // Calculate Category stats (PUB vs PRI)
    const categoryStats = useMemo(() => {
        const stats = { PUB: 0, PRI: 0, FED: 0 };
        const schoolsToProcess = activeTab === 'OVERALL' 
            ? [...ssceSchools, ...beceSchools]
            : activeTab === 'SSCE' ? ssceSchools : beceSchools;
            
        schoolsToProcess.forEach(s => {
            if (s.category === 'PUB') stats.PUB++;
            else if (s.category === 'PRV' || s.category === 'PRI') stats.PRI++;
            else if (s.category === 'FED') stats.FED++;
        });
        return [
            { name: 'Public Schools', value: stats.PUB, color: '#3b82f6' }, // blue-500
            { name: 'Private Schools', value: stats.PRI, color: '#ec4899' }, // pink-500
            { name: 'Federal Schools', value: stats.FED, color: '#8b5cf6' }, // violet-500
        ];
    }, [ssceSchools, beceSchools, activeTab]);

    // Calculate Zone stats
    const zoneStats = useMemo(() => {
        interface ZoneStat {
            name: string;
            total: number;
            full: number;
        }
        const zoneMap = new Map<string, ZoneStat>();

        // Initialize zones
        zones.forEach(z => {
            zoneMap.set(z.code, { name: z.name, total: 0, full: 0 });
        });

        // Helper to map state to zone
        const stateToZone = new Map<string, string>();
        states.forEach(s => {
            if (s.zone_code) stateToZone.set(s.code, s.zone_code);
        });

        const schoolsToProcess = activeTab === 'OVERALL' 
            ? [...ssceSchools, ...beceSchools]
            : activeTab === 'SSCE' ? ssceSchools : beceSchools;

        schoolsToProcess.forEach(s => {
            const zCode = stateToZone.get(s.state_code || '');
            if (zCode && zoneMap.has(zCode)) {
                const zData = zoneMap.get(zCode)!;
                zData.total++;
                if (s.accreditation_status === 'Full') zData.full++;
            }
        });

        return Array.from(zoneMap.values()).filter((z: ZoneStat) => z.total > 0);
    }, [ssceSchools, beceSchools, states, zones, activeTab]);

    // Utility to format percentages
    const pct = (val: number, total: number) => {
        if (!total) return '0%';
        return `${Math.round((val / total) * 100)}%`;
    };

    const reportCards = [
        { id: 'schools', title: 'All Schools Report', description: 'Comprehensive list of all schools with current statuses.', icon: SchoolIcon, color: 'bg-emerald-500' },
        { id: 'states', title: 'State Performance', description: 'Analytics broken down by states and zones.', icon: LucideMap, color: 'bg-blue-500' },
        { id: 'lgas', title: 'LGA Distribution', description: 'Breakdown of local government areas and centers.', icon: BarChart3, color: 'bg-purple-500' },
        { id: 'custodians', title: 'Custodians Report', description: 'List of all custodians and their assigned points.', icon: Users, color: 'bg-amber-500' },
    ];

    const handlePrintSummary = () => {
        setIsPrintingSummary(true);
        const originalTitle = document.title;
        document.title = ' ';  // Suppress browser header text
        setTimeout(() => {
            window.print();
            document.title = originalTitle;
            setIsPrintingSummary(false);
        }, 100);
    };

    const pieData = [
        { name: 'Full Accreditation', value: aggregatedStats?.totalAccredited || 0, color: '#10b981' }, // emerald-500
        { name: 'Partial Accreditation', value: aggregatedStats?.totalPartial || 0, color: '#f59e0b' }, // amber-500
        { name: 'Failed', value: aggregatedStats?.totalFailed || 0, color: '#ef4444' }, // red-500
        { name: 'Unverified Payment', value: aggregatedStats?.totalPending || 0, color: '#94a3b8' }, // slate-400
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-emerald-600" />
                        Reporting & Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Export system data and generate detailed performance insights.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner">
                        <button
                            onClick={() => setActiveTab('OVERALL')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'OVERALL'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            Overall
                        </button>
                        <button
                            onClick={() => setActiveTab('SSCE')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'SSCE'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            SSCE
                        </button>
                        <button
                            onClick={() => setActiveTab('BECE')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${activeTab === 'BECE'
                                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            BECE
                        </button>
                    </div>

                    <button
                        onClick={() => fetchData()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 animate-in shake">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-xs font-black uppercase tracking-widest">Clear</button>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                    <p className="font-bold text-slate-500">Compiling Analytics Data...</p>
                </div>
            ) : (
                <>
                    {/* Main Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Schools', value: aggregatedStats?.total || 0, icon: SchoolIcon, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                            { label: 'Fully Accredited', value: aggregatedStats?.totalAccredited || 0, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                            { label: 'Active States', value: stateStats.length, icon: LucideMap, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                            { label: 'Completion Rate', value: `${aggregatedStats?.completionRate}%`, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-[64px] flex items-center justify-end p-4 opacity-50`}>
                                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                                </div>
                                <div className="relative z-10 space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-[32px] shadow-sm flex flex-col justify-between min-h-[350px]">
                            <h4 className="text-slate-900 dark:text-white text-lg font-black mb-4">National Accreditation Overview</h4>
                            <div className="flex-1 w-full min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number, name: string) => [`${value} (${pct(value, aggregatedStats?.total || 1)})`, name]}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-[32px] shadow-sm flex flex-col justify-between min-h-[350px] lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-slate-900 dark:text-white text-lg font-black">Top 10 States by Registration Status</h4>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Bar Chart</span>
                            </div>
                            <div className="flex-1 w-full min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stateStats.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend />
                                        <Bar dataKey="full" name="Full Accr." stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="partial" name="Partial Accr." stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" />
                                        <Bar dataKey="pending" name="Pending" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-[32px] shadow-sm flex flex-col justify-between min-h-[350px]">
                            <h4 className="text-slate-900 dark:text-white text-lg font-black mb-4">School Categories</h4>
                            <div className="flex-1 w-full min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryStats}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {categoryStats.map(c => (
                                    <div key={c.name} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{c.name}</span>
                                        <span className="text-xl font-black text-slate-700 dark:text-slate-300">{c.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-[32px] shadow-sm flex flex-col justify-between min-h-[350px] lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-slate-900 dark:text-white text-lg font-black">Regional Distribution</h4>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schools per Zone</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 flex-1">
                                {zoneStats.map((z: any) => (
                                    <div key={z.name} className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-600 dark:text-slate-400">{z.name}</span>
                                            <span className="text-slate-900 dark:text-white">{z.total.toLocaleString()} schools</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full"
                                                style={{ width: `${(z.total / (aggregatedStats?.total || 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                            <span>Accreditation Rate</span>
                                            <span className="text-emerald-500">{pct(z.full, z.total)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* State Data Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">State Analytics Breakdown</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 whitespace-nowrap">State</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Total Schools</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Paid (Verified)</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Fully Accredited</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Partial Accredited</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Failed</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Awaiting Approval</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                                    {stateStats.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-bold italic">
                                                No accreditation records found. Upload payment proofs to see analytics.
                                            </td>
                                        </tr>
                                    ) : (
                                        stateStats.map((state, idx) => (
                                            <tr key={state.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="font-bold text-slate-900 dark:text-white">{state.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-slate-700 dark:text-slate-300">
                                                    {state.total.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{state.paid.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{pct(state.paid, state.total)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{state.full.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{pct(state.full, state.total)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-amber-600 dark:text-amber-400">{state.partial.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{pct(state.partial, state.total)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-red-600 dark:text-red-400">{state.failed.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{pct(state.failed, state.total)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-slate-600 dark:text-slate-400">{state.pending.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">{pct(state.pending, state.total)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Grand Total Row */}
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white">NATIONAL TOTALS</td>
                                        <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">{(aggregatedStats?.total || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center font-black text-blue-600">{(aggregatedStats?.totalPaid || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center font-black text-emerald-600">{(aggregatedStats?.totalAccredited || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center font-black text-amber-600">{(aggregatedStats?.totalPartial || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center font-black text-red-600">{(aggregatedStats?.totalFailed || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center font-black text-slate-600">{(aggregatedStats?.totalPending || 0).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Report Cards Grid */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Export Reports</h2>
                        {isSuperAdmin && (
                            <button
                                onClick={handlePrintSummary}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Generate Summary Report</span>
                            </button>
                        )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {reportCards.map((report) => (
                                <div key={report.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[28px] overflow-hidden shadow-sm group hover:border-emerald-500/50 transition-all flex flex-col">
                                    <div className={`h-24 ${report.color} p-6 flex items-center justify-between relative overflow-hidden`}>
                                        <report.icon className="w-24 h-24 text-white opacity-20 absolute -right-4 -top-4 rotate-12" />
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white z-10">
                                            <report.icon className="w-6 h-6" />
                                        </div>
                                        <FileSpreadsheet className="w-5 h-5 text-white/50 z-10" />
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight">{report.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 flex-1 leading-relaxed">
                                            {report.description}
                                        </p>

                                        <button
                                            onClick={() => handleExport(report.id as any)}
                                            disabled={!isSuperAdmin || isExporting !== null}
                                            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 rounded-2xl text-sm font-bold hover:bg-emerald-600 dark:hover:bg-emerald-700 transition-all disabled:opacity-50"
                                        >
                                            {isExporting === report.id ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Generating Excel...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    <span>Download (.xlsx)</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Printable Summary Report (matching report.png) */}
            <div id="summary-report-print" className={`hidden ${isPrintingSummary ? 'print:block' : ''} p-8 bg-white text-black font-sans min-h-screen`}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: portrait; margin: 1.5cm; }
                        body * { visibility: hidden !important; }
                        #summary-report-print, #summary-report-print * { visibility: visible !important; }
                        #summary-report-print {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            display: block !important;
                            padding: 0;
                            background: white;
                        }
                        .summary-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; background: transparent !important; }
                        .summary-table th, .summary-table td { border: 1px solid black; padding: 4px 6px; text-align: left; background: transparent !important; }
                        .summary-table th { background-color: rgba(241, 245, 249, 0.5) !important; text-transform: uppercase; font-weight: 800; font-size: 10px; }
                        .text-center { text-align: center !important; }
                        .font-bold { font-weight: 800; }
                        tr { background: transparent !important; }
                        .watermark {
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: 120%;
                            opacity: 0.04 !important;
                            z-index: -1;
                            pointer-events: none;
                        }
                        .report-header {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 20px;
                            margin-bottom: 20px;
                        }
                        .header-logo {
                            width: 60px;
                            height: 60px;
                            object-fit: contain;
                        }
                        .report-footer {
                            margin-top: 30px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                            font-weight: 700;
                            color: #64748b;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 10px;
                        }
                    }
                ` }} />

                <div className="report-header">
                    <img src="/images/neco.png" alt="NECO Logo" className="header-logo" />
                    <div className="text-center space-y-1">
                        <h1 className="text-xl font-black uppercase tracking-tight text-[#059669]">National Examinations Council (NECO)</h1>
                        <h2 className="text-lg font-bold uppercase">Quality Assurance Department</h2>
                        <h3 className="text-md font-bold uppercase">Accreditation Division</h3>
                        <div className="mt-2 py-1 border-y-2 border-black inline-block px-8">
                            <h4 className="text-sm font-black uppercase">Schools Due for Accreditation Report</h4>
                        </div>
                    </div>
                </div>

                <img src="/images/neco.png" alt="Watermark" className="watermark" />

                <table className="summary-table">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-center w-8">S/N</th>
                            <th rowSpan={2}>State</th>
                            <th colSpan={3} className="text-center">SSCE</th>
                            <th colSpan={3} className="text-center">BECE</th>
                        </tr>
                        <tr>
                            <th className="text-center">Schools Due</th>
                            <th className="text-center">No. Paid</th>
                            <th className="text-center">Percentage (%)</th>
                            <th className="text-center">Schools Due</th>
                            <th className="text-center">No. Paid</th>
                            <th className="text-center">Percentage (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summaryReportStats.map((st, idx) => (
                            <tr key={st.code}>
                                <td className="text-center">{idx + 1}</td>
                                <td className="font-bold uppercase">{st.name}</td>
                                <td className="text-center">{st.ssceDue}</td>
                                <td className="text-center">{st.sscePaid}</td>
                                <td className="text-center font-bold">
                                    {st.ssceDue > 0 ? ((st.sscePaid / st.ssceDue) * 100).toFixed(2) + '%' : '0.00%'}
                                </td>
                                <td className="text-center">{st.beceDue}</td>
                                <td className="text-center">{st.becePaid}</td>
                                <td className="text-center font-bold">
                                    {st.beceDue > 0 ? ((st.becePaid / st.beceDue) * 100).toFixed(2) + '%' : '0.00%'}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50 font-black">
                            <td colSpan={2} className="text-right">TOTAL</td>
                            <td className="text-center">
                                {summaryReportStats.reduce((sum, s) => sum + s.ssceDue, 0)}
                            </td>
                            <td className="text-center">
                                {summaryReportStats.reduce((sum, s) => sum + s.sscePaid, 0)}
                            </td>
                            <td className="text-center">
                                {(() => {
                                    const totalDue = summaryReportStats.reduce((sum, s) => sum + s.ssceDue, 0);
                                    const totalPaid = summaryReportStats.reduce((sum, s) => sum + s.sscePaid, 0);
                                    return totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(2) + '%' : '0.00%';
                                })()}
                            </td>
                            <td className="text-center">
                                {summaryReportStats.reduce((sum, s) => sum + s.beceDue, 0)}
                            </td>
                            <td className="text-center">
                                {summaryReportStats.reduce((sum, s) => sum + s.becePaid, 0)}
                            </td>
                            <td className="text-center">
                                {(() => {
                                    const totalDue = summaryReportStats.reduce((sum, s) => sum + s.beceDue, 0);
                                    const totalPaid = summaryReportStats.reduce((sum, s) => sum + s.becePaid, 0);
                                    return totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(2) + '%' : '0.00%';
                                })()}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div className="report-footer">
                    <span>Generated: {new Date().toLocaleDateString('en-GB')}</span>
                    <span>By: NECO Accreditation Management System</span>
                </div>
            </div>
        </div>
    );
}
