export default function XrayImage({ dataUrl, alt = 'Chest X-ray', invert = false, zoom = 1 }) {
  if (!dataUrl) {
    return (
      <div style={{ color: 'var(--fg-3)', fontSize: 12, padding: 24, textAlign: 'center' }}>
        Image unavailable
      </div>
    );
  }
  return (
    <img
      src={dataUrl}
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
