// components/VideoBackground.jsx
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const VideoBackground = ({ 
  src, 
  fallbackSrc, 
  alt, 
  poster, 
  className = '',
  loading = 'lazy',
  priority = false
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const handleError = () => {
    console.warn('Video failed to load:', src);
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    
    if (!video) return;

    // Set preload based on priority
    video.preload = priority ? 'auto' : 'metadata';

    // Load the video
    video.load();

    // Intersection Observer for lazy loading/playing
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (video.paused) {
              video.play().catch(e => {
                console.warn('Video autoplay failed:', e);
                // Fallback: Show poster if autoplay fails
                if (!poster) setHasError(true);
              });
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.25 }
    );

    if (loading === 'lazy') {
      observer.observe(video);
    } else {
      // Eager loading: try to play immediately
      video.play().catch(e => {
        console.warn('Immediate video play failed:', e);
      });
    }

    return () => {
      observer.disconnect();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [src, loading, priority, poster]);

  // Fallback to static image if video fails
  if (hasError && poster) {
    return (
      <div 
        className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
        style={{ 
          backgroundImage: `url(${poster})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <div className={`relative inset-0 w-full h-full overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay={loading === 'eager'}
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label={alt}
        onError={handleError}
        onLoadedData={handleLoad}
        onPlay={handlePlay}
        onPause={handlePause}
        poster={poster}
        // Accessibility: indicate this is decorative
        aria-hidden="true"
      >
        <source src={src} type="video/mp4" />
        {fallbackSrc && <source src={fallbackSrc} type="video/webm" />}
        {/* Fallback text for browsers that don't support video */}
        <p>{alt} - Your browser does not support HTML5 video.</p>
      </video>
      
      {/* Loading state */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-teal-900/80 to-green-900/80 animate-pulse" />
      )}
      
      {/* Play state indicator (debug/optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
          {isPlaying ? '▶ Playing' : '⏸ Paused'}
        </div>
      )}
    </div>
  );
};

VideoBackground.propTypes = {
  src: PropTypes.string.isRequired,
  fallbackSrc: PropTypes.string,
  alt: PropTypes.string.isRequired,
  poster: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.oneOf(['eager', 'lazy']),
  priority: PropTypes.bool,
};

VideoBackground.defaultProps = {
  loading: 'lazy',
  priority: false,
};

export default VideoBackground;
