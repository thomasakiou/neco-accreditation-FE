import React from 'react';
import { 
  Building2, 
  Users, 
  FileCheck, 
  TrendingUp,
  MapPin,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function HeadOfficeDashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 12%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total States Active</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">36 + FCT</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 8.5%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Total Schools</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">24,592</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 5.2%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Accredited (YTD)</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">18,402</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> 2.1%
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">Pending Review</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">1,205</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">National Coverage</h3>
              <p className="text-sm text-slate-500">Accreditation status across states</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>High (&gt;80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span>Medium (50-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span>Low (&lt;50%)</span>
              </div>
            </div>
          </div>
          
          {/* Map Placeholder */}
          <div className="bg-slate-50 rounded-xl h-[400px] flex items-center justify-center relative overflow-hidden border border-slate-100">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="text-center">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Interactive Map Visualization</p>
              <p className="text-xs text-slate-400 mt-1">Select a state to view detailed metrics</p>
            </div>
            
            {/* Simulated Map Points */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-amber-400 rounded-full shadow-lg shadow-amber-400/30 opacity-80"></div>
            <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/30"></div>
            <div className="absolute top-1/2 right-1/4 w-5 h-5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 opacity-90"></div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-6">Recent Activities</h3>
          <div className="space-y-8 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
            {[
              { title: 'Lagos State Report Submitted', time: '2 hours ago', type: 'report', color: 'bg-blue-500' },
              { title: 'New Accreditation Policy Updated', time: '5 hours ago', type: 'policy', color: 'bg-purple-500' },
              { title: 'Kano State Approval Pending', time: '1 day ago', type: 'approval', color: 'bg-amber-500' },
              { title: 'System Maintenance Scheduled', time: '2 days ago', type: 'system', color: 'bg-slate-500' },
            ].map((activity, i) => (
              <div key={i} className="relative pl-10">
                <div className={`absolute left-0 top-1.5 w-7 h-7 rounded-full border-4 border-white shadow-sm ${activity.color}`}></div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{activity.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-auto pt-6 text-center text-sm font-bold text-emerald-600 hover:text-emerald-700">
            View Activity Log
          </button>
        </div>
      </div>

      {/* State Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-lg">State Performance Metrics</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Export CSV</button>
            <button className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">Print Report</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">Total Schools</th>
                <th className="px-6 py-4">Accredited</th>
                <th className="px-6 py-4">Compliance Rate</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-sm">Lagos</td>
                <td className="px-6 py-4 text-sm text-slate-600">4,250</td>
                <td className="px-6 py-4 text-sm text-slate-600">3,980</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-24 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '93%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">93%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    Excellent
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-sm">Abuja (FCT)</td>
                <td className="px-6 py-4 text-sm text-slate-600">1,850</td>
                <td className="px-6 py-4 text-sm text-slate-600">1,620</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-24 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '87%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">87%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    Good
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-sm">Rivers</td>
                <td className="px-6 py-4 text-sm text-slate-600">2,100</td>
                <td className="px-6 py-4 text-sm text-slate-600">1,450</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-24 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: '69%' }}></div>
                    </div>
                    <span className="text-xs font-bold text-amber-600">69%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Average
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
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
