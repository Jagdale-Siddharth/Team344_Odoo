import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Auth/Login';
import EmployeeList from './pages/Employees/EmployeeList';
import EmployeeForm from './pages/Employees/EmployeeForm';
import ContractList from './pages/Contracts/ContractList';
import ScheduleList from './pages/Schedules/ScheduleList';
import AttendanceList from './pages/Attendance/AttendanceList';
import TimeOffRequests from './pages/TimeOff/TimeOffRequests';
import TimeOffAllocations from './pages/TimeOff/TimeOffAllocations';
import TimeOffTypes from './pages/TimeOff/TimeOffTypes';
import Payruns from './pages/Payroll/Payruns';
import PayrunDetail from './pages/Payroll/PayrunDetail';
import Payslips from './pages/Payroll/Payslips';
import PayslipDetail from './pages/Payroll/PayslipDetail';
import SalaryStructures from './pages/Payroll/SalaryStructures';
import SalaryStructureDetail from './pages/Payroll/SalaryStructureDetail';
import NewPayrun from './pages/Payroll/NewPayrun';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/Users/UserManagement';

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];
const PAYROLL_ROLES = ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/employees" replace />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/new" element={<EmployeeForm />} />
              <Route path="/employees/:id" element={<EmployeeForm />} />

              <Route path="/attendance" element={<AttendanceList />} />

              <Route path="/timeoff/requests" element={<TimeOffRequests />} />
              <Route path="/timeoff/allocations" element={<TimeOffAllocations />} />
              <Route path="/timeoff/types" element={<TimeOffTypes />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={HR_ROLES} />}>
            <Route element={<Layout />}>
              <Route path="/contracts" element={<ContractList />} />
              <Route path="/schedules" element={<ScheduleList />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={PAYROLL_ROLES} />}>
            <Route element={<Layout />}>
              <Route path="/payroll/payruns" element={<Payruns />} />
              <Route path="/payroll/payruns/new" element={<NewPayrun />} />
              <Route path="/payroll/payruns/:id" element={<PayrunDetail />} />
              <Route path="/payroll/payslips" element={<Payslips />} />
              <Route path="/payroll/payslips/:id" element={<PayslipDetail />} />
              <Route path="/payroll/structures" element={<SalaryStructures />} />
              <Route path="/payroll/structures/:id" element={<SalaryStructureDetail />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route element={<Layout />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
