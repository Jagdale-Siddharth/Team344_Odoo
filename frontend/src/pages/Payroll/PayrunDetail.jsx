import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

export default function PayrunDetail() {
  const { id } = useParams();
  const [payrun, setPayrun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => api.get(`/payroll/payruns/${id}`).then((res) => setPayrun(res.data));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAction = async (action) => {
    setBusy(true);
    setMessage('');
    try {
      const res = await api.post(`/payroll/payruns/${id}/${action}`);
      if (action === 'send-payslips') setMessage(res.data.message);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!payrun) return <p className="text-gray-400 text-sm">Loading...</p>;

  const flaggedPayslips = payrun.payslips.filter((p) => Array.isArray(p.warnings) && p.warnings.length > 0);
  const warningCount = flaggedPayslips.length;

  return (
    <div>
      <PageHeader
        title={payrun.name}
        subtitle={`${new Date(payrun.periodStart).toLocaleDateString()} - ${new Date(payrun.periodEnd).toLocaleDateString()} · ${payrun.salaryStructure?.name}`}
        actions={
          <Link to="/payroll/payruns" className="btn-secondary">
            Back
          </Link>
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <StatusBadge status={payrun.status} />
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-amber-600 text-sm">
            <AlertTriangle size={14} /> {warningCount} payslip(s) have warnings
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <button disabled={busy} className="btn-secondary" onClick={() => runAction('compute')}>
            Compute
          </button>
          <button disabled={busy || payrun.status === 'DRAFT'} className="btn-secondary" onClick={() => runAction('validate')}>
            Validate
          </button>
          <button disabled={busy || payrun.status !== 'VALIDATED'} className="btn-secondary" onClick={() => runAction('mark-paid')}>
            Mark Paid
          </button>
          <button disabled={busy} className="btn-primary" onClick={() => runAction('send-payslips')}>
            Send Payslips
          </button>
        </div>
      </div>

      {message && <p className="text-sm text-green-700 mb-3">{message}</p>}

      {warningCount > 0 && (
        <div className="card p-4 mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
            <AlertTriangle size={14} /> {warningCount} payslip(s) need attention
          </p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            {flaggedPayslips.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.employee?.name}:</span> {p.warnings.join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Basic</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Status</th>
              <th>Warnings</th>
            </tr>
          </thead>
          <tbody>
            {payrun.payslips.map((p) => (
              <tr key={p.id} className="cursor-pointer" onClick={() => (window.location.href = `/payroll/payslips/${p.id}`)}>
                <td className="font-medium text-gray-800">{p.employee?.name}</td>
                <td>{p.employee?.department}</td>
                <td>₹{p.basic.toLocaleString()}</td>
                <td>₹{p.allowances.toLocaleString()}</td>
                <td>₹{p.deductions.toLocaleString()}</td>
                <td>₹{p.gross.toLocaleString()}</td>
                <td className="font-semibold">₹{p.net.toLocaleString()}</td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
                <td>
                  {Array.isArray(p.warnings) && p.warnings.length > 0 ? (
                    <span
                      className="text-amber-600 text-xs flex items-start gap-1 max-w-xs"
                      title={p.warnings.join('; ')}
                    >
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                      <span>{p.warnings.join('; ')}</span>
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
