import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js';
import { Play, Pause, Square, Upload, Download, ArrowLeft, Loader2, Gauge } from 'lucide-react';
import { audioBufferToWav } from '../lib/audioUtils';
import { useHistory } from '../lib/useHistory';
import * as Tone from 'tone';

export default function SpeedTool({ onBack }: { onBack: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState<string>("No file loaded");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);

  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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
      waveColor: 'rgba(217, 70, 239, 0.4)', // Fuchsia
      progressColor: '#D946EF',
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
    
    // Setup Tone.js PitchShift for live independent pitch
    pitchShiftRef.current = new Tone.PitchShift({ pitch: 0 }).toDestination();
    
    const mediaObj = ws.getMediaElement();
    try {
        const audioCtx = Tone.getContext().rawContext as AudioContext;
        mediaSourceRef.current = audioCtx.createMediaElementSource(mediaObj);
        Tone.connect(mediaSourceRef.current, pitchShiftRef.current);
    } catch(e) {
        console.error("Audio routing error:", e);
    }

    return () => {
      ws.destroy();
      pitchShiftRef.current?.dispose();
      pitchShiftRef.current = null;
      if (mediaSourceRef.current) {
          mediaSourceRef.current.disconnect();
          mediaSourceRef.current = null;
      }
    };
  }, []);

  // Sync state to Web Audio routing
  useEffect(() => {
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.setPlaybackRate(speed);
        const media = wavesurferRef.current.getMediaElement();
        if (media) {
             media.preservesPitch = false;
             if ('webkitPreservesPitch' in media) {
                 (media as any).webkitPreservesPitch = false;
             }
             if ('mozPreservesPitch' in media) {
                 (media as any).mozPreservesPitch = false;
             }
        }
        
        if (pitchShiftRef.current) {
             // Analog playback forces a pitch change proportional to speed. 
             // We compensate so the final output matches exactly the requested pitch semitones!
             const speedPitchOffset = 12 * Math.log2(speed);
             pitchShiftRef.current.pitch = pitch - speedPitchOffset;
        }
      } catch (err) {
        console.error("Playback set err", err);
      }
    }
  }, [speed, pitch]);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);

    // Provide immediate preview feedback when the user drags the speed slider
    if (wavesurferRef.current) {
      const media = wavesurferRef.current.getMediaElement();
      if (media && media.paused) {
        Tone.start().then(() => wavesurferRef.current?.play().catch(console.error));
      }
    }
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = parseFloat(e.target.value);
    setPitch(newPitch);

    if (wavesurferRef.current) {
      const media = wavesurferRef.current.getMediaElement();
      if (media && media.paused) {
        Tone.start().then(() => wavesurferRef.current?.play().catch(console.error));
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wavesurferRef.current) return;

    setFileName(file.name);
    setSpeed(1.0);
    setPitch(0);
    resetAudioBlob(file);
  };

  const handlePlayPause = async () => {
    await Tone.start();
    wavesurferRef.current?.playPause();
  };

  const handleStop = () => {
    wavesurferRef.current?.stop();
  };

  const handleApplySpeed = async () => {
    if (!audioBlob) return;
    if (speed === 1.0 && pitch === 0) {
      alert("No changes to apply.");
      return;
    }

    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(audioBlob);
      const buffer = await new Promise<Tone.ToneAudioBuffer>((resolve, reject) => {
          const buf = new Tone.ToneAudioBuffer(url, () => resolve(buf), (err) => reject(err));
      });
      
      const speedPitchOffset = 12 * Math.log2(speed);
      const compensationPitch = pitch - speedPitchOffset; 
      
      const duration = buffer.duration / speed;
      
      const renderedBuffer = await Tone.Offline(() => {
          const player = new Tone.Player(buffer);
          player.playbackRate = speed;
          
          const pitchShift = new Tone.PitchShift({ pitch: compensationPitch }).toDestination();
          player.connect(pitchShift);
          
          player.start(0);
      }, duration);
      
      const newBlob = audioBufferToWav(renderedBuffer.get() as AudioBuffer);
      
      pushAudioBlob(newBlob);
      setSpeed(1.0); 
      setPitch(0);
    } catch (e) {
      console.error(e);
      alert("Failed to apply speed and pitch changes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpeedShifted_${fileName.endsWith('.wav') ? fileName : fileName + '.wav'}`;
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
          <Gauge className="w-5 h-5 text-[#D946EF]" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Speed Changer</h1>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="speed-upload-file" className="flex items-center gap-2 px-4 py-2 border border-[#D946EF]/30 bg-[#D946EF]/10 rounded text-xs font-bold uppercase tracking-widest text-[#D946EF] cursor-pointer hover:bg-[#D946EF]/20 transition-colors">
            <Upload className="w-4 h-4" aria-hidden="true" /> Upload File
            <input id="speed-upload-file" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} aria-label="Upload single audio file" />
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
              onClick={handleApplySpeed}
              disabled={!audioBlob || isProcessing || (speed === 1.0 && pitch === 0)}
              aria-label={isProcessing ? "Processing rendering..." : "Apply changes offline"}
              className="flex items-center gap-2 px-4 py-2 rounded bg-[#D946EF] text-[#090A0F] hover:bg-fuchsia-500 transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed glow-fuchsia"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Gauge className="w-4 h-4" aria-hidden="true" />} Render Changes
            </button>
          </div>
        </div>

        <div className={`relative border border-white/10 bg-[#0A0C10] rounded-2xl overflow-hidden shadow-2xl p-6 ${audioBlob ? 'mb-4' : ''}`}>
           {isProcessing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090A0F]/80 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 mb-4 text-[#D946EF] animate-spin glow-fuchsia" />
              <p className="font-mono text-sm tracking-widest uppercase text-[#D946EF]">Baking Audio...</p>
            </div>
          )}
          {!audioBlob && !isProcessing && (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none text-white/30">
               <Gauge className="w-10 h-10 mb-4 opacity-30" />
               <p className="font-mono text-sm tracking-widest uppercase">Upload an audio block to edit</p>
             </div>
          )}

          <div className="relative z-10">
            <div ref={containerRef} className="w-full mb-4" />
            <div ref={timelineRef} className="w-full text-xs font-mono text-white/40" />
          </div>
        </div>

        {audioBlob && (
          <div className="flex gap-4 justify-between w-full mb-6 pr-1">
            {/* Speed & Pitch Control Cluster */}
            <div className="flex flex-col gap-6 justify-center px-8 py-5 rounded-2xl bg-white/5 border border-white/10 flex-1 lg:w-2/3 shadow-xl relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D946EF] opacity-5 blur-[40px] pointer-events-none"></div>
              
              {/* Speed Slider */}
              <div className="flex flex-col z-10">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="speed-slider" className="text-xs font-bold text-white/70 uppercase tracking-widest">Time Stretch (Speed)</label>
                  <span className="text-xs font-mono font-bold text-[#D946EF] bg-[#D946EF]/10 px-2 py-0.5 rounded">{speed.toFixed(2)}x</span>
                </div>
                <input 
                  id="speed-slider"
                  type="range" 
                  min="0.25" 
                  max="3.0" 
                  step="0.05" 
                  value={speed}
                  onChange={handleSpeedChange}
                  className="accent-[#D946EF] w-full"
                  aria-label="Adjust playback speed"
                />
              </div>

              {/* Pitch Slider */}
              <div className="flex flex-col z-10">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="pitch-slider" className="text-xs font-bold text-white/70 uppercase tracking-widest">Independent Pitch Shift</label>
                  <span className="text-xs font-mono font-bold text-[#D946EF] bg-[#D946EF]/10 px-2 py-0.5 rounded">
                    {pitch > 0 ? '+' : ''}{pitch} {Math.abs(pitch) === 1 ? 'step' : 'steps'}
                  </span>
                </div>
                <input 
                  id="pitch-slider"
                  type="range" 
                  min="-24" 
                  max="24" 
                  step="1" 
                  value={pitch}
                  onChange={handlePitchChange}
                  className="accent-[#D946EF] w-full"
                  aria-label="Adjust pitch independently of speed in semitones"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-end pb-1 w-24">
              <button
                 onClick={() => { undoAudio(); setSpeed(1.0); setPitch(0); }}
                 disabled={!canUndoAudio}
                 aria-label="Undo last action"
                 className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Undo
              </button>
              <button
                 onClick={() => { redoAudio(); setSpeed(1.0); setPitch(0); }}
                 disabled={!canRedoAudio}
                 aria-label="Redo last action"
                 className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-white hover:bg-white/10 hover:border-white/30 transition-all uppercase disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#D946EF]/10 border border-[#D946EF]/30 text-[#D946EF] hover:bg-[#D946EF]/20 transition-colors uppercase text-sm font-bold tracking-widest glow-fuchsia-soft"
             >
               <Download className="w-5 h-5" aria-hidden="true" /> Download Output
             </button>
          </div>
        )}

      </main>
    </div>
  );
}
