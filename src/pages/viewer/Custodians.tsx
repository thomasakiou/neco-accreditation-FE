import React from 'react';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { cn } from '../../lib/utils';

interface Custodian {
  code: string;
  name: string;
  state_code?: string;
  lga_code?: string;
  town?: string;
}

export default function ViewerCustodians() {
  const [custodians, setCustodians] = React.useState<Custodian[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [expandedStates, setExpandedStates] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [custodiansData, statesData, userData] = await Promise.all([
          DataService.getCustodians(),
          DataService.getStates(),
          AuthService.getCurrentUser()
        ]);
        setCustodians(custodiansData);
        setStates(statesData);
        setCurrentUser(userData);

        // Default all to collapsed
        setExpandedStates({});
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleState = (stateName: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [stateName]: !prev[stateName]
    }));
  };

  const filteredCustodians = custodians.filter(custodian => {
    const matchesSearch = custodian.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custodian.code.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesZone = true;
    if (currentUser?.role === 'zone') {
      const state = states.find(s => s.code === custodian.state_code);
      matchesZone = state?.zone_code === currentUser.zone_code;
    }

    return matchesSearch && matchesZone;
  });

  const custodiansByState = React.useMemo(() => {
    const grouped: Record<string, Custodian[]> = {};
    filteredCustodians.forEach(custodian => {
      const stateName = states.find(s => s.code === custodian.state_code)?.name || custodian.state_code || 'Other';
      if (!grouped[stateName]) grouped[stateName] = [];
      grouped[stateName].push(custodian);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCustodians, states]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="text-slate-600 dark:text-slate-400">Loading custodians...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Custodians in your Zone</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">View custodians grouped by state</p>
      </div>


      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search custodians by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4">
          {custodiansByState.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No custodians found
            </div>
          ) : (
            custodiansByState.map(([stateName, stateCustodians]) => {
              const isExpanded = expandedStates[stateName];
              return (
                <div key={stateName} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  <button
                    onClick={() => toggleState(stateName)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200 flex-1">
                      {stateName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400">
                      {stateCustodians.length} {stateCustodians.length === 1 ? 'CUSTODIAN' : 'CUSTODIANS'}
                    </span>
                  </button>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                  )}>
                    <div className="p-4 pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Code</th>
                              <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Name</th>
                              <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Town</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stateCustodians.map((custodian) => (
                              <tr key={custodian.code} className="border-b border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                <td className="py-3 px-4 text-slate-950 dark:text-white font-medium">{custodian.code}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{custodian.name}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{custodian.town || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


