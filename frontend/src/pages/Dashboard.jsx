import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import { useAuth, PAYROLL_ROLES } from '../context/AuthContext';

function KpiCard({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { hasRole } = useAuth();
  const canSeePayroll = hasRole(...PAYROLL_ROLES);
  const [data, setData] = useState(null);
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/employees/departments').then((res) => setDepartments(res.data));
  }, []);

  useEffect(() => {
    api.get('/dashboard', { params: { department: department || undefined } }).then((res) => setData(res.data));
  }, [department]);

  if (!data) return <p className="text-gray-400 text-sm">Loading dashboard...</p>;

  return (
    <div>
      <PageHeader
        title="Payroll Dashboard"
        subtitle="Live insights combining HR data from Employees, Attendance, Time Off, and Payroll."
        actions={
          <select className="input w-48" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Employees" value={data.totalEmployees} sub={`${data.departmentCount} departments`} />
        {canSeePayroll && data.payroll && (
          <>
            <KpiCard label="Total Net Salary" value={`₹${Math.round(data.payroll.totalNetSalaryPaid).toLocaleString()}`} />
            <KpiCard label="Payslips Generated" value={data.payroll.payslipsGenerated} />
            <KpiCard label="Average Salary" value={`₹${Math.round(data.payroll.averageSalary).toLocaleString()}`} />
          </>
        )}
        <KpiCard label="Attendance Health" value={`${data.attendance.health}%`} sub="Present / Late / Overtime ratio" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {canSeePayroll && data.payroll && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Salary Cost by Department</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.payroll.salaryCostByDepartment}>
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Math.round(v).toLocaleString()}`} />
                <Bar dataKey="total" fill="#714B67" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {canSeePayroll && data.payroll && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Monthly Net Salary Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.payroll.monthlyNetSalaryTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Math.round(v).toLocaleString()}`} />
                <Line type="monotone" dataKey="total" stroke="#714B67" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Department Headcount</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.departmentBreakdown}>
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="headcount" fill="#8f6382" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Attendance Overview</h3>
          <ul className="space-y-2 text-sm">
            {data.attendance.byStatus.map((s) => (
              <li key={s.status} className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">{s.status.replaceAll('_', ' ')}</span>
                <span className="font-medium">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Time Off Overview</h3>
          <ul className="space-y-2 text-sm mb-3">
            {data.timeOff.byStatus.map((s) => (
              <li key={s.status} className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">{s.status}</span>
                <span className="font-medium">
                  {s.count} requests · {s.totalDays} day(s)
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500">Remaining balance across employees: {data.timeOff.remainingBalance} day(s)</p>
        </div>

        {canSeePayroll && data.payroll && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Payslip Status & Payroll Alerts</h3>
            <ul className="space-y-2 text-sm mb-3">
              {data.payroll.payslipStatusBreakdown.map((s) => (
                <li key={s.status} className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">{s.status}</span>
                  <span className="font-medium">{s.count}</span>
                </li>
              ))}
            </ul>
            {data.payroll.payrollWarnings > 0 && (
              <p className="text-sm text-amber-600">⚠ {data.payroll.payrollWarnings} payslip(s) require attention</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
