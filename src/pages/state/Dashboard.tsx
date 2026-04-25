import React from 'react';
import {
  School as SchoolIcon,
  CheckCircle,
  Calendar,
  AlertCircle,
  Clock,
  MoreVertical,
  Megaphone,
  HelpCircle,
  GraduationCap,
  Loader2,
  Lock,
  RefreshCw
} from 'lucide-react';
import AuthService from '../../api/services/auth.service';
import DataService from '../../api/services/data.service';
import { useFilterContext } from '../../context/FilterContext';
import { cn } from '../../components/layout/DashboardLayout';

type School = components['schemas']['School'];

export default function StateDashboard() {
  const [ssceSchools, setSsceSchools] = React.useState<School[]>([]);
  const [beceSchools, setBeceSchools] = React.useState<School[]>([]);
  const [lgas, setLgas] = React.useState<components['schemas']['LGA'][]>([]);
  const [custodians, setCustodians] = React.useState<components['schemas']['Custodian'][]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stateName, setStateName] = React.useState<string>('State Office');
  const [isLocked, setIsLocked] = React.useState(false);

  const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
  const hasInitializedYear = React.useRef(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const user = await AuthService.getCurrentUser();
      if (user?.state_code) {
        const statesData = await DataService.getStates();
        const currentState = statesData.find(s => s.code === user.state_code);
        setStateName(currentState?.name || user.state_name || user.state_code);

        const [ssceData, beceData, lgaData, custodianData] = await Promise.all([
          DataService.getSchools({ state_code: user.state_code }),
          DataService.getBeceSchools({ state_code: user.state_code }),
          DataService.getLGAs({ state_code: user.state_code }),
          DataService.getCustodians({ state_code: user.state_code })
        ]);

        setSsceSchools(ssceData);
        setBeceSchools(beceData);
        setLgas(lgaData);
        setCustodians(custodianData);
        setError(null);

        if (currentState) {
          setIsLocked(!!currentState.is_locked);
        }
      } else {
        setError('No state association found for your account.');
      }
    } catch (err: any) {
      setError('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();

    return () => {
      setHeaderAvailableYears([]);
      setHeaderYearFilter('');
    };
  }, []);

  React.useEffect(() => {
    if (ssceSchools.length > 0 || beceSchools.length > 0) {
      const allSchools = [...ssceSchools, ...beceSchools];
      const years = new Set<string>();
      allSchools.forEach(school => {
        const year = school.accrd_year || (school.accredited_date ? new Date(school.accredited_date).getFullYear().toString() : '');
        if (year) years.add(year.toString());
      });

      const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
      setHeaderAvailableYears(sortedYears);

      if (!hasInitializedYear.current && sortedYears.length > 0) {
        const currentYear = new Date().getFullYear().toString();
        const prevYear = (new Date().getFullYear() - 1).toString();

        if (sortedYears.includes(currentYear)) setHeaderYearFilter(currentYear);
        else if (sortedYears.includes(prevYear)) setHeaderYearFilter(prevYear);
        else setHeaderYearFilter(sortedYears[0]);

        hasInitializedYear.current = true;
      }
    }
  }, [ssceSchools, beceSchools]);

  const {
    activeSsce,
    activeBece,
    fullSsce,
    partialSsce,
    failedSsce,
    pendingSsce,
    fullBece,
    partialBece,
    failedBece,
    pendingBece,
    statsCards,
    dashboardLgaData,
    recentApplications,
    totalSsce,
    totalBece
  } = React.useMemo(() => {
    // Filter schools by year first
    const filteredSsce = ssceSchools.filter(s => {
      const year = s.accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : '');
      return !headerYearFilter || year === headerYearFilter;
    });

    const filteredBece = beceSchools.filter(s => {
      const year = s.accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : '');
      return !headerYearFilter || year === headerYearFilter;
    });

    const totalSsce = filteredSsce.length;
    const totalBece = filteredBece.length;

    // SSCE Stats logic
    const fullSsce = filteredSsce.filter(s => s.accreditation_status === 'Full').length;
    const partialSsce = filteredSsce.filter(s => s.accreditation_status === 'Partial').length;
    const failedSsce = filteredSsce.filter(s => s.accreditation_status === 'Failed').length;
    const activeSsce = fullSsce + partialSsce;
    const pendingSsce = filteredSsce.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;

    // BECE Stats logic
    const fullBece = filteredBece.filter(s => s.accreditation_status === 'Full').length;
    const partialBece = filteredBece.filter(s => s.accreditation_status === 'Partial').length;
    const failedBece = filteredBece.filter(s => s.accreditation_status === 'Failed').length;
    const activeBece = fullBece + partialBece;
    const pendingBece = filteredBece.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;

    const statsCards = [
      // SSCE Group
      { icon: SchoolIcon, label: 'SSCE Total', value: totalSsce.toLocaleString(), change: 'SSCE', color: 'emerald', iconBg: 'bg-emerald-500/10 text-emerald-600' },
      { icon: CheckCircle, label: 'Accredited', value: activeSsce.toLocaleString(), change: 'Valid', color: 'emerald', iconBg: 'bg-emerald-500/10 text-emerald-600' },
      { icon: Clock, label: 'In Review', value: pendingSsce.toLocaleString(), change: 'Pending', color: 'amber', iconBg: 'bg-amber-500/10 text-amber-600' },
      { icon: AlertCircle, label: 'Failed', value: failedSsce.toLocaleString(), change: 'Issue', color: 'red', iconBg: 'bg-red-500/10 text-red-600' },

      // BECE Group
      { icon: GraduationCap, label: 'BECE Total', value: totalBece.toLocaleString(), change: 'BECE', color: 'blue', iconBg: 'bg-blue-500/10 text-blue-600' },
      { icon: CheckCircle, label: 'Accredited', value: activeBece.toLocaleString(), change: 'Valid', color: 'blue', iconBg: 'bg-blue-500/10 text-blue-600' },
      { icon: Clock, label: 'In Review', value: pendingBece.toLocaleString(), change: 'Pending', color: 'amber', iconBg: 'bg-amber-500/10 text-amber-600' },
      { icon: AlertCircle, label: 'Failed', value: failedBece.toLocaleString(), change: 'Issue', color: 'red', iconBg: 'bg-red-500/10 text-red-600' },
    ];

    // Group schools by LGA (using SSCE for distribution overview)
    const lgaGrouping = filteredSsce.reduce((acc: Record<string, number>, school) => {
      const lgaName = lgas.find(l => l.code === school.lga_code)?.name || school.lga_code;
      acc[lgaName] = (acc[lgaName] || 0) + 1;
      return acc;
    }, {});

    const dashboardLgaData = (Object.entries(lgaGrouping) as [string, number][])
      .map(([name, count]) => ({
        name,
        count,
        percent: totalSsce > 0 ? Math.round((count / totalSsce) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentApplications = filteredSsce
      .filter(s => s.status === 'pending' || s.accreditation_status === 'Accredited' || s.accreditation_status === 'Full' || s.accreditation_status === 'Partial')
      .sort((a, b) => {
        const dateA = a.accredited_date ? new Date(a.accredited_date).getTime() : 0;
        const dateB = b.accredited_date ? new Date(b.accredited_date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(s => ({
        school: s.name,
        lga: lgas.find(l => l.code === s.lga_code)?.name || s.lga_code,
        type: 'SSCE Accreditation',
        date: s.accredited_date ? new Date(s.accredited_date).toLocaleDateString() : 'Pending',
        status: (s.accreditation_status === 'Accredited' || s.accreditation_status === 'Passed' || s.accreditation_status === 'Full' || s.accreditation_status === 'Partial') ? 'Accredited' : s.approval_status === 'Approved' ? 'Paid & Verified' : s.payment_url ? 'Pymt Review' : 'Pending',
        statusColor: (s.accreditation_status === 'Accredited' || s.accreditation_status === 'Passed' || s.accreditation_status === 'Full' || s.accreditation_status === 'Partial') ? 'emerald' : s.approval_status === 'Approved' ? 'blue' : s.payment_url ? 'amber' : 'slate'
      }));

    return {
      activeSsce,
      activeBece,
      fullSsce,
      partialSsce,
      failedSsce,
      pendingSsce,
      fullBece,
      partialBece,
      failedBece,
      pendingBece,
      statsCards,
      dashboardLgaData,
      recentApplications,
      totalSsce,
      totalBece
    };
  }, [ssceSchools, beceSchools, lgas, headerYearFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-slate-500 font-medium">Loading {stateName} metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 relative">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
            {stateName}
            <span className="text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full lowercase tracking-normal">office dashboard</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold max-w-xl">Comprehensive metrics and accreditation analytics for institutions within your state.</p>
        </div>

        <button
          onClick={() => fetchData()}
          disabled={isLoading}
          className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:border-emerald-500 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 transition-transform duration-700 group-hover:rotate-180", isLoading && "animate-spin")} />
          Sync State Data
        </button>
      </div>

      {isLocked && (
        <div className="p-6 bg-amber-50/50 dark:bg-amber-900/20 backdrop-blur-xl border border-amber-200 dark:border-amber-800 rounded-[2rem] flex items-center gap-6 text-amber-900 dark:text-amber-400 animate-in slide-in-from-top-4 shadow-xl shadow-amber-500/5">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-lg border border-amber-200 dark:border-amber-800">
            <Lock className="w-7 h-7 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-xl uppercase tracking-widest">Administrative Lock Active</h3>
            <p className="text-sm font-bold opacity-80 mt-1 leading-relaxed">The National Head Office has placed this state portal in read-only mode. New school registrations and accreditation modifications are currently disabled.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-md border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-4 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SSCE Metrics */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm p-8 hover:shadow-lg transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <SchoolIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">SSCE Analytics</h2>
            </div>
            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Annual</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statsCards.slice(0, 4).map((card) => (
              <div key={card.label} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{card.label}</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:scale-110 transition-transform origin-left">{card.value}</h3>
                <div className={`mt-3 w-8 h-1 rounded-full bg-${card.color}-500/30 overflow-hidden`}>
                  <div className={`h-full bg-${card.color}-500 w-2/3`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BECE Metrics */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm p-8 hover:shadow-lg transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">BECE Analytics</h2>
            </div>
            <div className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">Annual</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {statsCards.slice(4, 8).map((card) => (
              <div key={card.label} className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">{card.label}</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:scale-110 transition-transform origin-left">{card.value}</h3>
                <div className={`mt-3 w-8 h-1 rounded-full bg-${card.color}-500/30 overflow-hidden`}>
                  <div className={`h-full bg-${card.color}-500 w-2/3`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications Table */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all duration-500">
          <div className="p-8 border-b border-white dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-widest">State Registry</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live updates from localized applications</p>
            </div>
            <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Full Registry →</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/50">
                  <th className="px-8 py-5">Institution</th>
                  <th className="px-8 py-5">History</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {recentApplications.map((app) => (
                  <tr key={app.school} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500">
                          {app.school.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{app.school}</p>
                          <p className="text-[10px] font-bold text-slate-500 tracking-wider">LGA: {app.lga}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-300">{app.date}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Logged</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        app.statusColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-500/20' :
                          app.statusColor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-500/20' :
                            app.statusColor === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-500/20' :
                              'bg-slate-50 dark:bg-slate-900 text-slate-600 border-slate-700'
                      )}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm p-8 flex flex-col hover:shadow-lg transition-all duration-500">
          <div className="mb-8">
            <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-widest">Regional Density</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">LGA Distribution metrics</p>
          </div>

          <div className="flex-1 space-y-6">
            {dashboardLgaData.map((lga) => (
              <div key={lga.name} className="group/lga cursor-default">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-900 dark:text-slate-300 group-hover/lga:text-emerald-500 transition-colors">{lga.name}</span>
                  <span className="text-slate-500">{lga.count} Institutions</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-3 p-0.5 border border-slate-200 dark:border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    style={{ width: `${lga.percent}%` }}
                  />
                </div>
              </div>
            ))}
            {dashboardLgaData.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
                <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No distribution data</p>
              </div>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Compliance Rate</p>
                <p className="text-2xl font-black text-slate-900 dark:text-emerald-400 tracking-tighter">
                  {totalSsce > 0 ? ((activeSsce / totalSsce) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center font-black text-[10px] text-emerald-600">
                OK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
