import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';

export default function NewPayrun() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [scope, setScope] = useState({ name: '', salaryStructureId: '', employeeType: '', periodStart: '', periodEnd: '' });
  const [eligible, setEligible] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/payroll/structures').then((res) => setStructures(res.data));
  }, []);

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.get('/payroll/eligible-employees', {
        params: {
          employeeType: scope.employeeType || undefined,
          periodStart: scope.periodStart,
          periodEnd: scope.periodEnd,
        },
      });
      setEligible(res.data);
      setSelected(new Set(res.data.map((e) => e.id)));
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load eligible employees');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/payroll/payruns', {
        name: scope.name,
        periodStart: scope.periodStart,
        periodEnd: scope.periodEnd,
        employeeType: scope.employeeType || null,
        salaryStructureId: scope.salaryStructureId,
        employeeIds: Array.from(selected),
      });
      navigate(`/payroll/payruns/${res.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create payrun');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Pay Run" subtitle={step === 1 ? 'Step 1 of 2: Define scope and period' : 'Step 2 of 2: Select employee records'} />

      {step === 1 && (
        <form onSubmit={handleContinue} className="card p-6 max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pay Run Name</label>
            <input required className="input" value={scope.name} onChange={(e) => setScope((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. February 2026" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Salary Structure</label>
            <select required className="input" value={scope.salaryStructureId} onChange={(e) => setScope((s) => ({ ...s, salaryStructureId: e.target.value }))}>
              <option value="">Select structure</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee Type (optional)</label>
            <select className="input" value={scope.employeeType} onChange={(e) => setScope((s) => ({ ...s, employeeType: e.target.value }))}>
              <option value="">All Types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period Start</label>
              <input required type="date" className="input" value={scope.periodStart} onChange={(e) => setScope((s) => ({ ...s, periodStart: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Period End</label>
              <input required type="date" className="input" value={scope.periodEnd} onChange={(e) => setScope((s) => ({ ...s, periodEnd: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div>
          <div className="card overflow-x-auto mb-4">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === eligible.length && eligible.length > 0}
                      onChange={(e) => setSelected(e.target.checked ? new Set(eligible.map((x) => x.id)) : new Set())}
                    />
                  </th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Worked Hours</th>
                  <th>Wage</th>
                </tr>
              </thead>
              <tbody>
                {eligible.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                    </td>
                    <td className="font-medium text-gray-800">{e.name}</td>
                    <td>{e.department}</td>
                    <td>{e.workedHours ?? '-'}</td>
                    <td>₹{e.wage.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {eligible.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No eligible employees found for this scope.</p>}
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn-primary" disabled={selected.size === 0 || loading} onClick={handleCreate}>
              {loading ? 'Creating...' : `Create Payrun (${selected.size} employees)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
