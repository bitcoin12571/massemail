import { useEffect, useRef, useState } from 'react';

/**
 * Hook that triggers animations when element scrolls into view
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection threshold (0-1, default: 0.1)
 * @param {string} options.rootMargin - Root margin for intersection (default: "0px 0px -100px 0px")
 * @returns {Object} - { ref, isInView }
 */
export function useAnimationOnScroll(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -100px 0px'
  } = options;

  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Stop observing once in view for one-time animations
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin]);

  return { ref, isInView };
}

/**
 * Hook for continuous animation trigger on scroll
 * Useful for parallax effects
 */
export function useScrollAnimation() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
}

/**
 * Hook for animating numbers/counters
 */
export function useCounter(end, duration = 2000, start = 0) {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);

  useEffect(() => {
    const incrementTime = duration / (end - start);
    let currentTime = 0;

    const timer = setInterval(() => {
      currentTime += incrementTime;
      if (currentTime >= duration) {
        setCount(end);
        clearInterval(timer);
      } else {
        const progress = currentTime / duration;
        const newCount = Math.floor(start + (end - start) * progress);
        countRef.current = newCount;
        setCount(newCount);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [end, duration, start]);

  return count;
}
