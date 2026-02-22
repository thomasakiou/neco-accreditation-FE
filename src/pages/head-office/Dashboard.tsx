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
  AlertCircle
} from 'lucide-react';
import DataService from '../../api/services/data.service';
import { components } from '../../api/types';

type School = components['schemas']['School'];
type State = components['schemas']['State'];

export default function HeadOfficeDashboard() {
  const [states, setStates] = React.useState<State[]>([]);
  const [ssceSchools, setSsceSchools] = React.useState<School[]>([]);
  const [beceSchools, setBeceSchools] = React.useState<School[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statesData, ssceSchoolsData, beceSchoolsData] = await Promise.all([
          DataService.getStates(),
          DataService.getSchools(),
          DataService.getBeceSchools()
        ]);
        setStates(statesData);
        setSsceSchools(ssceSchoolsData);
        setBeceSchools(beceSchoolsData);
      } catch (err: any) {
        setError('Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalStates = states.length;
  const totalSsceSchools = ssceSchools.length;
  const totalBeceSchools = beceSchools.length;
  const accreditedSsce = ssceSchools.filter(s => s.status === 'active').length;
  const pendingSsce = ssceSchools.filter(s => s.status === 'pending').length;

  const stats = [
    { icon: Building2, label: 'Total States Active', value: totalStates.toString(), change: '+2', up: true, iconBg: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' },
    { icon: Users, label: 'SSCE Schools', value: totalSsceSchools.toLocaleString(), change: 'Total', up: true, iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
    { icon: GraduationCap, label: 'BECE Schools', value: totalBeceSchools.toLocaleString(), change: 'Total', up: true, iconBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' },
    { icon: FileCheck, label: 'Accredited SSCE', value: accreditedSsce.toLocaleString(), change: 'YTD', up: true, iconBg: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' },
  ];

  const activities = [
    { title: 'System Refresh Completed', time: 'Just now', color: 'bg-emerald-500' },
    { title: 'New Accreditation Policy Updated', time: '5 hours ago', color: 'bg-purple-500' },
    { title: 'Head Office Analytics Ready', time: '1 day ago', color: 'bg-blue-500' },
    { title: 'Maintenance Window Scheduled', time: '2 days ago', color: 'bg-slate-500' },
  ];

  const statePerformance = states.map(state => {
    const stateSchools = ssceSchools.filter(s => s.state_code === state.code);
    const total = stateSchools.length;
    const accredited = stateSchools.filter(s => s.status === 'active').length;
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-slate-500 font-medium">Loading Head Office metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-bold ${s.up ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'} px-2 py-1 rounded flex items-center gap-1 border border-transparent ${s.up ? 'border-emerald-200' : 'border-red-200'}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {s.change}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-400 text-sm font-bold">{s.label}</p>
            <h3 className="text-2xl font-black mt-1 text-slate-950 dark:text-white">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-lg text-slate-950 dark:text-white">National Coverage</h3>
              <p className="text-sm text-slate-700 dark:text-slate-400 font-medium">Accreditation status across states</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-900">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="dark:text-slate-300">High (&gt;80%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span className="dark:text-slate-300">Medium (50-80%)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><span className="dark:text-slate-300">Low (&lt;50%)</span></div>
            </div>
          </div>
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl h-[400px] flex items-center justify-center relative overflow-hidden border border-slate-300 dark:border-slate-700">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="text-center">
              <MapPin className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-500 font-bold">Interactive Map Visualization</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">Select a state to view detailed metrics</p>
            </div>
            <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-amber-400 rounded-full shadow-lg shadow-amber-400/30 opacity-80"></div>
            <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/30"></div>
            <div className="absolute top-1/2 right-1/4 w-5 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 opacity-90"></div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-6 dark:text-white">Recent Activities</h3>
          <div className="space-y-8 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-700">
            {activities.map((activity, i) => (
              <div key={i} className="relative pl-10">
                <div className={`absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ${activity.color}`}></div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activity.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-auto pt-6 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
            View Activity Log
          </button>
        </div>
      </div>

      {/* State Performance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="p-6 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-black text-lg text-slate-950 dark:text-white">State Performance Metrics</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700">Export CSV</button>
            <button className="px-3 py-1.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border border-emerald-200">Print Report</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">Total Schools</th>
                <th className="px-6 py-4">Accredited</th>
                <th className="px-6 py-4">Compliance Rate</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
              {statePerformance.map((row) => (
                <tr key={row.state} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm dark:text-white">{row.state}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.total}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.accredited}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div className={`${row.rate >= 80 ? 'bg-emerald-500' : 'bg-amber-400'} h-1.5 rounded-full`} style={{ width: `${row.rate}%` }}></div>
                      </div>
                      <span className={`text-xs font-bold ${row.rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{row.rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${row.statusColor}-100 dark:bg-${row.statusColor}-900/50 text-${row.statusColor}-800 dark:text-${row.statusColor}-400`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
