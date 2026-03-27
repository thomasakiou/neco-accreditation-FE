import React, { useState, useEffect } from 'react';
import {
    Users as UsersIcon,
    Search,
    Loader2,
    ShieldAlert,
    Mail,
    Building2,
    Map,
    RefreshCw
} from 'lucide-react';
import DataService, { School, State } from '../../api/services/data.service';
import AuthService from '../../api/services/auth.service';

interface UserRow {
    id: string;
    name: string;
    email: string;
    role: 'state' | 'school';
    location: string;
    code: string;
}

export default function HeadOfficeUsers() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'state' | 'school'>('all');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const isSuperAdmin = currentUser?.email === 'admin@neco.gov.ng';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const [states, schools, userData] = await Promise.all([
                DataService.getStates(),
                DataService.getSchools(),
                AuthService.getCurrentUser()
            ]);
            setCurrentUser(userData);

            const stateUsers: UserRow[] = states
                .filter(s => s.email)
                .map(s => ({
                    id: `state-${s.code}`,
                    name: s.name,
                    email: s.email!,
                    role: 'state',
                    location: s.capital || '',
                    code: s.code
                }));

            const schoolUsers: UserRow[] = schools
                .filter(s => s.email)
                .map(s => ({
                    id: `school-${s.code}`,
                    name: s.name,
                    email: s.email!,
                    role: 'school',
                    location: s.state_code,
                    code: s.code
                }));

            setUsers([...stateUsers, ...schoolUsers]);
        } catch (err: any) {
            setError('Failed to load users. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
                        <UsersIcon className="w-8 h-8 text-emerald-600" />
                        System Users
                    </h1>
                    <p className="text-slate-700 dark:text-slate-400 font-medium mt-1">Overview of all active state and school user accounts in the system.</p>
                </div>
                <button
                    onClick={() => fetchUsers()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {!isSuperAdmin && !isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Access Restricted</h3>
                    <p className="max-w-md text-slate-500 dark:text-slate-400 font-medium">
                        You do not have the required permissions to view the system user registry. 
                        This area is reserved for Super Administrators only.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-300 dark:border-slate-700 flex flex-col md:flex-row md:items-center gap-4 bg-slate-200 dark:bg-slate-800/30">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Search by name, email or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Filter by Role:</span>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as any)}
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                            >
                                <option value="all">All Users</option>
                                <option value="state">States</option>
                                <option value="school">Schools</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-200 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest border-b border-slate-300 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Account Holder</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Contact Email</th>
                                    <th className="px-6 py-4 text-right">Identifier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 dark:divide-slate-800 font-medium">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                                            <p className="text-slate-400 text-sm">Loading user registry...</p>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <UsersIcon className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <p className="text-slate-900 dark:text-white font-bold">No accounts found</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your search filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="group hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${user.role === 'state'
                                                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                        } border border-transparent group-hover:border-current transition-all`}>
                                                        {user.role === 'state' ? <Map className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-950 dark:text-white capitalize">
                                                        {user.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'state'
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                    }`}>
                                                    {user.role} Account
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-400">
                                                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-sm font-bold">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-400 text-[11px] font-mono font-bold">
                                                    {user.code}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20">
                        <p className="text-xs text-slate-500 font-medium">
                            Showing <span className="text-slate-900 dark:text-white font-bold">{filteredUsers.length}</span> active user accounts in the system.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
