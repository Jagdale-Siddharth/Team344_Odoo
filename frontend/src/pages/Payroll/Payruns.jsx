import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

export default function Payruns() {
  const [payruns, setPayruns] = useState([]);

  useEffect(() => {
    api.get('/payroll/payruns').then((res) => setPayruns(res.data));
  }, []);

  return (
    <div>
      <PageHeader
        title="Payruns"
        subtitle="A Payrun represents payroll processing for a particular period."
        actions={
          <Link to="/payroll/payruns/new" className="btn-primary flex items-center gap-1">
            <Plus size={16} /> New Pay Run
          </Link>
        }
      />

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Period</th>
              <th>Structure</th>
              <th>Payslips</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payruns.map((p) => (
              <tr key={p.id} className="cursor-pointer" onClick={() => (window.location.href = `/payroll/payruns/${p.id}`)}>
                <td className="font-medium text-gray-800">{p.name}</td>
                <td>
                  {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                </td>
                <td>{p.salaryStructure?.name}</td>
                <td>{p._count?.payslips ?? 0}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payruns.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No payruns yet.</p>}
      </div>
    </div>
  );
}
