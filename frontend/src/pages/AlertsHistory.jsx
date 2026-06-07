import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, Calendar, RefreshCw } from 'lucide-react';
import api from '../lib/api';

const AlertsHistory = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'all', 'active', 'resolved'

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchAlerts, 0);
    const interval = setInterval(fetchAlerts, 6000); // refresh every 6s
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchAlerts]);

  const handleResolve = async (id) => {
    try {
      await api.post(`/alerts/${id}/resolve`);
      fetchAlerts();
    } catch {
      alert('Failed to resolve alert');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !alert.resolved;
    if (filter === 'resolved') return alert.resolved;
    return true;
  });

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'LOW':
        default:
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    }
  };

  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  const criticalCount = alerts.filter(a => !a.resolved && (a.severity === 'HIGH' || a.severity === 'CRITICAL')).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Alerts Center</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time telemetry threshold monitor</p>
        </div>
        <button 
          onClick={fetchAlerts}
          className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all active:scale-95"
          title="Refresh alerts"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Active Alerts</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{unresolvedCount}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Critical Excursions</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{criticalCount}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Resolved Alerts</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{alerts.filter(a => a.resolved).length}</p>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl">
            {[
              { label: 'Active Alerts', value: 'active' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'All Logs', value: 'all' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  filter === tab.value
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-primary-600 dark:text-primary-400'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Showing {filteredAlerts.length} entries
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <Info size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium">No alerts found</p>
            <p className="text-sm text-slate-400 mt-1">Excellent! All devices are running within safe parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Device</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-2 whitespace-nowrap">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {alert.container?.name || `Device #${alert.container?.id}`}
                    </td>
                    <td className="px-6 py-4 min-w-[240px]">
                      <div>
                        <span>{alert.message}</span>
                        {alert.latitude && alert.longitude && (
                          <span className="block text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                            📍 Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!alert.resolved ? (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all active:scale-95"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-emerald-500 font-semibold text-xs flex items-center gap-1">
                          <CheckCircle size={14} /> Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsHistory;
