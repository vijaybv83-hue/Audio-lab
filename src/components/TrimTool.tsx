import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { Play, Pause, Square, Upload, Download, ArrowLeft, Scissors, Crop, Loader2, Wand2, Undo, Redo } from 'lucide-react';
import { audioBufferToWav } from '../lib/audioUtils';
import AudioEffectsPanel from './AudioEffectsPanel';
import { useHistory } from '../lib/useHistory';

export default function TrimTool({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("No file loaded");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRegion, setHasRegion] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  const { 
    state: audioBlob, 
    pushState: pushAudioBlob, 
    undo: undoAudio, 
    redo: redoAudio, 
    canUndo: canUndoAudio, 
    canRedo: canRedoAudio,
    resetSelection: resetAudioBlob
  } = useHistory<Blob | null>(null);

  // Synchronize wavesurfer any time the blob changes (e.g. from upload, crop, FX, undo, redo)
  useEffect(() => {
    if (wavesurferRef.current) {
      if (audioBlob) {
        const objectUrl = URL.createObjectURL(audioBlob);
        wavesurferRef.current.load(objectUrl);
      } else {
        wavesurferRef.current.empty();
      }
      regionsPluginRef.current?.clearRegions();
      setHasRegion(false);
    }
  }, [audioBlob]);

  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const wsRegions = RegionsPlugin.create();
    regionsPluginRef.current = wsRegions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255, 92, 0, 0.4)',
      progressColor: '#FF5C00',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 160,
      normalize: true,
      plugins: [
        TimelinePlugin.create({ container: timelineRef.current }),
        wsRegions
      ],
    });

    wavesurferRef.current = ws;

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wsRegions.on('region-created', () => {
      // Clear all other regions so only one exists at a time
      const regions = wsRegions.getRegions();
      if (regions.length > 1) {
        regions[0].remove(); // remove old selection
      }
      setHasRegion(true);
    });

    wsRegions.on('region-removed', () => {
      if (wsRegions.getRegions().length === 0) setHasRegion(false);
    });

    return () => {
      ws.destroy();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wavesurferRef.current) return;

    setFileName(file.name);
    resetAudioBlob(file); // Reset history totally when a completely new file is loaded
    setShowEffects(false);
  };

  const handlePlayPause = () => {
    wavesurferRef.current?.playPause();
  };

  const handleStop = () => {
    wavesurferRef.current?.stop();
  };

  const handleAddRegion = () => {
    if (!regionsPluginRef.current || !wavesurferRef.current) return;
    const dur = wavesurferRef.current.getDuration();
    if (!dur) return;

    // Clear any existing
    regionsPluginRef.current.clearRegions();
    
    // Add new in middle
    const start = dur * 0.25;
    const end = dur * 0.75;

    regionsPluginRef.current.addRegion({
      start,
      end,
      color: 'rgba(255, 255, 255, 0.2)',
      resize: true,
      drag: true,
    });
  };

  const handleCrop = async () => {
    if (!regionsPluginRef.current || !wavesurferRef.current || !audioBlob) return;
    const regions = regionsPluginRef.current.getRegions();
    if (regions.length === 0) return;
    const region = regions[0];

    setIsProcessing(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const startOffset = Math.floor(region.start * sampleRate);
      const endOffset = Math.floor(region.end * sampleRate);
      const frameCount = endOffset - startOffset;

      if (frameCount > 0) {
        const newAudioBuffer = audioCtx.createBuffer(
          audioBuffer.numberOfChannels,
          frameCount,
          sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          const newChannelData = newAudioBuffer.getChannelData(channel);
          for (let i = 0; i < frameCount; i++) {
            newChannelData[i] = channelData[startOffset + i];
          }
        }

        const wavBlob = audioBufferToWav(newAudioBuffer);
        pushAudioBlob(wavBlob); // Push to history
      }
    } catch (err) {
      console.error(err);
      alert("Failed to trim the audio.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trimmed_${fileName.endsWith('.wav') ? fileName : fileName + '.wav'}`;
    a.click();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#07080B] text-[#E0E0E6] overflow-hidden font-sans">
      <header className="h-16 px-6 border-b border-white/10 bg-[#0D0E14] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            aria-label="Back to Mode Selection"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <Scissors className="w-5 h-5 text-[#FF5C00]" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Trim Audio</h1>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="trim-upload-file" className="flex items-center gap-2 px-4 py-2 border border-[#FF5C00]/30 bg-[#FF5C00]/10 rounded text-xs font-bold uppercase tracking-widest text-[#FF5C00] cursor-pointer hover:bg-[#FF5C00]/20 transition-colors">
            <Upload className="w-4 h-4" aria-hidden="true" /> Upload File
            <input id="trim-upload-file" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} aria-label="Upload single audio file" />
          </label>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col pt-12">
        <div className="flex items-center justify-between mb-6">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-sm text-white/50 inline-block min-w-[200px]" aria-live="polite">
            {fileName}
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={() => setShowEffects(!showEffects)}
              disabled={!audioBlob}
              aria-expanded={showEffects}
              aria-label={showEffects ? "Close FX Studio panel" : "Open FX Studio panel"}
              className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed ${showEffects ? 'bg-[#00E0FF]/20 text-[#00E0FF] border-[#00E0FF]/50' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
             >
              <Wand2 className="w-4 h-4" aria-hidden="true" /> FX Studio
             </button>
             <button 
              onClick={handleAddRegion}
              disabled={!audioBlob || showEffects}
              aria-label="Add trimming region"
              className="flex items-center gap-2 px-4 py-2 rounded bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Mark Region
            </button>
            <button 
              onClick={handleCrop}
              disabled={!hasRegion || isProcessing || showEffects}
              aria-label={isProcessing ? "Cropping audio..." : "Crop audio to selected region"}
              className="flex items-center gap-2 px-4 py-2 rounded bg-[#FF5C00] text-[#090A0F] hover:bg-orange-500 transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed glow-orange"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Crop className="w-4 h-4" aria-hidden="true" />} Crop to Selection
            </button>
          </div>
        </div>

        {audioBlob && (
          <div className="flex gap-2 justify-end mb-4 pr-1">
            <button
               onClick={undoAudio}
               disabled={!canUndoAudio}
               aria-label="Undo last action"
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors uppercase text-[10px] font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo className="w-3 h-3" aria-hidden="true" /> Undo
            </button>
            <button
               onClick={redoAudio}
               disabled={!canRedoAudio}
               aria-label="Redo last action"
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors uppercase text-[10px] font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo className="w-3 h-3" aria-hidden="true" /> Redo
            </button>
          </div>
        )}

        {showEffects && audioBlob && (
          <div className="mb-8">
            <AudioEffectsPanel 
              audioBlob={audioBlob} 
              onApply={(newBlob) => {
                pushAudioBlob(newBlob);
                setShowEffects(false); // Close panel on success
              }} 
            />
          </div>
        )}

        <div className={`relative border border-white/10 bg-[#0A0C10] rounded-2xl overflow-hidden shadow-2xl p-6 ${audioBlob ? 'mb-8' : ''}`}>
           {isProcessing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 mb-4 text-[#FF5C00] animate-spin glow-orange" />
              <p className="font-mono text-sm tracking-widest uppercase text-[#FF5C00]">Extracting Audio...</p>
            </div>
          )}
          {!audioBlob && !isProcessing && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none text-white/30">
               <Scissors className="w-10 h-10 mb-4 opacity-30" />
               <p className="font-mono text-sm tracking-widest uppercase">Upload an audio block to edit</p>
             </div>
          )}

          <div className="relative z-10">
            <div ref={containerRef} className="w-full mb-4" />
            <div ref={timelineRef} className="w-full text-xs font-mono text-white/40" />
          </div>
        </div>

        {audioBlob && (
          <div className="flex items-center justify-between px-8 py-4 bg-[#090A0F] border border-white/5 rounded-2xl shadow-xl" role="toolbar" aria-label="Audio playback controls">
             <div className="flex items-center gap-4">
               <button 
                onClick={handleStop} 
                aria-label="Stop playback"
                className="w-12 h-12 flex items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
               >
                 <Square className="w-5 h-5" aria-hidden="true" />
               </button>
               <button 
                onClick={handlePlayPause} 
                aria-label={isPlaying ? "Pause playback" : "Play audio"}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
               >
                 {isPlaying ? <Pause className="w-6 h-6" aria-hidden="true" /> : <Play className="w-6 h-6 translate-x-1" aria-hidden="true" />}
               </button>
             </div>

             <button 
              onClick={handleExport} 
              aria-label="Download trimmed audio"
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/30 text-[#FF5C00] hover:bg-[#FF5C00]/20 transition-colors uppercase text-sm font-bold tracking-widest"
             >
               <Download className="w-5 h-5" aria-hidden="true" /> Download Trimmed
             </button>
          </div>
        )}

      </main>
    </div>
  );
}
