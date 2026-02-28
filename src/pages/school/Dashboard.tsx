import React from 'react';
import {
  AlertTriangle,
  FileText,
  GraduationCap,
  PlusCircle,
  History,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import AuthService from '../../api/services/auth.service';
import DataService from '../../api/services/data.service';
import { components } from '../../api/types';

type School = components['schemas']['School'];

export default function SchoolDashboard() {
  const [ssceSchool, setSsceSchool] = React.useState<School | null>(null);
  const [beceSchool, setBeceSchool] = React.useState<School | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [user, ssceSchools, beceSchools] = await Promise.all([
          AuthService.getCurrentUser(),
          DataService.getSchools(),
          DataService.getBeceSchools()
        ]);

        if (user?.school_code) {
          const ssce = ssceSchools.find(s => s.code === user.school_code);
          const bece = beceSchools.find(s => s.code === user.school_code);
          setSsceSchool(ssce || null);
          setBeceSchool(bece || null);
        } else {
          // Fallback for demo/admin view
          setSsceSchool(ssceSchools[0] || null);
          setBeceSchool(beceSchools[0] || null);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-slate-500 font-medium">Loading your dashboard data...</p>
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

      {/* Status Banners */}
      {ssceSchool?.status === 'expired' && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm animate-in zoom-in-95">
          <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-xl text-red-700 dark:text-red-400 border border-red-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-black text-red-950 dark:text-red-300 text-xl uppercase tracking-tighter">SSCE Accreditation Expired</h4>
            <p className="text-red-900/80 dark:text-red-400 mt-1 text-sm font-bold">
              Your SSCE accreditation for the current academic session has lapsed. Please renew immediately.
            </p>
          </div>
          <a href="https://payments.neco.gov.ng/payment" target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-sm font-black transition-all shrink-0 shadow-lg hover:shadow-red-500/20 active:scale-95 uppercase tracking-widest">
            Renew SSCE
          </a>
        </div>
      )}

      {beceSchool?.status === 'expired' && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm animate-in zoom-in-95">
          <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-xl text-red-700 dark:text-red-400 border border-red-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-black text-red-950 dark:text-red-300 text-xl uppercase tracking-tighter">BECE Accreditation Expired</h4>
            <p className="text-red-900/80 dark:text-red-400 mt-1 text-sm font-bold">
              Your BECE accreditation for the current academic session has lapsed. Please renew immediately.
            </p>
          </div>
          <a href="https://payments.neco.gov.ng/payment" target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-sm font-black transition-all shrink-0 shadow-lg hover:shadow-red-500/20 active:scale-95 uppercase tracking-widest">
            Renew BECE
          </a>
        </div>
      )}

      {ssceSchool?.status === 'active' && beceSchool?.status === 'active' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 flex items-center gap-6 shadow-sm border-l-[12px] border-l-emerald-600">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-200">
            <FileText className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-emerald-950 dark:text-emerald-300 text-xl uppercase tracking-tighter">Institution Status: Fully Accredited</h4>
            <p className="text-emerald-900/80 dark:text-emerald-400 mt-1 text-sm font-bold">
              Your institution is fully accredited for both SSCE and BECE 2024/2025 examination cycles.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight uppercase">Dashboard Overview</h2>
        <p className="text-slate-700 dark:text-slate-400 mt-1 font-bold">Comprehensive management of your school's examination certifications and compliance.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SSCE Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6">
            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border-2 ${ssceSchool?.status === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
              : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800'
              }`}>
              {ssceSchool?.status || 'Pending'}
            </span>
          </div>
          <div className="flex items-center gap-5 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase">SSCE Accreditation</h3>
              <p className="text-slate-600 dark:text-slate-500 text-sm font-bold tracking-widest uppercase">ID CODE: {ssceSchool?.code || '...'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest block mb-1">Last Accredited</span>
              <span className="text-sm font-black text-slate-950 dark:text-white">{ssceSchool?.accredited_date ? new Date(ssceSchool.accredited_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-xl border-l-[6px] border-emerald-600 border-y border-r border-slate-300">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest block mb-1">Status</span>
              <span className="text-sm font-black text-slate-950 dark:text-white uppercase">{(ssceSchool?.accreditation_status === 'Full' || ssceSchool?.accreditation_status === 'Passed' || ssceSchool?.accreditation_status === 'Partial') ? `Accredited (${ssceSchool?.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : ssceSchool?.accreditation_status === 'Failed' ? 'Unaccredited' : ssceSchool?.accreditation_status || 'Unaccredited'}</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Institution Name</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 uppercase leading-tight">{ssceSchool?.name || 'Not Found'}</p>
            </div>
            <div className="relative h-20 w-20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="h-full w-full -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                <path className="text-slate-200 dark:text-slate-700 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4"></path>
                <path className={`stroke-current ${ssceSchool?.status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={ssceSchool?.status === 'active' ? "100, 100" : "50, 100"} strokeLinecap="round" strokeWidth="4"></path>
              </svg>
              <span className="absolute text-[10px] font-black text-slate-950 dark:text-white uppercase">{ssceSchool?.status === 'active' ? 'OK' : 'PEND'}</span>
            </div>
          </div>
        </div>

        {/* BECE Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6">
            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border-2 ${beceSchool?.status === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400 border-red-300 dark:border-red-800'
              }`}>
              {beceSchool?.status || 'Pending'}
            </span>
          </div>
          <div className="flex items-center gap-5 mb-8">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${beceSchool?.status === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200'
              }`}>
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase">BECE Accreditation</h3>
              <p className="text-slate-600 dark:text-slate-500 text-sm font-bold tracking-widest uppercase">ID CODE: {beceSchool?.code || '...'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner">
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest block mb-1">Last Accredited</span>
              <span className="text-sm font-black text-slate-950 dark:text-white">{beceSchool?.accredited_date ? new Date(beceSchool.accredited_date).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className={`bg-slate-200 dark:bg-slate-800 p-4 rounded-xl border-l-[6px] border-y border-r border-slate-300 ${beceSchool?.status === 'active' ? 'border-emerald-600' : 'border-red-600'}`}>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest block mb-1">Status</span>
              <span className={`text-sm font-black uppercase ${beceSchool?.status === 'active' ? 'text-slate-950 dark:text-white' : 'text-red-700 dark:text-red-400'}`}>{(beceSchool?.accreditation_status === 'Full' || beceSchool?.accreditation_status === 'Passed' || beceSchool?.accreditation_status === 'Partial') ? `Accredited (${beceSchool?.accreditation_status === 'Partial' ? 'Partial' : 'Full'})` : beceSchool?.accreditation_status === 'Failed' ? 'Unaccredited' : beceSchool?.accreditation_status || 'Unaccredited'}</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-600 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Institution Name</p>
              <p className="text-lg font-black text-slate-950 dark:text-white uppercase leading-tight">{beceSchool?.name || 'Not Found'}</p>
            </div>
            {beceSchool?.status !== 'active' && (
              <a href="https://payments.neco.gov.ng/payment" target="_blank" rel="noopener noreferrer" className="bg-emerald-600 text-white p-4 rounded-xl flex items-center gap-2 font-black shadow-lg hover:shadow-emerald-500/20 hover:bg-emerald-700 transition-all hover:scale-105 uppercase text-xs tracking-widest">
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Renew</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-black dark:text-white uppercase tracking-tight text-slate-950">Quick Administration Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <a href="https://payments.neco.gov.ng/payment" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-4 p-8 bg-emerald-600 text-white rounded-2xl shadow-xl hover:bg-emerald-700 transition-all text-center border-b-8 border-emerald-800 hover:translate-y-1 hover:border-b-4 group">
            <PlusCircle className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="font-black uppercase tracking-widest text-xs">Apply for New Certification</span>
          </a>
          <a href="https://payments.neco.gov.ng/payment" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl hover:border-emerald-600 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all text-center border-b-8 border-slate-300 dark:border-slate-800 group shadow-sm">
            <History className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            <span className="font-black uppercase tracking-widest text-xs dark:text-white group-hover:text-emerald-700">Renew Existing Records</span>
          </a>
          <button className="flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl hover:border-emerald-600 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all text-center border-b-8 border-slate-300 dark:border-slate-800 group shadow-sm">
            <Download className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            <span className="font-black uppercase tracking-widest text-xs dark:text-white group-hover:text-emerald-700">Retrieve Certificates</span>
          </button>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center bg-slate-200 dark:bg-slate-800/30">
          <h3 className="text-lg font-black dark:text-white uppercase tracking-tight text-slate-950">Recent Application Submissions</h3>
          <a href="#" className="text-emerald-700 dark:text-emerald-400 text-sm font-black hover:underline underline-offset-4">View Full History →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-300">
              <tr>
                <th className="px-6 py-5">Internal Tracking ID</th>
                <th className="px-6 py-5">Application Schema</th>
                <th className="px-6 py-5">Submission Timeline</th>
                <th className="px-6 py-5">Compliance Status</th>
                <th className="px-6 py-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-800 font-medium">
              <tr className="hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-5 font-black text-sm text-slate-950 dark:text-white">
                  <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 shadow-sm">#APP-99201</span>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-slate-800 dark:text-slate-300">SSCE RENEWAL</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-950 dark:text-slate-300">24 Oct 2023</span>
                    <span className="text-[10px] text-slate-500 uppercase font-black uppercase tracking-tighter">Certified Log</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400">Under Review</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-300">
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-5 font-black text-sm text-slate-950 dark:text-white">
                  <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 shadow-sm">#APP-88412</span>
                </td>
                <td className="px-6 py-5 text-sm font-bold text-slate-800 dark:text-slate-300">BECE INITIAL</td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-950 dark:text-slate-300">12 Jan 2023</span>
                    <span className="text-[10px] text-slate-500 uppercase font-black uppercase tracking-tighter">Certified Log</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-300 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400">Approved</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-300">
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
