import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

const EMPTY = { name: '', employeeId: '', department: '', jobPosition: '', startDate: '', endDate: '', wage: '', salaryStructureId: '', status: 'RUNNING' };

export default function ContractList() {
  const [params] = useSearchParams();
  const employeeIdFilter = params.get('employeeId') || '';
  const { hasRole } = useAuth();
  const canWrite = hasRole(...HR_WRITE_ROLES);

  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = () => api.get('/contracts', { params: { employeeId: employeeIdFilter || undefined } }).then((res) => setContracts(res.data));

  useEffect(() => {
    load();
    api.get('/employees', { params: { pageSize: 200 } }).then((res) => setEmployees(res.data.items));
    // structures endpoint requires payroll role; ignore failure for HR_MANAGER
    api.get('/payroll/structures').then((res) => setStructures(res.data)).catch(() => setStructures([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeIdFilter]);

  const openNew = () => {
    setForm({ ...EMPTY, employeeId: employeeIdFilter || '' });
    setError('');
    setShowForm(true);
  };

  const handleEmployeeSelect = (e) => {
    const emp = employees.find((x) => x.id === e.target.value);
    setForm((f) => ({ ...f, employeeId: e.target.value, department: emp?.department || '', jobPosition: emp?.jobPosition || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/contracts', { ...form, wage: Number(form.wage), endDate: form.endDate || null, salaryStructureId: form.salaryStructureId || null });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create contract');
    }
  };

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Historical employment contracts. Payroll uses only the active, period-specific contract."
        actions={
          canWrite && (
            <button className="btn-primary flex items-center gap-1" onClick={openNew}>
              <Plus size={16} /> New
            </button>
          )
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Contract Name</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Start</th>
              <th>End</th>
              <th>Wage</th>
              <th>Structure</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id}>
                <td>{c.reference}</td>
                <td className="font-medium text-gray-800">{c.name || '-'}</td>
                <td>{c.employee?.name}</td>
                <td>{c.department}</td>
                <td>{new Date(c.startDate).toLocaleDateString()}</td>
                <td>{c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}</td>
                <td>₹{c.wage.toLocaleString()}</td>
                <td>{c.salaryStructure?.name || '-'}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contracts.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No contracts found.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-md w-full max-w-lg p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Contract</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contract Name</label>
                <input
                  required
                  className="input"
                  placeholder="e.g. Full Time Employment Contract"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                <select required className="input" value={form.employeeId} onChange={handleEmployeeSelect}>
                  <option value="">Select employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date (optional)</label>
                  <input type="date" className="input" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Wage (₹)</label>
                <input required type="number" min="0" className="input" value={form.wage} onChange={(e) => setForm((f) => ({ ...f, wage: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salary Structure</label>
                <select className="input" value={form.salaryStructureId} onChange={(e) => setForm((f) => ({ ...f, salaryStructureId: e.target.value }))}>
                  <option value="">None</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn-primary w-full">
                Create Contract
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
