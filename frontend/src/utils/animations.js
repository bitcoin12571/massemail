// Animation presets for Framer Motion
export const animationDurations = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.6,
  verySlow: 0.8
};

// Common entrance animations
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: animationDurations.normal }
  }
};

export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: animationDurations.normal, ease: 'easeOut' }
  }
};

export const slideDown = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: animationDurations.normal, ease: 'easeOut' }
  }
};

export const slideLeft = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: animationDurations.normal, ease: 'easeOut' }
  }
};

export const slideRight = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: animationDurations.normal, ease: 'easeOut' }
  }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: animationDurations.normal, ease: 'easeOut' }
  }
};

export const scaleInCenter = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: animationDurations.normal, ease: 'easeOut' }
  }
};

// Staggered container for child animations
export const containerVariants = (delay = 0.1) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: delay,
      delayChildren: 0
    }
  }
});

// Hover effects
export const hoverScale = {
  whileHover: { scale: 1.02 },
  transition: { duration: animationDurations.fast }
};

export const hoverGrow = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.98 },
  transition: { duration: animationDurations.fast }
};

export const hoverShadow = {
  whileHover: { boxShadow: '0 20px 40px rgba(32,34,53,.15)' },
  transition: { duration: animationDurations.fast }
};

// Counter animation configuration
export const counterVariant = (duration = 2) => ({
  from: 0,
  to: 1,
  transition: { duration }
});

// Success animation
export const successBounce = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 200, damping: 15 }
  }
};

// Loading pulse
export const pulse = {
  animate: { opacity: [0.5, 1, 0.5] },
  transition: { repeat: Infinity, duration: 2 }
};

// Page transition
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 }
};

// Flip animation (for cards)
export const flipCard = {
  hidden: { rotateY: -90, opacity: 0 },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

// Bounce entrance
export const bounceIn = {
  hidden: { scale: 0.3, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.4
    }
  }
};

// Shimmer loading effect
export const shimmer = {
  backgroundPosition: ['200% center', '-200% center'],
  transition: {
    duration: 2,
    repeat: Infinity
  }
};
