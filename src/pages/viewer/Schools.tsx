import React from 'react';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import DataService from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';
import { cn } from '../../lib/utils';

interface School {
  code: string;
  name: string;
  state_code?: string;
  accreditation_status: string;
  category?: string;
}

export default function ViewerSchools() {
  const [schools, setSchools] = React.useState<School[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [expandedStates, setExpandedStates] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const fetchSchoolsAndData = async () => {
      try {
        const [schoolsData, statesData, userData] = await Promise.all([
          DataService.getSchools(),
          DataService.getStates(),
          AuthService.getCurrentUser()
        ]);
        setSchools(schoolsData);
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

    fetchSchoolsAndData();
  }, []);

  const toggleState = (stateName: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [stateName]: !prev[stateName]
    }));
  };

  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.code.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesZone = true;
    if (currentUser?.role === 'zone') {
      const state = states.find(s => s.code === school.state_code);
      matchesZone = state?.zone_code === currentUser.zone_code;
    }

    return matchesSearch && matchesZone;
  });

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

  const schoolsByState = React.useMemo(() => {
    const grouped: Record<string, School[]> = {};
    filteredSchools.forEach(school => {
      const stateName = states.find(s => s.code === school.state_code)?.name || school.state_code || 'Other';
      if (!grouped[stateName]) grouped[stateName] = [];
      grouped[stateName].push(school);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSchools, states]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><div className="text-slate-600 dark:text-slate-400">Loading schools...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Schools in your Zone</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">View schools grouped by state</p>
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

        <div className="space-y-4">
          {schoolsByState.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              No schools found
            </div>
          ) : (
            schoolsByState.map(([stateName, stateSchools]) => {
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
                      {stateSchools.length} {stateSchools.length === 1 ? 'SCHOOL' : 'SCHOOLS'}
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
                              <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Category</th>
                              <th className="text-left py-3 px-4 font-semibold text-slate-950 dark:text-white">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stateSchools.map((school) => (
                              <tr key={school.code} className="border-b border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                <td className="py-3 px-4 text-slate-950 dark:text-white font-medium">{school.code}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{school.name}</td>
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


