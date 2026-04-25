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
  Clock,
  School as SchoolIcon
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import TemplateDownloadModal from '../../components/modals/TemplateDownloadModal';
import { useFilterContext } from '../../context/FilterContext';
import { cn } from '../../lib/utils';
import { components } from '../../api/types';

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
  const verifiedDueSsce = yearFilteredSsce.filter(s => isDueForAccreditation(s) && s.approval_status === 'Approved').length;
  const dueSsce = yearFilteredSsce.filter(s => isDueForAccreditation(s) && s.approval_status !== 'Approved').length;

  // BECE calculations
  const accreditedBeceNotDue = yearFilteredBece.filter(s =>
    (s.accreditation_status === 'Full' || s.accreditation_status === 'Partial') && !isDueForAccreditation(s)
  ).length;
  const verifiedDueBece = yearFilteredBece.filter(s => isDueForAccreditation(s) && s.approval_status === 'Approved').length;
  const beceDue = yearFilteredBece.filter(s => isDueForAccreditation(s) && s.approval_status !== 'Approved').length;

  const totalDueSchools = (yearFilteredSsce.filter(isDueForAccreditation).length + yearFilteredBece.filter(isDueForAccreditation).length);
  const totalVerifiedPayments = (verifiedDueSsce + verifiedDueBece);

  const stats = [
    {
      icon: Building2,
      label: 'Total Schools',
      value: (totalSsceSchools + totalBeceSchools).toLocaleString(),
      change: 'Global View',
      up: true,
      color: 'blue',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
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

  const ssceStats = [
    {
      icon: SchoolIcon,
      label: 'Total SSCE Due',
      value: yearFilteredSsce.filter(isDueForAccreditation).length.toLocaleString(),
      change: 'Expiring Soon',
      up: false,
      color: 'amber',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    },
    {
      icon: FileCheck,
      label: 'SSCE Verified',
      value: verifiedDueSsce.toLocaleString(),
      change: 'Paid & Confirmed',
      up: true,
      color: 'emerald',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: Clock,
      label: 'SSCE Pending',
      value: dueSsce.toLocaleString(),
      change: 'Action Required',
      up: false,
      color: 'rose',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    },
  ];

  const beceStats = [
    {
      icon: GraduationCap,
      label: 'Total BECE Due',
      value: yearFilteredBece.filter(isDueForAccreditation).length.toLocaleString(),
      change: 'Expiring Soon',
      up: false,
      color: 'purple',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    },
    {
      icon: FileCheck,
      label: 'BECE Verified',
      value: verifiedDueBece.toLocaleString(),
      change: 'Paid & Confirmed',
      up: true,
      color: 'emerald',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: Clock,
      label: 'BECE Pending',
      value: beceDue.toLocaleString(),
      change: 'Action Required',
      up: false,
      color: 'rose',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    },
  ];




  return (
    <div className="space-y-10 animate-in fade-in duration-700 relative">
      {/* Background blobs for depth */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black text-slate-950 dark:text-white flex items-center gap-4 tracking-tighter uppercase">
            <TrendingUp className="w-10 h-10 text-blue-600" />
            Dashoboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 text-sm uppercase tracking-widest">Global Accreditation Oversight & Command</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="px-6 py-3 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Dashboard
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Templates
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-5 bg-red-50/50 dark:bg-red-900/20 backdrop-blur-md border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-4 text-red-600 dark:text-red-400 shadow-sm animate-in slide-in-from-top-4">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((s, idx) => (
          <div
            key={s.label}
            className="group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-${s.color}-500/10 transition-all duration-500`} />
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", s.iconBg)}>
                <s.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                s.up ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              )}>
                {s.change}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">SSCE Accreditation STatistics</h2>
          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ssceStats.map((s) => (
            <div key={s.label} className="group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", s.iconBg)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.change}</div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{s.value}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">BECE Accreditation STatistics</h2>
          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {beceStats.map((s) => (
            <div key={s.label} className="group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner", s.iconBg)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.change}</div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{s.value}</h3>
            </div>
          ))}
        </div>
      </div>

      <TemplateDownloadModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
}
