import { useCallback, useEffect, useState } from 'react';
import { Box, Signal, Thermometer, Plus, Trash2, Power, Droplets, Gauge, Activity } from 'lucide-react';
import api from '../lib/api';

const Dashboard = ({ onViewDetails }) => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  
  // Custom temp thresholds states
  const [minTemp, setMinTemp] = useState('5');
  const [maxTemp, setMaxTemp] = useState('25');

  const fetchContainers = useCallback(async () => {
    try {
      const response = await api.get('/containers');
      const containersWithTelemetry = await Promise.all(
        response.data.map(async (container) => {
          try {
            const telemetryRes = await api.get(`/telemetry/container/${container.id}/history`);
            const telemetry = telemetryRes.data || [];
            const latestValue = (key) => {
              const row = telemetry.find((item) => item[key] !== null && item[key] !== undefined);
              return row ? row[key] : null;
            };

            return {
              ...container,
              latestTelemetry: {
                temperature: latestValue('temperature'),
                humidity: latestValue('humidity'),
                speed: latestValue('speed'),
                vibration: latestValue('vibration'),
                vibAvg: latestValue('vibAvg'),
                updatedAt: telemetry[0]?.createdAt || telemetry[0]?.created_at || null
              }
            };
          } catch {
            return { ...container, latestTelemetry: null };
          }
        })
      );
      setContainers(containersWithTelemetry);
    } catch (error) {
      console.error('Failed to fetch containers', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchContainers, 0);
    const interval = setInterval(fetchContainers, 8000); // refresh data every 8s
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchContainers]);

  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined) return '--';
    const number = Number(value);
    return Number.isNaN(number) ? '--' : number.toFixed(decimals);
  };

  const formatUpdatedAt = (value) => {
    if (!value) return 'No telemetry yet';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'No telemetry yet' : `Updated ${date.toLocaleTimeString()}`;
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      const resp = await api.post('/containers', { 
        name: newName,
        minTemp: parseFloat(minTemp),
        maxTemp: parseFloat(maxTemp)
      });
      const containerId = resp.data.id;

      // Also publish settings to MQTT and DB via Python backend
      try {
        await fetch(`http://localhost:8000/api/containers/${containerId}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            minTemp: parseFloat(minTemp),
            maxTemp: parseFloat(maxTemp),
            maxVibration: 2.0
          })
        });
      } catch (err) {
        console.error("Failed to publish initial settings", err);
      }

      setNewName('');
      setMinTemp('5');
      setMaxTemp('25');
      setIsModalOpen(false);
      fetchContainers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create device');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      if (currentStatus === 'ACTIVE') {
        await api.post(`/containers/${id}/deactivate`);
      } else {
        await api.post(`/containers/${id}/activate`);
      }
      fetchContainers();
    } catch {
      alert('Failed to modify device status');
    }
  };

  const handleDeleteDevice = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await api.delete(`/containers/${id}`);
        fetchContainers();
      } catch {
        alert('Failed to delete device');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>System Overview</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Monitoring {containers.length} registered units</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <Plus size={20} />
          Add New Device
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Containers', value: containers.filter(c => c.status === 'ACTIVE').length, icon: <Box className="text-primary-600" />, color: 'bg-primary-50 dark:bg-primary-950/20' },
          { label: 'Deactivated Containers', value: containers.filter(c => c.status === 'INACTIVE').length, icon: <Power className="text-amber-600" />, color: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Total Mapped Devices', value: containers.length, icon: <Signal className="text-emerald-600" />, color: 'bg-emerald-50 dark:bg-emerald-950/20' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((container) => (
          <div key={container.id} className="glass-card overflow-hidden hover:shadow-lg transition-all group border border-slate-100 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 group-hover:bg-primary-50 dark:group-hover:bg-primary-950/20 group-hover:text-primary-600 transition-colors">
                  <Box size={24} />
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    container.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    {container.status}
                  </span>
                  
                  {/* Status toggle switch */}
                  <button 
                    onClick={() => handleToggleStatus(container.id, container.status)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all active:scale-95 ${
                      container.status === 'ACTIVE' 
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' 
                        : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                    }`}
                    title={container.status === 'ACTIVE' ? 'Deactivate device' : 'Activate device'}
                  >
                    {container.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <button 
                    onClick={() => handleDeleteDevice(container.id, container.name)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete device"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{container.name}</h3>
              <p className="text-xs mb-4 text-slate-400">UUID: #{container.id}</p>
              
              <div className="space-y-2 border-t border-slate-50 dark:border-slate-800/40 pt-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="grid grid-cols-2 gap-3 pb-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Thermometer size={14} className="text-orange-500" />
                      Temp
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {formatNumber(container.latestTelemetry?.temperature, 1)} C
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Droplets size={14} className="text-blue-500" />
                      Hum
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {formatNumber(container.latestTelemetry?.humidity, 1)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Gauge size={14} className="text-indigo-500" />
                      Speed
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {formatNumber(container.latestTelemetry?.speed, 2)} m/s
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Activity size={14} className="text-red-500" />
                      Vib
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {formatNumber(container.latestTelemetry?.vibration, 2)}g
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Thermometer size={16} className="text-slate-400" />
                    Temp Limits
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {container.minTemp !== null && container.maxTemp !== null 
                      ? `${container.minTemp}°C to ${container.maxTemp}°C` 
                      : 'None'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400">
                  {formatUpdatedAt(container.latestTelemetry?.updatedAt)}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => onViewDetails(container.id)}
              className="block w-full p-4 bg-slate-50 dark:bg-slate-800/30 text-center text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-primary-600 hover:text-white transition-all border-t border-slate-50 dark:border-slate-800/40"
            >
              View Detailed Analytics
            </button>
          </div>
        ))}
      </div>

      {/* Create Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>New Device Registration</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Register a container with temperature thresholds and GPS tracking.</p>
            
            <form onSubmit={handleCreateDevice} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Device Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Vaccine Shipment 101"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Min Temp limit (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-100"
                    value={minTemp}
                    onChange={(e) => setMinTemp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Temp limit (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-slate-900 dark:text-slate-100"
                    value={maxTemp}
                    onChange={(e) => setMaxTemp(e.target.value)}
                  />
                </div>
              </div>



              <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/40">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
