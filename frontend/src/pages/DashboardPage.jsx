import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/UI/Button';
import { Alert } from '../components/UI/Alert';
import api from '../services/api';
import { User, Shield, Key, Activity, RefreshCw, CheckCircle, Database } from 'lucide-react';

export const DashboardPage = () => {
  const { user, token } = useAuth();
  const [healthStatus, setHealthStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [testError, setTestError] = useState(null);

  const handleTestHealth = async () => {
    setTestingApi(true);
    setTestError(null);
    try {
      const res = await api.get('/health');
      setHealthStatus(res.data);
    } catch (err) {
      setTestError(err.response?.data?.message || err.message || 'Health check failed');
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4">
      {/* Header section */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>Welcome, {user?.name || user?.email}</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full uppercase font-bold">
              {user?.role}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authenticated Session Active • User ID: <span className="font-mono text-slate-300">{user?.id}</span>
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTestHealth}
          isLoading={testingApi}
          className="flex items-center space-x-2 self-start md:self-auto"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Test API &amp; DB Connection</span>
        </Button>
      </div>

      {/* Health Check API Result */}
      {healthStatus && (
        <Alert
          type="success"
          title="Backend & Database Health Check Passed!"
          message={`Status: ${healthStatus.status} | DB: ${healthStatus.database} | Env: ${healthStatus.environment} | Timestamp: ${healthStatus.timestamp}`}
        />
      )}

      {testError && <Alert type="error" title="API Connectivity Error" message={testError} />}

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User profile card */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-200">Current User Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Name:</span>
              <span className="font-medium text-slate-200">{user?.name || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Email:</span>
              <span className="font-medium text-slate-200">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Role:</span>
              <span className="font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded">{user?.role}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-slate-400">Joined:</span>
              <span className="text-slate-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Auth Token details */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Key className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-slate-200">Active Session Token</h3>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400 leading-relaxed">
              JWT token is safely stored in <span className="font-mono text-indigo-300">localStorage</span> and automatically forwarded in the <span className="font-mono text-indigo-300">Authorization: Bearer</span> header on all outgoing Axios requests.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-slate-400 break-all border border-slate-800">
              {token ? `${token.substring(0, 45)}...` : 'No token found'}
            </div>
          </div>
        </div>
      </div>

      {/* 24-Hour Hackathon Extension Tips */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 border-indigo-500/20">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Database className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-slate-200">How to Extend this Starter Kit for the Surprise Problem</h3>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>1. Add Database Models:</strong> Edit <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">backend/prisma/schema.prisma</code> to define problem models.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>2. Migrate Schema:</strong> Run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">npx prisma migrate dev --name add_domain_models</code> in <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">backend/</code>.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>3. Add API Endpoints:</strong> Add controller and router files under <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">backend/src/controllers/</code> and <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">backend/src/routes/</code>.</span>
          </li>
          <li className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>4. Add Frontend Views:</strong> Create React components in <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">frontend/src/pages/</code> and map routes in <code className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">App.jsx</code>.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
