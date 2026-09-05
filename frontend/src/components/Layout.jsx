import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, PAYROLL_ROLES, HR_WRITE_ROLES } from '../context/AuthContext';
import { LogOut, ChevronDown, Menu } from 'lucide-react';

const navItem =
  'px-3 py-4 text-sm font-medium border-b-2 border-transparent hover:text-odoo hover:border-odoo transition-colors whitespace-nowrap';
const navItemActive = 'text-odoo border-odoo';
const navItemInactive = 'text-gray-600';

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = hasRole(...HR_WRITE_ROLES);
  const isPayroll = hasRole(...PAYROLL_ROLES);
  const isAdmin = hasRole('ADMIN');

  const links = [
    { to: '/employees', label: 'Employees', show: true },
    { to: '/contracts', label: 'Contracts', show: isStaff },
    { to: '/schedules', label: 'Working Schedules', show: isStaff },
    { to: '/attendance', label: 'Attendance', show: true },
    { to: '/timeoff/requests', label: 'Time Off', show: true },
    { to: '/payroll/payruns', label: 'Payroll', show: isPayroll },
    { to: '/dashboard', label: 'Dashboard', show: isStaff },
    { to: '/users', label: 'Users', show: isAdmin },
  ].filter((l) => l.show);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-odoo text-white sticky top-0 z-20 shadow">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2" onClick={() => setMobileOpen((o) => !o)}>
              <Menu size={20} />
            </button>
            <span className="font-bold text-lg py-3 tracking-tight">PeoplePay360</span>
          </div>
          <nav className="hidden md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `${navItem} ${isActive ? navItemActive + ' bg-white/10' : navItemInactive} text-white/90`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 py-2 px-2 rounded hover:bg-white/10 text-sm"
            >
              <span className="w-7 h-7 rounded-full bg-white text-odoo flex items-center justify-center font-semibold text-xs">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="hidden sm:inline">{user?.name}</span>
              <ChevronDown size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white text-gray-700 rounded shadow-lg border border-gray-200 py-1">
                <div className="px-3 py-2 text-xs text-gray-400 border-b">{user?.role?.replaceAll('_', ' ')}</div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
        {mobileOpen && (
          <nav className="md:hidden flex flex-col bg-odoo-dark">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm text-white/90 border-b border-white/10"
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
