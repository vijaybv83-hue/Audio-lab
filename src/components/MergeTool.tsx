import React, { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Square, Plus, Trash2, Music, Download, Loader2, Volume2, VolumeX, Wand2, ArrowLeft, Layers, Save, FolderOpen, Undo, Redo } from 'lucide-react';
import { mixDownTracks, MixdownTrack } from '../lib/audioUtils';
import AudioEffectsPanel from './AudioEffectsPanel';
import { saveProject, loadProject } from '../lib/storageUtils';
import { useHistory } from '../lib/useHistory';

export interface TrackData extends MixdownTrack {
  id: string;
  name: string;
}

interface TrackRowProps {
  track: TrackData;
  onUpdate: (id: string, updates: Partial<TrackData>) => void;
  onRemove: (id: string) => void;
  registerWs: (id: string, ws: WaveSurfer | null) => void;
}

const TrackRow: React.FC<TrackRowProps> = ({
  track,
  onUpdate,
  onRemove,
  registerWs
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [showFx, setShowFx] = useState(false);
  const [localVolume, setLocalVolume] = useState(track.volume);

  useEffect(() => {
    setLocalVolume(track.volume);
  }, [track.volume]);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(0, 224, 255, 0.4)',
      progressColor: '#00E0FF',
      cursorColor: '#FF5C00',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 96,
      normalize: true
    });

    wsRef.current = ws;
    registerWs(track.id, ws);

    return () => {
      ws.destroy();
      registerWs(track.id, null);
    };
  }, [track.id, registerWs]);

  useEffect(() => {
    if (wsRef.current && track.blob) {
      const url = URL.createObjectURL(track.blob);
      wsRef.current.load(url);
    }
  }, [track.blob]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.setVolume(track.isMuted ? 0 : localVolume);
    }
  }, [localVolume, track.isMuted]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.setPlaybackRate(track.rate, track.preservePitch);
    }
  }, [track.rate, track.preservePitch]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVolume(parseFloat(e.target.value));
  };
  
  const handleVolumeCommit = () => {
    if (localVolume !== track.volume) {
      onUpdate(track.id, { volume: localVolume });
    }
  };

  const toggleMute = () => {
    onUpdate(track.id, { isMuted: !track.isMuted });
  };

  return (
    <div className="flex border border-white/5 bg-white/5 rounded-xl overflow-hidden mb-4 relative">
      <div className="w-64 bg-[#090A0F] border-r border-white/5 p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#E0E0E6] truncate w-32" title={track.name}>{track.name}</h3>
          <div className="flex gap-1">
            <button
              onClick={toggleMute}
              aria-label={track.isMuted ? "Unmute track" : "Mute track"}
              aria-pressed={track.isMuted}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${track.isMuted ? 'bg-[#FF5C00]/20 text-[#FF5C00]' : 'text-white/40 hover:bg-white/10'}`}
            >
              {track.isMuted ? <VolumeX className="w-3.5 h-3.5" aria-hidden="true" /> : <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
            <button 
              onClick={() => onRemove(track.id)} 
              aria-label="Remove track"
              className="w-7 h-7 flex items-center justify-center rounded text-white/30 hover:bg-red-500/20 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor={`track-vol-${track.id}`} className="text-[10px] font-medium text-white/30 uppercase tracking-widest flex justify-between mb-2">
              <span>Volume</span>
              <span className="font-mono text-[#00E0FF]">{Math.round(localVolume * 100)}%</span>
            </label>
            <input 
              id={`track-vol-${track.id}`}
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={localVolume} 
              onChange={handleVolumeChange}
              onPointerUp={handleVolumeCommit}
              onTouchEnd={handleVolumeCommit}
              className="w-full accent-[#00E0FF]" 
              aria-label={`Volume for ${track.name}`}
            />
          </div>

          <div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
              <button 
                onClick={() => setShowFx(!showFx)}
                aria-expanded={showFx}
                aria-label={showFx ? "Close FX Studio panel" : "Open FX Studio panel"}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded transition-colors uppercase font-bold tracking-wider text-[10px] border ${showFx ? 'bg-[#00E0FF]/20 text-[#00E0FF] border-[#00E0FF]/50' : 'bg-transparent text-[#00E0FF] border-[#00E0FF]/20 hover:bg-[#00E0FF]/10'}`}
              >
                <Wand2 className="w-3 h-3" aria-hidden="true" /> FX / Pitch
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 relative waveform-container p-4 flex items-center bg-[#090A0F]/50">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="w-full relative z-10" ref={containerRef} />
        </div>
        
        {showFx && (
          <div className="border-t border-[#00E0FF]/20 bg-[#00E0FF]/5">
            <AudioEffectsPanel 
              audioBlob={track.blob}
              onApply={(newBlob) => {
                onUpdate(track.id, { blob: newBlob, rate: 1.0 }); // Reset rate to 1 since pitching applies destrutively
                setShowFx(false);
              }}
              inline={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};


export default function MergeTool({ onBack }: { onBack: () => void }) {
  const {
    state: tracks,
    pushState: setTracks,
    undo: undoTracks,
    redo: redoTracks,
    canUndo: canUndoTracks,
    canRedo: canRedoTracks,
    resetSelection: resetTracks
  } = useHistory<TrackData[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  
  const wsInstances = useRef<Map<string, WaveSurfer>>(new Map());

  const registerWs = useCallback((id: string, ws: WaveSurfer | null) => {
    if (ws) wsInstances.current.set(id, ws);
    else wsInstances.current.delete(id);
  }, []);

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      await saveProject(tracks);
      alert("Project saved successfully to local storage!");
    } catch (err) {
      console.error(err);
      alert("Failed to save project.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadProject = async () => {
    if (tracks.length > 0) {
      const confirmLoad = window.confirm("Loading a project will replace your current tracks. Continue?");
      if (!confirmLoad) return;
    }
    
    setIsLoadingProject(true);
    stopAll(); // Stop any active playback before swapping tracks
    
    try {
      const savedTracks = await loadProject();
      if (savedTracks && savedTracks.length > 0) {
        resetTracks(savedTracks);
      } else {
        alert("No saved project found in local storage.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load project.");
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleAddTrack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newTrack: TrackData = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      blob: file,
      volume: 1,
      rate: 1,
      preservePitch: true,
      isMuted: false
    };

    setTracks(prev => [...prev, newTrack]);
    e.target.value = '';
  };

  const handleUpdateTrack = useCallback((id: string, updates: Partial<TrackData>) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const handleRemoveTrack = useCallback((id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
  }, []);

  const playAll = () => {
    if (tracks.length === 0) return;
    setIsPlaying(true);
    wsInstances.current.forEach(ws => ws.play());
  };

  const pauseAll = () => {
    setIsPlaying(false);
    wsInstances.current.forEach(ws => ws.pause());
  };

  const stopAll = () => {
    setIsPlaying(false);
    wsInstances.current.forEach(ws => {
      ws.stop();
      ws.seekTo(0);
    });
  };

  const handleExport = async () => {
    if (tracks.length === 0) return;
    setIsExporting(true);
    try {
      const mixedBlob = await mixDownTracks(tracks);
      const url = URL.createObjectURL(mixedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AudioLab_MasterMix.wav';
      a.click();
    } catch (err) {
      console.error(err);
      alert("Failed to mix down tracks. Ensure there are active, non-muted tracks.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#07080B] text-[#E0E0E6] overflow-hidden font-sans">
      <header className="h-16 px-6 border-b border-white/10 bg-[#0D0E14] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            aria-label="Back to Mode Selection"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <Layers className="w-5 h-5 text-[#00E0FF]" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Merge Audio</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2 border-r border-white/10 pr-4">
            <button
               onClick={undoTracks}
               disabled={!canUndoTracks}
               aria-label="Undo last action"
               className="w-8 h-8 flex items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
               onClick={redoTracks}
               disabled={!canRedoTracks}
               aria-label="Redo last action"
               className="w-8 h-8 flex items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          
          <button 
            onClick={handleLoadProject} 
            disabled={isLoadingProject}
            aria-label="Load project from local storage"
            className="flex items-center gap-2 px-3 py-2 border border-white/20 bg-white/5 rounded text-xs font-bold uppercase tracking-widest text-white/70 cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
          >
            {isLoadingProject ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <FolderOpen className="w-4 h-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Load</span>
          </button>
          <button 
            onClick={handleSaveProject} 
            disabled={isSaving || tracks.length === 0}
            aria-label="Save current project to local storage"
            className="flex items-center gap-2 px-3 py-2 border border-[#FF5C00]/30 bg-[#FF5C00]/10 rounded text-xs font-bold uppercase tracking-widest text-[#FF5C00] cursor-pointer hover:bg-[#FF5C00]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Save</span>
          </button>
          
          <label htmlFor="global-add-track" className="flex items-center gap-2 px-4 py-2 border border-[#00E0FF]/30 bg-[#00E0FF]/10 rounded text-xs font-bold uppercase tracking-widest text-[#00E0FF] cursor-pointer hover:bg-[#00E0FF]/20 transition-colors">
            <Plus className="w-4 h-4" aria-hidden="true" /> Add Track
            <input id="global-add-track" type="file" accept="audio/*" className="hidden" onChange={handleAddTrack} aria-label="Upload an audio track" />
          </label>
        </div>
      </header>

      <div className="h-20 bg-[#090A0F] border-b border-white/5 flex items-center px-6 justify-between shrink-0 shadow-lg z-10" role="toolbar" aria-label="Global Transport Controls">
        <div className="flex items-center gap-4 bg-white/5 rounded-full p-1 border border-white/5">
          <button 
            onClick={stopAll} 
            aria-label="Stop all playback"
            className="w-12 h-12 flex items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Square className="w-5 h-5" aria-hidden="true" />
          </button>
          <button 
            onClick={isPlaying ? pauseAll : playAll} 
            aria-label={isPlaying ? "Pause mix" : "Play mix"}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-[#00E0FF] glow-blue transition-colors hover:bg-blue-500"
          >
            {isPlaying ? <Pause className="w-6 h-6 text-[#090A0F]" aria-hidden="true" /> : <Play className="w-6 h-6 text-[#090A0F] translate-x-1" aria-hidden="true" />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-4" aria-live="polite">
            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Master Output</div>
            <div className="lcd-text text-xl font-bold italic">{tracks.filter(t => !t.isMuted).length} Tracks Active</div>
          </div>
          <button 
            onClick={handleExport} 
            disabled={tracks.length === 0 || isExporting} 
            aria-label={isExporting ? "Mixing and exporting master audio" : "Merge and Export Master Mix"}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#00E0FF] text-[#090A0F] hover:bg-white transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />} Merge & Export
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {tracks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/5 rounded-xl">
            <Music className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-mono uppercase tracking-widest block">No tracks to merge.</p>
          </div>
        ) : (
          tracks.map(track => <TrackRow key={track.id} track={track} onUpdate={handleUpdateTrack} onRemove={handleRemoveTrack} registerWs={registerWs} />)
        )}
      </main>
    </div>
  );
}
