import React, { useState } from 'react';
import { FileText, ArrowLeft, Download, Upload, Search, Loader2, Music } from 'lucide-react';
import jsPDF from 'jspdf';

export default function LyricsTool({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'online' | 'audio'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("No file selected");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const fetchOnlineLyrics = async () => {
    if (!searchQuery.trim()) return;
    setIsProcessing(true);
    setLyrics('');
    try {
      const res = await fetch('/api/lyrics/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLyrics(data.lyrics || "Lyrics not found");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to fetch lyrics");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAudioFile(file);
  };

  const generateLyricsFromAudio = async () => {
    if (!audioFile) return;
    setIsProcessing(true);
    setLyrics('');
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const res = await fetch('/api/lyrics/audio', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLyrics(data.lyrics || "Could not transcribe lyrics from audio");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to process audio file");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPDF = () => {
    if (!lyrics) return;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const title = activeTab === 'online' ? `Lyrics: ${searchQuery}` : `Lyrics: ${fileName}`;
    doc.text(title, 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const splitText = doc.splitTextToSize(lyrics, 170); // line wrap
    doc.text(splitText, 20, 30);
    
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
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
          <FileText className="w-5 h-5 text-[#D946EF]" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tighter uppercase italic">Song Lyrics</h1>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full flex flex-col pt-12 overflow-y-auto">
        
        {/* Tabs */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <button
            onClick={() => setActiveTab('online')}
             aria-pressed={activeTab === 'online'}
            className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'online' ? 'bg-[#D946EF] text-[#090A0F] shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'bg-[#090A0F] text-white/50 border border-white/10 hover:bg-white/5'}`}
          >
            Download Online
          </button>
          <button
            onClick={() => setActiveTab('audio')}
             aria-pressed={activeTab === 'audio'}
            className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'audio' ? 'bg-[#00E0FF] text-[#090A0F] shadow-[0_0_15px_rgba(0,224,255,0.3)]' : 'bg-[#090A0F] text-white/50 border border-white/10 hover:bg-white/5'}`}
          >
            Upload to Generate
          </button>
        </div>

        <div className="border border-white/10 bg-[#090A0F] rounded-2xl p-6 shadow-2xl mb-8">
          {activeTab === 'online' ? (
            <div className="flex flex-col gap-4">
               <label htmlFor="song-search" className="text-xs font-bold text-white/50 uppercase tracking-widest">Search Song Name / Artist</label>
               <div className="flex gap-4">
                 <div className="relative flex-1">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden="true" />
                   <input
                     id="song-search"
                     type="text"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="e.g. Bohemian Rhapsody Queen"
                     onKeyDown={(e) => { if(e.key === 'Enter') fetchOnlineLyrics(); }}
                     className="w-full bg-[#07080B] border border-white/10 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-[#D946EF] transition-colors font-mono"
                   />
                 </div>
                 <button
                   onClick={fetchOnlineLyrics}
                   disabled={isProcessing || !searchQuery.trim()}
                   className="px-6 py-3 rounded-xl bg-[#D946EF]/10 border border-[#D946EF]/30 text-[#D946EF] hover:bg-[#D946EF]/20 transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                 >
                   {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : 'Search Lyrics'}
                 </button>
               </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
               <div className="text-xs font-bold text-white/50 uppercase tracking-widest">Upload Audio File</div>
               <div className="flex items-center gap-4">
                  <label htmlFor="lyrics-upload-file" className="flex items-center justify-center gap-3 w-64 h-32 border-2 border-dashed border-[#00E0FF]/30 bg-[#00E0FF]/5 rounded-xl text-xs font-bold uppercase tracking-widest text-[#00E0FF] cursor-pointer hover:bg-[#00E0FF]/10 transition-colors">
                    <Upload className="w-5 h-5 flex-shrink-0" aria-hidden="true" /> 
                    <span className="text-center">Select Audio File</span>
                    <input id="lyrics-upload-file" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl font-mono text-sm text-white/50 w-full truncate">
                      {fileName}
                    </div>
                    <button
                       onClick={generateLyricsFromAudio}
                       disabled={isProcessing || !audioFile}
                       className="px-6 py-3 rounded-xl bg-[#00E0FF]/10 border border-[#00E0FF]/30 text-[#00E0FF] hover:bg-[#00E0FF]/20 transition-colors uppercase text-xs font-bold tracking-widest disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center h-12"
                    >
                      {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" /> AI Transcribing...</> : <><Music className="w-4 h-4 mr-2" aria-hidden="true"/> Generate Lyrics</>}
                    </button>
                  </div>
               </div>
               <p className="text-white/30 text-xs italic mt-2">Note: Keep files under 20MB for direct extraction. High accuracy relies on clean vocals.</p>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 border border-white/10 bg-[#090A0F] rounded-2xl flex flex-col relative overflow-hidden shadow-2xl">
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-white/5">
            <span className="text-xs font-bold uppercase tracking-widest text-white/50">Output Text</span>
            {lyrics && (
              <button 
                onClick={downloadPDF}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                aria-label="Download lyrics as PDF"
              >
                <Download className="w-4 h-4" aria-hidden="true" /> Download PDF
              </button>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {isProcessing ? (
               <div className="flex flex-col items-center justify-center h-full text-white/30">
                 <Loader2 className={`w-8 h-8 mb-4 animate-spin ${activeTab === 'online' ? 'text-[#D946EF]' : 'text-[#00E0FF]'}`} />
                 <p className="font-mono text-sm tracking-widest uppercase">Fetching Lyrics...</p>
               </div>
            ) : lyrics ? (
               <pre className="font-sans text-sm whitespace-pre-wrap text-white/80 leading-relaxed max-w-full">
                 {lyrics}
               </pre>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-white/20">
                 <FileText className="w-12 h-12 mb-4 opacity-20" />
                 <p className="font-mono text-sm tracking-widest uppercase text-center max-w-sm">Lyrics will appear here once generated.</p>
               </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
