import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Thermometer, Droplets, Activity, Clock, MapPin, CheckCircle, AlertTriangle, Gauge } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../lib/api';

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom animated destination divIcon to avoid loading external assets
const destIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg animate-pulse"><div class="w-2.5 h-2.5 bg-white rounded-full"></div></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Component to handle map center updates
const ChangeView = ({ center }) => {
  const map = useMap();
  map.setView(center, 13);
  return null;
};

const ContainerDetails = ({ containerId, onBack }) => {
  const [container, setContainer] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [destination, setDestination] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Settings form states
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    minTemp: '',
    maxTemp: '',
    maxVibration: '',
    turnOn: true
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [containerRes, telemetryRes, destRes, alertsRes] = await Promise.all([
        api.get(`/containers/${containerId}`),
        api.get(`/telemetry/container/${containerId}/history`),
        api.get(`/containers/${containerId}/destination`).catch(() => ({ data: null })),
        api.get('/alerts').catch(() => ({ data: [] }))
      ]);
      setContainer(containerRes.data);
      
      // Initialize settings form if not already editing
      if (!isUpdatingSettings && !isEditingSettings && containerRes.data) {
          setSettingsForm({
              minTemp: containerRes.data.minTemp ?? 5,
              maxTemp: containerRes.data.maxTemp ?? 25,
              maxVibration: containerRes.data.maxVibration ?? 2.0,
              turnOn: settingsForm.turnOn ?? true
          });
      }
      
      setTelemetry(telemetryRes.data);
      if (destRes && destRes.data) {
        setDestination(destRes.data);
      } else {
        setDestination(null);
      }
      setAlerts(alertsRes?.data || []);
    } catch (error) {
      console.error('Failed to fetch details', error);
    } finally {
      setLoading(false);
    }
  }, [containerId, isEditingSettings, isUpdatingSettings, settingsForm.turnOn]);

  useEffect(() => {
    const timeout = setTimeout(fetchData, 0);
    const interval = setInterval(fetchData, 5000); // Auto-refresh every 5s
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleToggleStatus = async () => {
    try {
      if (container.status === 'ACTIVE') {
        await api.post(`/containers/${containerId}/deactivate`);
      } else {
        await api.post(`/containers/${containerId}/activate`);
      }
      fetchData();
    } catch {
      alert('Failed to modify device status');
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      // Call the FastAPI endpoint which handles DB + MQTT publish
      await fetch(`http://localhost:8000/api/containers/${containerId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minTemp: parseFloat(settingsForm.minTemp),
          maxTemp: parseFloat(settingsForm.maxTemp),
          maxVibration: parseFloat(settingsForm.maxVibration),
          turnOn: settingsForm.turnOn
        })
      });
      setContainer(prev => prev ? ({
        ...prev,
        minTemp: parseFloat(settingsForm.minTemp),
        maxTemp: parseFloat(settingsForm.maxTemp),
        maxVibration: parseFloat(settingsForm.maxVibration)
      }) : prev);
      setIsEditingSettings(false);
      alert('Device settings successfully updated and published to container!');
      fetchData();
    } catch (error) {
      alert('Failed to update device settings');
      console.error(error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const updateSettingsField = (field, value) => {
    setIsEditingSettings(true);
    setSettingsForm(prev => ({ ...prev, [field]: value }));
  };

  // Haversine formula to compute geodesic distance between current coordinates and destination
  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!container) return <div className="p-12 text-center text-slate-500 font-bold">Device not found</div>;

  // Temperature and humidity arrive as separate telemetry rows, so keep only rows
  // that actually contain chartable values to avoid broken line segments.
  const chartData = [...telemetry].filter(t => (
    t.temperature !== null && t.temperature !== undefined &&
    t.humidity !== null && t.humidity !== undefined
  )).slice(0, 15).reverse().map(t => {
    const ts = t.createdAt || t.created_at || t.timestamp;
    return {
      time: ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
      temp: t.temperature,
      humidity: t.humidity
    };
  });

  // Helper to scan for the latest non-null value of any metric in telemetry history
  const getLatestValue = (key) => {
    for (const t of telemetry) {
      if (t[key] !== null && t[key] !== undefined && t[key] !== '--') {
        return t[key];
      }
    }
    return null;
  };

  const latest = {
    temperature: getLatestValue('temperature'),
    humidity: getLatestValue('humidity'),
    speed: getLatestValue('speed'),
    vibration: getLatestValue('vibration'),
    vibAvg: getLatestValue('vibAvg'),
    latitude: getLatestValue('latitude'),
    longitude: getLatestValue('longitude'),
    createdAt: telemetry[0]?.createdAt || telemetry[0]?.created_at || telemetry[0]?.timestamp,
    created_at: telemetry[0]?.createdAt || telemetry[0]?.created_at || telemetry[0]?.timestamp,
    timestamp: telemetry[0]?.createdAt || telemetry[0]?.created_at || telemetry[0]?.timestamp
  };

  // Safe helper to convert potential null / string values to numbers safely
  const safeNumber = (val) => {
    if (val === null || val === undefined || val === '--') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  const distanceRemaining = (destination && safeNumber(latest.latitude) && safeNumber(latest.longitude)) 
    ? getDistanceInKm(safeNumber(latest.latitude), safeNumber(latest.longitude), destination.targetLatitude, destination.targetLongitude)
    : null;

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-bold transition-all active:scale-95"
      >
        <ChevronLeft size={20} />
        Back to Dashboard
      </button>

      {/* Details Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{container.name}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              container.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}>
              {container.status}
            </span>
            
            <button 
              onClick={handleToggleStatus}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                container.status === 'ACTIVE' 
                  ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' 
                  : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
              }`}
            >
              {container.status === 'ACTIVE' ? 'Deactivate Device' : 'Activate Device'}
            </button>
          </div>
          <p className="text-xs text-slate-400">Device UUID: {container.id}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
            <Clock size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Last updated: {(latest.createdAt || latest.created_at || latest.timestamp) ? new Date(latest.createdAt || latest.created_at || latest.timestamp).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600">
              <Thermometer size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Temperature</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-data)' }}>{safeNumber(latest.temperature) !== null ? `${safeNumber(latest.temperature).toFixed(1)}°C` : '--'}</p>
              {container.minTemp !== null && container.maxTemp !== null && (
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  Safe limits: {container.minTemp}°C - {container.maxTemp}°C
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600">
              <Droplets size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Humidity</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-data)' }}>{safeNumber(latest.humidity) !== null ? `${safeNumber(latest.humidity).toFixed(1)}%` : '--'}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600">
              <Gauge size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Transport Speed</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-data)' }}>{safeNumber(latest.speed) !== null ? `${safeNumber(latest.speed).toFixed(2)} m/s` : '0.00 m/s'}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Vibration (Peak / Avg)</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-data)' }}>
                {safeNumber(latest.vibration) !== null ? `${safeNumber(latest.vibration).toFixed(2)}g` : '0.00g'} 
                <span className="text-xs font-normal text-slate-400 ml-1.5">
                  / {safeNumber(latest.vibAvg) !== null ? `${safeNumber(latest.vibAvg).toFixed(2)}g` : '0.00g'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Destination & Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {destination && (
          <div className="glass-card p-6 md:col-span-2 flex flex-col justify-between border border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Delivery Cargo Destination</h4>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MapPin size={22} className="text-red-500" />
                {destination.locationName}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Target Coordinates: {destination.targetLatitude.toFixed(4)}, {destination.targetLongitude.toFixed(4)}
              </p>
            </div>
            
            {distanceRemaining !== null && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800/80">
                <div>
                  <p className="text-xs font-semibold text-slate-450 dark:text-slate-400">Remaining Travel Distance</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{distanceRemaining.toFixed(2)} km</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    distanceRemaining < 0.15 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                      : 'bg-primary-50 text-primary-600 dark:bg-primary-950/20 dark:text-primary-400'
                  }`}>
                    {distanceRemaining < 0.15 ? 'Arrived' : 'In Transit'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Active Alerts for this Device */}
        <div className={`glass-card p-6 border border-slate-100 dark:border-slate-800 flex flex-col justify-between max-h-[220px] overflow-y-auto ${
          destination ? 'md:col-span-1' : 'md:col-span-3'
        }`}>
          <div>
            <h4 className="text-[10px] font-bold text-slate-450 dark:text-slate-455 uppercase tracking-widest mb-3">Device Notifications</h4>
            <div className="space-y-2.5">
              {alerts.filter(a => !a.resolved && a.container?.id === container.id).length === 0 ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold flex items-center gap-2">
                  <CheckCircle size={16} /> All parameters normal. No active alerts.
                </p>
              ) : (
                alerts.filter(a => !a.resolved && a.container?.id === container.id).map(a => (
                  <div key={a.id} className="p-3 bg-red-500/10 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-xl text-xs flex flex-col gap-1">
                    <div className="flex gap-2">
                      <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                      <span>{a.message}</span>
                    </div>
                    {a.latitude && a.longitude && (
                      <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold ml-6 mt-0.5 uppercase tracking-wider">
                        📍 Location: {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Temperature Trend</h3>
            <Activity size={20} className="text-orange-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} padding={{ left: 10, right: 10 }} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="°" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={4} dot={{ r: 3.5, strokeWidth: 2, stroke: '#f97316', fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Humidity Trend</h3>
            <Activity size={20} className="text-blue-500" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} padding={{ left: 10, right: 10 }} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={4} dot={{ r: 3.5, strokeWidth: 2, stroke: '#3b82f6', fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} fillOpacity={1} fill="url(#colorHum)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="glass-card p-6 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Real-time Location Path Tracking</h3>
          <div className="flex gap-4 text-xs font-semibold text-slate-550 dark:text-slate-400">
            <span>Lat: {latest.latitude?.toFixed(4) || '--'}</span>
            <span>Lng: {latest.longitude?.toFixed(4) || '--'}</span>
          </div>
        </div>
        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 z-0">
          {latest.latitude ? (
            <MapContainer 
              center={[latest.latitude, latest.longitude]} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <ChangeView center={[latest.latitude, latest.longitude]} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Vibration Danger Zones (Red Dots) */}
              {telemetry.filter(t => t.vibration > 2 && t.latitude !== null && t.longitude !== null).map((t, idx) => {
                const ts = t.createdAt || t.created_at || t.timestamp;
                return (
                  <Circle 
                    key={`vibration-${idx}`}
                    center={[t.latitude, t.longitude]}
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}
                    radius={50}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong>Vibration Detected!</strong><br/>
                        Intensity: {t.vibration?.toFixed(2)}<br/>
                        Time: {ts ? new Date(ts).toLocaleTimeString() : '--'}
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

              {/* Destination Point & Polyline Connection */}
              {destination && (
                <>
                  <Marker position={[destination.targetLatitude, destination.targetLongitude]} icon={destIcon}>
                    <Popup>
                      <div className="text-center font-bold">
                        Destination: {destination.locationName}<br/>
                        <span className="text-xs font-normal text-slate-500">Target Delivery Point</span>
                      </div>
                    </Popup>
                  </Marker>
                  <Polyline 
                    positions={[
                      [latest.latitude, latest.longitude],
                      [destination.targetLatitude, destination.targetLongitude]
                    ]}
                    pathOptions={{ color: '#2563eb', dashArray: '8, 8', weight: 4 }}
                  />
                </>
              )}

              <Marker position={[latest.latitude, latest.longitude]}>
                <Popup>
                  <div className="text-center font-bold">
                    {container.name}<br/>
                    <span className="text-xs font-normal text-slate-500">Current Position</span>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full w-full bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center text-slate-400">
              Waiting for live GPS coordinates... Please activate container to begin transmission simulation.
            </div>
          )}
        </div>
      </div>

      {/* Device Settings Configuration Section */}
      <div className="glass-card p-6 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Device Configuration</h3>
        </div>
        <form onSubmit={handleUpdateSettings} className="space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Hardware temperature control</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Min Temp Limit (°C)</label>
                <input 
                  type="number" step="0.1" required
                  value={settingsForm.minTemp}
                  onFocus={() => setIsEditingSettings(true)}
                  onChange={e => updateSettingsField('minTemp', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-slate-100" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Max Temp Limit (°C)</label>
                <input 
                  type="number" step="0.1" required
                  value={settingsForm.maxTemp}
                  onFocus={() => setIsEditingSettings(true)}
                  onChange={e => updateSettingsField('maxTemp', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-slate-100" 
                />
              </div>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 px-4 py-3">
                <span>
                  <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fan Command</span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{settingsForm.turnOn ? 'Fan on' : 'Fan off'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={settingsForm.turnOn}
                  onChange={e => updateSettingsField('turnOn', e.target.checked)}
                  className="h-5 w-5 accent-primary-600"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">MQTT publishes only maxTemp, minTemp, and turnOn to bunker/001/setTemp.</p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Dashboard and Telegram alert threshold</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Vibration Limit (g)</label>
                <input 
                  type="number" step="0.1" required
                  value={settingsForm.maxVibration}
                  onFocus={() => setIsEditingSettings(true)}
                  onChange={e => updateSettingsField('maxVibration', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-slate-100" 
                />
                <p className="text-[10px] text-slate-400 mt-1">Used for dashboard and Telegram vibration alerts only.</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button 
              type="submit" 
              disabled={isUpdatingSettings}
              className="btn-primary flex items-center gap-2"
            >
              {isUpdatingSettings ? 'Applying...' : 'Apply & Publish Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Raw Data Table */}
      <div className="glass-card overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800/40">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Telemetry Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Temp</th>
                <th className="px-6 py-4">Humidity</th>
                <th className="px-6 py-4">Speed</th>
                <th className="px-6 py-4">Vibration (Peak / Avg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {telemetry.slice(0, 10).map((t, i) => {
                const ts = t.createdAt || t.created_at || t.timestamp;
                const tempNum = safeNumber(t.temperature);
                const humNum = safeNumber(t.humidity);
                const speedNum = safeNumber(t.speed);
                const vibPeak = safeNumber(t.vibration);
                const vibAvg = safeNumber(t.vibAvg);
                return (
                  <tr key={i} className="text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{ts ? new Date(ts).toLocaleString() : '--'}</td>
                    <td className="px-6 py-4">{tempNum !== null ? `${tempNum.toFixed(1)}°C` : '--'}</td>
                    <td className="px-6 py-4">{humNum !== null ? `${humNum.toFixed(1)}%` : '--'}</td>
                    <td className="px-6 py-4">{speedNum !== null ? `${speedNum.toFixed(2)} m/s` : '0.00 m/s'}</td>
                    <td className="px-6 py-4">
                      {vibPeak !== null ? `${vibPeak.toFixed(2)}g` : '0.00g'} / {vibAvg !== null ? `${vibAvg.toFixed(2)}g` : '0.00g'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContainerDetails;
