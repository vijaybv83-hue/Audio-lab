import React from 'react';
import { Scissors, ArrowRight, Layers, Gauge } from 'lucide-react';

export default function Home({ onSelectTool }: { onSelectTool: (tool: 'trim' | 'merge' | 'speed') => void }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#07080B] text-[#E0E0E6] items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#00E0FF] glow-blue"></div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase italic">Audio Lab</h1>
            <div className="w-3 h-3 rounded-full bg-[#FF5C00] glow-orange"></div>
            <div className="w-3 h-3 rounded-full bg-[#D946EF] glow-fuchsia flex sm:hidden md:flex"></div>
          </div>
          <p className="text-sm font-mono text-white/40 tracking-widest uppercase block">Select an audio production tool</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6" role="navigation" aria-label="Tool selection">
          {/* Trim Tool Card */}
          <button
            onClick={() => onSelectTool('trim')}
            aria-label="Launch Trim Audio Tool"
            className="group relative flex flex-col items-start p-8 text-left border border-white/5 bg-[#090A0F] rounded-2xl hover:border-[#FF5C00]/50 hover:bg-[#FF5C00]/5 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5C00] opacity-10 blur-[50px] group-hover:opacity-20 transition-opacity pointer-events-none"></div>
            <div className="w-14 h-14 rounded-full bg-[#FF5C00]/10 flex items-center justify-center text-[#FF5C00] mb-6 group-hover:scale-110 transition-transform">
              <Scissors className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Trim Audio</h2>
            <p className="text-white/40 text-sm mb-8">
              Upload a single audio file, mark a specific region, and precisely crop out the content. Download the exact snipped segment you need.
            </p>
            <div className="mt-auto flex items-center gap-2 text-[#FF5C00] text-sm font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
              Launch Tool <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
            </div>
          </button>

          {/* Merge Tool Card */}
          <button
            onClick={() => onSelectTool('merge')}
            aria-label="Launch Merge Audio Tool"
            className="group relative flex flex-col items-start p-8 text-left border border-white/5 bg-[#090A0F] rounded-2xl hover:border-[#00E0FF]/50 hover:bg-[#00E0FF]/5 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E0FF] opacity-10 blur-[50px] group-hover:opacity-20 transition-opacity pointer-events-none"></div>
            <div className="w-14 h-14 rounded-full bg-[#00E0FF]/10 flex items-center justify-center text-[#00E0FF] mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Merge Audio</h2>
            <p className="text-white/40 text-sm mb-8">
              Mix multiple audio tracks together in a structural DAW view. Apply voice effects, adjust individual volumes, and export a master mixdown file.
            </p>
            <div className="mt-auto flex items-center gap-2 text-[#00E0FF] text-sm font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
              Launch Tool <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
            </div>
          </button>

          {/* Speed Tool Card */}
          <button
            onClick={() => onSelectTool('speed')}
            aria-label="Launch Speed Changer Tool"
            className="group relative flex flex-col items-start p-8 text-left border border-white/5 bg-[#090A0F] rounded-2xl hover:border-[#D946EF]/50 hover:bg-[#D946EF]/5 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D946EF] opacity-10 blur-[50px] group-hover:opacity-20 transition-opacity pointer-events-none"></div>
            <div className="w-14 h-14 rounded-full bg-[#D946EF]/10 flex items-center justify-center text-[#D946EF] mb-6 group-hover:scale-110 transition-transform">
              <Gauge className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Speed Changer</h2>
            <p className="text-white/40 text-sm mb-8">
              Modify the speed and pitch of your audio track. Slow things down to a crawl or speed them up organically.
            </p>
            <div className="mt-auto flex items-center gap-2 text-[#D946EF] text-sm font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
              Launch Tool <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
