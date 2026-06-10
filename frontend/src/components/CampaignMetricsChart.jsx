import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Box, Paper, Typography, Stack } from '@mui/material';
import { slideUp } from '../utils/animations';

/**
 * Sample data - in real app this would come from API
 */
const generateSampleData = () => {
  const data = [];
  for (let i = 0; i < 12; i++) {
    data.push({
      name: `Week ${i + 1}`,
      sent: Math.floor(Math.random() * 500) + 100,
      delivered: Math.floor(Math.random() * 450) + 50,
      opened: Math.floor(Math.random() * 300) + 20,
      clicked: Math.floor(Math.random() * 150) + 5
    });
  }
  return data;
};

export default function CampaignMetricsChart() {
  const data = generateSampleData();

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={chartVariants}
      style={{ width: '100%', height: '100%' }}
    >
      <Paper
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #f7f8fc 0%, #ffffff 100%)',
          border: '1px solid #ebecf1',
          borderRadius: 2,
          boxShadow: '0 4px 18px rgba(32,34,53,.035)'
        }}
      >
        <Stack spacing={3}>
          {/* Header */}
          <motion.div variants={slideUp}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Campaign Performance Metrics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email delivery and engagement trends over time
              </Typography>
            </Box>
          </motion.div>

          {/* Main Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ececf1" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#75788d' }}
                  axisLine={{ stroke: '#ececf1' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#75788d' }}
                  axisLine={{ stroke: '#ececf1' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  cursor={{ fill: 'rgba(103,86,232,0.05)' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />

                {/* Bars for sent and delivered */}
                <Bar dataKey="sent" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="delivered" fill="#10b981" radius={[8, 8, 0, 0]} />

                {/* Lines for opened and clicked */}
                <Line
                  type="monotone"
                  dataKey="opened"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="clicked"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 2,
                pt: 2,
                borderTop: '1px solid #efeff3'
              }}
            >
              {[
                {
                  label: 'Avg Sent',
                  value: Math.floor(data.reduce((a, b) => a + b.sent, 0) / data.length),
                  color: '#8b5cf6'
                },
                {
                  label: 'Avg Delivered',
                  value: Math.floor(data.reduce((a, b) => a + b.delivered, 0) / data.length),
                  color: '#10b981'
                },
                {
                  label: 'Avg Opened',
                  value: Math.floor(data.reduce((a, b) => a + b.opened, 0) / data.length),
                  color: '#3b82f6'
                },
                {
                  label: 'Avg Clicked',
                  value: Math.floor(data.reduce((a, b) => a + b.clicked, 0) / data.length),
                  color: '#f97316'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.08 }}
                >
                  <Box
                    sx={{
                      p: 2,
                      background: `${stat.color}10`,
                      border: `1px solid ${stat.color}30`,
                      borderRadius: 1,
                      textAlign: 'center'
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: stat.color,
                        mb: 0.5
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </Stack>
      </Paper>
    </motion.div>
  );
}
