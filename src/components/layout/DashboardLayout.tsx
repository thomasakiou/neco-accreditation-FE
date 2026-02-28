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
  X,
  Sun,
  Moon,
  Layers,
  ShieldCheck,
  LocateFixed,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '../../context/ThemeContext';
import AuthService from '../../api/services/auth.service';
import DataService, { State } from '../../api/services/data.service';

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
  { icon: ShieldCheck, label: 'Custodians', path: '/state/custodians' },
  { icon: FileText, label: 'Applications', path: '/state/applications' },
  { icon: BarChart3, label: 'Reports', path: '/state/reports' },
];

const headOfficeNavItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/head-office/dashboard' },
  { icon: Layers, label: 'Zones', path: '/head-office/zones' },
  { icon: Map, label: 'States', path: '/head-office/states' },
  { icon: LocateFixed, label: 'LGAs', path: '/head-office/lgas' },
  { icon: School, label: 'Schools', path: '/head-office/schools' },
  { icon: ShieldCheck, label: 'Custodians', path: '/head-office/custodians' },
  { icon: Users, label: 'Users', path: '/head-office/users' },
  { icon: FileText, label: 'Review Proofs', path: '/head-office/review-proofs' },
  { icon: CheckCircle, label: 'Final Approval', path: '/head-office/approvals', badge: 'dynamic_pending_approvals' },
  { icon: BarChart3, label: 'Reports', path: '/head-office/reports' },
];

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [entityName, setEntityName] = React.useState<string>('');
  const [pendingApprovalsCount, setPendingApprovalsCount] = React.useState<number>(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);

        if (role === 'school' && user?.school_code) {
          // In a real app we might fetch the school name specifically
          // For now, let's see if we can get it from the schools list or assume it's in the user object
          setEntityName(user.school_name || `School: ${user.school_code}`);
        } else if (role === 'state' && user?.state_code) {
          const states = await DataService.getStates();
          const currentState = states.find((s: State) => s.code === user.state_code);
          setEntityName(currentState?.name ? `${currentState.name} State Office` : `State Office: ${user.state_code}`);
        } else {
          setEntityName('Head Office Portal');

          // Fetch pending approvals count for Head Office
          const schools = await DataService.getSchools();
          const pendingCount = schools.filter((school: any) => {
            return school.payment_url && (
              !school.accreditation_status ||
              school.accreditation_status === 'Pending' ||
              // school.accreditation_status === 'Failed' ||
              school.accreditation_status === 'Unaccredited'
            );
          }).length;
          setPendingApprovalsCount(pendingCount);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };

    fetchUserData();
  }, [role]);

  const navItemsRaw = role === 'school' ? schoolNavItems : role === 'state' ? stateNavItems : headOfficeNavItems;
  const navItems = navItemsRaw.map(item => {
    if (item.badge === 'dynamic_pending_approvals') {
      return { ...item, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount.toString() : undefined };
    }
    return item;
  });
  const roleLabel = currentUser?.full_name || currentUser?.name || (role === 'school' ? 'School Admin' : role === 'state' ? 'State Coordinator' : 'National Admin');
  const roleSubLabel = entityName || (role === 'school' ? 'Greenwood Academy' : role === 'state' ? 'Lagos State Office' : 'Head Office Portal');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex font-sans text-slate-950 dark:text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-700 transform transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        isDesktopCollapsed ? "w-20" : "w-64",
        isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-300 dark:border-slate-800 relative group">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/images/neco.png" alt="NECO" className="w-full h-full object-contain" />
            </div>
            <div className={cn("transition-opacity duration-300 whitespace-nowrap", isDesktopCollapsed ? "opacity-0 w-0" : "opacity-100")}>
              <h1 className="font-bold text-sm leading-tight dark:text-white">NECO</h1>
              <p className="text-[10px] text-slate-700 dark:text-slate-400 font-medium">Accreditation System</p>
            </div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 dark:text-slate-500"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={cn("flex-1 overflow-y-auto py-6 custom-scrollbar", isDesktopCollapsed ? "px-2" : "px-3")}>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                title={isDesktopCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group whitespace-nowrap overflow-hidden",
                  isDesktopCollapsed ? "px-3 justify-center" : "px-3",
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-200"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300")} />
                    <span className={cn("transition-opacity duration-300", isDesktopCollapsed ? "opacity-0 w-0" : "opacity-100")}>{item.label}</span>
                    {item.badge && !isDesktopCollapsed && (
                      <span className="ml-auto bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.badge && isDesktopCollapsed && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className={cn("mt-8", isDesktopCollapsed ? "px-2" : "px-3")}>
            <p className={cn("text-xs font-semibold text-slate-600 dark:text-slate-500 uppercase tracking-wider mb-2", isDesktopCollapsed ? "text-center text-[10px]" : "")}>{isDesktopCollapsed ? 'Sys' : 'System'}</p>
            <nav className="space-y-1">
              <button
                onClick={toggleTheme}
                title={isDesktopCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
                className={cn("w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-200 transition-colors group overflow-hidden whitespace-nowrap", isDesktopCollapsed ? "px-3 justify-center" : "px-3")}
              >
                {isDark
                  ? <Sun className="w-5 h-5 shrink-0 text-amber-400 group-hover:text-amber-500" />
                  : <Moon className="w-5 h-5 shrink-0 text-slate-600 group-hover:text-slate-700" />
                }
                <span className={cn("transition-opacity duration-300", isDesktopCollapsed ? "opacity-0 w-0" : "opacity-100")}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button
                title={isDesktopCollapsed ? 'Settings' : undefined}
                className={cn("w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-200 transition-colors group overflow-hidden whitespace-nowrap", isDesktopCollapsed ? "px-3 justify-center" : "px-3")}
              >
                <Settings className="w-5 h-5 shrink-0 text-slate-600 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                <span className={cn("transition-opacity duration-300", isDesktopCollapsed ? "opacity-0 w-0" : "opacity-100")}>Settings</span>
              </button>
              <button
                title={isDesktopCollapsed ? 'Notifications' : undefined}
                className={cn("w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-200 transition-colors group overflow-hidden whitespace-nowrap relative", isDesktopCollapsed ? "px-3 justify-center" : "px-3")}
              >
                <Bell className="w-5 h-5 shrink-0 text-slate-600 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
                <span className={cn("transition-opacity duration-300", isDesktopCollapsed ? "opacity-0 w-0" : "opacity-100")}>Notifications</span>
                {!isDesktopCollapsed && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full shrink-0"></span>}
                {isDesktopCollapsed && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />}
              </button>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-300 dark:border-slate-800 relative">
          <div className={cn("flex items-center gap-3 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden transition-all duration-300", isDesktopCollapsed ? "p-1 justify-center border-transparent bg-transparent" : "p-2")}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase" title={roleLabel}>
              {roleLabel ? getInitials(roleLabel) : (role === 'school' ? 'GA' : role === 'state' ? 'LS' : 'HO')}
            </div>
            <div className={cn("flex-1 min-w-0 transition-opacity duration-300", isDesktopCollapsed ? "opacity-0 w-0 hidden" : "opacity-100")}>
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100 truncate">{roleLabel}</p>
              <p className="text-xs text-slate-700 dark:text-slate-400 truncate">{roleSubLabel}</p>
            </div>
            <button
              onClick={() => {
                AuthService.logout();
                navigate('/', { replace: true });
              }}
              title="Logout"
              className={cn("text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0", isDesktopCollapsed ? "hidden" : "")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {isDesktopCollapsed && (
            <button
              onClick={() => {
                AuthService.logout();
                navigate('/', { replace: true });
              }}
              title="Logout"
              className="mt-4 flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mx-auto"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out",
        isDesktopCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <header className={cn(
          "h-16 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out left-0",
          isDesktopCollapsed ? "lg:left-20" : "lg:left-64"
        )}>
          <div className="flex items-center gap-4">
            <button
              className="hidden lg:flex p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
            >
              {isDesktopCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-700 dark:text-slate-400">
              <span className="capitalize">{role.replace('-', ' ')}</span>
              <span className="text-slate-400 dark:text-slate-600">/</span>
              <span className="font-bold text-slate-950 dark:text-slate-100 capitalize">{location.pathname.split('/').pop()?.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 w-64 bg-slate-200 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 text-slate-950 dark:text-slate-100 placeholder:text-slate-700 dark:placeholder:text-slate-400"
              />
            </div>
            <button className="relative p-2 text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 mt-16">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
