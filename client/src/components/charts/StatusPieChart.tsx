import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { StatusCounts } from '../../types/Report';

interface StatusPieChartProps {
  data: StatusCounts;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

const STATUS_COLORS: Record<string, string> = {
  'Approved': '#28a745',
  'Approved (Final)': '#20c997',
  'Failed': '#dc3545',
  'Failed (Absence)': '#fd7e14',
  'Pending': '#ffc107'
};

/**
 * StatusPieChart - Displays a pie chart of student status distribution.
 */
const StatusPieChart: React.FC<StatusPieChartProps> = ({ data }) => {
  const chartData: ChartDataItem[] = [
    { name: 'Approved', value: data.approvedCount, color: STATUS_COLORS['Approved'] },
    { name: 'Approved (Final)', value: data.approvedFinalCount, color: STATUS_COLORS['Approved (Final)'] },
    { name: 'Failed', value: data.notApprovedCount, color: STATUS_COLORS['Failed'] },
    { name: 'Failed (Absence)', value: data.failedByAbsenceCount, color: STATUS_COLORS['Failed (Absence)'] },
    { name: 'Pending', value: data.pendingCount, color: STATUS_COLORS['Pending'] }
  ].filter(item => item.value > 0);

  const hasData = chartData.length > 0;

  const renderCustomLabel = ({ name, percent }: { name: string; percent: number }) => {
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="chart-container">
      <h4>Student Status Distribution</h4>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          {hasData ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} student(s)`, '']}
              />
              <Legend />
            </PieChart>
          ) : (
            <PieChart>
              <Pie
                data={[{ name: 'No Data', value: 1 }]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#e0e0e0"
                dataKey="value"
                label={false}
              >
                <Cell fill="#e0e0e0" />
              </Pie>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="chart-no-data-text"
                fill="#666"
              >
                Ainda não há notas lançadas para gerar o gráfico.
              </text>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatusPieChart;
