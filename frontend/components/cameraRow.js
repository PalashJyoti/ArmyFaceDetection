import React from 'react';

const CameraRow = ({ camera, index, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editLabel, setEditLabel] = React.useState(camera.label);
  const [editIP, setEditIP] = React.useState(camera.ip);
  const [editStatus, setEditStatus] = React.useState(camera.status);

  const saveChanges = () => {
    if (!editLabel.trim() || !editIP.trim()) {
      alert('Label and IP cannot be empty.');
      return;
    }
    onUpdate({
      id: camera.id,
      label: editLabel.trim(),
      ip: editIP.trim(),
      status: editStatus,
    });
    setIsEditing(false);
  };

  return (
    <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-indigo-50'} border-t border-gray-200`}>
      <td className="px-6 py-4">{camera.id}</td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 w-full"
          />
        ) : (
          camera.label
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editIP}
            onChange={(e) => setEditIP(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 w-full"
          />
        ) : (
          camera.ip
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        ) : (
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white ${
              camera.status === 'Active' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {camera.status}
          </span>
        )}
      </td>
      <td className="px-6 py-4 space-x-2">
        {isEditing ? (
          <>
            <button
              onClick={saveChanges}
              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-400 text-white px-3 py-1 rounded-md hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(camera.id)}
              className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition"
            >
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  );
};


export default CameraRow;