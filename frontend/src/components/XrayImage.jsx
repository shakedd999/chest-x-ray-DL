import { useEffect, useState } from 'react';
import { getStudyImageUrl } from '../lib/studies.js';

export default function XrayImage({ imagePath, alt = 'Chest X-ray', invert = false, zoom = 1 }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setError(null);
    if (!imagePath) return;
    getStudyImageUrl(imagePath)
      .then((u) => {
        if (alive) setUrl(u);
      })
      .catch((e) => {
        if (alive) setError(e);
      });
    return () => {
      alive = false;
    };
  }, [imagePath]);

  if (error) {
    return (
      <div style={{ color: 'var(--fg-2)', fontSize: 12, padding: 24, textAlign: 'center' }}>
        Image unavailable
      </div>
    );
  }
  if (!url) {
    return (
      <div style={{ color: 'var(--fg-3)', fontSize: 12, padding: 24, textAlign: 'center' }}>
        Loading image…
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
        filter: invert ? 'invert(1)' : 'none',
        transform: `scale(${zoom})`,
        transformOrigin: 'center',
        transition: 'transform 200ms ease, filter 120ms',
      }}
    />
  );
}
