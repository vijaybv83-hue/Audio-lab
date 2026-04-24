import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { Play, Pause, Square, Upload, Download, ArrowLeft, Wand2 } from 'lucide-react';
import { useHistory } from '../lib/useHistory';
import AudioEffectsPanel from './AudioEffectsPanel';

export default function EffectsTool({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("No file loaded");

  const { 
    state: audioBlob, 
    pushState: pushAudioBlob, 
    undo: undoAudio, 
    redo: redoAudio, 
    canUndo: canUndoAudio, 
    canRedo: canRedoAudio,
    resetSelection: resetAudioBlob
  } = useHistory<Blob | null>(null);

  useEffect(() => {
    if (wavesurferRef.current) {
      if (audioBlob) {
        const objectUrl = URL.createObjectURL(audioBlob);
        wavesurferRef.current.load(objectUrl);
      } else {
        wavesurferRef.current.empty();
      }
    }
  }, [audioBlob]);

  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(245, 158, 11, 0.4)', // Amber
      progressColor: '#F59E0B',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 160,
      normalize: true,
      plugins: [
        TimelinePlugin.create({ container: timelineRef.current })
      ],
    });

    wavesurferRef.current = ws;

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    
    return () => {
      ws.destroy();
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wavesurferRef.current) return;

    setFileName(file.name);
    resetAudioBlob(file);
  };

  const handlePlayPause = async () => {
    wavesurferRef.current?.playPause();
  };

  const handleStop = () => {
    wavesurferRef.current?.stop();
  };

  const handleExport = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FX_${fileName.endsWith('.wav') ? fileName : fileName + '.wav'}`;
    a.click();
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#07080B] text-[#E0E0E6] font-sans">
      <header className="h-16 px-6 border-b border-white/10 bg-[#0D0E14] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            aria-label="Back to Mode Selection"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <Wand2 className="w-5 h-5 text-[#F59E0B]" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">FX Studio</h1>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="effects-upload-file" className="flex items-center gap-2 px-4 py-2 border border-[#F59E0B]/30 bg-[#F59E0B]/10 rounded text-xs font-bold uppercase tracking-widest text-[#F59E0B] cursor-pointer hover:bg-[#F59E0B]/20 transition-colors">
            <Upload className="w-4 h-4" aria-hidden="true" /> Upload File
            <input id="effects-upload-file" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} aria-label="Upload single audio file" />
          </label>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-sm text-white/50 inline-block min-w-[200px]" aria-live="polite">
            {fileName}
          </div>
        </div>

        <div className={`relative border border-white/10 bg-[#0A0C10] rounded-2xl overflow-hidden shadow-2xl p-6 flex-shrink-0 ${audioBlob ? 'mb-6' : ''}`}>
          {!audioBlob && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none text-white/30">
               <Wand2 className="w-10 h-10 mb-4 opacity-30" />
               <p className="font-mono text-sm tracking-widest uppercase">Upload an audio block to apply effects</p>
             </div>
          )}

          <div className="relative z-10">
            <div ref={containerRef} className="w-full mb-4" />
            <div ref={timelineRef} className="w-full text-xs font-mono text-white/40" />
          </div>
        </div>

        {audioBlob && (
          <div className="flex flex-col gap-6 w-full">
            
            {/* The Integrated AudioEffectsPanel */}
            <div className="w-full relative shadow-lg ring-1 ring-white/10 rounded-xl overflow-hidden">
                <AudioEffectsPanel 
                  audioBlob={audioBlob}
                  onApply={(newBlob) => pushAudioBlob(newBlob)}
                  inline={true} 
                />
            </div>
          
            <div className="flex gap-3 justify-end ml-auto mt-2">
              <button
                 onClick={() => { undoAudio(); }}
                 disabled={!canUndoAudio}
                 aria-label="Undo last action"
                 className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Undo
              </button>
              <button
                 onClick={() => { redoAudio(); }}
                 disabled={!canRedoAudio}
                 aria-label="Redo last action"
                 className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                 Redo
              </button>
            </div>
            
            <div className="flex items-center justify-between px-8 py-5 bg-[#090A0F] border border-white/5 rounded-2xl shadow-xl mt-6" role="toolbar" aria-label="Audio playback controls">
               <div className="flex items-center gap-5">
                 <button 
                  onClick={handleStop} 
                  aria-label="Stop playback"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                 >
                   <Square className="w-5 h-5" aria-hidden="true" />
                 </button>
                 <button 
                  onClick={handlePlayPause} 
                  aria-label={isPlaying ? "Pause playback" : "Play audio"}
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                 >
                   {isPlaying ? <Pause className="w-6 h-6" aria-hidden="true" /> : <Play className="w-6 h-6 translate-x-1" aria-hidden="true" />}
                 </button>
               </div>

               <button 
                onClick={handleExport} 
                aria-label="Download altered audio"
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors uppercase text-sm font-bold tracking-widest glow-amber-soft"
               >
                 <Download className="w-5 h-5" aria-hidden="true" /> Download Output
               </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
