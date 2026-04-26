import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3,
    School,
    GraduationCap,
    CheckCircle,
    Calendar,
    Map,
    Loader2,
    AlertCircle,
    ChevronRight,
    PieChart,
    Printer,
    RefreshCw
} from 'lucide-react';
import DataService, { LGA } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';
import { cn } from '../../lib/utils';

type SchoolType = components['schemas']['School'];
type BECESchoolType = components['schemas']['BECESchool'];

export default function StateReports() {
    const [ssceSchools, setSsceSchools] = useState<SchoolType[]>([]);
    const [beceSchools, setBeceSchools] = useState<BECESchoolType[]>([]);
    const [lgas, setLgas] = useState<LGA[]>([]);
    const [zones, setZones] = useState<components['schemas']['Zone'][]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrintingSummary, setIsPrintingSummary] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stateName, setStateName] = useState('State Office');
    const [currentState, setCurrentState] = useState<any>(null);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const user = await AuthService.getCurrentUser();
            if (!user?.state_code) {
                setError('No state association found for your account.');
                setIsLoading(false);
                return;
            }

            const statesData = await DataService.getStates();
            const state = statesData.find(s => s.code === user.state_code);
            setCurrentState(state || null);
            setStateName(state?.name || user.state_name || user.state_code);

            const ssceData = await DataService.getSchools({ state_code: user.state_code });
            const beceData = await DataService.getBeceSchools({ state_code: user.state_code });
            const lgasData = await DataService.getLGAs({ state_code: user.state_code });
            const zonesData = await DataService.getZones();

            setSsceSchools(ssceData);
            setBeceSchools(beceData);
            setLgas(lgasData);
            setZones(zonesData);
            setError(null);

        } catch (err: any) {
            setError('Failed to load report data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

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

    // Determine if a school is due for accreditation
    const isDueForAccreditation = (school: any): boolean => {
        if (school.accreditation_status === 'Failed') return true;
        if (!school.accredited_date || !['Full', 'Partial'].includes(school.accreditation_status || '')) {
            return false;
        }
        const accreditedDate = new Date(school.accredited_date);
        let yearsToAdd = 5;

        const zone = zones.find(z => z.code === currentState?.zone_code);
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

    // Summary Report Stats (matching report.png)
    const summaryReportStats = useMemo(() => {
        return lgas.map(lga => {
            const lgaSsceDue = ssceSchools.filter(s => s.lga_code === lga.code && isDueForAccreditation(s));
            const lgaBeceDue = beceSchools.filter(s => s.lga_code === lga.code && isDueForAccreditation(s));

            return {
                lgaCode: lga.code,
                lgaName: lga.name,
                ssceDue: lgaSsceDue.length,
                sscePaid: lgaSsceDue.filter(s => s.approval_status === 'Approved').length,
                beceDue: lgaBeceDue.length,
                becePaid: lgaBeceDue.filter(s => s.approval_status === 'Approved').length,
            };
        }).sort((a, b) => a.lgaName.localeCompare(b.lgaName));
    }, [ssceSchools, beceSchools, lgas, zones]);

    // Derived Statistics (Existing UI)
    const {
        totalSsce,
        totalBece,
        activeSsce,
        activeBece,
        pendingSsce,
        pendingBece,
        lgaStats
    } = React.useMemo(() => {
        const totalSsce = ssceSchools.length;
        const totalBece = beceSchools.length;
        const activeSsce = ssceSchools.filter(s => ['Full', 'Partial', 'Accredited'].includes(s.accreditation_status || '') && !isDueForAccreditation(s)).length;
        const activeBece = beceSchools.filter(s => ['Full', 'Partial', 'Accredited'].includes(s.accreditation_status || '') && !isDueForAccreditation(s)).length;
        const pendingSsce = ssceSchools.filter(s => isDueForAccreditation(s)).length;
        const pendingBece = beceSchools.filter(s => isDueForAccreditation(s)).length;

        // LGA Breakdown
        const lgaStats = lgas.map(lga => {
            const lgaSsce = ssceSchools.filter(s => s.lga_code === lga.code);
            const lgaBece = beceSchools.filter(s => s.lga_code === lga.code);
            return {
                lgaCode: lga.code,
                lgaName: lga.name,
                totalSsce: lgaSsce.length,
                accreditedSsce: lgaSsce.filter(s => ['Full', 'Partial', 'Accredited'].includes(s.accreditation_status || '') && !isDueForAccreditation(s)).length,
                pendingSsce: lgaSsce.filter(s => isDueForAccreditation(s)).length,
                totalBece: lgaBece.length,
                accreditedBece: lgaBece.filter(s => ['Full', 'Partial', 'Accredited'].includes(s.accreditation_status || '') && !isDueForAccreditation(s)).length,
                pendingBece: lgaBece.filter(s => isDueForAccreditation(s)).length,
            };
        }).sort((a, b) => b.totalSsce - a.totalSsce || b.totalBece - a.totalBece); // Sort by highest schools

        return {
            totalSsce,
            totalBece,
            activeSsce,
            activeBece,
            pendingSsce,
            pendingBece,
            lgaStats
        };
    }, [ssceSchools, beceSchools, lgas, zones, currentState]);


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="text-slate-500 font-medium">Generating reports for {stateName}...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 print:p-0 print:m-0 print:space-y-6 print:bg-white print:text-black">
            {/* Header section */}
            <div className="relative group print:hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Statistical Analytics</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stateName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Report Page</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
                            Consolidated data insights and accreditation performance metrics for your state.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>

                        <button
                            onClick={() => fetchInitialData()}
                            disabled={isLoading}
                            className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            title="Refresh Intelligence"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        </button>

                        <button
                            onClick={handlePrintSummary}
                            className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all active:scale-95 group"
                        >
                            <Printer className="w-4 h-4 group-hover:animate-bounce" />
                            Generate Summary Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:flex flex-col items-center justify-center text-center pb-8 border-b-2 border-black">
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">National Examinations Council (NECO)</h1>
                <h2 className="text-xl font-bold text-emerald-700 uppercase">{stateName} State Office</h2>
                <p className="text-sm font-bold text-slate-500 mt-2">Comprehensive Statistical Report — {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 print:hidden">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-[10px] font-black uppercase hover:underline">Dismiss</button>
                </div>
            )}

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3">
                {[
                    {
                        label: 'Total Registered',
                        sub: 'SCHOOLS',
                        main: totalSsce,
                        mainLabel: 'SSCE',
                        sec: totalBece,
                        secLabel: 'BECE',
                        icon: School,
                        color: 'from-blue-600 to-indigo-600',
                        bg: 'bg-blue-500/10',
                        text: 'text-blue-600'
                    },
                    {
                        label: 'Valid Accreditation',
                        sub: 'ACCREDITED',
                        main: activeSsce,
                        mainLabel: 'SSCE',
                        sec: activeBece,
                        secLabel: 'BECE',
                        icon: CheckCircle,
                        color: 'from-emerald-600 to-teal-600',
                        bg: 'bg-emerald-500/10',
                        text: 'text-emerald-600'
                    },
                    {
                        label: 'Pending Action',
                        sub: 'EXPIRED/DUE',
                        main: pendingSsce,
                        mainLabel: 'SSCE',
                        sec: pendingBece,
                        secLabel: 'BECE',
                        icon: Calendar,
                        color: 'from-orange-600 to-amber-600',
                        bg: 'bg-orange-500/10',
                        text: 'text-orange-600'
                    }
                ].map((stat, i) => (
                    <div key={i} className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-3xl transition duration-500 blur-lg"></div>
                        <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-xl group-hover:translate-y-[-4px] transition-all duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border", stat.bg, stat.text, "border-current/10")}>
                                    <stat.icon className="w-7 h-7" />
                                </div>
                                <div className="text-right">
                                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border shadow-sm", stat.bg, stat.text, "border-current/20")}>
                                        {stat.sub}
                                    </span>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{stat.label}</h4>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 relative">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.mainLabel}</p>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1 tabular-nums">{stat.main.toLocaleString()}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.secLabel}</p>
                                    <h3 className="text-xl font-black text-slate-700 dark:text-slate-400 tracking-tighter mt-1 tabular-nums">{stat.sec.toLocaleString()}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* LGA Statistical Breakdown Table */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden print:border-black print:shadow-none print:bg-white print:rounded-none">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20 print:bg-slate-100 print:border-black">
                    <div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight print:text-black">LGA Statistics</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1 print:text-slate-700">Detailed Regional Performance Metrics</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 print:hidden">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <Map className="w-3.5 h-3.5 text-emerald-500" />
                            {lgaStats.length} LGAs
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-200 dark:border-slate-800 print:bg-slate-200 print:text-black print:border-black">
                                <th className="px-8 py-6 border-r border-slate-200 dark:border-slate-800 print:border-black" rowSpan={2}>Regional LGA</th>
                                <th className="px-6 py-3 text-center border-b border-r border-slate-200 dark:border-slate-800 print:border-black" colSpan={3}>SSCE Capacity</th>
                                <th className="px-6 py-3 text-center border-b border-slate-200 dark:border-slate-800 print:border-black" colSpan={3}>BECE Capacity</th>
                            </tr>
                            <tr className="bg-slate-50/30 dark:bg-slate-800/10 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 print:bg-white print:text-black print:border-black">
                                <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black">Total</th>
                                <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black text-emerald-600 dark:text-emerald-400">Valid</th>
                                <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black text-amber-600 dark:text-amber-400">Due</th>

                                <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black">Total</th>
                                <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black text-blue-600 dark:text-blue-400">Valid</th>
                                <th className="px-4 py-3 text-center text-orange-600 dark:text-orange-400 print:border-black">Due</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-black tabular-nums">
                            {lgaStats.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest">No intelligence data available.</td>
                                </tr>
                            ) : (
                                lgaStats.map((lga, index) => (
                                    <tr key={lga.lgaCode} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300 print:bg-white">
                                        <td className="px-8 py-4 border-r border-slate-50 dark:border-slate-800/50 print:border-black">
                                            <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors print:text-black">{lga.lgaName}</span>
                                        </td>

                                        <td className="px-4 py-4 text-center border-r border-slate-50 dark:border-slate-800/50 print:border-black font-bold text-slate-600 dark:text-slate-400 print:text-black">{lga.totalSsce}</td>
                                        <td className="px-4 py-4 text-center border-r border-slate-50 dark:border-slate-800/50 print:border-black font-black text-emerald-600 dark:text-emerald-400 print:text-black">{lga.accreditedSsce}</td>
                                        <td className="px-4 py-4 text-center border-r border-slate-50 dark:border-slate-800/50 print:border-black font-bold text-amber-500/80 dark:text-amber-400/80 print:text-slate-600">{lga.pendingSsce}</td>

                                        <td className="px-4 py-4 text-center border-r border-slate-50 dark:border-slate-800/50 print:border-black font-bold text-slate-600 dark:text-slate-400 print:text-black">{lga.totalBece}</td>
                                        <td className="px-4 py-4 text-center border-r border-slate-50 dark:border-slate-800/50 print:border-black font-black text-blue-600 dark:text-blue-400 print:text-black">{lga.accreditedBece}</td>
                                        <td className="px-4 py-4 text-center font-bold text-orange-500/80 dark:text-orange-400/80 print:text-slate-600 print:border-black">{lga.pendingBece}</td>
                                    </tr>
                                ))
                            )}

                            {/* Summary Footer Row */}
                            {lgaStats.length > 0 && (
                                <tr className="bg-slate-900 dark:bg-emerald-600 font-black text-white uppercase text-xs border-t-2 border-slate-400 dark:border-slate-600 print:bg-slate-200 print:text-black print:border-black print:border-t-4">
                                    <td className="px-8 py-6 text-right border-r border-white/10 dark:border-white/20 print:border-black">Grand Statistics</td>
                                    <td className="px-4 py-6 text-center border-r border-white/10 dark:border-white/20 print:border-black">{totalSsce}</td>
                                    <td className="px-4 py-6 text-center border-r border-white/10 dark:border-white/20 print:border-black">{activeSsce}</td>
                                    <td className="px-4 py-6 text-center border-r border-white/10 dark:border-white/20 print:border-black">{pendingSsce}</td>
                                    <td className="px-4 py-6 text-center border-r border-white/10 dark:border-white/20 print:border-black">{totalBece}</td>
                                    <td className="px-4 py-6 text-center border-r border-white/10 dark:border-white/20 print:border-black">{activeBece}</td>
                                    <td className="px-4 py-6 text-center print:border-black">{pendingBece}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Printable Summary Report Overlay */}
            <div id="summary-report-print" className={cn("hidden p-12 bg-white text-black font-sans min-h-screen", isPrintingSummary && "print:block")}>
                {/* ... (Printable styles and structure remain consistent for functional accuracy) */}
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
                            <h4 className="text-sm font-black uppercase">Accreditation Summary: {stateName} State</h4>
                        </div>
                    </div>
                </div>

                <img src="/images/neco.png" alt="Watermark" className="watermark" />

                <table className="summary-table">
                    <thead>
                        <tr>
                            <th rowSpan={2} className="text-center w-8">S/N</th>
                            <th rowSpan={2}>LGA Name</th>
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
                            <tr key={st.lgaCode}>
                                <td className="text-center">{idx + 1}</td>
                                <td className="font-bold uppercase">{st.lgaName}</td>
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

