import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, X, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../context/AuthContext';

const EMPTY = {
  name: '',
  code: '',
  category: 'ALLOWANCE',
  sequence: 10,
  computationMethod: 'FIXED',
  amount: '',
  percentage: '',
  percentageBase: 'BASIC',
  formula: '',
};

export default function SalaryStructureDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'HR_PAYROLL_MANAGER');
  const [structure, setStructure] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get(`/payroll/structures/${id}`).then((res) => setStructure(res.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openNew = () => {
    setForm(EMPTY);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      structureId: id,
      sequence: Number(form.sequence),
      amount: form.amount !== '' ? Number(form.amount) : null,
      percentage: form.percentage !== '' ? Number(form.percentage) : null,
    };
    await api.post('/payroll/rules', payload);
    setShowForm(false);
    load();
  };

  const removeRule = async (ruleId) => {
    await api.delete(`/payroll/rules/${ruleId}`);
    load();
  };

  if (!structure) return <p className="text-gray-400 text-sm">Loading...</p>;

  return (
    <div>
      <PageHeader
        title={structure.name}
        subtitle={structure.description}
        actions={
          <>
            <Link to="/payroll/structures" className="btn-secondary">
              Back
            </Link>
            {canWrite && (
              <button className="btn-primary flex items-center gap-1" onClick={openNew}>
                <Plus size={16} /> Add Rule
              </button>
            )}
          </>
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Seq</th>
              <th>Name</th>
              <th>Code</th>
              <th>Category</th>
              <th>Computation</th>
              <th>Value</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {structure.rules.map((r) => (
              <tr key={r.id}>
                <td>{r.sequence}</td>
                <td className="font-medium text-gray-800">{r.name}</td>
                <td>{r.code}</td>
                <td>{r.category}</td>
                <td>{r.computationMethod}</td>
                <td>
                  {r.computationMethod === 'FIXED' && `₹${r.amount ?? 0}`}
                  {r.computationMethod === 'PERCENTAGE' && `${r.percentage}% of ${r.percentageBase}`}
                  {r.computationMethod === 'FORMULA' && <code className="text-xs">{r.formula}</code>}
                </td>
                {canWrite && (
                  <td>
                    <button className="text-red-400 hover:text-red-600" onClick={() => removeRule(r.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {structure.rules.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No rules configured yet.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4 overflow-y-auto">
          <div className="bg-white rounded-md w-full max-w-lg p-6 relative my-8">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Salary Rule</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                  <input required className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="BASIC">Basic</option>
                    <option value="ALLOWANCE">Allowance</option>
                    <option value="DEDUCTION">Deduction</option>
                    <option value="GROSS">Gross</option>
                    <option value="NET">Net</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sequence</label>
                  <input type="number" className="input" value={form.sequence} onChange={(e) => setForm((f) => ({ ...f, sequence: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Computation Method</label>
                <select className="input" value={form.computationMethod} onChange={(e) => setForm((f) => ({ ...f, computationMethod: e.target.value }))}>
                  <option value="FIXED">Fixed Amount</option>
                  <option value="PERCENTAGE">Percentage of Base</option>
                  <option value="FORMULA">Formula</option>
                </select>
              </div>

              {form.computationMethod === 'FIXED' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
                  <input type="number" className="input" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
              )}

              {form.computationMethod === 'PERCENTAGE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Percentage (%)</label>
                    <input type="number" className="input" value={form.percentage} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Base</label>
                    <select className="input" value={form.percentageBase} onChange={(e) => setForm((f) => ({ ...f, percentageBase: e.target.value }))}>
                      <option value="BASIC">Basic</option>
                      <option value="GROSS">Gross (so far)</option>
                      <option value="WAGE">Contract Wage</option>
                    </select>
                  </div>
                </div>
              )}

              {form.computationMethod === 'FORMULA' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Formula</label>
                  <input className="input" placeholder="e.g. basic * 0.12" value={form.formula} onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">Available vars: wage, basic, gross, worked_days, total_days, and any earlier rule code (lowercase).</p>
                </div>
              )}

              <button type="submit" className="btn-primary w-full">
                Add Rule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
