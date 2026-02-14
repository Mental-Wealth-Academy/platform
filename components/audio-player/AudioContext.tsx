'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'

const TRACKS = [
  { name: 'Neo Soul', url: '/Intimate-Neo-Soul.mp3' },
]

const STORAGE_KEY_TRACK_INDEX = 'audioPlayer_trackIndex'
const STORAGE_KEY_CURRENT_TIME = 'audioPlayer_currentTime'
const STORAGE_KEY_SAVED_TRACK_INDEX = 'audioPlayer_savedTrackIndex'

interface AudioContextType {
  currentTrackIndex: number
  isPlaying: boolean
  currentTrack: { name: string; url: string }
  togglePlayPause: () => void
  nextTrack: () => void
  prevTrack: () => void
}

const AudioContext = createContext<AudioContextType | null>(null)

export function useAudio() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_TRACK_INDEX)
      if (saved !== null) {
        const idx = parseInt(saved, 10)
        return idx >= 0 && idx < TRACKS.length ? idx : 0
      }
    }
    return 0
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isInitializedRef = useRef(false)

  const currentTrack = TRACKS[currentTrackIndex]

  // Create audio element once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Create a persistent audio element
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    // Load saved track
    const savedIndex = localStorage.getItem(STORAGE_KEY_TRACK_INDEX)
    const parsed = savedIndex !== null ? parseInt(savedIndex, 10) : 0
    const trackIndex = parsed >= 0 && parsed < TRACKS.length ? parsed : 0
    audio.src = TRACKS[trackIndex].url

    // Handle track end
    const handleEnded = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    // Restore playback position
    const handleCanPlay = () => {
      if (!isInitializedRef.current) {
        const savedTime = localStorage.getItem(STORAGE_KEY_CURRENT_TIME)
        const savedTrackIndex = localStorage.getItem(STORAGE_KEY_SAVED_TRACK_INDEX)

        if (savedTime && savedTrackIndex && parseInt(savedTrackIndex, 10) === trackIndex) {
          const time = parseFloat(savedTime)
          if (!isNaN(time) && time > 0 && time < audio.duration) {
            audio.currentTime = time
          }
        }
        isInitializedRef.current = true
      }
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  // Save track index to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TRACK_INDEX, currentTrackIndex.toString())
    }
  }, [currentTrackIndex])

  // Save current time periodically
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const saveTime = () => {
      if (typeof window !== 'undefined' && audio.currentTime > 0 && !audio.paused) {
        localStorage.setItem(STORAGE_KEY_CURRENT_TIME, audio.currentTime.toString())
        localStorage.setItem(STORAGE_KEY_SAVED_TRACK_INDEX, currentTrackIndex.toString())
      }
    }

    const interval = setInterval(saveTime, 1000)
    return () => clearInterval(interval)
  }, [currentTrackIndex])

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !isInitializedRef.current) return

    const wasPlaying = !audio.paused
    audio.src = currentTrack.url

    // Clear saved time when track changes
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_CURRENT_TIME)
      localStorage.removeItem(STORAGE_KEY_SAVED_TRACK_INDEX)
    }

    const handleCanPlay = () => {
      if (wasPlaying) {
        audio.play().catch(console.log)
      }
      audio.removeEventListener('canplay', handleCanPlay)
    }

    audio.addEventListener('canplay', handleCanPlay)
    audio.load()

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [currentTrackIndex, currentTrack.url])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(console.log)
    }
  }

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length)
  }

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length)
  }

  return (
    <AudioContext.Provider
      value={{
        currentTrackIndex,
        isPlaying,
        currentTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}
