import React from 'react';
import { AlertCircle, BarChart3, Download } from 'lucide-react';
import DataService from '../../api/services/data.service';

export default function ViewerReports() {
  const [stats, setStats] = React.useState({
    totalStates: 0,
    totalSchools: 0,
    totalBECESchools: 0,
    accreditedSchools: 0,
    accreditedBECESchools: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [states, schools, beceSchools] = await Promise.all([
          DataService.getStates(),
          DataService.getSchools(),
          DataService.getBeceSchools(),
        ]);

        const accreditedSCE = schools.filter((s: any) => s.accreditation_status === 'Full').length;
        const accreditedBECE = beceSchools.filter((s: any) => s.accreditation_status === 'Full').length;

        setStats({
          totalStates: states.length,
          totalSchools: schools.length,
          totalBECESchools: beceSchools.length,
          accreditedSchools: accreditedSCE,
          accreditedBECESchools: accreditedBECE,
        });
      } catch (err) {
        console.error('Failed to fetch report data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="text-slate-600 dark:text-slate-400">Loading reports...</div></div>;
  }

  const getSCEAccreditationRate = () => {
    if (stats.totalSchools === 0) return 0;
    return Math.round((stats.accreditedSchools / stats.totalSchools) * 100);
  };

  const getBECEAccreditationRate = () => {
    if (stats.totalBECESchools === 0) return 0;
    return Math.round((stats.accreditedBECESchools / stats.totalBECESchools) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Reports</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">System-wide accreditation reports and statistics</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          This is a read-only view. Data cannot be modified.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total States</p>
          <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.totalStates}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">SSCE Schools</p>
          <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.totalSchools}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">BECE Schools</p>
          <p className="text-3xl font-bold text-slate-950 dark:text-white mt-2">{stats.totalBECESchools}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Accredited SSCE</p>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.accreditedSchools}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Accredited BECE</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.accreditedBECESchools}</p>
        </div>
      </div>

      {/* Accreditation Rate Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5" />
            SSCE Accreditation Rate
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Rate</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{getSCEAccreditationRate()}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${getSCEAccreditationRate()}%` }}
                ></div>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Total Schools</span>
                <span className="font-semibold text-slate-950 dark:text-white">{stats.totalSchools}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Accredited</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.accreditedSchools}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5" />
            BECE Accreditation Rate
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Rate</span>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{getBECEAccreditationRate()}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${getBECEAccreditationRate()}%` }}
                ></div>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Total Schools</span>
                <span className="font-semibold text-slate-950 dark:text-white">{stats.totalBECESchools}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-600 dark:text-slate-400">Accredited</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.accreditedBECESchools}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Note */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-white">Report Export</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Export functionality for detailed reports is available only to authorized administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
