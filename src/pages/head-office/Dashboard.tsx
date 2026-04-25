import React from 'react';
import {
  Building2,
  Users,
  FileCheck,
  TrendingUp,
  GraduationCap,
  MapPin,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Download,
  RefreshCw,
  Clock
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import TemplateDownloadModal from '../../components/modals/TemplateDownloadModal';
import { useFilterContext } from '../../context/FilterContext';
import { cn } from '../../components/layout/DashboardLayout';

type School = components['schemas']['School'];
type State = components['schemas']['State'];

export default function HeadOfficeDashboard() {
  const [states, setStates] = React.useState<State[]>([]);
  const [zones, setZones] = React.useState<components['schemas']['Zone'][]>([]);
  const [ssceSchools, setSsceSchools] = React.useState<School[]>([]);
  const [beceSchools, setBeceSchools] = React.useState<School[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const isSuperAdmin = currentUser?.email === 'admin@neco.gov.ng';

  const { headerYearFilter, setHeaderYearFilter, setHeaderAvailableYears } = useFilterContext();
  const hasInitializedYear = React.useRef(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statesData, zonesData, ssceSchoolsData, beceSchoolsData, userData] = await Promise.all([
        DataService.getStates(),
        DataService.getZones(),
        DataService.getSchools(),
        DataService.getBeceSchools(),
        AuthService.getCurrentUser()
      ]);
      setStates(statesData);
      setZones(zonesData);
      setSsceSchools(ssceSchoolsData);
      setBeceSchools(beceSchoolsData);
      setCurrentUser(userData);
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

  const totalStates = states.length;

  // Filter schools by year
  const yearFilteredSsce = React.useMemo(() => {
    return ssceSchools.filter(s => {
      const year = s.accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : '');
      return !headerYearFilter || year === headerYearFilter;
    });
  }, [ssceSchools, headerYearFilter]);

  const yearFilteredBece = React.useMemo(() => {
    return beceSchools.filter(s => {
      const year = s.accrd_year || (s.accredited_date ? new Date(s.accredited_date).getFullYear().toString() : '');
      return !headerYearFilter || year === headerYearFilter;
    });
  }, [beceSchools, headerYearFilter]);

  const totalSsceSchools = yearFilteredSsce.length;
  const totalBeceSchools = yearFilteredBece.length;

  // Calculate schools due for accreditation
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

  // SSCE calculations
  const accreditedSsceNotDue = yearFilteredSsce.filter(s =>
    (s.accreditation_status === 'Full' || s.accreditation_status === 'Partial') && !isDueForAccreditation(s)
  ).length;
  const dueSsce = yearFilteredSsce.filter(isDueForAccreditation).length;

  // BECE calculations
  const accreditedBeceNotDue = yearFilteredBece.filter(s =>
    (s.accreditation_status === 'Full' || s.accreditation_status === 'Partial') && !isDueForAccreditation(s)
  ).length;
  const beceDue = yearFilteredBece.filter(isDueForAccreditation).length;

  const stats = [
    { 
        icon: Building2, 
        label: 'Total Schools', 
        value: (totalSsceSchools + totalBeceSchools).toLocaleString(), 
        change: 'Consolidated', 
        up: true, 
        color: 'blue',
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
    },
    { 
        icon: GraduationCap, 
        label: 'SSCE Institutions', 
        value: totalSsceSchools.toLocaleString(), 
        change: 'Registered', 
        up: true, 
        color: 'emerald',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
    },
    { 
        icon: GraduationCap, 
        label: 'BECE Institutions', 
        value: totalBeceSchools.toLocaleString(), 
        change: 'Registered', 
        up: true, 
        color: 'purple',
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
    },
    { 
        icon: FileCheck, 
        label: 'Active Accr.', 
        value: (accreditedSsceNotDue + accreditedBeceNotDue).toLocaleString(), 
        change: 'Verified', 
        up: true, 
        color: 'indigo',
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
    },
    { 
        icon: TrendingUp, 
        label: 'Due Soon', 
        value: (dueSsce + beceDue).toLocaleString(), 
        change: 'Action Required', 
        up: false, 
        color: 'amber',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
    },
    { 
        icon: MapPin, 
        label: 'State Offices', 
        value: totalStates.toLocaleString(), 
        change: 'National', 
        up: true, 
        color: 'slate',
        iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' 
    },
  ];

  const activities = [
    { title: 'System Refresh Completed', time: 'Just now', color: 'bg-emerald-500' },
    { title: 'New Accreditation Policy Updated', time: '5 hours ago', color: 'bg-purple-500' },
    { title: 'Head Office Analytics Ready', time: '1 day ago', color: 'bg-blue-500' },
    { title: 'Maintenance Window Scheduled', time: '2 days ago', color: 'bg-slate-500' },
  ];

  const statePerformance = states.map(state => {
    const stateSchools = yearFilteredSsce.filter(s => s.state_code === state.code);
    const total = stateSchools.length;
    const accredited = stateSchools.filter(s => s.accreditation_status === 'Full').length;
    const rate = total > 0 ? Math.round((accredited / total) * 100) : 0;

    let status = 'New';
    let statusColor = 'slate';
    if (rate >= 80) { status = 'Excellent'; statusColor = 'emerald'; }
    else if (rate >= 50) { status = 'Good'; statusColor = 'blue'; }
    else if (total > 0) { status = 'Needs Focus'; statusColor = 'amber'; }

    return {
      state: state.name,
      total: total.toLocaleString(),
      accredited: accredited.toLocaleString(),
      rate,
      status,
      statusColor
    };
  }).sort((a, b) => b.rate - a.rate).slice(0, 5); // Show top 5

  return (
    <div className="space-y-10 animate-in fade-in duration-700 relative">
      {/* Background blobs for depth */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {error && (
        <div className="p-5 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-md border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-4 text-red-600 dark:text-red-400 shadow-sm animate-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((s, idx) => (
          <div 
            key={s.label} 
            className="group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-${s.color}-500/10 transition-all duration-500`} />
            
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", s.iconBg)}>
                <s.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                s.up 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              )}>
                {s.change}
              </div>
            </div>
            
            <div className="relative z-10">
                <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{s.value}</h3>
                </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Performance Matrix Section */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-500">
            <div className="p-8 border-b border-white dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
                <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-widest">Performance Matrix</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">State office compliance and registration velocity</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button
                onClick={() => fetchData()}
                disabled={isLoading}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
                >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Sync Data
                </button>
                {isSuperAdmin && (
                    <button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Templates
                    </button>
                )}
            </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-5">State Entity</th>
                    <th className="px-8 py-5">Registered Schools</th>
                    <th className="px-8 py-5 text-center">Accredited</th>
                    <th className="px-8 py-5">Compliance Velocity</th>
                    <th className="px-8 py-5">Market Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {statePerformance.map((row) => (
                    <tr key={row.state} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500">
                                {row.state.substring(0, 2)}
                            </div>
                            <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight uppercase">{row.state}</span>
                        </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-300">{row.total}</td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600 dark:text-slate-300 text-center">{row.accredited}</td>
                    <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-[120px] bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                            <div 
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px]",
                                    row.rate >= 80 ? 'bg-emerald-500 shadow-emerald-500/40' : 
                                    row.rate >= 50 ? 'bg-blue-500 shadow-blue-500/40' : 
                                    'bg-amber-400 shadow-amber-400/40'
                                )} 
                                style={{ width: `${row.rate}%` }} 
                            />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-200 tracking-tighter">{row.rate}%</span>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            row.statusColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-500/20' :
                            row.statusColor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-500/20' :
                            'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-500/20'
                        )}>
                        {row.status}
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>

        {/* Recent Activities Section */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm p-8 flex flex-col hover:shadow-lg transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-widest">Global Activity</h3>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex-1 space-y-6 relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800" />
            {activities.map((activity, i) => (
              <div key={i} className="relative pl-12 group/item">
                <div className={cn(
                    "absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-4 border-white dark:border-slate-900 shadow-md z-10 transition-transform duration-300 group-hover/item:scale-125",
                    activity.color
                )} />
                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 group-hover/item:bg-white dark:group-hover/item:bg-slate-800 transition-all duration-300">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{activity.title}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-8 w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-all">
            Open Activity Center
          </button>
        </div>
      </div>



      <TemplateDownloadModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
}
