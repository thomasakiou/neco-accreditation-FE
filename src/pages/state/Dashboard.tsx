import React from 'react';
import { 
  School, 
  CheckCircle, 
  Calendar, 
  AlertCircle, 
  Clock,
  MoreVertical,
  Megaphone,
  HelpCircle
} from 'lucide-react';

export default function StateDashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+2.5%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Schools</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">1,284</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">-1.2%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Active</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">942</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+5.4%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Due Soon</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">115</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+0.8%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Expired</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">48</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+12.1%</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Pending Apps</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">179</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg">Recent Applications</h3>
            <button className="text-emerald-600 text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">School Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date Submitted</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-emerald-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-sm">Bright Future Academy</p>
                    <p className="text-xs text-slate-500">LGA: Ikeja</p>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">SSCE</span></td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">Oct 24, 2023</span></td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Pending Review
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                      <MoreVertical className="text-slate-500 w-5 h-5" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-emerald-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-sm">St. Mary's College</p>
                    <p className="text-xs text-slate-500">LGA: Surulere</p>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">BECE</span></td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">Oct 22, 2023</span></td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      Approved
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                      <MoreVertical className="text-slate-500 w-5 h-5" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-emerald-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-sm">Unity Secondary School</p>
                    <p className="text-xs text-slate-500">LGA: Alimosho</p>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">SSCE</span></td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">Oct 21, 2023</span></td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      In Processing
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors">
                      <MoreVertical className="text-slate-500 w-5 h-5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Schools by LGA */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg">Schools by LGA</h3>
            <p className="text-xs text-slate-500">Accreditation Distribution</p>
          </div>
          <div className="flex-1 space-y-4">
            {[
              { name: 'Ikeja', count: 320, percent: 85 },
              { name: 'Alimosho', count: 285, percent: 75 },
              { name: 'Surulere', count: 210, percent: 60 },
              { name: 'Eti-Osa', count: 195, percent: 55 },
              { name: 'Ikorodu', count: 145, percent: 40 },
            ].map((lga) => (
              <div key={lga.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700">{lga.name}</span>
                  <span className="text-slate-500">{lga.count} Schools</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${lga.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Top Performer</p>
                <p className="text-sm font-bold text-slate-900">Ikeja</p>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div className="flex-1 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Accreditation Rate</p>
                <p className="text-sm font-bold text-emerald-600">92.4%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">SSCE 2024 Window Closing</h4>
            <p className="text-sm text-slate-600 mt-1">Application window for the upcoming SSCE session closes in 14 days. Ensure all pending reviews are finalized.</p>
            <button className="mt-3 text-sm font-bold text-emerald-600 hover:text-emerald-700">Review Now →</button>
          </div>
        </div>
        <div className="bg-slate-100 p-6 rounded-xl flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Portal Support</h4>
            <p className="text-sm text-slate-600 mt-1">Need help with the accreditation process? Contact the head office technical team for assistance.</p>
            <button className="mt-3 text-sm font-bold text-slate-700 hover:underline">Contact Support</button>
          </div>
        </div>
      </div>
    </div>
  );
}
