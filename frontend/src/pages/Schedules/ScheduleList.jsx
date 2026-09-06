import { useEffect, useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/PageHeader';
import { useAuth, HR_WRITE_ROLES } from '../../context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const emptyLine = () => ({ day: 'Monday', startTime: '09:00', endTime: '18:00', breakMinutes: 60 });

export default function ScheduleList() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(...HR_WRITE_ROLES);
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('FULL_TIME');
  const [lines, setLines] = useState([emptyLine()]);
  const [selected, setSelected] = useState(null);

  const load = () => api.get('/schedules').then((res) => setSchedules(res.data));
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setName('');
    setType('FULL_TIME');
    setLines([emptyLine()]);
    setShowForm(true);
  };

  const updateLine = (idx, field, value) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/schedules', { name, type, lines });
    setShowForm(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Working Schedules"
        subtitle="Weekly patterns used by Attendance and Payroll."
        actions={
          canWrite && (
            <button className="btn-primary flex items-center gap-1" onClick={openNew}>
              <Plus size={16} /> New Schedule
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Weekly Hours</th>
                <th>Employees</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="font-medium text-gray-800">{s.name}</td>
                  <td>{s.type?.replaceAll('_', ' ')}</td>
                  <td>{s.weeklyHours}h</td>
                  <td>{s._count?.employees ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card p-4">
          {selected ? (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">{selected.name}</h3>
              <p className="text-xs text-gray-500 mb-3">Total weekly hours: {selected.weeklyHours}h</p>
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Break</th>
                    <th>Daily Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.day}</td>
                      <td>{l.startTime}</td>
                      <td>{l.endTime}</td>
                      <td>{l.breakMinutes}m</td>
                      <td className="font-medium text-gray-800">{l.dailyHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Select a schedule to view its weekly pattern.</p>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4 overflow-y-auto">
          <div className="bg-white rounded-md w-full max-w-2xl p-6 relative my-8">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
            <h2 className="font-semibold text-gray-800 mb-4">New Working Schedule</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input required className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="FLEXIBLE">Flexible</option>
                    <option value="SHIFT">Shift</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">Weekly Pattern</label>
                  <button type="button" className="text-odoo text-xs font-medium" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
                    + Add Day
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-0.5">
                    <span className="col-span-3">Day</span>
                    <span className="col-span-3">Start Time</span>
                    <span className="col-span-3">End Time</span>
                    <span className="col-span-2">Break (min)</span>
                    <span className="col-span-1"></span>
                  </div>
                  {lines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <select className="input col-span-3" value={l.day} onChange={(e) => updateLine(idx, 'day', e.target.value)}>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <input type="time" className="input col-span-3" value={l.startTime} onChange={(e) => updateLine(idx, 'startTime', e.target.value)} />
                      <input type="time" className="input col-span-3" value={l.endTime} onChange={(e) => updateLine(idx, 'endTime', e.target.value)} />
                      <input
                        type="number"
                        min="0"
                        className="input col-span-2"
                        value={l.breakMinutes}
                        onChange={(e) => updateLine(idx, 'breakMinutes', Number(e.target.value))}
                        aria-label="Break time in minutes"
                        title="Break time in minutes"
                      />
                      <button type="button" className="col-span-1 text-red-400 hover:text-red-600" onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Daily and weekly worked hours are calculated automatically as End Time − Start Time − Break Time.
              </p>

              <button type="submit" className="btn-primary w-full">
                Create Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
