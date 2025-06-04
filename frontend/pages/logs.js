import React, { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import axios from '@/pages/api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const emotionColors = {
  FEAR: '#f87171',
  ANGER: '#f59e0b', 
  SADNESS: '#60a5fa',
  DISGUST: '#34d399',
  default: '#2a9d8f'
};

const emotionEmojis = {
  FEAR: '😨',
  ANGER: '😠',
  SADNESS: '😢',
  DISGUST: '🤢'
};

const DetectionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [emotionStats, setEmotionStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('weekly');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmotion, setSelectedEmotion] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [totalDetections, setTotalDetections] = useState(0);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const logsPerPage = 10;

  useEffect(() => {
    fetchLogs();
  }, [range]);

  const fetchLogs = () => {
    setLoading(true);
    axios.get(`/api/detection-logs?range=${range}`)
      .then(response => {
        setLogs(response.data);
        setFilteredLogs(response.data);
        setChartData(aggregateData(response.data));
        setEmotionStats(calculateEmotionStats(response.data));
        setTotalDetections(response.data.length);
        setCurrentPage(1);
        setSelectedLogs([]);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching logs:', error);
        setLoading(false);
      });
  };

  // Filter logs when emotion or search term changes
  useEffect(() => {
    let filtered = logs;
    
    if (selectedEmotion !== 'all') {
      filtered = filtered.filter(log => log.emotion.toUpperCase() === selectedEmotion);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.camera_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.emotion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
    setSelectedLogs([]);
  }, [selectedEmotion, searchTerm, logs]);

  const calculateEmotionStats = (logs) => {
    const stats = {};
    logs.forEach(log => {
      const emotion = log.emotion.toUpperCase();
      stats[emotion] = (stats[emotion] || 0) + 1;
    });
    return stats;
  };

  const aggregateData = (logs) => {
    const grouped = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp);
      let key = '';
      
      if (range === 'weekly') {
        key = date.toLocaleDateString('en-IN', { weekday: 'short' });
      } else if (range === 'monthly') {
        key = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      } else {
        key = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }
      
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    return Object.entries(grouped).map(([key, value]) => ({ name: key, count: value }));
  };

  const handleBarClick = (data) => {
    if (!data || !data.activeLabel) return;
    
    const label = data.activeLabel;
    const filtered = logs.filter(log => {
      const date = new Date(log.timestamp);
      const formatted =
        range === 'weekly' ? date.toLocaleDateString('en-IN', { weekday: 'short' }) :
        range === 'monthly' ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) :
        date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      return formatted === label;
    });
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
    setSelectedLogs([]);
  };

  const resetFilters = () => {
    setSelectedEmotion('all');
    setSearchTerm('');
    setFilteredLogs(logs);
    setCurrentPage(1);
    setSelectedLogs([]);
  };

  // Delete functionality
  const handleDeleteSingle = (logId) => {
    setDeleteTarget({ type: 'single', id: logId });
    setShowDeleteConfirm(true);
  };

  const handleDeleteSelected = () => {
    if (selectedLogs.length === 0) return;
    setDeleteTarget({ type: 'bulk', ids: selectedLogs });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget.type === 'single') {
        await axios.delete(`/api/detection-logs/${deleteTarget.id}`);
      } else {
        await axios.delete('/api/detection-logs/bulk', {
          data: { ids: deleteTarget.ids }
        });
      }
      
      // Refresh the data
      fetchLogs();
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting logs:', error);
      alert('Failed to delete logs. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentLogIds = currentLogs.map(log => log.id);
      setSelectedLogs(prev => [...new Set([...prev, ...currentLogIds])]);
    } else {
      const currentLogIds = currentLogs.map(log => log.id);
      setSelectedLogs(prev => prev.filter(id => !currentLogIds.includes(id)));
    }
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  const exportCSV = () => {
    const csvContent = [
      'Timestamp,Camera,Emotion,Image URL',
      ...filteredLogs.map(log => 
        `"${new Date(log.timestamp).toLocaleString()}","${log.camera_label}","${log.emotion}","${process.env.NEXT_PUBLIC_FLASK_MAIN_API_BASE_URL}${log.image_url}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection_logs_${range}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen bg-cover bg-center flex flex-col items-center justify-start px-6 py-10"
        style={{ backgroundImage: "url('/image-3.png')" }}
      >
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40 z-0"></div>
        <h1 className="text-4xl font-extrabold mb-10 text-center text-white tracking-tight drop-shadow-lg">
              Detection Logs Analytics
            </h1>
        
        <div className="relative z-10 w-full max-w-7xl mt-2">
          {/* Main Content Card */}
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-700/50">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-600/50">
                <h3 className="text-white font-semibold">Total Detections</h3>
                <p className="text-2xl font-bold text-[#2a9d8f]">{totalDetections}</p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-600/50">
                <h3 className="text-white font-semibold">Filtered Results</h3>
                <p className="text-2xl font-bold text-blue-400">{filteredLogs.length}</p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-600/50">
                <h3 className="text-white font-semibold">Time Range</h3>
                <p className="text-lg font-bold text-purple-400 capitalize">{range}</p>
              </div>
              <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-600/50">
                <h3 className="text-white font-semibold">Most Common</h3>
                <p className="text-lg font-bold text-orange-400">
                  {Object.keys(emotionStats).length > 0 && 
                    Object.entries(emotionStats).reduce((a, b) => emotionStats[a[0]] > emotionStats[b[0]] ? a : b)[0]
                  }
                </p>
              </div>
            </div>

            {/* Controls Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Time Range Selector */}
              <div>
                <label className="block text-white font-medium mb-2">Time Range</label>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="w-full border border-gray-600 rounded-lg px-4 py-2 bg-gray-800 text-white focus:border-[#2a9d8f] focus:outline-none"
                  disabled={loading}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="overall">Overall</option>
                </select>
              </div>

              {/* Emotion Filter */}
              <div>
                <label className="block text-white font-medium mb-2">Filter by Emotion</label>
                <select
                  value={selectedEmotion}
                  onChange={(e) => setSelectedEmotion(e.target.value)}
                  className="w-full border border-gray-600 rounded-lg px-4 py-2 bg-gray-800 text-white focus:border-[#2a9d8f] focus:outline-none"
                >
                  <option value="all">All Emotions</option>
                  <option value="FEAR">😨 Fear</option>
                  <option value="ANGER">😠 Anger</option>
                  <option value="SADNESS">😢 Sadness</option>
                  <option value="DISGUST">🤢 Disgust</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-white font-medium mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search camera or emotion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-600 rounded-lg px-4 py-2 bg-gray-800 text-white placeholder-gray-400 focus:border-[#2a9d8f] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Reset Filters
                </button>
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2a9d8f] hover:from-[#2a9d8f] hover:to-[#264653] text-white rounded-lg transition"
                >
                  Export CSV
                </button>
              </div>
            </div>
            {/* Chart Section */}
            <div className="bg-gray-800/60 rounded-xl p-6 mb-8 border border-gray-600/50">
              <h2 className="text-xl font-bold text-white mb-4">Detection Frequency</h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} onClick={handleBarClick}>
                  <XAxis
                    dataKey="name"
                    stroke="#e5e7eb"
                    tick={{ fill: '#e5e7eb', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#e5e7eb"
                    tick={{ fill: '#e5e7eb', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    cursor={{ fill: '#2a9d8f33' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#2a9d8f" 
                    cursor="pointer"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-gray-300 text-sm mt-2 text-center">
                💡 Click on bars to filter logs by time period
              </p>
            </div>

            {/* Emotion Stats */}
            {Object.keys(emotionStats).length > 0 && (
              <div className="bg-gray-800/60 rounded-xl p-6 mb-8 border border-gray-600/50">
                <h2 className="text-xl font-bold text-white mb-4">Emotion Breakdown</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(emotionStats).map(([emotion, count]) => (
                    <div 
                      key={emotion} 
                      className="text-center p-4 bg-gray-700/50 rounded-lg border border-gray-600/30"
                    >
                      <div className="text-2xl mb-2">
                        {emotionEmojis[emotion] || '❓'}
                      </div>
                      <div className="text-white font-semibold">{emotion}</div>
                      <div className="text-xl font-bold" style={{color: emotionColors[emotion] || emotionColors.default}}>
                        {count}
                      </div>
                      <div className="text-sm text-gray-300">
                        {((count / totalDetections) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedLogs.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-medium">
                      {selectedLogs.length} log{selectedLogs.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedLogs([])}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition text-sm"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm flex items-center gap-2"
                    >
                      🗑️ Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table Section */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Detection Details</h2>
                <div className="text-gray-300">
                  Showing {indexOfFirstLog + 1}-{Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} results
                </div>
              </div>

              <div className="overflow-x-auto bg-gray-800/80 rounded-xl shadow-xl border border-gray-600/50">
                {loading ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2a9d8f]"></div>
                    <div className="mt-4 text-[#2a9d8f] font-semibold text-lg">Loading...</div>
                  </div>
                ) : (
                  <>
                    <table className="min-w-full text-sm text-left text-white">
                      <thead className="bg-[#2a9d8f] text-white">
                        <tr>
                          <th className="px-4 py-4 font-semibold">
                            <input
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={currentLogs.length > 0 && currentLogs.every(log => selectedLogs.includes(log.id))}
                              className="rounded border-gray-300 text-[#2a9d8f] focus:ring-[#2a9d8f]"
                            />
                          </th>
                          <th className="px-6 py-4 font-semibold">Timestamp</th>
                          <th className="px-6 py-4 font-semibold">Camera</th>
                          <th className="px-6 py-4 font-semibold">Emotion</th>
                          <th className="px-6 py-4 font-semibold">Screenshot</th>
                          <th className="px-6 py-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentLogs.length > 0 ? (
                          currentLogs.map((log, index) => (
                            <tr
                              key={log.id || index}
                              className="border-t border-gray-600/50 hover:bg-gray-700/50 transition duration-300"
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedLogs.includes(log.id)}
                                  onChange={() => handleSelectLog(log.id)}
                                  className="rounded border-gray-300 text-[#2a9d8f] focus:ring-[#2a9d8f]"
                                />
                              </td>
                              <td className="px-6 py-4 text-gray-200">
                                {new Date(log.timestamp).toLocaleString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-6 py-4 text-gray-200">{log.camera_label}</td>
                              <td className="px-6 py-4">
                                <span 
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                                  style={{
                                    backgroundColor: `${emotionColors[log.emotion.toUpperCase()] || emotionColors.default}20`,
                                    color: emotionColors[log.emotion.toUpperCase()] || emotionColors.default,
                                    border: `1px solid ${emotionColors[log.emotion.toUpperCase()] || emotionColors.default}40`
                                  }}
                                >
                                  {emotionEmojis[log.emotion.toUpperCase()] || '❓'} {log.emotion}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <a
                                  href={`${process.env.NEXT_PUBLIC_FLASK_MAIN_API_BASE_URL}${log.image_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-1 bg-[#2a9d8f] hover:bg-[#238b7a] text-white rounded-lg transition text-sm"
                                >
                                  🖼️ View Image
                                </a>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => handleDeleteSingle(log.id)}
                                  className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                                  title="Delete this log"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-20 text-center">
                              <div className="text-gray-400 text-lg">
                                📭 No logs found for the current filters
                              </div>
                              {(selectedEmotion !== 'all' || searchTerm) && (
                                <button
                                  onClick={resetFilters}
                                  className="mt-4 px-4 py-2 bg-[#2a9d8f] hover:bg-[#238b7a] text-white rounded-lg transition"
                                >
                                  Clear Filters
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Enhanced Pagination */}
                    {filteredLogs.length > logsPerPage && (
                      <div className="flex justify-between items-center p-6 bg-gray-700/30 border-t border-gray-600/50">
                        <div className="text-gray-300 text-sm">
                          Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} entries
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2a9d8f] hover:from-[#2a9d8f] hover:to-[#264653] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Previous
                          </button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.ceil(filteredLogs.length / logsPerPage) }, (_, i) => i + 1)
                              .filter(page => {
                                const total = Math.ceil(filteredLogs.length / logsPerPage);
                                return page === 1 || page === total || Math.abs(page - currentPage) <= 1;
                              })
                              .map((page, index, array) => (
                                <React.Fragment key={page}>
                                  {index > 0 && array[index - 1] !== page - 1 && (
                                    <span className="px-2 text-gray-400">...</span>
                                  )}
                                  <button
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded transition ${
                                      page === currentPage
                                        ? 'bg-[#2a9d8f] text-white'
                                        : 'text-gray-300 hover:bg-gray-600'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </React.Fragment>
                              ))}
                          </div>

                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                prev < Math.ceil(filteredLogs.length / logsPerPage) ? prev + 1 : prev
                              )
                            }
                            disabled={currentPage === Math.ceil(filteredLogs.length / logsPerPage)}
                            className="px-4 py-2 bg-gradient-to-r from-[#264653] to-[#2a9d8f] hover:from-[#2a9d8f] hover:to-[#264653] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-600">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
                <p className="text-gray-300 mb-6">
                  {deleteTarget?.type === 'single' 
                    ? 'Are you sure you want to delete this detection log? This action cannot be undone.'
                    : `Are you sure you want to delete ${deleteTarget?.ids?.length} selected detection logs? This action cannot be undone.`
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={cancelDelete}
                    disabled={deleting}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>🗑️ Delete</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DetectionLogs;