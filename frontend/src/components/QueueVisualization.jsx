import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Box, Typography, Stack } from '@mui/material';
import { slideUp, containerVariants } from '../utils/animations';

export default function QueueVisualization({ stats }) {
  const { waiting = 0, active = 0, completed = 0, failed = 0, total = 0 } = stats;

  const data = [
    { name: 'Waiting', value: waiting, color: '#f97316' },
    { name: 'Active', value: active, color: '#3b82f6' },
    { name: 'Completed', value: completed, color: '#10b981' },
    { name: 'Failed', value: failed, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const progress = total ? Math.round((completed / total) * 100) : 0;

  const COLORS = {
    waiting: '#f97316',
    active: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444'
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants(0.1)}
      style={{ width: '100%', height: '100%' }}
    >
      <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ height: '100%', p: 3 }}>
        <motion.div
          className="queue-chart-wrap"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <Box className="queue-chart-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Typography className="queue-chart-percent">{progress}%</Typography>
              <Typography variant="caption" color="text.secondary">Finalizat</Typography>
            </motion.div>
          </Box>
        </motion.div>

        {/* Stats Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            width: '100%',
            mt: 2
          }}
        >
          {Object.entries({
            Waiting: { value: waiting, color: COLORS.waiting },
            Active: { value: active, color: COLORS.active },
            Completed: { value: completed, color: COLORS.completed },
            Failed: { value: failed, color: COLORS.failed }
          }).map(([label, { value, color }], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
            >
              <Box
                sx={{
                  p: 2,
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  borderRadius: 2,
                  textAlign: 'center'
                }}
              >
                <Typography
                  sx={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color
                  }}
                >
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Box>

        {/* Animated Pulse for Active */}
        {active > 0 && (
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(59, 130, 246, 0.7)',
                '0 0 0 12px rgba(59, 130, 246, 0)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              width: '12px',
              height: '12px',
              background: '#3b82f6',
              borderRadius: '50%',
              right: '24px',
              top: '24px'
            }}
          />
        )}
      </Stack>
    </motion.div>
  );
}
