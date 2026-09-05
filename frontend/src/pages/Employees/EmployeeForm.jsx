import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

const EMPTY = {
  name: '',
  workEmail: '',
  phone: '',
  department: '',
  jobPosition: '',
  employeeType: 'FULL_TIME',
  status: 'ACTIVE',
  managerId: '',
  workingScheduleId: '',
};

export default function EmployeeForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole(...HR_WRITE_ROLES);

  const [form, setForm] = useState(EMPTY);
  const [detail, setDetail] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [managers, setManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/schedules').then((res) => setSchedules(res.data));
    api.get('/employees', { params: { pageSize: 200 } }).then((res) => setManagers(res.data.items));
  }, []);

  useEffect(() => {
    if (!isNew) {
      api.get(`/employees/${id}`).then((res) => {
        setDetail(res.data);
        setForm({
          name: res.data.name,
          workEmail: res.data.workEmail,
          phone: res.data.phone || '',
          department: res.data.department,
          jobPosition: res.data.jobPosition,
          employeeType: res.data.employeeType,
          status: res.data.status,
          managerId: res.data.managerId || '',
          workingScheduleId: res.data.workingScheduleId || '',
        });
      });
    }
  }, [id, isNew]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = { ...form, managerId: form.managerId || null, workingScheduleId: form.workingScheduleId || null };
    try {
      if (isNew) {
        const res = await api.post('/employees', payload);
        navigate(`/employees/${res.data.id}`);
      } else {
        await api.put(`/employees/${id}`, payload);
        const res = await api.get(`/employees/${id}`);
        setDetail(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Employee' : detail?.name || 'Employee'}
        subtitle={!isNew && detail?.jobPosition}
        actions={
          <Link to="/employees" className="btn-secondary">
            Back to list
          </Link>
        }
      />

      {!isNew && detail && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Link to={`/contracts?employeeId=${id}`} className="card px-4 py-2 text-sm text-gray-600 hover:text-odoo">
            Contracts <span className="font-semibold">{detail._count?.contracts || 0}</span>
          </Link>
          <Link to={`/attendance?employeeId=${id}`} className="card px-4 py-2 text-sm text-gray-600 hover:text-odoo">
            Attendance <span className="font-semibold">{detail._count?.attendances || 0}</span>
          </Link>
          <Link to={`/timeoff/requests?employeeId=${id}`} className="card px-4 py-2 text-sm text-gray-600 hover:text-odoo">
            Time Off <span className="font-semibold">{detail._count?.timeOffRequests || 0}</span>
          </Link>
          <Link to={`/timeoff/allocations?employeeId=${id}`} className="card px-4 py-2 text-sm text-gray-600 hover:text-odoo">
            Allocations <span className="font-semibold">{detail._count?.allocations || 0}</span>
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 max-w-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
            <input required disabled={!canWrite} className="input" value={form.name} onChange={handleChange('name')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Work Email</label>
            <input required type="email" disabled={!canWrite} className="input" value={form.workEmail} onChange={handleChange('workEmail')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input disabled={!canWrite} className="input" value={form.phone} onChange={handleChange('phone')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <input required disabled={!canWrite} className="input" value={form.department} onChange={handleChange('department')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Job Position</label>
            <input required disabled={!canWrite} className="input" value={form.jobPosition} onChange={handleChange('jobPosition')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee Type</label>
            <select disabled={!canWrite} className="input" value={form.employeeType} onChange={handleChange('employeeType')}>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select disabled={!canWrite} className="input" value={form.status} onChange={handleChange('status')}>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Manager</label>
            <select disabled={!canWrite} className="input" value={form.managerId} onChange={handleChange('managerId')}>
              <option value="">No manager</option>
              {managers.filter((m) => m.id !== id).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Working Schedule</label>
            <select disabled={!canWrite} className="input" value={form.workingScheduleId} onChange={handleChange('workingScheduleId')}>
              <option value="">No schedule</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {canWrite && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </form>

      {!isNew && detail?.contracts?.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">Contract History</h2>
          <div className="card overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Wage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.contracts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.reference}</td>
                    <td>{new Date(c.startDate).toLocaleDateString()}</td>
                    <td>{c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}</td>
                    <td>₹{c.wage.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
