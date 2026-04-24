import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { Play, Pause, Square, Upload, Download, ArrowLeft, Loader2, Sparkles, Activity } from 'lucide-react';
import { audioBufferToWav } from '../lib/audioUtils';
import { useHistory } from '../lib/useHistory';
import * as Tone from 'tone';

export default function EnhanceTool({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("No file loaded");
  const [isProcessing, setIsProcessing] = useState(false);
  const [masteringMode, setMasteringMode] = useState<'clarity' | 'podcast' | 'loudness'>('clarity');

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
      waveColor: 'rgba(16, 185, 129, 0.4)', // Emerald
      progressColor: '#10B981',
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

  const handleEnhance = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(audioBlob);
      const buffer = await new Promise<Tone.ToneAudioBuffer>((resolve, reject) => {
          const buf = new Tone.ToneAudioBuffer(url, () => resolve(buf), (err) => reject(err));
      });
      
      const duration = buffer.duration;
      
      const renderedBuffer = await Tone.Offline(() => {
          const player = new Tone.Player(buffer);
          
          let gate: Tone.Gate;
          let eq: Tone.EQ3;
          let comp: Tone.Compressor;
          let limiter: Tone.Limiter;

          if (masteringMode === 'clarity') {
             gate = new Tone.Gate(-45, 0.05); // Light noise gate
             eq = new Tone.EQ3({ low: 0, mid: 1, high: 3 }); // Boost definition
             comp = new Tone.Compressor({ threshold: -20, ratio: 2.5, attack: 0.1, release: 0.2 }); // Light glue
             limiter = new Tone.Limiter(-1);
          } else if (masteringMode === 'podcast') {
             gate = new Tone.Gate(-35, 0.1); // Stronger noise gate for voice
             eq = new Tone.EQ3({ low: 2, mid: 3, high: 2 }); // Boost presence and warmth
             comp = new Tone.Compressor({ threshold: -25, ratio: 4, attack: 0.05, release: 0.1 }); // Fast vocal leveler
             limiter = new Tone.Limiter(-0.5);
          } else { // loudness
             gate = new Tone.Gate(-50, 0.1); 
             eq = new Tone.EQ3({ low: 1, mid: 0, high: 1 }); // DJ Smile curve
             // Heavy compression for maximum loudness without destroying transients
             comp = new Tone.Compressor({ threshold: -15, ratio: 6, attack: 0.003, release: 0.25 }); 
             limiter = new Tone.Limiter(-0.1);
          }
          
          player.chain(gate, eq, comp, limiter, Tone.Destination);
          player.start(0);
      }, duration);
      
      const newBlob = audioBufferToWav(renderedBuffer.get() as AudioBuffer);
      
      pushAudioBlob(newBlob);
    } catch (e) {
      console.error(e);
      alert("Failed to apply Smart Enhance changes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Enhanced_${fileName.endsWith('.wav') ? fileName : fileName + '.wav'}`;
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
          <Sparkles className="w-5 h-5 text-[#10B981]" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Smart Enhance</h1>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="enhance-upload-file" className="flex items-center gap-2 px-4 py-2 border border-[#10B981]/30 bg-[#10B981]/10 rounded text-xs font-bold uppercase tracking-widest text-[#10B981] cursor-pointer hover:bg-[#10B981]/20 transition-colors">
            <Upload className="w-4 h-4" aria-hidden="true" /> Upload File
            <input id="enhance-upload-file" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} aria-label="Upload single audio file" />
          </label>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col pt-12 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-sm text-white/50 inline-block min-w-[200px]" aria-live="polite">
            {fileName}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleEnhance}
              disabled={!audioBlob || isProcessing}
              aria-label={isProcessing ? "Processing enhancements..." : "Apply AI master offline"}
              className="flex items-center gap-2 px-6 py-2 rounded bg-[#10B981] text-[#090A0F] hover:bg-emerald-500 transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed glow-emerald relative overflow-hidden"
            >
              {isProcessing && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Activity className="w-4 h-4" aria-hidden="true" />} 
              {isProcessing ? 'Mastering...' : 'Auto-Master'}
            </button>
          </div>
        </div>

        <div className={`relative border border-white/10 bg-[#0A0C10] rounded-2xl overflow-hidden shadow-2xl p-6 flex-shrink-0 ${audioBlob ? 'mb-4' : ''}`}>
           {isProcessing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 mb-4 text-[#10B981] animate-spin glow-emerald" />
              <p className="font-mono text-sm tracking-widest uppercase text-[#10B981]">Applying Dynamics...</p>
            </div>
          )}
          {!audioBlob && !isProcessing && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none text-white/30">
               <Sparkles className="w-10 h-10 mb-4 opacity-30" />
               <p className="font-mono text-sm tracking-widest uppercase">Upload an audio block to master</p>
             </div>
          )}

          <div className="relative z-10">
            <div ref={containerRef} className="w-full mb-4" />
            <div ref={timelineRef} className="w-full text-xs font-mono text-white/40" />
          </div>
        </div>

        {audioBlob && (
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {/* Enhance Profiles */}
            <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 flex-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent pointer-events-none"></div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#10B981] mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Processing Algorithm Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 z-10">
                    <button
                       onClick={() => setMasteringMode('clarity')}
                       className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                         masteringMode === 'clarity' 
                          ? 'bg-[#10B981]/20 border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10'
                       }`}
                    >
                        <span className="font-bold text-sm text-white mb-1">Clarity & Crisp</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/50">Light noise gate. Boosts high definition. Soft glue compression.</span>
                    </button>
                    
                    <button
                       onClick={() => setMasteringMode('podcast')}
                       className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                         masteringMode === 'podcast' 
                          ? 'bg-[#10B981]/20 border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10'
                       }`}
                    >
                        <span className="font-bold text-sm text-white mb-1">Podcast Voice</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/50">Aggressive noise reduction. Fast vocal leveling limits breathing.</span>
                    </button>

                    <button
                       onClick={() => setMasteringMode('loudness')}
                       className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                         masteringMode === 'loudness' 
                          ? 'bg-[#10B981]/20 border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10'
                       }`}
                    >
                        <span className="font-bold text-sm text-white mb-1">Max Loudness</span>
                        <span className="text-[10px] uppercase tracking-wide text-white/50">Heavy multi-band squashing. Master Limiting. DJ Curve EQ.</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-3 justify-end pb-1 w-full lg:w-32 self-end">
              <button
                 onClick={() => { undoAudio(); }}
                 disabled={!canUndoAudio}
                 aria-label="Undo last action"
                 className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Undo
              </button>
              <button
                 onClick={() => { redoAudio(); }}
                 disabled={!canRedoAudio}
                 aria-label="Redo last action"
                 className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                 Redo
              </button>
            </div>
          </div>
        )}

        {audioBlob && (
          <div className="flex items-center justify-between px-8 py-5 bg-[#090A0F] border border-white/5 rounded-2xl shadow-xl mt-auto" role="toolbar" aria-label="Audio playback controls">
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
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/20 transition-colors uppercase text-sm font-bold tracking-widest glow-emerald-soft"
             >
               <Download className="w-5 h-5" aria-hidden="true" /> Download Output
             </button>
          </div>
        )}

      </main>
    </div>
  );
}
