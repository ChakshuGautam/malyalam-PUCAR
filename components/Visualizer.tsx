import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  inputLevel: number;
  outputLevel: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputLevel, outputLevel, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    // Smooth values
    let smoothInput = 0;
    let smoothOutput = 0;

    const render = () => {
      // Decay smoothing
      smoothInput += (inputLevel - smoothInput) * 0.2;
      smoothOutput += (outputLevel - smoothOutput) * 0.2;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // If not active, just draw a small idle circle
      if (!isActive) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#3f3f46'; // zinc-700 (darker grey for idle in dark mode)
        ctx.fill();
        return;
      }

      // Determine dominance (Input vs Output)
      // Note: Output now represents "Processing/Translating" since audio is muted
      const isSpeaking = smoothOutput > 0.05;
      const isListening = !isSpeaking && smoothInput > 0.01;
      
      // Base radius
      const baseRadius = 40;
      
      // Draw Output Ripple (AI Translating)
      if (isSpeaking) {
        const rings = 3;
        for (let i = 0; i < rings; i++) {
          ctx.beginPath();
          const r = baseRadius + (smoothOutput * 60) + (i * 20 * Math.sin(Date.now() / 200));
          ctx.arc(centerX, centerY, Math.max(0, r), 0, Math.PI * 2);
          // Light grey ripples for dark mode
          ctx.strokeStyle = `rgba(228, 228, 231, ${0.3 - (i * 0.08)})`; // zinc-200 with low opacity
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw Input Ripple (User speaking)
      if (isListening) {
        const rings = 4;
        for (let i = 0; i < rings; i++) {
          ctx.beginPath();
          const r = baseRadius + (smoothInput * 100) + (i * 12);
          ctx.arc(centerX, centerY, Math.max(0, r), 0, Math.PI * 2);
          // Darker grey ripples
          ctx.strokeStyle = `rgba(161, 161, 170, ${0.4 - (i * 0.1)})`; // zinc-400
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Central Orb
      ctx.beginPath();
      const activeLevel = Math.max(smoothInput, smoothOutput);
      const orbRadius = baseRadius + (activeLevel * 10);
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      
      // Grey shades style
      if (isSpeaking) {
        ctx.fillStyle = '#f4f4f5'; // zinc-100 (bright white/grey for AI)
      } else if (isListening) {
        ctx.fillStyle = '#a1a1aa'; // zinc-400 (medium grey for user)
      } else {
        ctx.fillStyle = '#18181b'; // zinc-900 (dark background match)
        ctx.strokeStyle = '#52525b'; // zinc-600 (border only)
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.fill();
      
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [inputLevel, outputLevel, isActive]);

  return (
    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={250} 
        className="w-full h-full"
      />
    </div>
  );
};

export default Visualizer;