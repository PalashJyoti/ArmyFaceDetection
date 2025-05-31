import React, { useState } from 'react';

const CameraRow = ({ camera, index, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(camera.label);
  const [editIP, setEditIP] = useState(camera.ip);
  const [editStatus, setEditStatus] = useState(camera.status);
  const [editSrc, setEditSrc] = useState(camera.src || '');
  const [isLoading, setIsLoading] = useState(false);

  const saveChanges = async () => {
    if (!editLabel.trim() || !editIP.trim() || !editSrc.trim()) {
      alert('Label, IP, and Source cannot be empty.');
      return;
    }
    
    setIsLoading(true);
    try {
      await onUpdate({
        id: camera.id,
        label: editLabel.trim(),
        ip: editIP.trim(),
        status: editStatus,
        src: editSrc.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating camera:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditLabel(camera.label);
    setEditIP(camera.ip);
    setEditStatus(camera.status);
    setEditSrc(camera.src || '');
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete camera "${camera.label}"?`)) {
      onDelete(camera.id);
    }
  };

  const truncateUrl = (url, maxLength = 30) => {
    if (!url) return 'No URL';
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  };

  return (
    <tr 
      className={`${
        index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-700/30'
      } border-t border-gray-600/50 hover:bg-gray-700/50 transition-all duration-200 ${
        isEditing ? 'ring-2 ring-indigo-500/50' : ''
      }`}
    >
      {/* Camera ID */}
      <td className="px-6 py-4">
        <span className="text-gray-300 font-mono text-sm">{camera.id}</span>
      </td>

      {/* Label */}
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            placeholder="Camera label"
          />
        ) : (
          <span className="text-gray-200 font-medium">{camera.label}</span>
        )}
      </td>

      {/* IP Address */}
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editIP}
            onChange={(e) => setEditIP(e.target.value)}
            className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            placeholder="192.168.1.100"
          />
        ) : (
          <span className="text-gray-300 font-mono text-sm bg-gray-800/50 px-2 py-1 rounded">
            {camera.ip}
          </span>
        )}
      </td>

      {/* Source URL */}
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editSrc}
            onChange={(e) => setEditSrc(e.target.value)}
            className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            placeholder="rtsp://camera-url or http://stream-url"
          />
        ) : camera.src ? (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded">
              {truncateUrl(camera.src)}
            </span>
            <a
              href={camera.src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
              title="Open source URL"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : (
          <span className="text-gray-500 italic">No URL</span>
        )}
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        {isEditing ? (
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="bg-gray-800/90 text-white border border-gray-500/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        ) : (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg ${
              camera.status === 'Active'
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                camera.status === 'Active' ? 'bg-green-300' : 'bg-red-300'
              }`}
            ></span>
            {camera.status}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                onClick={saveChanges}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-105 font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </>
                )}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isLoading}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 transform hover:scale-105 font-semibold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-4 py-2 rounded-lg hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 transform hover:scale-105 font-semibold text-sm shadow-lg flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-105 font-semibold text-sm shadow-lg flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default CameraRow;