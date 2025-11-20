import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeminiLiveService } from './services/geminiLiveService';
import { ConnectionState, TranscriptionItem } from './types';
import Visualizer from './components/Visualizer';

// Minimalist Icons
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const MicOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  const [service, setService] = useState<GeminiLiveService | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<TranscriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Visualizer state
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Initialize Service
  useEffect(() => {
    if (apiKey) {
      const s = new GeminiLiveService(apiKey);
      
      s.onStateChange = (state) => setConnectionState(state);
      
      s.onTranscription = (item) => {
        setTranscripts(prev => {
          const exists = prev.findIndex(t => t.id === item.id);
          if (exists !== -1) {
            const updated = [...prev];
            updated[exists] = item;
            return updated;
          }
          return [...prev, item];
        });
      };

      s.onAudioLevel = (inLvl, outLvl) => {
        setInputLevel(inLvl);
        setOutputLevel(outLvl);
      };

      s.onError = (msg) => setError(msg);

      setService(s);

      return () => {
        s.disconnect();
      };
    }
  }, [apiKey]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handleToggleConnection = async () => {
    if (!service) return;

    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      service.disconnect();
    } else {
      setError(null);
      setTranscripts([]);
      await service.connect();
    }
  };

  const handleClear = () => {
    setTranscripts([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col items-center justify-center p-4 sm:p-6">
      
      {/* Main Card */}
      <div className="w-full max-w-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-zinc-950/50 overflow-hidden flex flex-col h-[85vh]">
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/90 backdrop-blur-sm z-10">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100">
              Malayalam Translator
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionState === ConnectionState.CONNECTED ? 'bg-emerald-500' : 
                connectionState === ConnectionState.CONNECTING ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'
              }`} />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                {connectionState === ConnectionState.CONNECTED ? 'Listening' : 'Offline'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleClear}
            className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-all"
            title="Clear chat"
          >
            <TrashIcon />
          </button>
        </header>

        {/* Visualizer Area */}
        <div className="bg-zinc-900 border-b border-zinc-800">
          <Visualizer 
            inputLevel={inputLevel} 
            outputLevel={outputLevel} 
            isActive={connectionState === ConnectionState.CONNECTED} 
          />
        </div>

        {/* Transcript Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-zinc-900 relative">
           {error && (
             <div className="p-3 text-xs border border-red-900/30 bg-red-900/10 text-red-400 rounded-lg mb-4 text-center">
               {error}
             </div>
           )}

           {transcripts.length === 0 && !error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 pointer-events-none select-none">
               <div className="w-12 h-12 mb-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                 <MicIcon />
               </div>
               <p className="text-sm font-medium text-zinc-600">Tap microphone to start</p>
             </div>
           )}

           {transcripts.map((item) => (
             <div key={item.id} className={`flex flex-col ${item.isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
               <div className={`
                 max-w-[85%] px-5 py-3 text-[15px] leading-relaxed shadow-sm
                 ${item.isUser 
                   ? 'bg-zinc-100 text-zinc-900 rounded-2xl rounded-tr-sm' 
                   : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-2xl rounded-tl-sm'
                 }
               `}>
                 {item.text}
               </div>
               <span className="text-[10px] font-medium text-zinc-500 mt-2 px-1">
                 {item.isUser ? 'You' : 'Translation'}
               </span>
             </div>
           ))}
           <div ref={transcriptEndRef} />
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/90 flex justify-center">
             <button 
               onClick={handleToggleConnection}
               disabled={!apiKey || connectionState === ConnectionState.CONNECTING}
               className={`
                 group relative h-16 w-16 flex items-center justify-center rounded-full transition-all duration-300 shadow-lg
                 ${connectionState === ConnectionState.CONNECTED 
                   ? 'bg-zinc-800 border border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-zinc-600 hover:scale-105' 
                   : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 hover:scale-105 hover:shadow-zinc-100/10'
                 }
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
               `}
             >
               {connectionState === ConnectionState.CONNECTED ? <MicOffIcon /> : <MicIcon />}
             </button>
        </div>
      </div>
      
      <div className="mt-6 flex flex-col items-center gap-1 text-center">
         <span className="text-[10px] font-semibold tracking-widest text-zinc-600 uppercase">Powered by Gemini Live</span>
      </div>
    </div>
  );
};

export default App;