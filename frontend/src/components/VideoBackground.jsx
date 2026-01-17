// components/VideoBackground.jsx
import React from 'react';

const VideoBackground = ({ src, fallbackSrc, alt }) => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
        aria-label={alt}
      >
        <source src={src} type="video/mp4" />
        <source src={fallbackSrc} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoBackground;
