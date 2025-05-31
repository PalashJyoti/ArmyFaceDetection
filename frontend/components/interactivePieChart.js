import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

// Emotion color map (use your existing map)
const emotionColors = {
  HAPPY: '#FFD700',
  SAD: '#1E90FF',
  ANGER: '#FF4500',
  FEAR: '#800080',
  SURPRISE: '#00CED1',
  DISGUST: '#228B22',
  // fallback: '#8884d8'
};

// Active shape function
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={fill} fontWeight="bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="white">
        {`${value} (${(percent * 100).toFixed(1)}%)`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export default function InteractivePieChart({ pieData }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  if (!pieData || pieData.length === 0) {
    return <p className="text-center text-gray-500">No pie chart data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={130}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          onMouseEnter={onPieEnter}
        >
          {pieData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={emotionColors[entry.name?.toUpperCase()] || '#8884d8'}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
