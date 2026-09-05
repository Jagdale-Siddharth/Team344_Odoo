import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '../components/UI/Button';
import { FormInput } from '../components/UI/FormInput';
import { Alert } from '../components/UI/Alert';
import { Spinner } from '../components/UI/Spinner';
import { Building2, Briefcase, Plus, Edit2, CheckCircle, XCircle, Filter, Search, X } from 'lucide-react';

export const DepartmentsPage = () => {
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'positions'
  const [departments, setDepartments] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Search
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // null for create
  const [deptForm, setDeptForm] = useState({ department_name: '', description: '', is_active: true });
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // null for create
  const [jobForm, setJobForm] = useState({ department_id: '', title: '', description: '', is_active: true });
  const [jobSubmitting, setJobSubmitting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptRes, jobRes] = await Promise.all([
        api.get('/departments'),
        api.get('/job-positions'),
      ]);
      if (deptRes.data.success) {
        setDepartments(deptRes.data.departments || []);
      }
      if (jobRes.data.success) {
        setJobPositions(jobRes.data.jobPositions || []);
      }
    } catch (err) {
      console.error('Failed to load HR master data:', err);
      setError(err.response?.data?.message || 'Failed to load master data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Department Modal Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptForm({ department_name: '', description: '', is_active: true });
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      department_name: dept.department_name,
      description: dept.description || '',
      is_active: dept.is_active,
    });
    setDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setDeptSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (editingDept) {
        const res = await api.put(`/departments/${editingDept.id}`, deptForm);
        if (res.data.success) {
          setSuccessMsg(`Department "${deptForm.department_name}" updated successfully.`);
        }
      } else {
        const res = await api.post('/departments', deptForm);
        if (res.data.success) {
          setSuccessMsg(`Department "${deptForm.department_name}" created successfully.`);
        }
      }
      setDeptModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setDeptSubmitting(false);
    }
  };

  // Job Position Modal Handlers
  const handleOpenCreateJob = () => {
    setEditingJob(null);
    const defaultDept = selectedDeptFilter || (departments[0]?.id || '');
    setJobForm({ department_id: defaultDept, title: '', description: '', is_active: true });
    setJobModalOpen(true);
  };

  const handleOpenEditJob = (job) => {
    setEditingJob(job);
    setJobForm({
      department_id: job.department_id,
      title: job.title,
      description: job.description || '',
      is_active: job.is_active,
    });
    setJobModalOpen(true);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setJobSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (editingJob) {
        const res = await api.put(`/job-positions/${editingJob.id}`, jobForm);
        if (res.data.success) {
          setSuccessMsg(`Job position "${jobForm.title}" updated successfully.`);
        }
      } else {
        const res = await api.post('/job-positions', jobForm);
        if (res.data.success) {
          setSuccessMsg(`Job position "${jobForm.title}" created successfully.`);
        }
      }
      setJobModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save job position.');
    } finally {
      setJobSubmitting(false);
    }
  };

  // Filtered lists
  const filteredDepartments = departments.filter((d) =>
    d.department_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredJobPositions = jobPositions.filter((j) => {
    const matchesDept = selectedDeptFilter ? j.department_id === selectedDeptFilter : true;
    const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.department?.department_name && j.department.department_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-400" />
            HR Master Data
          </h1>
          <p className="text-sm text-slate-400">
            Manage organizational departments and job positions for PeoplePay360
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => { setActiveTab('departments'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2 transition-all ${
              activeTab === 'departments'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments ({departments.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('positions'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-2 transition-all ${
              activeTab === 'positions'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Positions ({jobPositions.length})</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Control Bar: Search & Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-grow max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={activeTab === 'departments' ? "Search departments..." : "Search positions..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {activeTab === 'positions' && (
            <div className="flex items-center gap-2 min-w-[200px]">
              <Filter className="w-4 h-4 text-indigo-400" />
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          {activeTab === 'departments' ? (
            <Button variant="primary" size="sm" onClick={handleOpenCreateDept} className="flex items-center space-x-1.5">
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleOpenCreateJob} className="flex items-center space-x-1.5">
              <Plus className="w-4 h-4" />
              <span>Add Position</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400 font-medium">Loading HR master data...</p>
        </div>
      ) : activeTab === 'departments' ? (
        /* DEPARTMENTS TABLE */
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Department Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center">Positions</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No departments found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xs">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>{dept.department_name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-md truncate">
                      {dept.description || <span className="text-slate-600 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {dept.positionsCount ?? 0} positions
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dept.is_active ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-500">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEditDept(dept)} className="p-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* JOB POSITIONS TABLE */
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Position Title</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredJobPositions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No job positions found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredJobPositions.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center text-xs">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <span>{job.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-indigo-300">
                        {job.department?.department_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-md truncate">
                      {job.description || <span className="text-slate-600 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {job.is_active ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-500">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEditJob(job)} className="p-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DEPARTMENT CREATE/EDIT MODAL */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={() => setDeptModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeptSubmit} className="space-y-4 pt-2">
              <FormInput
                label="Department Name"
                id="department_name"
                name="department_name"
                value={deptForm.department_name}
                onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
                placeholder="e.g. Engineering"
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Department responsibilities and scope..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="dept_is_active"
                  checked={deptForm.is_active}
                  onChange={(e) => setDeptForm({ ...deptForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded bg-slate-900 border-slate-800"
                />
                <label htmlFor="dept_is_active" className="text-xs font-medium text-slate-300">
                  Active Department
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setDeptModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={deptSubmitting}>
                  {editingDept ? 'Save Changes' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOB POSITION CREATE/EDIT MODAL */}
      {jobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl space-y-4 border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-400" />
                {editingJob ? 'Edit Job Position' : 'Create Job Position'}
              </h3>
              <button onClick={() => setJobModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJobSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Department *
                </label>
                <select
                  required
                  value={jobForm.department_id}
                  onChange={(e) => setJobForm({ ...jobForm, department_id: e.target.value })}
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

              <FormInput
                label="Position Title"
                id="title"
                name="title"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                placeholder="e.g. Lead Full Stack Developer"
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Key responsibilities and qualifications..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="job_is_active"
                  checked={jobForm.is_active}
                  onChange={(e) => setJobForm({ ...jobForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded bg-slate-900 border-slate-800"
                />
                <label htmlFor="job_is_active" className="text-xs font-medium text-slate-300">
                  Active Position
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setJobModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={jobSubmitting}>
                  {editingJob ? 'Save Changes' : 'Create Position'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
