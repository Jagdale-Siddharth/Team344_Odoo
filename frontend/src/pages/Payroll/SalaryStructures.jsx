import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import PayrollTabs from '../../components/PayrollTabs';
import { useAuth } from '../../context/AuthContext';

export default function SalaryStructures() {
  const { hasRole } = useAuth();
  const canWrite = hasRole('ADMIN', 'HR_PAYROLL_MANAGER');
  const [structures, setStructures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = () => api.get('/payroll/structures').then((res) => setStructures(res.data));
  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/payroll/structures', form);
    setShowForm(false);
    setForm({ name: '', description: '' });
    load();
  };

  return (
    <div>
      <PayrollTabs />
      <PageHeader
        title="Salary Structures"
        subtitle="Containers for organized collections of Salary Rules."
        actions={
          canWrite && (
            <button className="btn-primary flex items-center gap-1" onClick={() => setShowForm(true)}>
              <Plus size={16} /> New Structure
            </button>
          )
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {structures.map((s) => (
          <Link key={s.id} to={`/payroll/structures/${s.id}`} className="card p-4 hover:shadow-md transition-shadow">
            <p className="font-medium text-gray-800">{s.name}</p>
            <p className="text-xs text-gray-500 mt-1">{s.description}</p>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>{s._count?.rules ?? 0} rules</span>
              <span>{s._count?.contracts ?? 0} contracts</span>
            </div>
          </Link>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-md w-full max-w-md p-6 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Salary Structure</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary w-full">
                Create Structure
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
