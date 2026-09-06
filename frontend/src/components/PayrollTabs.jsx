import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// The top nav only has a single "Payroll" link (-> Payruns), so there was
// previously no way to reach Payslips or Salary Structures from the UI at
// all, even though both pages and their permissions already exist. This
// gives every Payroll page the same set of tabs to switch between them.
const tabClass = ({ isActive }) =>
  `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
    isActive ? 'bg-odoo text-white' : 'text-gray-600 hover:bg-gray-100'
  }`;

export default function PayrollTabs() {
  const { hasRole } = useAuth();
  const canManageStructures = hasRole('ADMIN', 'HR_PAYROLL_MANAGER');

  return (
    <div className="flex flex-wrap gap-1 mb-4">
      <NavLink to="/payroll/payruns" className={tabClass}>
        Pay Runs
      </NavLink>
      <NavLink to="/payroll/payslips" className={tabClass}>
        Payslips
      </NavLink>
      <NavLink to="/payroll/structures" className={tabClass}>
        Salary Structures {canManageStructures ? '' : '(View only)'}
      </NavLink>
    </div>
  );
}
