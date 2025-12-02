// src/components/ui/AnimatedCounter.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const AnimatedCounter = ({ value, duration = 2000, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let start = 0;
    const end = parseInt(value.toString().replace(/[^0-9]/g, ''));
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, value, duration]);

  const formatNumber = (num) => {
    if (value.toString().includes('%')) {
      return `${prefix}${count}${suffix}`;
    }
    return `${prefix}${count.toLocaleString()}${suffix}`;
  };

  return (
    <Typography
      ref={ref}
      variant="h4"
      fontWeight={800}
      color="primary.main"
      sx={{
        fontFeatureSettings: '"tnum"',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {formatNumber(count)}
    </Typography>
  );
};

AnimatedCounter.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  duration: PropTypes.number,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
};

export default AnimatedCounter;
