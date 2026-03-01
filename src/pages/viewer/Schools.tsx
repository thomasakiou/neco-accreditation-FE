import React from 'react';
import { AlertCircle } from 'lucide-react';
import DataService from '../../api/services/data.service';

interface School {
  code: string;
  name: string;
  state_code?: string;
  accreditation_status: string;
  category?: string;
}

export default function ViewerSchools() {
  const [schools, setSchools] = React.useState<School[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const fetchSchools = async () => {
      try {
        const data = await DataService.getSchools();
        setSchools(data);
      } catch (err) {
        console.error('Failed to fetch schools:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Full':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200';
      case 'Partial':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
      case 'Failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="text-slate-600 dark:text-slate-400">Loading schools...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Schools</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">View all schools in the system (SSCE only)</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          This is a read-only view. Data cannot be modified.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search schools by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Code</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">State</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Category</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((school) => (
                <tr key={school.code} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-950 dark:text-white font-medium">{school.code}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{school.name}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{school.state_code || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{school.category || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(school.accreditation_status)}`}>
                      {school.accreditation_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSchools.length === 0 && (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No schools found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
