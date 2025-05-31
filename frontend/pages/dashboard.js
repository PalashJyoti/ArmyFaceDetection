import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/navbar';
import axios from '@/pages/api/axios';
import {
  Sector, PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip,
  LineChart, Line, Legend,
  ResponsiveContainer
} from 'recharts';
import InteractivePieChart from '@/components/interactivePieChart';

const emotionColors = {
  FEAR: '#f87171',
  ANGER: '#f59e0b',
  SADNESS: '#60a5fa',
  DISGUST: '#34d399'
};

const emotionEmojis = {
  FEAR: '😨',
  ANGER: '😠',
  SADNESS: '😢',
  DISGUST: '🤢'
};

const negativeEmotions = ['FEAR', 'ANGER', 'SADNESS', 'DISGUST'];

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#ffffff" fontWeight="bold">
        {payload.name}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#ffffff" fontWeight="bold">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey + 16} textAnchor={textAnchor} fill="#e5e7eb">
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

const Dashboard = () => {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [cameraList, setCameraList] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [pieData, setPieData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [avgIntensityData, setAvgIntensityData] = useState([]);
  const [timeRange, setTimeRange] = useState('5min');
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [piePercentageData, setPiePercentageData] = useState([]);
  const [mostFrequentEmotion, setMostFrequentEmotion] = useState(null);
  const [peakTimes, setPeakTimes] = useState({});
  const [totalDetections, setTotalDetections] = useState(0);
  const [emotionTrends, setEmotionTrends] = useState({});
  const [cameraUrl, setCameraUrl] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!selectedCamera) {
      setCameraUrl('');
      return;
    }

    const fetchCameraFeed = async () => {
      try {
        const res = await axios.get(`/api/camera_feed/${selectedCamera}`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(res.data);
        setCameraUrl(url);
        setHasError(false);
      } catch (err) {
        console.error('Failed to load camera feed:', err);
        setHasError(true);
      }
    };

    fetchCameraFeed();
    return () => {
      if (cameraUrl) URL.revokeObjectURL(cameraUrl);
    };
  }, [selectedCamera]);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    const fetchCameras = async () => {
      setLoadingCameras(true);
      try {
        const res = await axios.get('/api/cameras');
        const data = res.data;
        setCameraList(data);
        if (data.length > 0) setSelectedCamera(data[0].id);
      } catch (err) {
        console.error("Failed to fetch cameras", err);
      } finally {
        setLoadingCameras(false);
      }
    };
    fetchCameras();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const res = await axios.get(`/api/detection-analytics?range=${timeRange}`);
        const data = res.data;
        setPieData(data.pie_data);
        setPiePercentageData(data.pie_percentage_data);
        setMostFrequentEmotion(data.most_frequent_emotion);
        setTimelineData(data.timeline_data);
        setEmotionTrends(data.emotion_trends);
        setPeakTimes(data.peak_times);
        setTotalDetections(data.total_detections);
        console.log('Pie Data:', pieData);
        console.log('Pie percent:', piePercentageData);

        if (data.avg_intensity) {
          setAvgIntensityData(data.avg_intensity);
        } else {
          const avgData = data.timeline_data.map(entry => ({
            name: entry.time || '',
            value: (entry.FEAR + entry.ANGER + entry.SADNESS + entry.DISGUST) / 4
          }));
          setAvgIntensityData(avgData);
        }
      } catch (err) {
        console.error("Failed to fetch analytics", err);
        setPieData([]);
        setPiePercentageData([]);
        setMostFrequentEmotion(null);
        setTimelineData([]);
        setEmotionTrends({});
        setPeakTimes({});
        setTotalDetections(0);
        setAvgIntensityData([]);
      } finally {
        setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, [timeRange]);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await axios.post(
        '/api/auth/logout',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      localStorage.removeItem('token');
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      alert('Logout failed');
    }
  };

  const exportCSV = () => {
    let csvContent = `Emotion Detection KPI Report\nTime Range: ${timeRange}\n\n`;

    // --- Pie Chart (Raw Counts) ---
    if (pieData?.length) {
      csvContent += `Pie Chart (Raw Counts)\nEmotion,Value\n`;
      pieData.forEach(({ name, value }) => {
        csvContent += `${name},${value}\n`;
      });
      csvContent += '\n';
    }

    // --- Pie Percentage Data ---
    if (piePercentageData?.length) {
      csvContent += `Pie Chart (Percentage)\nEmotion,Value,Percentage\n`;
      piePercentageData.forEach(({ name, value, percentage }) => {
        csvContent += `${name},${value},${percentage}%\n`;
      });
      csvContent += '\n';
    }

    // --- Most Frequent Emotion ---
    if (mostFrequentEmotion) {
      csvContent += `Most Frequent Emotion\n${mostFrequentEmotion}\n\n`;
    }

    // --- Total Detections ---
    if (typeof totalDetections === 'number') {
      csvContent += `Total Detections\n${totalDetections}\n\n`;
    }

    // --- Timeline Data ---
    if (timelineData?.length) {
      const emotions = ['FEAR', 'ANGER', 'SADNESS', 'DISGUST'];
      csvContent += `Timeline Data\nTime,${emotions.join(',')}\n`;
      timelineData.forEach(entry => {
        const line = `${entry.time},${emotions.map(e => entry[e] || 0).join(',')}`;
        csvContent += line + '\n';
      });
      csvContent += '\n';
    }

    // --- Average Intensity ---
    if (avgIntensityData?.length) {
      csvContent += `Average Emotion Intensity\nEmotion,Average Confidence\n`;
      avgIntensityData.forEach(({ name, value }) => {
        csvContent += `${name},${value}\n`;
      });
      csvContent += '\n';
    }

    // --- Emotion Trends ---
    if (emotionTrends && Object.keys(emotionTrends).length > 0) {
      csvContent += `Emotion Trends\nEmotion,Trend\n`;
      Object.entries(emotionTrends).forEach(([emotion, trend]) => {
        csvContent += `${emotion},${trend}\n`;
      });
      csvContent += '\n';
    }

    // --- Peak Times ---
    if (peakTimes && Object.keys(peakTimes).length > 0) {
      csvContent += `Peak Times\nEmotion,Peak Time\n`;
      Object.entries(peakTimes).forEach(([emotion, time]) => {
        csvContent += `${emotion},${time || 'N/A'}\n`;
      });
      csvContent += '\n';
    }

    // --- Download CSV ---
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `emotion_kpis_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dominantEmotion = pieData.length > 0 ? pieData.reduce((a, b) => a.value > b.value ? a : b) : null;

  if (timelineData.length >= 2) {
    const latest = timelineData[timelineData.length - 1];
    const previous = timelineData[timelineData.length - 2];
    negativeEmotions.forEach(emotion => {
      if (latest[emotion] > previous[emotion]) emotionTrends[emotion] = 'increase';
      else if (latest[emotion] < previous[emotion]) emotionTrends[emotion] = 'decrease';
      else emotionTrends[emotion] = 'no change';
    });
  }

  return (
    <>
      <Navbar onLogout={handleLogout} />
      <div
        className="min-h-screen bg-cover bg-center p-6"
        style={{ backgroundImage: `url('/image-8.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 z-0"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-center text-white mb-10 tracking-tight drop-shadow-lg">
            Emotion Analysis Dashboard
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-screen-xl mx-auto">
            {/* Column 1 */}
            <div className="space-y-4">
              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center border border-gray-700/50">
                <h2 className="text-lg font-semibold text-white mb-2">Dominant Negative Emotion</h2>
                {loadingAnalytics ? (
                  <p className="text-gray-300">Loading...</p>
                ) : dominantEmotion ? (
                  <div className="text-3xl font-bold flex justify-center items-center gap-2 text-white">
                    {emotionEmojis[dominantEmotion.name.toUpperCase()] || '❓'} {dominantEmotion.name}
                  </div>
                ) : (
                  <div className="text-gray-300">No data</div>
                )}
              </div>

              {/* Live Feed */}
              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Live Detection Feed</h3>
                {loadingCameras ? (
                  <p className="text-gray-300">Loading cameras...</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <label className="text-sm font-medium text-white">Select Camera:</label>
                      <select
                        className="border border-gray-600 rounded px-2 py-1 bg-gray-800 text-white focus:border-[#2a9d8f] focus:outline-none"
                        value={selectedCamera || ''}
                        onChange={(e) => setSelectedCamera(e.target.value)}
                      >
                        {cameraList.map(cam => (
                          <option key={cam.id} value={cam.id}>
                            {cam.name || `Camera ${cam.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedCamera ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_FLASK_MAIN_API_BASE_URL}/api/camera_feed/${selectedCamera}?t=${Date.now()}`}
                        alt="Live Feed"
                        className="rounded-lg w-full h-64 object-cover border border-gray-600"
                      />
                    ) : (
                      <div className="bg-gray-800 h-64 flex items-center justify-center rounded-lg border border-gray-600">
                        <span className="text-gray-300">Select a camera to view feed</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-sm border border-gray-700/50">
                <p className="text-gray-300">
                  Location:{' '}
                  <span className="font-mono text-white">
                    {cameraList.find(cam => cam.id === selectedCamera)?.label || "N/A"}
                  </span>
                </p>
                <p className="text-gray-300">
                  Status:{' '}
                  <span
                    className={
                      (() => {
                        const status = cameraList.find(cam => cam.id === selectedCamera)?.status;
                        if (status === "Active") return "text-green-400";
                        if (status === "Inactive") return "text-gray-400";
                        if (status === "Error") return "text-red-400";
                        return "text-yellow-400";
                      })()
                    }
                  >
                    {cameraList.find(cam => cam.id === selectedCamera)?.status || "Unknown"}
                  </span>
                </p>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#264653] to-[#2a9d8f] rounded-3xl shadow-xl p-5 flex justify-between items-center cursor-pointer hover:from-[#2a9d8f] hover:to-[#264653] transition-colors duration-300">
                <span className="text-white font-semibold text-lg select-none">
                  Select Time Range to See Analytics
                </span>
                <select
                  className="ml-4 bg-white text-indigo-700 font-semibold rounded-xl px-4 py-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-300 transition"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <option value="5min">Last 5 minutes</option>
                  <option value="30min">Last 30 minutes</option>
                  <option value="1hr">Last 1 hour</option>
                  <option value="today">Today</option>
                </select>
              </div>

              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Emotion Trend</h3>
                {isClient ? (
                  emotionTrends ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(emotionTrends).map(([emotion, trend]) => {
                        const trendIcon = {
                          increase: '⬆️',
                          decrease: '⬇️',
                          'no change': '➡️',
                        }[trend];
                        const trendColor = {
                          increase: 'text-green-400',
                          decrease: 'text-red-400',
                          'no change': 'text-gray-300',
                        }[trend];

                        return (
                          <div key={emotion} className="flex items-center justify-between">
                            <span className="font-medium text-white">{emotion}</span>
                            <span className={`font-semibold ${trendColor}`}>
                              {trendIcon} {trend}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-300">No data</p>
                  )
                ) : null}
              </div>

              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Emotion Intensity Over Time
                </h3>
                {isClient ? (
                  timelineData.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={timelineData} margin={{ bottom: 30 }}>
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: '#e5e7eb' }}
                          interval="preserveStartEnd"
                        />
                        <YAxis stroke="#e5e7eb" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            borderRadius: '0.5rem',
                            border: '1px solid #374151',
                            color: '#fff',
                          }}
                          cursor={{ fill: '#2a9d8f22' }}
                        />
                        <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                        {negativeEmotions.map((emotion) => (
                          <Line
                            key={emotion}
                            type="monotone"
                            dataKey={emotion}
                            stroke={emotionColors[emotion]}
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray="3 3"
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-300">No data</p>
                  )
                ) : (
                  <p className="text-gray-300">Loading...</p>
                )}
              </div>

              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50 space-y-2">
                <button
                  onClick={exportCSV}
                  className="w-full bg-gradient-to-r from-[#264653] to-[#2a9d8f] text-white px-4 py-2 rounded hover:from-[#2a9d8f] hover:to-[#264653] transition"
                >
                  Export as CSV
                </button>
              </div>
            </div>

            {/* Column 3 */}
            <div className="space-y-4">
              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Emotion Distribution
                </h3>
                {isClient ? (
                  pieData.length ? (
                    <div className="w-full flex justify-center">
                      <InteractivePieChart pieData={pieData} />
                    </div>
                  ) : (
                    <p className="text-gray-300">No data</p>
                  )
                ) : (
                  <p className="text-gray-300">Loading...</p>
                )}
              </div>

              <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-2">Instant Emotion Count</h3>
                {isClient ? (
                  pieData.length ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={pieData}
                        margin={{ bottom: 60 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#e5e7eb"
                          interval={0}
                          tick={{ angle: -45, textAnchor: 'end', fill: '#e5e7eb' }}
                          height={60}
                        />
                        <YAxis stroke="#e5e7eb" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            borderRadius: '0.5rem',
                            border: '1px solid #374151',
                            color: '#fff',
                          }}
                          cursor={{ fill: '#2a9d8f22' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2a9d8f">
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={emotionColors[entry.name?.toUpperCase()] || '#8884d8'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-300">No data</p>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;