import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
        role="dialog" 
        aria-modal="true"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-800"
          aria-label="Close help"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <h2 className="text-lg font-bold text-zinc-100 mb-1">How to Use</h2>
        <p className="text-xs text-zinc-500 mb-6 uppercase tracking-wider font-semibold">Quick Guide</p>
        
        <div className="space-y-6 text-sm">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 font-bold border border-zinc-700">1</div>
            <div>
              <h3 className="text-zinc-200 font-medium mb-1">Tap to Start</h3>
              <p className="text-zinc-400 leading-relaxed">Press the microphone button at the bottom. Allow microphone access if prompted.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 font-bold border border-zinc-700">2</div>
            <div>
              <h3 className="text-zinc-200 font-medium mb-1">Speak Naturally</h3>
              <p className="text-zinc-400 leading-relaxed mb-2">The AI detects 3 languages:</p>
              <ul className="space-y-1.5 text-zinc-500 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span><strong>Malayalam:</strong> Translates to English</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span><strong>Hindi:</strong> Transcribes in Devanagari</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span><strong>English:</strong> Transcribes in English</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-100 font-bold border border-zinc-700">3</div>
            <div>
              <h3 className="text-zinc-200 font-medium mb-1">Read Results</h3>
              <p className="text-zinc-400 leading-relaxed">
                Your speech shows in <span className="text-zinc-900 bg-zinc-100 px-1 rounded text-[10px] font-bold">WHITE</span> bubbles.
                <br/>
                AI output shows in <span className="text-zinc-300 bg-zinc-800 px-1 rounded text-[10px] font-bold border border-zinc-700">DARK</span> bubbles.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-800">
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-100 text-zinc-900 font-semibold rounded-xl hover:bg-zinc-200 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm shadow-lg shadow-zinc-950/20"
          >
            Start Translating
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;