import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

export default function PayslipDetail() {
  const { id } = useParams();
  const [payslip, setPayslip] = useState(null);

  useEffect(() => {
    api.get(`/payroll/payslips/${id}`).then((res) => setPayslip(res.data));
  }, [id]);

  if (!payslip) return <p className="text-gray-400 text-sm">Loading...</p>;

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title={`Payslip - ${payslip.employee?.name}`}
          subtitle={`${new Date(payslip.periodStart).toLocaleDateString()} - ${new Date(payslip.periodEnd).toLocaleDateString()}`}
          actions={
            <>
              <Link to="/payroll/payslips" className="btn-secondary">
                Back
              </Link>
              <button className="btn-primary flex items-center gap-1" onClick={() => window.print()}>
                <Printer size={16} /> Print Payslip
              </button>
            </>
          }
        />
      </div>

      <div className="card p-8 max-w-2xl" id="payslip-print">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-odoo">PeoplePay360</h2>
            <p className="text-xs text-gray-500">Payslip for {new Date(payslip.periodStart).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
          <StatusBadge status={payslip.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-gray-400 text-xs">Employee</p>
            <p className="font-medium">{payslip.employee?.name}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Department</p>
            <p className="font-medium">{payslip.employee?.department}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Salary Structure</p>
            <p className="font-medium">{payslip.salaryStructure?.name}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Worked Days</p>
            <p className="font-medium">{payslip.workedDays}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-400 uppercase">
              <th className="py-2">Component</th>
              <th className="py-2">Category</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payslip.lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">{l.name}</td>
                <td className="py-2 text-gray-500">{l.category}</td>
                <td className={`py-2 text-right ${l.amount < 0 ? 'text-red-600' : ''}`}>
                  ₹{Math.abs(l.amount).toLocaleString()} {l.amount < 0 ? '-' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-sm ml-auto max-w-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Gross Salary</span>
            <span className="font-medium">₹{payslip.gross.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Deductions</span>
            <span className="font-medium text-red-600">-₹{payslip.deductions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="font-semibold text-gray-800">Net Salary</span>
            <span className="font-bold text-odoo text-lg">₹{payslip.net.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {Array.isArray(payslip.warnings) && payslip.warnings.length > 0 && (
        <div className="card p-4 max-w-2xl mt-4 border-amber-200 bg-amber-50 print:hidden">
          <p className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-1">
            <AlertTriangle size={14} /> This payslip has warnings
          </p>
          <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
            {payslip.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
