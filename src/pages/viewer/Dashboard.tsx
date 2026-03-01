import React from 'react';
import { BarChart3, Users, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import DataService from '../../api/services/data.service';

interface DashboardStats {
  totalStates: number;
  sceSchools: number;
  beceSchools: number;
  accreditedSCESchools: number;
  accreditedBECESchools: number;
}

interface StateOverview {
  code: string;
  name: string;
  sceCount: number;
  beceCount: number;
  sceAccredited: number;
  beceAccredited: number;
}

export default function ViewerDashboard() {
  const [stats, setStats] = React.useState<DashboardStats>({
    totalStates: 0,
    sceSchools: 0,
    beceSchools: 0,
    accreditedSCESchools: 0,
    accreditedBECESchools: 0,
  });
  const [stateOverviews, setStateOverviews] = React.useState<StateOverview[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [states, schools, beceSchools] = await Promise.all([
          DataService.getStates(),
          DataService.getSchools(),
          DataService.getBeceSchools(),
        ]);

        // Calculate overall stats
        const accreditedSCE = schools.filter(
          (s: any) => s.accreditation_status === 'Full'
        ).length;
        const accreditedBECE = beceSchools.filter(
          (s: any) => s.accreditation_status === 'Full'
        ).length;

        setStats({
          totalStates: states.length,
          sceSchools: schools.length,
          beceSchools: beceSchools.length,
          accreditedSCESchools: accreditedSCE,
          accreditedBECESchools: accreditedBECE,
        });

        // Calculate per-state stats
        const overviews: StateOverview[] = states.map((state: any) => {
          const stateSchools = schools.filter(
            (s: any) => s.state_code === state.code
          );
          const stateBeceSchools = beceSchools.filter(
            (s: any) => s.state_code === state.code
          );
          const stateAccreditedSCE = stateSchools.filter(
            (s: any) => s.accreditation_status === 'Full'
          ).length;
          const stateAccreditedBECE = stateBeceSchools.filter(
            (s: any) => s.accreditation_status === 'Full'
          ).length;

          return {
            code: state.code,
            name: state.name,
            sceCount: stateSchools.length,
            beceCount: stateBeceSchools.length,
            sceAccredited: stateAccreditedSCE,
            beceAccredited: stateAccreditedBECE,
          };
        });

        setStateOverviews(overviews);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getAccreditationRate = (accredited: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((accredited / total) * 100)}%`;
  };

  const getRateColor = (accredited: number, total: number) => {
    if (total === 0) return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    const rate = (accredited / total) * 100;
    if (rate >= 80) return 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
    if (rate >= 50) return 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    if (rate >= 25) return 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
    return 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <div className="w-12 h-12 border-4 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">View-only access to accreditation data</p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
            Read-Only Access
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
            You have view-only access to the accreditation system. You can browse statistics and school data but cannot make any modifications.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total States</p>
              <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.totalStates}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-30" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">SSCE Schools</p>
              <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.sceSchools}</p>
            </div>
            <Building2 className="w-10 h-10 text-emerald-500 opacity-30" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">BECE Schools</p>
              <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.beceSchools}</p>
            </div>
            <Building2 className="w-10 h-10 text-amber-500 opacity-30" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Accredited SSCE</p>
              <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.accreditedSCESchools}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-30" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Accredited BECE</p>
              <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.accreditedBECESchools}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-purple-500 opacity-30" />
          </div>
        </div>
      </div>

      {/* School Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SSCE Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            SSCE Schools Summary
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Total</span>
              <span className="font-bold text-slate-950 dark:text-white">{stats.sceSchools}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Accredited</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.accreditedSCESchools}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 dark:text-slate-400">Rate</span>
              <span className="font-bold text-slate-950 dark:text-white">
                {getAccreditationRate(stats.accreditedSCESchools, stats.sceSchools)}
              </span>
            </div>
          </div>
        </div>

        {/* BECE Summary */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            BECE Schools Summary
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Total</span>
              <span className="font-bold text-slate-950 dark:text-white">{stats.beceSchools}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">Accredited</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{stats.accreditedBECESchools}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600 dark:text-slate-400">Rate</span>
              <span className="font-bold text-slate-950 dark:text-white">
                {getAccreditationRate(stats.accreditedBECESchools, stats.beceSchools)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* States Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-4">States Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stateOverviews.map((state) => (
            <div
              key={state.code}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="font-bold text-slate-950 dark:text-white mb-3">{state.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">SSCE: {state.sceCount} schools</span>
                  <span className="text-slate-950 dark:text-white font-medium">{state.sceAccredited} accredited</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">BECE: {state.beceCount} schools</span>
                  <span className="text-slate-950 dark:text-white font-medium">{state.beceAccredited} accredited</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getRateColor(
                      state.sceAccredited,
                      state.sceCount
                    )}`}
                  >
                    SSCE: {getAccreditationRate(state.sceAccredited, state.sceCount)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getRateColor(
                      state.beceAccredited,
                      state.beceCount
                    )}`}
                  >
                    BECE: {getAccreditationRate(state.beceAccredited, state.beceCount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
