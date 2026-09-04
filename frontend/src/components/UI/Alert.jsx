import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export const Alert = ({ type = 'info', title, message, className = '' }) => {
  const styles = {
    info: {
      bg: 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200',
      icon: Info,
      iconColor: 'text-indigo-400',
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    error: {
      bg: 'bg-rose-950/40 border-rose-500/30 text-rose-200',
      icon: XCircle,
      iconColor: 'text-rose-400',
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-500/30 text-amber-200',
      icon: AlertCircle,
      iconColor: 'text-amber-400',
    },
  };

  const current = styles[type] || styles.info;
  const IconComponent = current.icon;

  return (
    <div className={`p-4 rounded-xl border flex items-start space-x-3 text-sm ${current.bg} ${className}`}>
      <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="space-y-1">
        {title && <h4 className="font-semibold leading-none">{title}</h4>}
        {message && <p className="text-xs leading-relaxed opacity-90">{message}</p>}
      </div>
    </div>
  );
};
