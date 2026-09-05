import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { FormInput } from '../components/UI/FormInput';
import { Alert } from '../components/UI/Alert';
import { Spinner } from '../components/UI/Spinner';
import { Calendar, Plus, Edit2, Search, Filter, CheckCircle, XCircle, Clock, Eye, X, Database, ShieldAlert, Cpu } from 'lucide-react';

const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

const DEFAULT_DAYS = [
  { day_of_week: 1, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
  { day_of_week: 2, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
  { day_of_week: 3, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
  { day_of_week: 4, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
  { day_of_week: 5, is_working: true, start_time: '09:00', end_time: '18:00', break_minutes: 60 },
  { day_of_week: 6, is_working: false, start_time: '09:00', end_time: '17:00', break_minutes: 0 },
  { day_of_week: 7, is_working: false, start_time: '09:00', end_time: '17:00', break_minutes: 0 },
];

export const WorkingSchedulesPage = () => {
  const { user, isAdmin, isHRAdmin, isSystemAdmin } = useAuth();
  const canManage = isAdmin || isSystemAdmin || isHRAdmin;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSched, setEditingSched] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewingSched, setViewingSched] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('WEEKLY');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDays, setFormDays] = useState(DEFAULT_DAYS);

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/working-schedules');
      if (res.data.success) {
        setSchedules(res.data.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load working schedules:', err);
      setError(err.response?.data?.message || 'Failed to load working schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenCreate = () => {
    setEditingSched(null);
    setFormName('');
    setFormType('WEEKLY');
    setFormIsActive(true);
    setFormDays(DEFAULT_DAYS);
    setModalOpen(true);
  };

  const handleOpenEdit = (sched) => {
    setEditingSched(sched);
    setFormName(sched.schedule_name || '');
    setFormType(sched.schedule_type || 'WEEKLY');
    setFormIsActive(sched.is_active !== undefined ? sched.is_active : true);

    // Map existing schedule lines to 7 days
    const linesMap = new Map((sched.lines || []).map((l) => [l.day_of_week, l]));
    const mappedDays = [1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
      const existingLine = linesMap.get(dayNum);
      if (existingLine) {
        return {
          day_of_week: dayNum,
          is_working: true,
          start_time: existingLine.start_time || '09:00',
          end_time: existingLine.end_time || '18:00',
          break_minutes: existingLine.break_minutes || 0,
        };
      }
      return {
        day_of_week: dayNum,
        is_working: false,
        start_time: '09:00',
        end_time: '18:00',
        break_minutes: 0,
      };
    });

    setFormDays(mappedDays);
    setModalOpen(true);
  };

  const handleOpenView = (sched) => {
    setViewingSched(sched);
    setViewModalOpen(true);
  };

  const handleDayChange = (dayNum, field, val) => {
    setFormDays((prev) =>
      prev.map((d) => (d.day_of_week === dayNum ? { ...d, [field]: val } : d))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const activeLines = formDays.filter((d) => d.is_working);
    if (activeLines.length === 0) {
      setError('Please select at least one active working day.');
      setSubmitting(false);
      return;
    }

    const payload = {
      schedule_name: formName,
      schedule_type: formType,
      is_active: formIsActive,
      lines: formDays.map((d) => ({
        day_of_week: d.day_of_week,
        is_working: d.is_working,
        start_time: d.start_time,
        end_time: d.end_time,
        break_minutes: Number(d.break_minutes) || 0,
      })),
    };

    try {
      if (editingSched) {
        const res = await api.put(`/working-schedules/${editingSched.id}`, payload);
        if (res.data.success) {
          setSuccessMsg(`Schedule "${formName}" updated successfully. Total calculated weekly hours: ${res.data.schedule.weekly_hours} hrs.`);
        }
      } else {
        const res = await api.post('/working-schedules', payload);
        if (res.data.success) {
          setSuccessMsg(`Schedule "${formName}" created successfully. Total calculated weekly hours: ${res.data.schedule.weekly_hours} hrs.`);
        }
      }
      setModalOpen(false);
      fetchSchedules();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save working schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredSchedules = schedules.filter((s) => {
    const matchesSearch = s.schedule_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === ''
        ? true
        : statusFilter === 'ACTIVE'
        ? s.is_active
        : !s.is_active;

    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalCount = schedules.length;
  const activeCount = schedules.filter((s) => s.is_active).length;
  const avgWeeklyHours =
    schedules.length > 0
      ? (schedules.reduce((acc, curr) => acc + (curr.weekly_hours || 0), 0) / schedules.length).toFixed(1)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-400" />
            Working Schedules
          </h1>
          <p className="text-sm text-slate-400">
            Define organizational shift timings and daily schedules with automated PostgreSQL weekly hour calculations
          </p>
        </div>

        {canManage && (
          <Button variant="primary" size="md" onClick={handleOpenCreate} className="flex items-center space-x-2 self-start md:self-auto shadow-lg shadow-indigo-600/30">
            <Plus className="w-4 h-4" />
            <span>Create Schedule</span>
          </Button>
        )}
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Schedules</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Shift Templates</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Weekly Work Hours</p>
            <p className="text-2xl font-extrabold text-purple-400 mt-1">{avgWeeklyHours} <span className="text-xs text-slate-400">hrs/wk</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search schedules by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-slate-400 font-medium">Loading working schedules...</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Schedule Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-center">Working Days</th>
                  <th className="px-6 py-4 text-center">Calculated Weekly Hours</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      No working schedules found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((sched) => (
                    <tr key={sched.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm">{sched.schedule_name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {sched.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-[11px] uppercase bg-slate-900 px-2 py-0.5 rounded text-slate-300 border border-slate-800">
                          {sched.schedule_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-purple-300 font-medium">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          <span>{sched.working_days_count} days / week</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-extrabold text-xs shadow-sm">
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{sched.weekly_hours} hrs / week</span>
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">PostgreSQL trigger calculated</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {sched.is_active ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-400 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="secondary" size="sm" onClick={() => handleOpenView(sched)} className="p-1.5" title="View Details">
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          </Button>
                          {canManage && (
                            <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(sched)} className="p-1.5" title="Edit Schedule">
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

      {/* CREATE / EDIT SCHEDULE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel p-6 rounded-2xl space-y-6 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                {editingSched ? 'Edit Working Schedule' : 'Create Working Schedule'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Schedule Name *"
                    id="schedule_name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Standard 40 Hours Shift"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Status
                  </label>
                  <select
                    value={formIsActive ? 'true' : 'false'}
                    onChange={(e) => setFormIsActive(e.target.value === 'true')}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="true">ACTIVE</option>
                    <option value="false">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Weekly Day Timings Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Weekly Shift Configuration (Mon – Sun)
                  </h4>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Database className="w-3 h-3 text-purple-400" />
                    Hours calculated by PostgreSQL engine
                  </span>
                </div>

                <div className="space-y-2">
                  {formDays.map((day) => (
                    <div
                      key={day.day_of_week}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        day.is_working ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-950/50 border-slate-900/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-[140px]">
                        <input
                          type="checkbox"
                          id={`day-${day.day_of_week}`}
                          checked={day.is_working}
                          onChange={(e) => handleDayChange(day.day_of_week, 'is_working', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                        />
                        <label htmlFor={`day-${day.day_of_week}`} className="text-xs font-semibold text-white cursor-pointer select-none">
                          {DAY_NAMES[day.day_of_week]}
                        </label>
                      </div>

                      {day.is_working ? (
                        <div className="grid grid-cols-3 gap-2 flex-grow max-w-md text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Start Time</span>
                            <input
                              type="time"
                              value={day.start_time}
                              onChange={(e) => handleDayChange(day.day_of_week, 'start_time', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">End Time</span>
                            <input
                              type="time"
                              value={day.end_time}
                              onChange={(e) => handleDayChange(day.day_of_week, 'end_time', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Break (mins)</span>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={day.break_minutes}
                              onChange={(e) => handleDayChange(day.day_of_week, 'break_minutes', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic flex-grow text-center">
                          Off Day (Non-Working)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Database calculation note */}
              <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/20 text-xs text-indigo-300 flex items-start space-x-2.5">
                <Database className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="font-semibold text-white">Database Verification Notice: </strong>
                  Upon saving, weekly total hours are automatically computed and persisted by PostgreSQL triggers (<code className="font-mono text-indigo-200">recalc_weekly_hours()</code>). Frontend calculations are not used for business integrity.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                  {editingSched ? 'Save Schedule Changes' : 'Create Working Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SCHEDULE DETAILS MODAL */}
      {viewModalOpen && viewingSched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl glass-panel p-6 rounded-2xl space-y-6 border border-slate-800 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{viewingSched.schedule_name}</h3>
                <span className="text-xs text-indigo-400 font-mono">ID: {viewingSched.id} • {viewingSched.schedule_type}</span>
              </div>
              <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Weekly Hours Badge */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Total Weekly Work Duration</span>
                <span className="text-2xl font-extrabold text-indigo-400">{viewingSched.weekly_hours} <span className="text-xs text-slate-300">Hours / Week</span></span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  PostgreSQL Calculated
                </span>
                <span className="text-[10px] text-slate-500 mt-1">trg_recalc_weekly_hours()</span>
              </div>
            </div>

            {/* Days Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Day-by-Day Shift Timings</h4>
              <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Day</th>
                      <th className="px-4 py-2.5">Timings</th>
                      <th className="px-4 py-2.5 text-center">Break</th>
                      <th className="px-4 py-2.5 text-right">Worked Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                      const line = (viewingSched.lines || []).find((l) => l.day_of_week === dayNum);
                      return (
                        <tr key={dayNum} className="hover:bg-slate-900/40">
                          <td className="px-4 py-2.5 font-semibold text-white">{DAY_NAMES[dayNum]}</td>
                          <td className="px-4 py-2.5">
                            {line ? (
                              <span className="font-mono text-indigo-300">
                                {line.start_time} – {line.end_time}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Off Day</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {line ? `${line.break_minutes} mins` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-purple-300">
                            {line ? `${line.worked_hours} hrs` : '0 hrs'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
