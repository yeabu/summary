import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';

// 图表颜色配置
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// 图表容器组件
interface ChartWrapperProps {
  title: string;
  children: React.ReactNode;
  height?: number;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ title, children, height = 300 }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ width: '100%', height }}>
        <ResponsiveContainer>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

// 柱状图组件
interface BarChartComponentProps {
  data: any[];
  xKey: string;
  yKey: string;
  title: string;
  color?: string;
  height?: number;
}

export const BarChartComponent: React.FC<BarChartComponentProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#8884d8',
  height = 300
}) => {
  const theme = useTheme();
  
  return (
    <ChartWrapper title={title} height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={xKey} 
          fontSize={12}
          tick={{ fill: theme.palette.text.secondary }}
        />
        <YAxis 
          fontSize={12}
          tick={{ fill: theme.palette.text.secondary }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4
          }}
        />
        <Bar dataKey={yKey} fill={color} />
      </BarChart>
    </ChartWrapper>
  );
};

// 饼图组件
interface PieChartComponentProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  title: string;
  height?: number;
}

export const PieChartComponent: React.FC<PieChartComponentProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  height = 300
}) => {
  const theme = useTheme();
  
  const renderCustomizedLabel = (entry: any) => {
    const percent = ((entry[dataKey] / data.reduce((sum, item) => sum + item[dataKey], 0)) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <ChartWrapper title={title} height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4
          }}
        />
        <Legend />
      </PieChart>
    </ChartWrapper>
  );
};

// 折线图组件
interface LineChartComponentProps {
  data: any[];
  xKey: string;
  yKey: string;
  title: string;
  color?: string;
  height?: number;
}

export const LineChartComponent: React.FC<LineChartComponentProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#8884d8',
  height = 300
}) => {
  const theme = useTheme();
  
  return (
    <ChartWrapper title={title} height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={xKey} 
          fontSize={12}
          tick={{ fill: theme.palette.text.secondary }}
        />
        <YAxis 
          fontSize={12}
          tick={{ fill: theme.palette.text.secondary }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4
          }}
        />
        <Line 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          strokeWidth={2}
          dot={{ fill: color }}
        />
      </LineChart>
    </ChartWrapper>
  );
};

// 多系列柱状图
interface MultiBarChartProps {
  data: any[];
  xKey: string;
  series: { key: string; name: string; color?: string }[];
  title: string;
  height?: number;
}

export const MultiBarChart: React.FC<MultiBarChartProps> = ({
  data,
  xKey,
  series,
  title,
  height = 300
}) => {
  const theme = useTheme();
  
  return (
    <ChartWrapper title={title} height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={xKey} 
          fontSize={12}
          tick={{ fill: theme.palette.text.secondary }}
        />
        <YAxis 
          fontSize={12}
          tick={{ fill: theme.palette.text.secondary }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 4
          }}
        />
        {series.map((s) => (
          <Bar 
            key={s.key} 
            dataKey={s.key} 
            fill={s.color || COLORS[series.indexOf(s) % COLORS.length]} 
            name={s.name}
          />
        ))}
      </BarChart>
    </ChartWrapper>
  );
};

// 简单统计卡片
interface StatCardProps {
  title: string;
  value: string | number;
  color?: string;
  suffix?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  color = 'primary', 
  suffix = '' 
}) => {
  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h6" color={color}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>
        {value}{suffix}
      </Typography>
    </Paper>
  );
};