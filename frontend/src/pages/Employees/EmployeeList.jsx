import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, LayoutGrid, Plus, Search } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

export default function EmployeeList() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(...HR_WRITE_ROLES);
  const [view, setView] = useState('list');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/employees', { params: { search, department, pageSize: 200 } });
    setItems(res.data.items);
    setTotal(res.data.total);
    setLoading(false);
  };

  useEffect(() => {
    api.get('/employees/departments').then((res) => setDepartments(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, department]);

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${total} employee${total === 1 ? '' : 's'}`}
        actions={
          canWrite && (
            <Link to="/employees/new" className="btn-primary flex items-center gap-1">
              <Plus size={16} /> New
            </Link>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-48" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button
            className={`p-2 ${view === 'kanban' ? 'bg-odoo text-white' : 'bg-white text-gray-600'}`}
            onClick={() => setView('kanban')}
            title="Kanban view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`p-2 ${view === 'list' ? 'bg-odoo text-white' : 'bg-white text-gray-600'}`}
            onClick={() => setView('list')}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {items.map((e) => (
            <Link to={`/employees/${e.id}`} key={e.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                  style={{ backgroundColor: e.avatarColor || '#714B67' }}
                >
                  {e.name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{e.name}</p>
                  <p className="text-xs text-gray-500 truncate">{e.jobPosition}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">{e.department}</span>
                <StatusBadge status={e.status} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Work Email</th>
                <th>Department</th>
                <th>Job Position</th>
                <th>Manager</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => (window.location.href = `/employees/${e.id}`)}>
                  <td className="font-medium text-gray-800">{e.name}</td>
                  <td>{e.workEmail}</td>
                  <td>{e.department}</td>
                  <td>{e.jobPosition}</td>
                  <td>{e.manager?.name || '-'}</td>
                  <td>{e.employeeType?.replaceAll('_', ' ')}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
