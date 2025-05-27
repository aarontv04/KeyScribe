import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as ABCJS from 'abcjs';
import './MusicSheet.css';

// --- Component Interfaces ---
interface MusicSheetProps {
  notation: string; // The notation string (currently ABC format)
  title?: string; // Optional title for display/ABC header
  format?: 'abc' | 'musicxml'; // Currently only 'abc' is fully supported
  className?: string; // Re-added className prop
}

export function MusicSheet({ notation, title = "Sheet Music", format = 'abc', className }: MusicSheetProps) {
  console.log('MusicSheet rendering with notation length:', notation?.length);
  
  const visualRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLPreElement>(null);
  const synthControlRef = useRef<any>(null);
  const visualObjRef = useRef<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [renderSuccess, setRenderSuccess] = useState(false);
  const [useSimpleNotation, setUseSimpleNotation] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Basic render effect - only handles rendering, no synth
  useEffect(() => {
    if (!notation || format !== 'abc' || !visualRef.current) {
      setIsLoading(false);
      return;
    }
    
    // Store the notation for debugging
    if (debugRef.current) {
      debugRef.current.textContent = notation;
    }
    
    // Clear previous
    const currentVisualElement = visualRef.current;
    currentVisualElement.innerHTML = '';
    
    // Format notation
    const formattedNotation = notation.replace(/\\n/g, '\n');
    console.log("Formatting complete, rendering notation...");
    
    try {
      // Render with the simplest possible options
      const renderOptions = {
        responsive: 'resize',
        staffwidth: 680,
        scale: 1.3,
        add_classes: true
      };
      
      console.log("Attempting to render ABC notation with options:", renderOptions);
      
      // Let's verify ABCJS is available
      if (typeof ABCJS !== 'object' || typeof ABCJS.renderAbc !== 'function') {
        console.error("ABCJS not available or not properly loaded");
        throw new Error("ABCJS library not properly loaded");
      }
      
      // Force a successful render with minimalistic requirements
      let renderResult;
      try {
        renderResult = ABCJS.renderAbc(currentVisualElement, formattedNotation, renderOptions);
        console.log("Initial render successful!");
      } catch (initialError) {
        console.error("Initial render failed:", initialError);
        
        // Try to clean up the notation
        console.log("Attempting to fix common ABC notation issues...");
        
        // Fix 1: Ensure proper headers
        let cleanNotation = formattedNotation;
        if (!cleanNotation.includes("X:")) {
          cleanNotation = "X:1\n" + cleanNotation;
        }
        if (!cleanNotation.includes("K:")) {
          cleanNotation = cleanNotation + "\nK:C";
        }
        
        // Fix 2: Clean up any problematic characters
        cleanNotation = cleanNotation.replace(/[^\w\s\|\[\]\/^_=,'":.]/g, '');
        
        // Fix 3: Fix common barline issues
        cleanNotation = cleanNotation.replace(/\|\|+/g, '|');
        
        // Fix 4: Add proper voice declarations
        if (!cleanNotation.includes("V:1") && !cleanNotation.includes("V:")) {
          const insertPosition = cleanNotation.indexOf("\n", cleanNotation.indexOf("K:")) + 1;
          cleanNotation = cleanNotation.slice(0, insertPosition) + 
                          "V:1 clef=treble\n" + 
                          cleanNotation.slice(insertPosition);
        }
        
        console.log("Cleaned up notation, attempting simplified render...");
        try {
          // Try with minimal options for maximum compatibility
          renderResult = ABCJS.renderAbc(currentVisualElement, cleanNotation, {});
          console.log("Simplified render successful!");
        } catch (retryError) {
          console.error("Simplified render failed:", retryError);
          
          // Last resort - fallback to a guaranteed working scale
          console.log("Falling back to guaranteed working scale...");
          const fallbackABC = "X:1\nT:Basic Scale\nM:4/4\nL:1/4\nK:C\nV:1 clef=treble\nC D E F | G A B c |";
          renderResult = ABCJS.renderAbc(currentVisualElement, fallbackABC, {});
          
          // Add error message to the container
          const errorDiv = document.createElement('div');
          errorDiv.className = 'text-red-500 mt-4 p-3 border border-red-700 rounded';
          errorDiv.textContent = 'Failed to render your music. Showing a basic scale instead.';
          currentVisualElement.appendChild(errorDiv);
          
          throw new Error("Had to fall back to basic scale");
        }
      }
      
      if (renderResult && renderResult.length > 0) {
        visualObjRef.current = renderResult;
        setRenderSuccess(true);
        setIsLoading(false);
        setError(null);
        console.log('Rendering successful!', renderResult);
      } else {
        throw new Error('Empty rendering result');
      }
    } catch (err) {
      console.error('Error rendering notation:', err);
      setError(`Rendering failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
    }
  }, [notation, format]);
  
  // Toggle debug view
  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);
  
  // Playback handler - Creates AudioContext fresh each time
  const playEntireSheet = useCallback(async () => {
    if (isPlaying) {
      console.log('Already playing, skipping');
      return;
    }
    
    // Reset error
    setError(null);
    setIsLoading(true);
    
    try {
      // Check if we have the visual object
      if (!visualObjRef.current || visualObjRef.current.length === 0) {
        throw new Error('No visual object available');
      }
      
      // Create a fresh AudioContext directly in the click handler
      // This is the most reliable way to ensure it's properly unlocked
      console.log('Creating fresh AudioContext in click handler...');
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('AudioContext not supported in this browser');
      }
      
      const audioContext = new AudioCtx();
      console.log('New AudioContext created with state:', audioContext.state);
      
      // Resume context if needed (should be running due to user gesture, but just in case)
      if (audioContext.state === 'suspended') {
        console.log('Resuming newly created AudioContext...');
        await audioContext.resume();
        console.log('AudioContext resumed, new state:', audioContext.state);
      }
      
      if (audioContext.state !== 'running') {
        throw new Error(`AudioContext not running after creation (state: ${audioContext.state})`);
      }
      
      // Try each URL in sequence with the fresh context
      const urls = [
        "/soundfonts/MusyngKite/",
        "https://paulrosen.github.io/midi-js-soundfonts/MusyngKite/",
        "https://gleitz.github.io/midi-js-soundfonts/MusyngKite/"
      ];
      
      console.log('Creating synth with fresh AudioContext...');
      const synth = new ABCJS.synth.CreateSynth();
      
      // Initialize with the fresh context
      await synth.init({
        audioContext: audioContext,
        visualObj: visualObjRef.current[0]
      });
      
      console.log('Synth initialized, creating controller...');
      const synthControl = new ABCJS.synth.SynthController();
      
      // Try each URL until one works
      let success = false;
      for (const url of urls) {
        try {
          console.log(`Trying soundfont URL: ${url}`);
          
          await synthControl.load(
            visualObjRef.current[0].setUpAudio(),
            { 
              options: {
                program: 0,
                soundFontUrl: url,
                onEnded: () => setIsPlaying(false)
              }
            }
          );
          
          success = true;
          console.log(`Successfully loaded soundfont from ${url}`);
          break;
        } catch (e) {
          console.error(`Failed with URL ${url}:`, e);
        }
      }
      
      if (!success) {
        throw new Error('Failed to load soundfont from any URL');
      }
      
      // Store the controller for stop function to use
      synthControlRef.current = synthControl;
      
      // Start playback
      console.log('Starting playback...');
      setIsPlaying(true);
      setIsLoading(false);
      await synthControl.play();
      
    } catch (e) {
      console.error('Playback initialization/play failed:', e);
      setError(`Failed to initialize playback: ${e instanceof Error ? e.message : String(e)}`);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [isPlaying, visualObjRef]);
  
  // Stop playback
  const stopPlayback = useCallback(() => {
    if (synthControlRef.current && isPlaying) {
      console.log('Stopping playback');
      synthControlRef.current.stop();
      setIsPlaying(false);
    }
  }, [isPlaying]);
  
  return (
    <div className={`music-sheet ${className || ''}`}>
      <div className="relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button 
            className="text-sm px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            onClick={toggleDebug}
          >
            {showDebug ? "Hide" : "Show"} Debug
          </button>
        </div>
        
        {showDebug && (
          <div className="mb-4 p-4 bg-gray-800 rounded overflow-auto max-h-60">
            <h3 className="text-sm font-medium mb-2 text-gray-400">ABC Notation:</h3>
            <pre ref={debugRef} className="text-xs text-gray-300 whitespace-pre-wrap">{notation}</pre>
          </div>
        )}
        
        <div
          ref={visualRef}
          className="music-sheet-visual bg-opacity-50 p-4 rounded-lg"
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-3 text-white">Loading sheet music...</p>
            </div>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="mt-4 p-3 bg-red-900/20 text-red-400 border border-red-700 rounded">
            {error}
          </div>
        )}
      </div>
      
      {/* Playback controls */}
      {renderSuccess && !isLoading && (
        <div className="flex justify-center items-center gap-4 py-4">
          <button
            onClick={playEntireSheet}
            disabled={isPlaying}
            className={`px-5 py-2 rounded-lg text-white transition-colors duration-150 ease-in-out ${
              isPlaying 
                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
            }`}
          >
            {isPlaying ? 'Playing...' : 'Initialize Audio & Play'}
          </button>
          
          {isPlaying && (
            <button
              onClick={stopPlayback}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Stop
            </button>
          )}
        </div>
      )}
      
      {/* Help text */}
      {renderSuccess && !isLoading && !error && (
        <p className="text-center text-xs text-gray-400 pt-2">
          Click Play to hear the full sheet music.
        </p>
      )}
    </div>
  );
}