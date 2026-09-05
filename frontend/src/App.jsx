import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { WorkingSchedulesPage } from './pages/WorkingSchedulesPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute roles={['SYSTEM_ADMIN', 'HR_ADMIN']}>
                    <DepartmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute roles={['SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER']}>
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/working-schedules"
                element={
                  <ProtectedRoute roles={['SYSTEM_ADMIN', 'HR_ADMIN', 'PAYROLL_OFFICER']}>
                    <WorkingSchedulesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
            <p>Team 344 Full-Stack Hackathon Starter Kit • Built with React, Vite, Tailwind, Express &amp; Prisma</p>
          </footer>
        </div>
      </AuthProvider>
    </Router>
  );
}
