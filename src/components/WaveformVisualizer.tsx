import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformVisualizerProps {
  audioFile: File;
  onTimeUpdate?: (time: number) => void;
  onReady?: () => void;
}

export function WaveformVisualizer({ audioFile, onTimeUpdate, onReady }: WaveformVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4F46E5',
      progressColor: '#818CF8',
      cursorColor: '#C7D2FE',
      barWidth: 2,
      barGap: 1,
      height: 100,
      normalize: true,
      responsive: true,
      fillParent: true,
      backend: 'WebAudio'
    });

    const wavesurfer = wavesurferRef.current;

    wavesurfer.loadBlob(audioFile);

    wavesurfer.on('ready', () => {
      onReady?.();
    });

    wavesurfer.on('audioprocess', (time: number) => {
      onTimeUpdate?.(time);
    });

    return () => {
      wavesurfer.destroy();
    };
  }, [audioFile]);

  return (
    <div className="rounded-lg bg-gray-900 p-4">
      <div ref={containerRef} className="w-full" />
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={() => wavesurferRef.current?.playPause()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Play/Pause
        </button>
        <button
          onClick={() => wavesurferRef.current?.stop()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  );
}