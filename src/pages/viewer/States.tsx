import React from 'react';
import { AlertCircle } from 'lucide-react';
import DataService from '../../api/services/data.service';

interface State {
  code: string;
  name: string;
  capital?: string;
  zone_code: string;
}

export default function ViewerStates() {
  const [states, setStates] = React.useState<State[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await DataService.getStates();
        setStates(data);
      } catch (err) {
        console.error('Failed to fetch states:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStates();
  }, []);

  const filteredStates = states.filter(state =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    state.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="text-slate-600 dark:text-slate-400">Loading states...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">States</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">View all states in the system</p>
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
            placeholder="Search states by name or code..."
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
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Capital</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Zone Code</th>
              </tr>
            </thead>
            <tbody>
              {filteredStates.map((state) => (
                <tr key={state.code} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-slate-950 dark:text-white font-medium">{state.code}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{state.name}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{state.capital || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{state.zone_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStates.length === 0 && (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No states found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
