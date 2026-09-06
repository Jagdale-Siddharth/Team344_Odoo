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

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`card p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-600 mb-3">{title}</h3>
      {children}
    </div>
  );
}

// Shared X-axis config for category charts (department / month names).
// angled + explicit interval=0 + extra height keeps every label
// (e.g. "Finance", "Customer Support") visible instead of being
// clipped or skipped when the category list gets long.
const CATEGORY_X_AXIS_PROPS = {
  interval: 0,
  angle: -30,
  textAnchor: 'end',
  height: 70,
  tick: { fontSize: 11 },
};

const CHART_MARGIN = { top: 8, right: 12, left: 0, bottom: 8 };

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
    <div className="space-y-6">
      <PageHeader
        title="HR & Payroll Dashboard"
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

      {/* -------------------------- Overview KPIs -------------------------- */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Employees" value={data.totalEmployees} sub={`${data.departmentCount} departments`} />
          <KpiCard label="Attendance Health" value={`${data.attendance.health}%`} sub="Present / Late / Overtime ratio" />
          <KpiCard
            label="Time Off Balance"
            value={`${data.timeOff.remainingBalance} day(s)`}
            sub="Remaining across employees"
          />
          {canSeePayroll && data.payroll && (
            <KpiCard label="Payroll Warnings" value={data.payroll.payrollWarnings} sub="Payslips needing attention" />
          )}
        </div>
      </section>

      {/* --------------------------- Payroll KPIs --------------------------- */}
      {canSeePayroll && data.payroll && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Payroll</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Net Salary" value={`₹${Math.round(data.payroll.totalNetSalaryPaid).toLocaleString()}`} />
            <KpiCard label="Payslips Generated" value={data.payroll.payslipsGenerated} />
            <KpiCard label="Pending Payslips" value={data.payroll.pendingPayslips} sub={`${data.payroll.paidPayslips} paid`} />
            <KpiCard label="Average Salary" value={`₹${Math.round(data.payroll.averageSalary).toLocaleString()}`} />
          </div>
        </section>
      )}

      {/* ------------------------- Headcount & Attendance ------------------------- */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Workforce</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Department Headcount">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentBreakdown} margin={CHART_MARGIN}>
                <XAxis dataKey="department" {...CATEGORY_X_AXIS_PROPS} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="headcount" fill="#8f6382" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Attendance Overview">
            <ul className="space-y-2 text-sm">
              {data.attendance.byStatus.map((s) => (
                <li key={s.status} className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">{s.status.replaceAll('_', ' ')}</span>
                  <span className="font-medium">{s.count}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </section>

      {/* ------------------------------ Payroll charts ------------------------------ */}
      {canSeePayroll && data.payroll && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Payroll Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Payroll by Department">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.payroll.salaryCostByDepartment} margin={CHART_MARGIN}>
                  <XAxis dataKey="department" {...CATEGORY_X_AXIS_PROPS} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `₹${Math.round(v).toLocaleString()}`} />
                  <Bar dataKey="total" fill="#714B67" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Net Salary Trend">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.payroll.monthlyNetSalaryTrend} margin={CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `₹${Math.round(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="total" stroke="#714B67" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Salary Distribution">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.payroll.salaryDistribution} margin={CHART_MARGIN}>
                  <XAxis dataKey="range" {...CATEGORY_X_AXIS_PROPS} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Employees" fill="#a480a0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Payslip Status & Payment">
              <ul className="space-y-2 text-sm mb-3">
                {data.payroll.payslipStatusBreakdown.map((s) => (
                  <li key={s.status} className="flex justify-between border-b border-gray-100 pb-1">
                    <span className="text-gray-500">{s.status}</span>
                    <span className="font-medium">{s.count}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-500">Paid vs Pending</span>
                <span className="font-medium">
                  {data.payroll.paidPayslips} paid · {data.payroll.pendingPayslips} pending
                </span>
              </div>
              {data.payroll.payrollWarnings > 0 && (
                <p className="text-sm text-amber-600 mt-2">⚠ {data.payroll.payrollWarnings} payslip(s) require attention</p>
              )}
            </ChartCard>
          </div>
        </section>
      )}

      {/* ------------------------------- Time Off ------------------------------- */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Time Off</h2>
        <ChartCard title="Time Off Overview">
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
        </ChartCard>
      </section>
    </div>
  );
}
