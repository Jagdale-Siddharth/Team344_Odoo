import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

function AttendanceWidget({ employeeId, onChange }) {
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => api.get(`/attendance/open/${employeeId}`).then((res) => setOpen(res.data));
  useEffect(() => {
    if (employeeId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (open) {
        await api.post('/attendance/check-out', { employeeId });
      } else {
        await api.post('/attendance/check-in', { employeeId });
      }
      await refresh();
      onChange?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 max-w-sm mb-6">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
        <Clock size={16} /> {now.toLocaleDateString(undefined, { weekday: 'long' })}
      </div>
      <p className="text-3xl font-semibold text-gray-800 mb-4">{now.toLocaleTimeString()}</p>
      {open && <p className="text-xs text-gray-500 mb-3">Checked in at {new Date(open.checkIn).toLocaleTimeString()}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full py-2 rounded text-sm font-medium text-white transition-colors ${
          open ? 'bg-red-500 hover:bg-red-600' : 'bg-odoo hover:bg-odoo-dark'
        }`}
      >
        {loading ? 'Please wait...' : open ? 'Check Out' : 'Check In'}
      </button>
    </div>
  );
}

export default function AttendanceList() {
  const [params] = useSearchParams();
  const employeeIdFilter = params.get('employeeId') || '';
  const { user, hasRole } = useAuth();
  const isStaff = hasRole('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER');
  const [rows, setRows] = useState([]);

  const load = () => api.get('/attendance', { params: { employeeId: employeeIdFilter || undefined } }).then((res) => setRows(res.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeIdFilter]);

  return (
    <div>
      <PageHeader title="Attendance" subtitle={isStaff ? 'Check-in, check-out, worked hours and status for all employees.' : 'Your attendance records.'} />

      {!isStaff && user?.employee?.id && <AttendanceWidget employeeId={user.employee.id} onChange={load} />}

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              {isStaff && <th>Employee</th>}
              <th>Check In</th>
              <th>Check Out</th>
              <th>Worked Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                {isStaff && <td className="font-medium text-gray-800">{a.employee?.name}</td>}
                <td>{new Date(a.checkIn).toLocaleString()}</td>
                <td>{a.checkOut ? new Date(a.checkOut).toLocaleString() : '-'}</td>
                <td>{a.workedHours ?? '-'}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No attendance records found.</p>}
      </div>
    </div>
  );
}
