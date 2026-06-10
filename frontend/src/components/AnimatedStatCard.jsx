import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Paper, Typography } from '@mui/material';
import { scaleIn, hoverScale, animationDurations } from '../utils/animations';
import { useAnimationOnScroll } from '../hooks/useAnimationOnScroll';

export default function AnimatedStatCard({
  label,
  value,
  change,
  icon: Icon,
  tone = 'violet',
  index = 0,
  animated = true
}) {
  const { ref, isInView } = useAnimationOnScroll();
  const [displayValue, setDisplayValue] = useState(animated && isInView ? 0 : value);

  // Animate counter
  useEffect(() => {
    if (!animated || !isInView) {
      setDisplayValue(value);
      return;
    }

    if (typeof value === 'number') {
      const startValue = 0;
      const endValue = value;
      const duration = 1.5;
      const steps = 60;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
        setDisplayValue(currentValue);

        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayValue(endValue);
        }
      }, stepDuration * 1000 / 60);

      return () => clearInterval(interval);
    } else {
      setDisplayValue(value);
    }
  }, [isInView, value, animated]);

  const delay = index * 0.1;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: animationDurations.normal,
            delay,
            ease: 'easeOut'
          }
        }
      }}
      whileHover={{ y: -4 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Paper
        className="stat-card"
        sx={{
          background: getGradient(tone),
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: `0 12px 32px ${getShadowColor(tone)}`,
            transform: 'translateY(-4px)'
          }
        }}
      >
        {/* Animated Icon */}
        <motion.div
          className={`stat-icon ${tone}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{
            duration: 0.5,
            delay: delay + 0.2,
            type: 'spring',
            stiffness: 200,
            damping: 15
          }}
        >
          <Icon size={20} />
        </motion.div>

        {/* Label */}
        <Typography
          color="text.secondary"
          fontWeight={600}
          sx={{
            animation: `fadeIn ${animationDurations.normal}s ease-out ${delay + 0.1}s backwards`
          }}
        >
          {label}
        </Typography>

        {/* Animated Value */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: delay + 0.2 }}
        >
          <Typography
            className="stat-value"
            sx={{
              background: `linear-gradient(135deg, ${getGradientStart(tone)}, ${getGradientEnd(tone)})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {displayValue}
          </Typography>
        </motion.div>

        {/* Change Label */}
        <Typography
          className="stat-change"
          sx={{
            opacity: 0.8,
            animation: `slideUp ${animationDurations.normal}s ease-out ${delay + 0.3}s backwards`
          }}
        >
          {change}
        </Typography>

        {/* Background Animated Accent */}
        <motion.div
          className={`stat-accent stat-accent-${tone}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 0.1 } : { scale: 0, opacity: 0 }}
          transition={{
            duration: 0.6,
            delay: delay + 0.4,
            type: 'spring'
          }}
          style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            bottom: '-30px',
            right: '-30px',
            background: getAccentColor(tone),
            zIndex: 0
          }}
        />
      </Paper>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </motion.div>
  );
}

function getGradient(tone) {
  const gradients = {
    violet: 'linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)',
    blue: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
    green: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
    orange: 'linear-gradient(135deg, #fed7aa 0%, #fef3c7 100%)',
    red: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)'
  };
  return gradients[tone] || gradients.violet;
}

function getGradientStart(tone) {
  const colors = {
    violet: '#8b5cf6',
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
    red: '#ef4444'
  };
  return colors[tone] || colors.violet;
}

function getGradientEnd(tone) {
  const colors = {
    violet: '#6d28d9',
    blue: '#1d4ed8',
    green: '#059669',
    orange: '#ea580c',
    red: '#dc2626'
  };
  return colors[tone] || colors.violet;
}

function getShadowColor(tone) {
  const colors = {
    violet: 'rgba(139, 92, 246, 0.3)',
    blue: 'rgba(59, 130, 246, 0.3)',
    green: 'rgba(16, 185, 129, 0.3)',
    orange: 'rgba(249, 115, 22, 0.3)',
    red: 'rgba(239, 68, 68, 0.3)'
  };
  return colors[tone] || colors.violet;
}

function getAccentColor(tone) {
  const colors = {
    violet: '#8b5cf6',
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
    red: '#ef4444'
  };
  return colors[tone] || colors.violet;
}
