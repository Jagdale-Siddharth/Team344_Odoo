import { useEffect, useState } from 'react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

export default function Payslips() {
  const [payslips, setPayslips] = useState([]);

  useEffect(() => {
    api.get('/payroll/payslips').then((res) => setPayslips(res.data));
  }, []);

  return (
    <div>
      <PageHeader title="Payslips" subtitle="All generated payslips across pay runs." />
      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Pay Run</th>
              <th>Period</th>
              <th>Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="cursor-pointer" onClick={() => (window.location.href = `/payroll/payslips/${p.id}`)}>
                <td className="font-medium text-gray-800">{p.employee?.name}</td>
                <td>{p.employee?.department}</td>
                <td>{p.payrun?.name}</td>
                <td>
                  {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                </td>
                <td className="font-semibold">₹{p.net.toLocaleString()}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payslips.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No payslips found.</p>}
      </div>
    </div>
  );
}
