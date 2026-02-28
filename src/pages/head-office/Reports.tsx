import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    Map as LucideMap,
    Loader2,
    AlertCircle,
    CheckCircle,
    School,
    Calendar,
    ChevronRight,
    Users,
    ShieldCheck
} from 'lucide-react';
import DataService from '../../api/services/data.service';
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
type State = components['schemas']['State'];

export default function HeadOfficeReports() {
    const [schools, setSchools] = useState<SchoolType[]>([]);
    const [states, setStates] = useState<State[]>([]);
    const [zones, setZones] = useState<components['schemas']['Zone'][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [sData, stData, zData] = await Promise.all([
                    DataService.getSchools(),
                    DataService.getStates(),
                    DataService.getZones()
                ]);
                setSchools(sData);
                setStates(stData);
                setZones(zData);
            } catch (err) {
                console.error("Failed to load report data:", err);
                setError("Failed to load report data. Please check your connection.");
            } finally {
                setIsLoading(false);
            }
        };
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
        if (!schools.length) return null;

        let totalAccredited = 0;
        let totalPartial = 0;
        let totalFailed = 0;
        let totalPending = 0;
        let totalPaid = 0;

        schools.forEach(s => {
            if (s.accreditation_status === 'Full') totalAccredited++;
            else if (s.accreditation_status === 'Partial') totalPartial++;
            else if (s.accreditation_status === 'Failed') totalFailed++;

            if (s.payment_url) {
                totalPaid++;
                // Pending: Paid but not Full/Partial/Failed
                if (!['Full', 'Partial', 'Failed'].includes(s.accreditation_status || '')) {
                    totalPending++;
                }
            }
        });

        const total = schools.length;
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
    }, [schools]);

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

        schools.forEach(school => {
            const sc = school.state_code || 'UNKNOWN';
            if (!map.has(sc)) {
                map.set(sc, { code: sc, name: sc, total: 0, full: 0, partial: 0, failed: 0, paid: 0, pending: 0 });
            }

            const stateData = map.get(sc)!;
            stateData.total++;

            if (school.payment_url) {
                stateData.paid++;

                // Pending Approval: Has paid, but status is not Full/Partial/Failed
                // This includes "Pending", "Unaccredited", or missing status
                if (!['Full', 'Partial', 'Failed'].includes(school.accreditation_status || '')) {
                    stateData.pending++;
                }
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
    }, [schools, states]);

    // Calculate Category stats (PUB vs PRI)
    const categoryStats = useMemo(() => {
        const stats = { PUB: 0, PRI: 0 };
        schools.forEach(s => {
            if (s.category === 'PUB') stats.PUB++;
            else if (s.category === 'PRI') stats.PRI++;
        });
        return [
            { name: 'Public Schools', value: stats.PUB, color: '#3b82f6' }, // blue-500
            { name: 'Private Schools', value: stats.PRI, color: '#ec4899' }, // pink-500
        ];
    }, [schools]);

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

        schools.forEach(s => {
            const zCode = stateToZone.get(s.state_code || '');
            if (zCode && zoneMap.has(zCode)) {
                const zData = zoneMap.get(zCode)!;
                zData.total++;
                if (s.accreditation_status === 'Full') zData.full++;
            }
        });

        return Array.from(zoneMap.values()).filter((z: ZoneStat) => z.total > 0);
    }, [schools, states, zones]);

    // Utility to format percentages
    const pct = (val: number, total: number) => {
        if (!total) return '0%';
        return `${Math.round((val / total) * 100)}%`;
    };

    const reportCards = [
        { id: 'schools', title: 'All Schools Report', description: 'Comprehensive list of all schools with current statuses.', icon: School, color: 'bg-emerald-500' },
        { id: 'states', title: 'State Performance', description: 'Analytics broken down by states and zones.', icon: LucideMap, color: 'bg-blue-500' },
        { id: 'lgas', title: 'LGA Distribution', description: 'Breakdown of local government areas and centers.', icon: BarChart3, color: 'bg-purple-500' },
        { id: 'custodians', title: 'Custodians Report', description: 'List of all custodians and their assigned points.', icon: Users, color: 'bg-amber-500' },
    ];

    const pieData = [
        { name: 'Full Accreditation', value: aggregatedStats?.totalAccredited || 0, color: '#10b981' }, // emerald-500
        { name: 'Partial Accreditation', value: aggregatedStats?.totalPartial || 0, color: '#f59e0b' }, // amber-500
        { name: 'Failed', value: aggregatedStats?.totalFailed || 0, color: '#ef4444' }, // red-500
        { name: 'Pending Review', value: aggregatedStats?.totalPending || 0, color: '#94a3b8' }, // slate-400
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

                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Real-time Data</span>
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
                            { label: 'Total Schools', value: aggregatedStats?.total || 0, icon: School, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
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
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Paid (Proof Uploaded)</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Fully Accredited</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Partial Accredited</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Failed</th>
                                        <th className="px-6 py-4 text-center whitespace-nowrap">Pending Approval</th>
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
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white px-2 mb-4">Export Reports</h2>
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
                                            disabled={isExporting !== null}
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
        </div>
    );
}
