import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

const EMPTY = { name: '', unit: 'DAYS', requiresAllocation: true, approvalRequired: true, affectsPayroll: false, color: '#3b82f6' };

export default function TimeOffTypes() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(...HR_WRITE_ROLES);
  const [types, setTypes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/timeoff/types').then((res) => setTypes(res.data));
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/timeoff/types', form);
    setShowForm(false);
    setForm(EMPTY);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Time Off Types"
        subtitle="Defines leave policies: units, allocation requirement, approval workflow, payroll impact."
        actions={
          canWrite && (
            <button className="btn-primary flex items-center gap-1" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Type
            </button>
          )
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>Requires Allocation</th>
              <th>Approval Required</th>
              <th>Affects Payroll</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-gray-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </td>
                <td>{t.unit}</td>
                <td>{t.requiresAllocation ? 'Yes' : 'No'}</td>
                <td>{t.approvalRequired ? 'Yes' : 'No'}</td>
                <td>{t.affectsPayroll ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Time Off Type</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                <select className="input" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                  <option value="DAYS">Days</option>
                  <option value="HOURS">Hours</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.requiresAllocation} onChange={(e) => setForm((f) => ({ ...f, requiresAllocation: e.target.checked }))} />
                Requires Allocation
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.approvalRequired} onChange={(e) => setForm((f) => ({ ...f, approvalRequired: e.target.checked }))} />
                Approval Required
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.affectsPayroll} onChange={(e) => setForm((f) => ({ ...f, affectsPayroll: e.target.checked }))} />
                Affects Payroll
              </label>
              <button type="submit" className="btn-primary w-full">
                Create Type
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
