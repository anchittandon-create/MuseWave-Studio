import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

export interface Track {
  id: string;
  trackName: string;
  prompt: string;
  genres: string[];
  durationRequested: number;
  durationGenerated: number;
  segmentsGenerated: number;
  audioMasterUrl: string | null;
  videoUrl: string | null;
  status: string;
  progressPercentage: number;
  createdAt: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  closePlayer: () => void;
  isPlayerOpen: boolean;
  setIsPlayerOpen: (isOpen: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const playTrack = (track: Track) => {
    if (!track.audioMasterUrl) return;
    
    if (currentTrack?.id === track.id) {
      // Toggle play if same track
      togglePlay();
      setIsPlayerOpen(true);
      return;
    }

    setCurrentTrack(track);
    setIsPlayerOpen(true);
    
    if (audioRef.current) {
      audioRef.current.src = track.audioMasterUrl;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Playback failed", err);
        setIsPlaying(false);
      });
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error("Playback failed", err);
        });
      }
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const closePlayer = () => {
    setIsPlayerOpen(false);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      playTrack,
      togglePlay,
      seek,
      closePlayer,
      isPlayerOpen,
      setIsPlayerOpen
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
