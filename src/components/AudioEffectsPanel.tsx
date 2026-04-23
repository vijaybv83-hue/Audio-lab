import React, { useState } from 'react';
import { Loader2, Wand2, RefreshCw } from 'lucide-react';
import { applyAudioFx, AudioFxConfig } from '../lib/audioUtils';

interface AudioEffectsPanelProps {
  audioBlob: Blob | null;
  onApply: (newBlob: Blob) => void;
  inline?: boolean;
}

export default function AudioEffectsPanel({ audioBlob, onApply, inline = false }: AudioEffectsPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fxConfig, setFxConfig] = useState<AudioFxConfig>({
    reverb: false,
    echo: false,
    pitchShift: 1.0
  });

  const handleApplyFx = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    try {
      const newBlob = await applyAudioFx(audioBlob, fxConfig);
      onApply(newBlob);
      // Reset config
      setFxConfig({ reverb: false, echo: false, pitchShift: 1.0 });
    } catch (e) {
      console.error(e);
      alert("Failed to apply effects.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!audioBlob) return null;

  return (
    <div className={`flex flex-col border border-[#00E0FF]/20 bg-[#00E0FF]/5 rounded-xl overflow-hidden ${inline ? 'mt-4' : 'shadow-xl'}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-[#00E0FF]/10 border-b border-[#00E0FF]/20">
        <Wand2 className="w-4 h-4 text-[#00E0FF]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#00E0FF]">Audio Effects Studio</h3>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4" role="group" aria-label="Audio effect toggles">
        {/* Reverb Toggle */}
        <label htmlFor="fx-reverb-toggle" className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
          <input 
            id="fx-reverb-toggle"
            type="checkbox" 
            checked={fxConfig.reverb || false}
            onChange={(e) => setFxConfig(prev => ({ ...prev, reverb: e.target.checked }))}
            className="accent-[#00E0FF] w-4 h-4 cursor-pointer"
            aria-label="Toggle Stadium Reverb effect"
          />
          <span className="text-sm font-medium tracking-wide">Stadium Reverb</span>
        </label>

        {/* Echo Toggle */}
        <label htmlFor="fx-echo-toggle" className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
          <input 
            id="fx-echo-toggle"
            type="checkbox" 
            checked={fxConfig.echo || false}
            onChange={(e) => setFxConfig(prev => ({ ...prev, echo: e.target.checked }))}
            className="accent-[#00E0FF] w-4 h-4 cursor-pointer"
            aria-label="Toggle Analog Echo effect"
          />
          <span className="text-sm font-medium tracking-wide">Analog Echo</span>
        </label>

        {/* Pitch Shift Slider */}
        <div className="flex flex-col justify-center p-3 rounded-lg border border-white/5 bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="fx-pitch-slider" className="text-xs font-medium text-white/50 uppercase tracking-widest">Speed & Pitch</label>
            <span className="text-xs font-mono text-[#00E0FF]" aria-live="polite">{fxConfig.pitchShift?.toFixed(1)}x</span>
          </div>
          <input 
            id="fx-pitch-slider"
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1" 
            value={fxConfig.pitchShift}
            onChange={(e) => setFxConfig(prev => ({ ...prev, pitchShift: parseFloat(e.target.value) }))}
            className="accent-[#00E0FF] w-full"
            aria-label="Adjust speed and pitch multiplier"
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            aria-valuenow={fxConfig.pitchShift}
          />
        </div>
      </div>

      <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex justify-end">
        <button
          onClick={handleApplyFx}
          disabled={isProcessing || (!fxConfig.reverb && !fxConfig.echo && fxConfig.pitchShift === 1.0)}
          aria-label={isProcessing ? "Rendering effects..." : "Apply rendered effects to audio"}
          className="flex items-center gap-2 px-6 py-2 rounded bg-[#00E0FF]/20 text-[#00E0FF] hover:bg-[#00E0FF] hover:text-[#090A0F] transition-colors font-bold text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed glow-blue"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />} Render Effects
        </button>
      </div>
    </div>
  );
}
