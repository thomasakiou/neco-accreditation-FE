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
  Lock
} from 'lucide-react';
import AuthService from '../../api/services/auth.service';
import DataService from '../../api/services/data.service';
import { components } from '../../api/types';

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

  React.useEffect(() => {
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
    fetchData();
  }, []);

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
    const totalSsce = ssceSchools.length;
    const totalBece = beceSchools.length;

    // SSCE Stats logic
    const fullSsce = ssceSchools.filter(s => s.accreditation_status === 'Full').length;
    const partialSsce = ssceSchools.filter(s => s.accreditation_status === 'Partial').length;
    const failedSsce = ssceSchools.filter(s => s.accreditation_status === 'Failed').length;
    const activeSsce = fullSsce + partialSsce;
    const pendingSsce = ssceSchools.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;

    // BECE Stats logic
    const fullBece = beceSchools.filter(s => s.accreditation_status === 'Full').length;
    const partialBece = beceSchools.filter(s => s.accreditation_status === 'Partial').length;
    const failedBece = beceSchools.filter(s => s.accreditation_status === 'Failed').length;
    const activeBece = fullBece + partialBece;
    const pendingBece = beceSchools.filter(s => !!s.payment_url && s.approval_status !== 'Approved').length;

    const statsCards = [
      // SSCE Group
      { icon: SchoolIcon, label: 'Total SSCE', value: totalSsce.toLocaleString(), change: 'SSCE', changeColor: 'emerald', iconBg: 'emerald' },
      { icon: CheckCircle, label: 'Full (SSCE)', value: fullSsce.toLocaleString(), change: 'Valid', changeColor: 'emerald', iconBg: 'emerald' },
      { icon: CheckCircle, label: 'Partial (SSCE)', value: partialSsce.toLocaleString(), change: 'Valid', changeColor: 'amber', iconBg: 'amber' },
      { icon: AlertCircle, label: 'Failed (SSCE)', value: failedSsce.toLocaleString(), change: 'Failed', changeColor: 'red', iconBg: 'red' },
      { icon: Clock, label: 'Unverified (SSCE)', value: pendingSsce.toLocaleString(), change: 'Awaiting', changeColor: 'slate', iconBg: 'slate' },

      // BECE Group
      { icon: GraduationCap, label: 'Total BECE', value: totalBece.toLocaleString(), change: 'BECE', changeColor: 'blue', iconBg: 'blue' },
      { icon: CheckCircle, label: 'Full (BECE)', value: fullBece.toLocaleString(), change: 'Valid', changeColor: 'blue', iconBg: 'blue' },
      { icon: CheckCircle, label: 'Partial (BECE)', value: partialBece.toLocaleString(), change: 'Valid', changeColor: 'amber', iconBg: 'amber' },
      { icon: AlertCircle, label: 'Failed (BECE)', value: failedBece.toLocaleString(), change: 'Failed', changeColor: 'red', iconBg: 'red' },
      { icon: Clock, label: 'Unverified (BECE)', value: pendingBece.toLocaleString(), change: 'Awaiting', changeColor: 'slate', iconBg: 'slate' },
    ];

    // Group schools by LGA (using SSCE for distribution overview)
    const lgaGrouping = ssceSchools.reduce((acc: Record<string, number>, school) => {
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

    const recentApplications = ssceSchools
      .filter(s => s.status === 'pending' || s.accreditation_status === 'Accredited')
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
  }, [ssceSchools, beceSchools, lgas]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-slate-500 font-medium">Loading {stateName} metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isLocked && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-4 text-amber-900 dark:text-amber-400 animate-in slide-in-from-top-4 mb-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/50">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg capitalize">Accreditation Portal Locked</h3>
            <p className="text-sm font-bold opacity-90 text-amber-950/80">Your state office portal has been placed in read-only mode by the National Head Office. You can view all data but cannot create new schools or modify existing accreditation applications.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* SSCE Stats */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">SSCE Accreditation Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.slice(0, 5).map((card) => (
            <div key={card.label} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-${card.iconBg}-100 dark:bg-${card.iconBg}-900/50 text-${card.iconBg}-700 dark:text-${card.iconBg}-400 flex items-center justify-center border border-${card.iconBg}-200 dark:border-${card.iconBg}-800`}>
                  <card.icon className="w-4.5 h-4.5" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest text-${card.changeColor}-700 dark:text-${card.changeColor}-400 bg-${card.changeColor}-100 dark:bg-${card.changeColor}-900/30 px-2 py-0.5 rounded-md border border-${card.changeColor}-200 dark:border-${card.changeColor}-800`}>{card.change}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{card.label}</p>
              <h3 className="text-2xl font-black mt-1 text-slate-950 dark:text-white">{card.value}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* BECE Stats */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">BECE Accreditation Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.slice(5, 10).map((card) => (
            <div key={card.label} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-${card.iconBg}-100 dark:bg-${card.iconBg}-900/50 text-${card.iconBg}-700 dark:text-${card.iconBg}-400 flex items-center justify-center border border-${card.iconBg}-200 dark:border-${card.iconBg}-800`}>
                  <card.icon className="w-4.5 h-4.5" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest text-${card.changeColor}-700 dark:text-${card.changeColor}-400 bg-${card.changeColor}-100 dark:bg-${card.changeColor}-900/30 px-2 py-0.5 rounded-md border border-${card.changeColor}-200 dark:border-${card.changeColor}-800`}>{card.change}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{card.label}</p>
              <h3 className="text-2xl font-black mt-1 text-slate-950 dark:text-white">{card.value}</h3>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between bg-slate-200 dark:bg-slate-800/30">
            <h3 className="font-black text-lg text-slate-950 dark:text-white uppercase tracking-tight">Recent Applications</h3>
            <button className="text-emerald-700 dark:text-emerald-400 text-sm font-black hover:underline underline-offset-4">View All Registry →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-300 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">School Details</th>
                  <th className="px-6 py-4">Application Type</th>
                  <th className="px-6 py-4">Update History</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
                {recentApplications.map((app) => (
                  <tr key={app.school} className="hover:bg-slate-200/50 dark:hover:bg-emerald-900/10 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-slate-950 dark:text-white">{app.school}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-600 dark:text-slate-400">LGA: {app.lga}</p>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-700 dark:text-slate-300">{app.type}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-300">{app.date}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-black">Logged Date</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-${app.statusColor}-300 bg-${app.statusColor}-100 dark:bg-${app.statusColor}-900/50 text-${app.statusColor}-700 dark:text-${app.statusColor}-400`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600">
                        <MoreVertical className="text-slate-600 dark:text-slate-400 w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-black text-lg text-slate-950 dark:text-white uppercase tracking-tight">Schools by LGA</h3>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">Accreditation Distribution</p>
          </div>
          <div className="flex-1 space-y-4">
            {dashboardLgaData.map((lga) => (
              <div key={lga.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-black uppercase">
                  <span className="text-slate-900 dark:text-slate-300">{lga.name}</span>
                  <span className="text-slate-700 dark:text-slate-400">{lga.count} Schools</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 border border-slate-300 dark:border-slate-700">
                  <div className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full" style={{ width: `${lga.percent}%` }}></div>
                </div>
              </div>
            ))}
            {dashboardLgaData.length === 0 && (
              <p className="text-xs text-slate-500 italic font-medium">No distribution data available.</p>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-300 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-black">Top Performer</p>
                <p className="text-sm font-black text-slate-950 dark:text-white underline decoration-emerald-500/50 underline-offset-4 decoration-2">{dashboardLgaData[0]?.name || 'N/A'}</p>
              </div>
              <div className="w-px h-8 bg-slate-300 dark:bg-slate-700"></div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-black">Success Rate</p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  {totalSsce > 0 ? ((activeSsce / totalSsce) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
        <div className="bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-800 p-6 rounded-2xl flex items-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-lg border-2 border-emerald-500">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-black text-slate-950 dark:text-white text-lg">SSCE 2024 Window Closing</h4>
            <p className="text-sm text-slate-700 dark:text-slate-400 mt-1 font-bold">Application window closes in 14 days. Ensure all pending reviews are finalized.</p>
            <button className="mt-3 text-sm font-black text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:scale-105 transition-transform">Review Now →</button>
          </div>
        </div>
        <div className="bg-slate-200 dark:bg-slate-800 p-6 rounded-2xl flex items-center gap-6 shadow-sm border border-slate-300 dark:border-slate-700">
          <div className="w-16 h-16 rounded-2xl bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-400 shrink-0 border border-slate-400 dark:border-slate-600 shadow-inner">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-black text-slate-950 dark:text-white text-lg">Portal Support</h4>
            <p className="text-sm text-slate-700 dark:text-slate-400 mt-1 font-bold">Need help? Contact the head office technical team for assistance.</p>
            <button className="mt-3 text-sm font-black text-slate-800 dark:text-slate-300 hover:underline hover:scale-105 transition-transform">Contact Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}
