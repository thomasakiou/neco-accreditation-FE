import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  FileText, 
  History, 
  User, 
  LogOut, 
  Settings, 
  BarChart3, 
  CheckCircle,
  Map,
  Bell,
  Search,
  Menu,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'school' | 'state' | 'head-office';
}

const schoolNavItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/school/dashboard' },
  { icon: FileText, label: 'Accreditation', path: '/school/application' },
  { icon: History, label: 'History', path: '/school/history' },
  { icon: User, label: 'Profile', path: '/school/profile' },
];

const stateNavItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/state/dashboard' },
  { icon: School, label: 'Schools', path: '/state/schools' },
  { icon: FileText, label: 'Applications', path: '/state/applications' },
  { icon: BarChart3, label: 'Reports', path: '/state/reports' },
];

const headOfficeNavItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/head-office/dashboard' },
  { icon: Map, label: 'States', path: '/head-office/states' },
  { icon: School, label: 'Schools', path: '/head-office/schools' },
  { icon: CheckCircle, label: 'Final Approval', path: '/head-office/approvals', badge: '12' },
  { icon: BarChart3, label: 'Reports', path: '/head-office/reports' },
];

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = role === 'school' ? schoolNavItems : role === 'state' ? stateNavItems : headOfficeNavItems;
  const roleLabel = role === 'school' ? 'School Admin' : role === 'state' ? 'State Coordinator' : 'National Admin';
  const roleSubLabel = role === 'school' ? 'Greenwood Academy' : role === 'state' ? 'Lagos State Office' : 'Head Office Portal';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">AMS Digital</h1>
              <p className="text-[10px] text-slate-500 font-medium">Accreditation System</p>
            </div>
          </div>
          <button 
            className="ml-auto lg:hidden text-slate-400"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group",
                  isActive 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500")} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 px-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System</p>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors group">
                <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-500" />
                <span>Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors group">
                <Bell className="w-5 h-5 text-slate-400 group-hover:text-slate-500" />
                <span>Notifications</span>
                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
              {role === 'school' ? 'GA' : role === 'state' ? 'LS' : 'HO'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{roleLabel}</p>
              <p className="text-xs text-slate-500 truncate">{roleSubLabel}</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-slate-600"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <span className="capitalize">{role.replace('-', ' ')}</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-900 capitalize">{location.pathname.split('/').pop()?.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 w-64 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
