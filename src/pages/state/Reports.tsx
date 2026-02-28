import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Printer,
    School,
    GraduationCap,
    CheckCircle,
    Calendar,
    Map,
    Loader2,
    AlertCircle,
    ChevronRight,
    PieChart
} from 'lucide-react';
import DataService, { LGA } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { components } from '../../api/types';

type SchoolType = components['schemas']['School'];
type BECESchoolType = components['schemas']['BECESchool'];

export default function StateReports() {
    const [ssceSchools, setSsceSchools] = useState<SchoolType[]>([]);
    const [beceSchools, setBeceSchools] = useState<BECESchoolType[]>([]);
    const [lgas, setLgas] = useState<LGA[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stateName, setStateName] = useState('State Office');

    useEffect(() => {
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
                const currentState = statesData.find(s => s.code === user.state_code);
                setStateName(currentState?.name || user.state_name || user.state_code);

                const ssceData = await DataService.getSchools({ state_code: user.state_code });
                const beceData = await DataService.getBeceSchools({ state_code: user.state_code });
                const lgasData = await DataService.getLGAs({ state_code: user.state_code });

                setSsceSchools(ssceData);
                setBeceSchools(beceData);
                setLgas(lgasData);

            } catch (err: any) {
                setError('Failed to load report data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    // Derived Statistics
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
        const activeSsce = ssceSchools.filter(s => s.accreditation_status === 'Accredited').length;
        const activeBece = beceSchools.filter(s => s.accreditation_status === 'Accredited').length;
        const pendingSsce = ssceSchools.filter(s => s.status === 'pending' || s.accreditation_status === 'Unaccredited').length;
        const pendingBece = beceSchools.filter(s => s.status === 'pending' || s.accreditation_status === 'Unaccredited').length;

        // LGA Breakdown
        const lgaStats = lgas.map(lga => {
            const lgaSsce = ssceSchools.filter(s => s.lga_code === lga.code);
            const lgaBece = beceSchools.filter(s => s.lga_code === lga.code);
            return {
                lgaCode: lga.code,
                lgaName: lga.name,
                totalSsce: lgaSsce.length,
                accreditedSsce: lgaSsce.filter(s => s.accreditation_status === 'Accredited').length,
                pendingSsce: lgaSsce.filter(s => s.status === 'pending' || s.accreditation_status === 'Unaccredited').length,
                totalBece: lgaBece.length,
                accreditedBece: lgaBece.filter(s => s.accreditation_status === 'Accredited').length,
                pendingBece: lgaBece.filter(s => s.status === 'pending' || s.accreditation_status === 'Unaccredited').length,
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
    }, [ssceSchools, beceSchools, lgas]);


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="text-slate-500 font-medium">Generating reports for {stateName}...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 print:p-0 print:m-0 print:space-y-6 print:bg-white print:text-black">
            {/* Header section - hide buttons on print */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:border-b-2 print:border-black print:pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 print:text-black">
                        <BarChart3 className="w-8 h-8 text-emerald-600 print:text-black" />
                        Statistical Reports
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 print:text-black font-semibold text-lg">
                        {stateName} Office Analytics
                    </p>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-semibold shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print PDF Report</span>
                    </button>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* Print only current date */}
                <div className="hidden print:block text-sm font-bold opacity-70">
                    Generated on: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 print:hidden">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-xs font-black uppercase tracking-widest">Clear</button>
                </div>
            )}

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-3">
                {/* Total Stats */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm print:border-slate-300 print:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center print:bg-transparent print:text-black">
                            <School className="w-5 h-5 print:w-6 print:h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md print:bg-transparent print:border print:border-black print:text-black">Total Registered</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest print:text-slate-700">SSCE Schools</p>
                            <h3 className="text-3xl font-black mt-1 text-slate-950 dark:text-white print:text-black">{totalSsce.toLocaleString()}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest print:text-slate-700">BECE Schools</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-700 dark:text-slate-300 print:text-slate-800">{totalBece.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                {/* Accredited Stats */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm print:border-slate-300 print:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center print:bg-transparent print:text-black">
                            <CheckCircle className="w-5 h-5 print:w-6 print:h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-md print:bg-transparent print:border print:border-black print:text-black">Valid Accreditation</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest print:text-slate-700">SSCE Accredited</p>
                            <h3 className="text-3xl font-black mt-1 text-slate-950 dark:text-white print:text-black">{activeSsce.toLocaleString()}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest print:text-slate-700">BECE Accredited</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-700 dark:text-slate-300 print:text-slate-800">{activeBece.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>

                {/* Pending/Yet to be Accredited Stats */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm print:border-slate-300 print:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 flex items-center justify-center print:bg-transparent print:text-black">
                            <Calendar className="w-5 h-5 print:w-6 print:h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md print:bg-transparent print:border print:border-black print:text-black">Yet To Be Accredited</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest print:text-slate-700">Pending SSCE</p>
                            <h3 className="text-3xl font-black mt-1 text-slate-950 dark:text-white print:text-black">{pendingSsce.toLocaleString()}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest print:text-slate-700">Pending BECE</p>
                            <h3 className="text-xl font-bold mt-1 text-slate-700 dark:text-slate-300 print:text-slate-800">{pendingBece.toLocaleString()}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* LGA Statistical Breakdown Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden print:border-black print:shadow-none">
                <div className="p-4 sm:p-6 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 print:bg-transparent print:border-black">
                    <h3 className="font-black text-lg text-slate-950 dark:text-white uppercase tracking-tight print:text-black">Accreditation Spread by LGA</h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-widest mt-1 print:text-slate-700">Detailed Statistical Breakdown</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-300 dark:border-slate-700 print:bg-slate-100 print:text-black print:border-black print:border-b-2">
                            <tr>
                                <th className="px-6 py-4 border-r border-slate-300 dark:border-slate-700 print:border-black" rowSpan={2}>LGA Name</th>
                                <th className="px-6 py-2 text-center border-b border-r border-slate-300 dark:border-slate-700 print:border-black" colSpan={3}>SSCE Schools</th>
                                <th className="px-6 py-2 text-center border-b border-slate-300 dark:border-slate-700 print:border-black" colSpan={3}>BECE Schools</th>
                            </tr>
                            <tr>
                                <th className="px-4 py-2 text-center bg-slate-100 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-500 print:text-black">Total</th>
                                <th className="px-4 py-2 text-center bg-emerald-50 dark:bg-emerald-900/20 border-r border-slate-300 dark:border-slate-700 print:border-black text-emerald-700 print:text-black">Accredited</th>
                                <th className="px-4 py-2 text-center bg-amber-50 dark:bg-amber-900/20 border-r border-slate-300 dark:border-slate-700 print:border-black text-amber-700 print:text-black">Pending</th>

                                <th className="px-4 py-2 text-center bg-slate-100 dark:bg-slate-800/80 border-r border-slate-300 dark:border-slate-700 print:border-black text-slate-500 print:text-black">Total</th>
                                <th className="px-4 py-2 text-center bg-blue-50 dark:bg-blue-900/20 border-r border-slate-300 dark:border-slate-700 print:border-black text-blue-700 print:text-black">Accredited</th>
                                <th className="px-4 py-2 text-center bg-orange-50 dark:bg-orange-900/20 print:border-black text-orange-700 print:text-black">Pending</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 dark:divide-slate-800 print:divide-black">
                            {lgaStats.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No LGA data available to display.</td>
                                </tr>
                            ) : (
                                lgaStats.map((lga, index) => (
                                    <tr key={lga.lgaCode} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900 print:bg-white' : 'bg-slate-50/50 dark:bg-slate-800/20 print:bg-white'}>
                                        <td className="px-6 py-3 border-r border-slate-200 dark:border-slate-800 print:border-black">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight print:text-black">{lga.lgaName}</span>
                                        </td>

                                        {/* SSCE Columns */}
                                        <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">{lga.totalSsce}</td>
                                        <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black font-black text-emerald-600 dark:text-emerald-400 print:text-black">{lga.accreditedSsce}</td>
                                        <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black font-bold text-amber-600 dark:text-amber-400 print:text-slate-600">{lga.pendingSsce}</td>

                                        {/* BECE Columns */}
                                        <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">{lga.totalBece}</td>
                                        <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-800 print:border-black font-black text-blue-600 dark:text-blue-400 print:text-black">{lga.accreditedBece}</td>
                                        <td className="px-4 py-3 text-center font-bold text-orange-600 dark:text-orange-400 print:text-slate-600 print:border-black">{lga.pendingBece}</td>
                                    </tr>
                                ))
                            )}

                            {/* Summary Footer Row */}
                            {lgaStats.length > 0 && (
                                <tr className="bg-slate-200 dark:bg-slate-800 font-black text-slate-900 dark:text-white print:bg-slate-200 print:text-black uppercase text-sm border-t-2 border-slate-400 dark:border-slate-600 print:border-black print:border-t-4">
                                    <td className="px-6 py-4 text-right border-r border-slate-300 dark:border-slate-700 print:border-black">Grand Total</td>
                                    <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">{totalSsce}</td>
                                    <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700 print:border-black text-emerald-700 dark:text-emerald-400 print:text-black">{activeSsce}</td>
                                    <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700 print:border-black text-amber-700 dark:text-amber-400 print:text-black">{pendingSsce}</td>
                                    <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700 print:border-black">{totalBece}</td>
                                    <td className="px-4 py-4 text-center border-r border-slate-300 dark:border-slate-700 print:border-black text-blue-700 dark:text-blue-400 print:text-black">{activeBece}</td>
                                    <td className="px-4 py-4 text-center text-orange-700 dark:text-orange-400 print:text-black print:border-black">{pendingBece}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer space for printed page */}
            <div className="hidden print:block mt-8 text-center text-[10px] text-slate-500 border-t border-black pt-4">
                <p>This report is system generated and does not require a signature.</p>
                <p>NECO Accreditation System &copy; {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}

