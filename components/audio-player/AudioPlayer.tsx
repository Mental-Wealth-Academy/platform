'use client'

import { useAudio } from './AudioContext'

export default function AudioPlayer() {
  const { currentTrack, isPlaying, togglePlayPause, nextTrack, prevTrack } = useAudio()

  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 12px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          gap: '8px',
        }}
      >
        {/* Previous Button */}
        <button
          onClick={prevTrack}
          style={{
            color: '#1A1D33',
            borderRadius: '4px',
            background: '#ffffff',
            border: '2px solid #1A1D33',
            width: '20px',
            height: '20px',
            minWidth: '20px',
            minHeight: '20px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 #1A1D33',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)'
            e.currentTarget.style.boxShadow = '3px 3px 0 #1A1D33'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '2px 2px 0 #1A1D33'
          }}
          aria-label="Previous track"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6L6 18M17 6L10 12L17 18L17 6Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          style={{
            color: '#ffffff',
            borderRadius: '4px',
            background: '#5168FF',
            border: '2px solid #1A1D33',
            width: '26px',
            height: '26px',
            minWidth: '26px',
            minHeight: '26px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 #1A1D33',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)'
            e.currentTarget.style.boxShadow = '3px 3px 0 #1A1D33'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '2px 2px 0 #1A1D33'
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
              <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 5L8 19L19 12L8 5Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={nextTrack}
          style={{
            color: '#1A1D33',
            borderRadius: '4px',
            background: '#ffffff',
            border: '2px solid #1A1D33',
            width: '20px',
            height: '20px',
            minWidth: '20px',
            minHeight: '20px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0 #1A1D33',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-1px, -1px)'
            e.currentTarget.style.boxShadow = '3px 3px 0 #1A1D33'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '2px 2px 0 #1A1D33'
          }}
          aria-label="Next track"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L18 18M7 6L14 12L7 18L7 6Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Track Name */}
        <div
          style={{
            color: '#62BE8F',
            borderRadius: '4px',
            background: 'rgba(98, 190, 143, 0.1)',
            border: '2px solid #1A1D33',
            boxShadow: '2px 2px 0 #1A1D33',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            padding: '4px 10px',
            minWidth: '80px',
            textAlign: 'center',
            flexShrink: 0,
            textTransform: 'uppercase'
          }}
        >
          {currentTrack.name}
        </div>
      </div>
    </div>
  )
}
