'use client';

const STATUS_MESSAGES = {
  booting: 'Booting environment...',
  installing: 'Installing dependencies...',
  starting: 'Starting dev server...',
  error: null,   // handled separately
  ready: null,   // shows iframe
};

export default function PreviewPanel({ status, previewUrl, error }) {
  if (status === 'ready' && previewUrl) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#fff', position: 'relative' }}>
        <iframe
          src={previewUrl}
          title="Live Preview"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          allow="cross-origin-isolated"
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1e1e',
          padding: '2rem',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <p style={{ color: '#f48771', fontWeight: 600, margin: 0 }}>WebContainer Error</p>
        <p style={{ color: '#858585', fontSize: '13px', textAlign: 'center', margin: 0, maxWidth: '360px' }}>
          {error || 'An unknown error occurred.'}
        </p>
      </div>
    );
  }

  // Loading states: booting | installing | starting
  const message = STATUS_MESSAGES[status] ?? 'Loading...';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1e1e',
        gap: '16px',
      }}
    >
      <Spinner />
      <p style={{ color: '#9d9d9d', fontSize: '14px', margin: 0 }}>{message}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '3px solid #3c3c3c',
        borderTopColor: '#0070f3',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}
