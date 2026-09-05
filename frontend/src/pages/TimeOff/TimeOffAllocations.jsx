import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

export default function TimeOffAllocations() {
  const [params] = useSearchParams();
  const employeeIdFilter = params.get('employeeId') || '';
  const { hasRole } = useAuth();
  const canWrite = hasRole(...HR_WRITE_ROLES);

  const [allocations, setAllocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: '', timeOffTypeId: '', allocated: '', validFrom: '', validTo: '', status: 'APPROVED' });

  const load = () => api.get('/timeoff/allocations', { params: { employeeId: employeeIdFilter || undefined } }).then((res) => setAllocations(res.data));

  useEffect(() => {
    load();
    api.get('/timeoff/types').then((res) => setTypes(res.data));
    api.get('/employees', { params: { pageSize: 200 } }).then((res) => setEmployees(res.data.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeIdFilter]);

  const openNew = () => {
    setForm({ employeeId: employeeIdFilter || '', timeOffTypeId: '', allocated: '', validFrom: '', validTo: '', status: 'APPROVED' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/timeoff/allocations', { ...form, allocated: Number(form.allocated), validTo: form.validTo || null });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Allocations"
        subtitle="Employee leave balances. Approved requests automatically consume these."
        actions={
          canWrite && (
            <button className="btn-primary flex items-center gap-1" onClick={openNew}>
              <Plus size={16} /> New Allocation
            </button>
          )
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Allocated</th>
              <th>Taken</th>
              <th>Remaining</th>
              <th>Valid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.id}>
                <td className="font-medium text-gray-800">{a.employee?.name}</td>
                <td>{a.timeOffType?.name}</td>
                <td>{a.allocated}</td>
                <td>{a.taken}</td>
                <td>{a.remaining}</td>
                <td>
                  {new Date(a.validFrom).toLocaleDateString()} {a.validTo ? `- ${new Date(a.validTo).toLocaleDateString()}` : ''}
                </td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {allocations.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No allocations found.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Allocation</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
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
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Allocated (days)</label>
                <input required type="number" min="0" className="input" value={form.allocated} onChange={(e) => setForm((f) => ({ ...f, allocated: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valid From</label>
                  <input required type="date" className="input" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valid To</label>
                  <input type="date" className="input" value={form.validTo} onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Create Allocation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
