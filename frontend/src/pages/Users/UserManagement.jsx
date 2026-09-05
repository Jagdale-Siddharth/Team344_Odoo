import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

const ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'];
const EMPTY = { name: '', email: '', password: '', role: 'EMPLOYEE', employeeId: '' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = () => api.get('/users').then((res) => setUsers(res.data));
  useEffect(() => {
    load();
    api.get('/employees', { params: { pageSize: 200 } }).then((res) => setEmployees(res.data.items));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', { ...form, employeeId: form.employeeId || null });
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create user');
    }
  };

  const updateRole = async (id, role) => {
    await api.put(`/users/${id}`, { role });
    load();
  };

  const toggleActive = async (id, isActive) => {
    await api.put(`/users/${id}`, { isActive: !isActive });
    load();
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create accounts, assign roles, and control access (Admin only)."
        actions={
          <button className="btn-primary flex items-center gap-1" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create User / Assign Role
          </button>
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Linked Employee</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-gray-800">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.employee?.name || '-'}</td>
                <td>
                  <select className="input py-1" value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </td>
                <td>
                  <button className="text-odoo text-xs font-medium" onClick={() => toggleActive(u.id, u.isActive)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
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
            <h2 className="font-semibold text-gray-800 mb-4">Create / Edit User</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input required type="email" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input required type="password" minLength={6} className="input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link to Employee (optional)</label>
                <select className="input" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
                  <option value="">None</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn-primary w-full">
                Create User
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
