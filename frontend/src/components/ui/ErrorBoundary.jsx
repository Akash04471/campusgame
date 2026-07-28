import React from 'react'

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[React Error Boundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#09090b',
          color: '#f87171',
          padding: '40px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ fontSize: '1.8rem', margin: '0 0 16px 0', color: '#ef4444', fontFamily: 'Orbitron, sans-serif' }}>
            ⚠️ Campus Undercover — System Error
          </h2>
          <p style={{ maxWidth: '600px', margin: '0 0 20px 0', color: '#d1d5db', fontSize: '1rem' }}>
            A runtime component error occurred. Please refresh or check backend API connectivity.
          </p>
          <pre style={{
            background: '#18181b',
            padding: '16px 20px',
            borderRadius: '8px',
            border: '1px solid #27272a',
            color: '#fca5a5',
            fontSize: '0.85rem',
            textAlign: 'left',
            maxWidth: '90%',
            overflowX: 'auto',
            fontFamily: 'monospace'
          }}>
            {String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '12px 28px',
              borderRadius: '6px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            🔄 Reload Application
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
