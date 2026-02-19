import React from 'react';
import { 
  AlertTriangle, 
  FileText, 
  GraduationCap, 
  PlusCircle, 
  History, 
  Download, 
  Eye,
  RefreshCw
} from 'lucide-react';

export default function SchoolDashboard() {
  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-900">Attention: SSCE Accreditation expiring soon</h4>
          <p className="text-amber-700 mt-0.5 text-sm">
            Your certification is set to expire in 3 months. Please initiate your renewal process early to avoid service interruption for upcoming exams.
          </p>
        </div>
        <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0">
          Start Renewal Now
        </button>
      </div>

      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h2>
        <p className="text-slate-500 mt-1">Manage and track your school's examination certifications.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SSCE Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Active</span>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">SSCE Accreditation</h3>
              <p className="text-slate-400 text-sm">Senior Secondary School Certificate</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-lg">
              <span className="text-xs text-slate-500 font-semibold block">Last Accredited</span>
              <span className="text-sm font-bold">12 Oct 2023</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-emerald-500">
              <span className="text-xs text-slate-500 font-semibold block">Next Due Date</span>
              <span className="text-sm font-bold">12 Oct 2024</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Time Remaining</p>
              <p className="text-3xl font-black text-emerald-600">90 Days</p>
            </div>
            <div className="relative h-16 w-16 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3"></path>
                <path className="text-emerald-600 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray="75, 100" strokeLinecap="round" strokeWidth="3"></path>
              </svg>
              <span className="absolute text-[10px] font-bold">75%</span>
            </div>
          </div>
        </div>

        {/* BECE Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Expired</span>
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">BECE Accreditation</h3>
              <p className="text-slate-400 text-sm">Basic Education Certificate Exam</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-lg">
              <span className="text-xs text-slate-500 font-semibold block">Last Accredited</span>
              <span className="text-sm font-bold">05 Jan 2023</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-red-500">
              <span className="text-xs text-slate-500 font-semibold block">Next Due Date</span>
              <span className="text-sm font-bold text-red-500">05 Jan 2024</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Status Action</p>
              <p className="text-3xl font-black text-red-500">Immediate</p>
            </div>
            <button className="bg-emerald-600 text-white p-3 rounded-lg flex items-center gap-2 font-bold hover:bg-emerald-700 hover:shadow-lg transition-all">
              <RefreshCw className="w-5 h-5" />
              <span>Renew Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all text-center group">
            <PlusCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="font-bold">Apply for New Accreditation</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 hover:text-emerald-600 transition-all text-center group">
            <History className="w-8 h-8 text-emerald-600" />
            <span className="font-bold">Renew Existing</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-200 rounded-xl hover:border-emerald-600 hover:text-emerald-600 transition-all text-center group">
            <Download className="w-8 h-8 text-emerald-600" />
            <span className="font-bold">View Certificates</span>
          </button>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold">Recent Submissions</h3>
          <a href="#" className="text-emerald-600 text-sm font-bold hover:underline">View all history</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Application ID</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Submitted Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-6 py-4 font-bold text-sm">#APP-99201</td>
                <td className="px-6 py-4 text-sm">SSCE Renewal</td>
                <td className="px-6 py-4 text-sm">24 Oct 2023</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Under Review</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-sm">#APP-88412</td>
                <td className="px-6 py-4 text-sm">BECE Initial</td>
                <td className="px-6 py-4 text-sm">12 Jan 2023</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-emerald-600 transition-colors">
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
