import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X, Check, Ban } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

export default function TimeOffRequests() {
  const [params] = useSearchParams();
  const employeeIdFilter = params.get('employeeId') || '';
  const { user, hasRole } = useAuth();
  const isStaff = hasRole(...HR_WRITE_ROLES);

  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', timeOffTypeId: '', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/timeoff/requests', { params: { employeeId: employeeIdFilter || undefined } }).then((res) => setRequests(res.data));

  useEffect(() => {
    load();
    api.get('/timeoff/types').then((res) => setTypes(res.data));
    if (isStaff) api.get('/employees', { params: { pageSize: 200 } }).then((res) => setEmployees(res.data.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeIdFilter]);

  const openNew = () => {
    setForm({ employeeId: isStaff ? '' : user?.employee?.id || '', timeOffTypeId: '', startDate: '', endDate: '', reason: '' });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/timeoff/requests', form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit request');
    }
  };

  const decide = async (id, decision) => {
    await api.put(`/timeoff/requests/${id}/decision`, { decision });
    load();
  };

  return (
    <div>
      <PageHeader
        title="Time Off Requests"
        subtitle="Requests support a simple approval flow."
        actions={
          <button className="btn-primary flex items-center gap-1" onClick={openNew}>
            <Plus size={16} /> New Request
          </button>
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Status</th>
              {isStaff && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="font-medium text-gray-800">{r.employee?.name}</td>
                <td>{r.timeOffType?.name}</td>
                <td>{new Date(r.startDate).toLocaleDateString()}</td>
                <td>{new Date(r.endDate).toLocaleDateString()}</td>
                <td>{r.duration} day(s)</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                {isStaff && (
                  <td>
                    {r.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <button className="text-green-600 hover:text-green-800" onClick={() => decide(r.id, 'APPROVED')} title="Approve">
                          <Check size={16} />
                        </button>
                        <button className="text-red-500 hover:text-red-700" onClick={() => decide(r.id, 'REFUSED')} title="Refuse">
                          <Ban size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No time off requests found.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Time Off Request</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {isStaff && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                  <select required className="input" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
                    <option value="">Select employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time Off Type</label>
                <select required className="input" value={form.timeOffTypeId} onChange={(e) => setForm((f) => ({ ...f, timeOffTypeId: e.target.value }))}>
                  <option value="">Select type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input required type="date" className="input" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input required type="date" className="input" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
                <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn-primary w-full">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
