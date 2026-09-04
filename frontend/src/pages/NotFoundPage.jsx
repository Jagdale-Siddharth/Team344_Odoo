import { Link } from 'react-router-dom';
import { Button } from '../components/UI/Button';
import { Home, AlertTriangle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-xl">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-4xl font-extrabold text-white">404 - Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The route you are looking for does not exist or has been moved.
        </p>
      </div>
      <Link to="/">
        <Button className="flex items-center space-x-2">
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Button>
      </Link>
    </div>
  );
};
