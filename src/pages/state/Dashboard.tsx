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
  RefreshCw,
  TrendingUp,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import AuthService from '../../api/services/auth.service';
import DataService from '../../api/services/data.service';
import { useFilterContext } from '../../context/FilterContext';
import { cn } from '../../lib/utils';
import { components } from '../../api/types';

type School = components['schemas']['School'];

export default function StateDashboard() {
  const [ssceSchools, setSsceSchools] = React.useState<School[]>([]);
  const [beceSchools, setBeceSchools] = React.useState<School[]>([]);
  const [lgas, setLgas] = React.useState<components['schemas']['LGA'][]>([]);
  const [zones, setZones] = React.useState<components['schemas']['Zone'][]>([]);
  const [custodians, setCustodians] = React.useState<components['schemas']['Custodian'][]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stateName, setStateName] = React.useState<string>('State Office');
  const [currentState, setCurrentState] = React.useState<components['schemas']['State'] | null>(null);
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
        setCurrentState(currentState || null);

        const [ssceData, beceData, lgaData, custodianData, zonesData] = await Promise.all([
          DataService.getSchools({ state_code: user.state_code }),
          DataService.getBeceSchools({ state_code: user.state_code }),
          DataService.getLGAs({ state_code: user.state_code }),
          DataService.getCustodians({ state_code: user.state_code }),
          DataService.getZones()
        ]);

        setSsceSchools(ssceData);
        setBeceSchools(beceData);
        setLgas(lgaData);
        setCustodians(custodianData);
        setZones(zonesData);
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
    ssceStatsCards,
    beceStatsCards,
    ssceCompliance,
    beceCompliance,
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

    // Global Stats Calculation (Merged SSCE + BECE)
    const allSchools = [...filteredSsce, ...filteredBece];

    const isDueForAccreditation = (school: School) => {
      if (school.accreditation_status === 'Failed') return true;
      if (!school.accredited_date || !['Full', 'Partial'].includes(school.accreditation_status || '')) return false;

      const accreditedDate = new Date(school.accredited_date);
      let yearsToAdd = 5;

      // Check if school is in a foreign zone
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

    // SSCE Specific Stats
    const ssceDue = filteredSsce.filter(isDueForAccreditation);
    const ssceDueCount = ssceDue.length;
    const sscePaidCount = ssceDue.filter(s => !!s.payment_url).length;
    const ssceVerifiedCount = ssceDue.filter(s => s.approval_status === 'Approved').length;
    const sscePaymentRate = ssceDueCount > 0 ? Math.round((sscePaidCount / ssceDueCount) * 100) : 0;

    // BECE Specific Stats
    const beceDue = filteredBece.filter(isDueForAccreditation);
    const beceDueCount = beceDue.length;
    const becePaidCount = beceDue.filter(s => !!s.payment_url).length;
    const beceVerifiedCount = beceDue.filter(s => s.approval_status === 'Approved').length;
    const becePaymentRate = beceDueCount > 0 ? Math.round((becePaidCount / beceDueCount) * 100) : 0;

    const ssceStatsCards = [
      { icon: Clock, label: 'Due for Accrd.', value: ssceDueCount.toLocaleString(), color: 'amber', iconBg: 'bg-amber-500/10 text-amber-600' },
      { icon: FileCheck, label: 'Total Paid', value: sscePaidCount.toLocaleString(), color: 'blue', iconBg: 'bg-blue-500/10 text-blue-600' },
      { icon: CheckCircle2, label: 'Verified', value: ssceVerifiedCount.toLocaleString(), color: 'emerald', iconBg: 'bg-emerald-500/10 text-emerald-600' },
      { icon: TrendingUp, label: 'Payment Rate', value: `${sscePaymentRate}%`, color: 'purple', iconBg: 'bg-purple-500/10 text-purple-600' },
    ];

    const beceStatsCards = [
      { icon: Clock, label: 'Due for Accrd.', value: beceDueCount.toLocaleString(), color: 'amber', iconBg: 'bg-amber-500/10 text-amber-600' },
      { icon: FileCheck, label: 'Total Paid', value: becePaidCount.toLocaleString(), color: 'blue', iconBg: 'bg-blue-500/10 text-blue-600' },
      { icon: CheckCircle2, label: 'Verified', value: beceVerifiedCount.toLocaleString(), color: 'emerald', iconBg: 'bg-emerald-500/10 text-emerald-600' },
      { icon: TrendingUp, label: 'Payment Rate', value: `${becePaymentRate}%`, color: 'purple', iconBg: 'bg-purple-500/10 text-purple-600' },
    ];

    // Recalculate category-specific active counts for charts
    const activeSsce = filteredSsce.filter(s => ['Full', 'Partial', 'Accredited', 'Passed'].includes(s.accreditation_status || '')).length;
    const activeBece = filteredBece.filter(s => ['Full', 'Partial', 'Accredited', 'Passed'].includes(s.accreditation_status || '')).length;
    
    // Compliance percentage calculation with zero-handling
    const ssceCompliance = totalSsce > 0 ? Math.round((activeSsce / totalSsce) * 100) : 0;
    const beceCompliance = totalBece > 0 ? Math.round((activeBece / totalBece) * 100) : 0;

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
      ssceStatsCards,
      beceStatsCards,
      ssceCompliance,
      beceCompliance,
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
    <div className="space-y-12 animate-in fade-in duration-1000 relative pb-20">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none" />

      {/* Hero Header Section */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Accreditation Management System
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {headerYearFilter || 'All Years'} Cycle
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tighter uppercase leading-none">
              {stateName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-600">State</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold max-w-2xl text-lg leading-relaxed">
              Real-time synchronization of school accreditation, payment verification, and compliance metrics.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="group flex items-center gap-3 px-8 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 transition-transform duration-1000 group-hover:rotate-180", isLoading && "animate-spin")} />
              Sync Dashboard
            </button>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="relative overflow-hidden p-8 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-2xl border border-amber-500/20 rounded-[2.5rem] flex items-center gap-8 text-amber-900 dark:text-amber-400 animate-in slide-in-from-top-8 duration-700 shadow-2xl shadow-amber-500/5">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Lock className="w-32 h-32 rotate-12" />
          </div>
          <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xl border border-amber-500/20 group hover:rotate-12 transition-transform duration-500">
            <Lock className="w-10 h-10 text-amber-500" />
          </div>
          <div className="relative z-10 flex-1">
            <h3 className="font-black text-2xl uppercase tracking-tighter">System Lockdown Initialized</h3>
            <p className="text-base font-bold opacity-75 mt-2 max-w-3xl leading-relaxed">
              National HQ has toggled read-only access for this state. Modification of institutional records and payment approvals are temporarily suspended.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-500/5 dark:bg-red-500/10 backdrop-blur-2xl border border-red-500/20 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm font-black uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Main Intelligence Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* SSCE Intelligence Section */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-[3rem] blur opacity-0 group-hover:opacity-100 transition duration-700"></div>
          <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[3rem] border border-white/20 dark:border-slate-800/50 shadow-2xl p-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                  <SchoolIcon className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">SSCE</h2>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Senior School Certificate Examination</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter">{totalSsce}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Centers</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              {ssceStatsCards.map((card) => (
                <div key={card.label} className="p-4 rounded-3xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", card.iconBg)}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                  <h4 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter">{card.value}</h4>
                </div>
              ))}
            </div>

            <div className="mt-10 flex-1 flex flex-col items-center justify-center border-t border-slate-100 dark:border-slate-800/50 pt-10">
              <div className="w-full max-w-[160px] aspect-square rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative group/chart">
                <div 
                  className="absolute inset-[-8px] rounded-full transition-transform duration-1000"
                  style={{ 
                    background: `conic-gradient(#10b981 ${ssceCompliance}%, transparent 0)`,
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 8px), #fff 0)'
                  }}
                />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Compliance</span>
                <span className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter">
                  {ssceCompliance}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BECE Intelligence Section */}
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/10 to-transparent rounded-[3rem] blur opacity-0 group-hover:opacity-100 transition duration-700"></div>
          <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[3rem] border border-white/20 dark:border-slate-800/50 shadow-2xl p-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                  <GraduationCap className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">BECE</h2>
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Basic Education Certificate Examination</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter">{totalBece}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Centers</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              {beceStatsCards.map((card) => (
                <div key={card.label} className="p-4 rounded-3xl bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", card.iconBg)}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
                  <h4 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter">{card.value}</h4>
                </div>
              ))}
            </div>

            <div className="mt-10 flex-1 flex flex-col items-center justify-center border-t border-slate-100 dark:border-slate-800/50 pt-10">
              <div className="w-full max-w-[160px] aspect-square rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative group/chart">
                <div 
                  className="absolute inset-[-8px] rounded-full transition-transform duration-1000"
                  style={{ 
                    background: `conic-gradient(#3b82f6 ${beceCompliance}%, transparent 0)`,
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 8px), #fff 0)'
                  }}
                />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Compliance</span>
                <span className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter">
                  {beceCompliance}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
