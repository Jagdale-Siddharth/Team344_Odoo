import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { FormInput } from '../components/UI/FormInput';
import { Alert } from '../components/UI/Alert';
import { Spinner } from '../components/UI/Spinner';
import { Users, UserPlus, Edit2, Search, Filter, CheckCircle, XCircle, Building2, Briefcase, Eye, Mail, Phone, Calendar, CreditCard, X, ShieldAlert } from 'lucide-react';

export const EmployeesPage = () => {
  const { user, isAdmin, isHRAdmin, isSystemAdmin, isPayrollOfficer } = useAuth();
  const canManage = isAdmin || isSystemAdmin || isHRAdmin;

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewingEmp, setViewingEmp] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Form State
  const defaultForm = {
    employee_code: '',
    first_name: '',
    last_name: '',
    work_email: '',
    personal_email: '',
    phone: '',
    department_id: '',
    job_position_id: '',
    employment_type: 'FULL_TIME',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
  };
  const [form, setForm] = useState(defaultForm);

  // Fetch initial master data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, deptRes, jobRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/job-positions'),
      ]);

      if (empRes.data.success) {
        setEmployees(empRes.data.employees || []);
      }
      if (deptRes.data.success) {
        setDepartments(deptRes.data.departments || []);
      }
      if (jobRes.data.success) {
        setJobPositions(jobRes.data.jobPositions || []);
      }
    } catch (err) {
      console.error('Failed to load employee master data:', err);
      setError(err.response?.data?.message || 'Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered job positions for form dropdown
  const modalAvailablePositions = jobPositions.filter((pos) => {
    if (!form.department_id) return true;
    return pos.department_id === form.department_id;
  });

  // Filtered job positions for filter bar dropdown
  const filterAvailablePositions = jobPositions.filter((pos) => {
    if (!deptFilter) return true;
    return pos.department_id === deptFilter;
  });

  // Modal handlers
  const handleOpenCreate = () => {
    setEditingEmp(null);
    const initialDept = departments[0]?.id || '';
    const initialPos = jobPositions.find(p => p.department_id === initialDept)?.id || '';
    setForm({
      ...defaultForm,
      department_id: initialDept,
      job_position_id: initialPos,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setForm({
      employee_code: emp.employee_code || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      work_email: emp.work_email || '',
      personal_email: emp.personal_email || '',
      phone: emp.phone || '',
      department_id: emp.department_id || '',
      job_position_id: emp.job_position_id || '',
      employment_type: emp.employment_type || 'FULL_TIME',
      joining_date: emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: emp.status || 'ACTIVE',
      bank_name: emp.bank_name || '',
      bank_account_number: emp.bank_account_number || '',
      bank_ifsc_code: emp.bank_ifsc_code || '',
    });
    setModalOpen(true);
  };

  const handleOpenView = (emp) => {
    setViewingEmp(emp);
    setViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingEmp) {
        const res = await api.put(`/employees/${editingEmp.id}`, form);
        if (res.data.success) {
          setSuccessMsg(`Employee "${form.first_name} ${form.last_name}" updated successfully.`);
        }
      } else {
        const res = await api.post('/employees', form);
        if (res.data.success) {
          setSuccessMsg(`Employee "${form.first_name} ${form.last_name}" created successfully.`);
        }
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save employee profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Employees List
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.work_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter ? emp.department_id === deptFilter : true;
    const matchesPos = posFilter ? emp.job_position_id === posFilter : true;
    const matchesStatus = statusFilter ? emp.status === statusFilter : true;

    return matchesSearch && matchesDept && matchesPos && matchesStatus;
  });

  // Metrics
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const inactiveEmployeesCount = employees.filter((e) => e.status !== 'ACTIVE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            Employee Management
          </h1>
          <p className="text-sm text-slate-400">
            View, create, and manage employee profiles and department assignments in PeoplePay360
          </p>
        </div>

        {canManage && (
          <Button variant="primary" size="md" onClick={handleOpenCreate} className="flex items-center space-x-2 self-start md:self-auto shadow-lg shadow-indigo-600/30">
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </Button>
        )}
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Employees</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalEmployeesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Staff</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{activeEmployeesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inactive / On Leave</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{inactiveEmployeesCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Control Bar: Search & Multi-Filters */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 min-w-[170px]">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPosFilter(''); // Reset position filter when department changes
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          {/* Job Position Filter */}
          <div className="flex items-center gap-1.5 min-w-[170px]">
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Positions</option>
              {filterAvailablePositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="TERMINATED">TERMINATED</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400 font-medium">Loading employee records...</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Job Position</th>
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No employees match your search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-indigo-300 font-medium">
                        {emp.employee_code}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                            {emp.first_name?.[0]?.toUpperCase()}{emp.last_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{emp.full_name}</span>
                            <span className="text-[11px] text-slate-400">{emp.work_email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300 font-medium">
                          <Building2 className="w-3 h-3 text-indigo-400" />
                          <span>{emp.department?.department_name || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-purple-300 font-medium">
                          <Briefcase className="w-3 h-3 text-purple-400" />
                          <span>{emp.job_position?.title || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[11px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                          {emp.employment_type || 'FULL_TIME'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {emp.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{emp.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="secondary" size="sm" onClick={() => handleOpenView(emp)} className="p-1.5" title="View Profile">
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          </Button>
                          {canManage && (
                            <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(emp)} className="p-1.5" title="Edit Profile">
                              <Edit2 className="w-3.5 h-3.5 text-slate-300" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl space-y-6 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                {editingEmp ? 'Edit Employee Profile' : 'Add New Employee'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 border-b border-slate-800/60 pb-1">
                  1. Basic Profile &amp; Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="First Name *"
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="e.g. Rahul"
                    required
                  />
                  <FormInput
                    label="Last Name *"
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="e.g. Sharma"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Work Email *"
                    id="work_email"
                    type="email"
                    value={form.work_email}
                    onChange={(e) => setForm({ ...form, work_email: e.target.value })}
                    placeholder="rahul.sharma@peoplepay360.demo"
                    required
                  />
                  <FormInput
                    label="Employee Code"
                    id="employee_code"
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                    placeholder="Auto-generated if blank (e.g. EMP0101)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Personal Email"
                    id="personal_email"
                    type="email"
                    value={form.personal_email}
                    onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
                    placeholder="rahul.personal@email.com"
                  />
                  <FormInput
                    label="Phone Number"
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Organizational Assignment */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-slate-800/60 pb-1">
                  2. Organizational &amp; Job Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Department *
                    </label>
                    <select
                      required
                      value={form.department_id}
                      onChange={(e) => {
                        const newDept = e.target.value;
                        const firstPos = jobPositions.find(p => p.department_id === newDept)?.id || '';
                        setForm({ ...form, department_id: newDept, job_position_id: firstPos });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.department_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Job Position *
                    </label>
                    <select
                      required
                      value={form.job_position_id}
                      onChange={(e) => setForm({ ...form, job_position_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="" disabled>Select Position</option>
                      {modalAvailablePositions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Employment Type
                    </label>
                    <select
                      value={form.employment_type}
                      onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="FULL_TIME">FULL_TIME</option>
                      <option value="PART_TIME">PART_TIME</option>
                      <option value="CONTRACTOR">CONTRACTOR</option>
                      <option value="INTERN">INTERN</option>
                    </select>
                  </div>

                  <FormInput
                    label="Joining Date *"
                    id="joining_date"
                    type="date"
                    value={form.joining_date}
                    onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                    required
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="TERMINATED">TERMINATED</option>
                      <option value="ON_LEAVE">ON_LEAVE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional Payroll & Bank Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800/60 pb-1">
                  3. Bank &amp; Payroll Info (Optional)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormInput
                    label="Bank Name"
                    id="bank_name"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                  />
                  <FormInput
                    label="Account Number"
                    id="bank_account_number"
                    value={form.bank_account_number}
                    onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                    placeholder="e.g. 501002345678"
                  />
                  <FormInput
                    label="IFSC Code"
                    id="bank_ifsc_code"
                    value={form.bank_ifsc_code}
                    onChange={(e) => setForm({ ...form, bank_ifsc_code: e.target.value })}
                    placeholder="e.g. HDFC0001234"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                  {editingEmp ? 'Save Changes' : 'Create Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PROFILE MODAL */}
      {viewModalOpen && viewingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg glass-panel p-6 rounded-2xl space-y-6 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                  {viewingEmp.first_name?.[0]?.toUpperCase()}{viewingEmp.last_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{viewingEmp.full_name}</h3>
                  <p className="text-xs text-indigo-400 font-mono">{viewingEmp.employee_code}</p>
                </div>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block mb-0.5">Department</span>
                  <span className="font-semibold text-indigo-300 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {viewingEmp.department?.department_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Job Position</span>
                  <span className="font-semibold text-purple-300 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {viewingEmp.job_position?.title || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-indigo-400" /> Work Email:</span>
                  <span className="font-medium text-white">{viewingEmp.work_email}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> Personal Email:</span>
                  <span className="text-slate-300">{viewingEmp.personal_email || 'Not provided'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-400" /> Phone:</span>
                  <span className="text-slate-300">{viewingEmp.phone || 'Not provided'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-400" /> Joining Date:</span>
                  <span className="text-slate-300">
                    {viewingEmp.joining_date ? new Date(viewingEmp.joining_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-purple-400" /> Employment Type:</span>
                  <span className="font-mono text-slate-200">{viewingEmp.employment_type}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-emerald-400">{viewingEmp.status}</span>
                </div>
              </div>

              {/* Bank Details */}
              {(viewingEmp.bank_name || viewingEmp.bank_account_number) && (
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Bank Details
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Bank</span>
                      <span className="text-slate-300">{viewingEmp.bank_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Account</span>
                      <span className="text-slate-300">{viewingEmp.bank_account_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">IFSC</span>
                      <span className="text-slate-300">{viewingEmp.bank_ifsc_code || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
