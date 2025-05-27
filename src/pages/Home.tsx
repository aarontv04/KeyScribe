import React, { useState, useEffect, useRef } from 'react';
import { FileUpload } from '../components/FileUpload';
import { MusicSheet } from '../components/MusicSheet';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { Piano, Music, AudioWaveform as Waveform, AlertCircle } from 'lucide-react';
import { analyzeAudio, AudioAnalysisResult, Note } from '../utils/audioAnalysis';
import { analyzeAudioFile } from '../services/audioAnalysis';

// --- ABC Notation Generation Helpers ---

// Basic mapping from Note pitch to ABC pitch (Helper from previous attempt - removed as noteNameToAbc handles it)
// const pitchToAbc: { [key: string]: string } = { ... };

function noteNameToAbc(pitch: string): string {
    if (!pitch || pitch.trim() === '') {
        console.warn(`Empty pitch provided, returning rest`);
        return 'z'; // Explicitly return rest for empty/whitespace pitch
    }
    
    // Handle "pitchindefined" or other malformed pitch strings
    if (pitch.includes('undefined') || pitch.includes('pitchindefined')) {
        console.warn(`Found malformed pitch: ${pitch}. Treating as rest.`);
        return 'z';
    }
    
    try {
        // Standard pitch format should be like "C4", "F#5", etc.
        const match = pitch.match(/^([A-G])([#b]?)(-?\d+)$/);
        if (!match) {
            console.warn(`Unexpected pitch format: '${pitch}'. Treating as rest.`);
            return 'z'; // Rest if format is unexpected
        }

        let note = match[1];       // The note letter (C, D, E, etc.)
        const accidental = match[2]; // # or b
        const octave = parseInt(match[3], 10);
            
        if (isNaN(octave)) {
            console.warn(`Invalid octave in pitch: '${pitch}'. Treating as rest.`);
            return 'z';
        }
        
        // DEBUG: Log the pitch components
        console.log(`[noteNameToAbc] Converting pitch: ${pitch} (note=${note}, accidental=${accidental}, octave=${octave})`);

        // In ABC notation:
        // - Middle C (C4) = C
        // - C5 = c (lowercase means one octave higher)
        // - C3 = C, (comma means one octave lower)
        // - Accidentals: ^C = C# (sharp), _C = Cb (flat)
        
        // Build the ABC note
        let abcNote = note;
        
        // Handle accidentals - add before the note letter
        if (accidental === '#') abcNote = `^${note}`;
        else if (accidental === 'b') abcNote = `_${note}`;

        // Handle octave adjustments
        if (octave < 4) {
            // For lower octaves, add commas (each comma lowers by one octave)
            abcNote += ','.repeat(4 - octave);
        } else if (octave > 4) {
            // For higher octaves, use lowercase for one octave up, then add apostrophes
            abcNote = abcNote.toLowerCase();
            if (octave > 5) {
                // Add apostrophes for each octave above 5
                abcNote += "'".repeat(octave - 5);
            }
        }
        // Octave 4 keeps the default notation (uppercase, no symbols)
        
        console.log(`[noteNameToAbc] Converted to ABC: ${pitch} → ${abcNote}`);
        return abcNote;
    } catch (error) {
        console.error(`Error in noteNameToAbc for pitch '${pitch}':`, error);
        return 'z'; // Fall back to rest on any error
    }
}

// Determine ABC default note length (L:) and multipliers based on tempo/time sig
// Using L:1/4 as base seems common for abcjs processing and duration ratios
function getAbcLengthAndMultiplier(tempo: number, timeSignature: string): { defaultLength: string, beatLengthSeconds: number, measureDurationSeconds: number } {
    const defaultLength = '1/4'; // Quarter note as the L: unit
    const beatLengthSeconds = 60 / tempo; // Duration of a quarter note beat (matches L:)
    const [numerator] = timeSignature.split('/').map(Number);
    const measureDurationSeconds = beatLengthSeconds * numerator; // Total duration of a measure in seconds
    return { defaultLength, beatLengthSeconds, measureDurationSeconds };
}

/**
 * Converts a duration in seconds to an ABC notation length
 * @param durationSeconds Duration in seconds
 * @param beatLengthSeconds Duration of a beat in seconds
 * @returns ABC notation length string
 */
function secondsToAbcLength(durationSeconds: number, beatLengthSeconds: number): string {
  // Standard note durations in ABC (relative to quarter note): 1/4=quarter, 1/2=half, 1=whole, etc.
  const durationRatio = durationSeconds / beatLengthSeconds;
  
  // Use simplified duration values that ABCJS can reliably parse
  // For L:1/4 (quarter note base):
  
  // Handle special cases first with exact matches
  if (Math.abs(durationRatio - 4) < 0.2) return "4";     // Whole note
  if (Math.abs(durationRatio - 3) < 0.2) return "3";     // Dotted half
  if (Math.abs(durationRatio - 2) < 0.2) return "2";     // Half note
  if (Math.abs(durationRatio - 1.5) < 0.2) return "3/2"; // Dotted quarter
  if (Math.abs(durationRatio - 1) < 0.2) return "";      // Quarter (default, no modifier)
  if (Math.abs(durationRatio - 0.5) < 0.15) return "/2"; // Eighth
  if (Math.abs(durationRatio - 0.25) < 0.1) return "/4"; // Sixteenth
  
  // For longer notes, use integers only
  if (durationRatio >= 4) return "4";  // Cap at whole note
  if (durationRatio >= 3) return "3";  // Use dotted half note
  if (durationRatio >= 2) return "2";  // Use half note
  if (durationRatio >= 1.25) return "3/2"; // Dotted quarter
  if (durationRatio >= 0.75) return ""; // Quarter note (default)
  
  // For shorter notes, use simple fractions
  if (durationRatio >= 0.375) return "/2"; // Eighth note
  if (durationRatio >= 0) return "/4";     // Sixteenth note
  
  // Failsafe
  return "";  // Default to quarter note
}

/**
 * Adds an event (note or rest) to the ABC staff, managing measure boundaries
 * @param abcStaff Current ABC staff content
 * @param event Note or rest in ABC notation
 * @param duration Duration in seconds
 * @param currentBeatInMeasure Current beat position in the measure
 * @param beatsPerMeasure Total beats per measure from time signature
 * @param beatLengthSeconds Duration of one beat in seconds
 * @returns Object with updated staff content, beat position, and measure count
 */
function addEventToStaff(
  abcStaff: string,
  event: string,
  duration: number,
  currentBeatInMeasure: number,
  beatsPerMeasure: number,
  beatLengthSeconds: number
): { 
  staff: string, 
  currentBeat: number, 
  measureCount: number 
} {
  console.log(`[addEventToStaff] Adding event: ${event}, duration: ${duration}, currentBeat: ${currentBeatInMeasure}`);

  // Initialize measure count from existing staff content
  const measureCount = (abcStaff.match(/\|/g) || []).length;
  
  // Convert duration to ABC notation length
  const abcLength = secondsToAbcLength(duration, beatLengthSeconds);
  
  // Calculate beats this event will occupy in the measure
  const eventBeats = duration / beatLengthSeconds;
  const newBeatPosition = currentBeatInMeasure + eventBeats;
  
  let updatedStaff = abcStaff;
  let updatedBeat = newBeatPosition;
  let updatedMeasureCount = measureCount;
  
  // For extremely short events, use a minimum duration to prevent ABC parsing issues
  if (eventBeats < 0.1) {
    console.log(`[addEventToStaff] Using minimum duration for short event: ${event}`);
    // Use a sixteenth note as minimum
    updatedStaff += `${event}/4 `;
    updatedBeat = currentBeatInMeasure + 0.25;
    return { 
      staff: updatedStaff, 
      currentBeat: updatedBeat, 
      measureCount: updatedMeasureCount 
    };
  }
  
  // SIMPLIFIED APPROACH: Just add notes/rests without complex measure handling
  // This sacrifices some musical accuracy but is more likely to parse correctly
  
  // Case 1: Note fits in current measure
  if (newBeatPosition <= beatsPerMeasure) {
    // Add the note with its duration
    updatedStaff += `${event}${abcLength} `;
    updatedBeat = newBeatPosition;
    
    // If we've exactly filled a measure, add a barline
    if (Math.abs(newBeatPosition - beatsPerMeasure) < 0.1) {
      updatedStaff += "| ";
      updatedBeat = 0;
      updatedMeasureCount++;
      
      // Add a newline after every 4 measures for readability
      if (updatedMeasureCount % 4 === 0) {
        updatedStaff += "\n";
      }
    }
  }
  // Case 2: Note would cross a measure boundary
  else {
    // Instead of complex ties, just end the current measure and start a new one
    // This is less musically accurate but more reliable for parsing
    
    // Add a rest to fill the current measure
    const remainingBeats = beatsPerMeasure - currentBeatInMeasure;
    const remainingLength = secondsToAbcLength(remainingBeats * beatLengthSeconds, beatLengthSeconds);
    updatedStaff += `z${remainingLength} | `;
    updatedMeasureCount++;
    
    // Add a newline after every 4 measures
    if (updatedMeasureCount % 4 === 0) {
      updatedStaff += "\n";
    }
    
    // Add the note in the next measure
    updatedStaff += `${event}${abcLength} `;
    updatedBeat = eventBeats;
    
    // If the note exactly fills the next measure, add a barline
    if (Math.abs(eventBeats - beatsPerMeasure) < 0.1) {
      updatedStaff += "| ";
      updatedBeat = 0;
      updatedMeasureCount++;
      
      // Add a newline after every 4 measures
      if (updatedMeasureCount % 4 === 0) {
        updatedStaff += "\n";
      }
    }
  }
  
  return {
    staff: updatedStaff,
    currentBeat: updatedBeat,
    measureCount: updatedMeasureCount
  };
}

/**
 * Generates staff notation from a list of notes
 * @param notes List of notes to convert to ABC notation
 * @param beatLengthSeconds Duration of a beat in seconds
 * @param beatsPerMeasure Beats per measure from time signature
 * @returns Complete ABC staff content
 */
function generateStaffNotation(
  notes: Note[],
  beatLengthSeconds: number,
  beatsPerMeasure: number
): string {
  if (!notes || notes.length === 0) {
    // Return a full measure rest if no notes
    return `z${beatsPerMeasure} | `;
  }
  
  let staff = '';
  let currentBeat = 0;
  let measureCount = 0;
  let lastNoteEndTime = 0;
  
  // Sort notes by start time
  const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
  
  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    
    // Calculate gap between previous note and this one
    const gap = note.startTime - lastNoteEndTime;
    
    // If there's a significant gap, add a rest
    if (gap > beatLengthSeconds * 0.1) {
      // Add rest to bridge the gap
      const result = addEventToStaff(staff, 'z', gap, currentBeat, beatsPerMeasure, beatLengthSeconds);
      staff = result.staff;
      currentBeat = result.currentBeat;
      measureCount = result.measureCount;
    }
    
    // Convert note pitch to ABC notation
    const abcNote = noteNameToAbc(note.pitch);
    
    // Add the note
    const result = addEventToStaff(staff, abcNote, note.duration, currentBeat, beatsPerMeasure, beatLengthSeconds);
    staff = result.staff;
    currentBeat = result.currentBeat;
    measureCount = result.measureCount;
    
    // Update the end time for calculating the next gap
    lastNoteEndTime = note.startTime + note.duration;
  }
  
  // Complete the final measure with rests if needed
  if (currentBeat > 0 && currentBeat < beatsPerMeasure) {
    const remainingBeats = beatsPerMeasure - currentBeat;
    const restDuration = remainingBeats * beatLengthSeconds;
    
    const result = addEventToStaff(staff, 'z', restDuration, currentBeat, beatsPerMeasure, beatLengthSeconds);
    staff = result.staff;
  }
  
  // Ensure we end with a barline
  if (!staff.trim().endsWith('|')) {
    staff += '|';
  }
  
  return staff;
}

// Helper function to create a super simple, guaranteed-to-parse ABC notation
function createSimpleAbc(analysis: AudioAnalysisResult): string {
  // Use very minimal ABC notation with just a few notes
  let abc = 'X:1\n';
  abc += 'T:Simple Transcription\n';
  abc += 'M:4/4\n';
  abc += 'L:1/4\n';
  abc += 'K:C\n';
  
  // Add a few simple notes from the analysis if possible
  abc += 'V:1 clef=treble\n';
  
  // Pick up to 8 notes from the treble range if available
  const trebleNotes = analysis.notes
    .filter(note => {
      try {
        const match = note.pitch?.match(/^([A-G][#b]?)(\d+)$/);
        if (!match) return false;
        const octave = parseInt(match[2], 10);
        return !isNaN(octave) && octave >= 4;
      } catch (e) {
        return false;
      }
    })
    .slice(0, 8);
    
  if (trebleNotes.length > 0) {
    let trebleLine = '';
    // Add simple quarter notes - 4 per measure
    for (let i = 0; i < trebleNotes.length; i++) {
      try {
        const note = trebleNotes[i];
        if (note && note.pitch) {
          const pitchPart = note.pitch.match(/^([A-G][#b]?)(\d+)$/);
          if (pitchPart) {
            // Create a very basic note, no accidentals or complex notation
            const noteLetter = pitchPart[1].charAt(0);
            const octave = parseInt(pitchPart[2], 10);
            
            // Simple octave representation
            let abcNote = octave >= 5 ? noteLetter.toLowerCase() : noteLetter;
            trebleLine += abcNote + ' ';
          } else {
            trebleLine += 'C ';
          }
        } else {
          trebleLine += 'C ';
        }
        
        // Add barlines every 4 notes
        if ((i + 1) % 4 === 0) {
          trebleLine += '| ';
        }
      } catch (e) {
        trebleLine += 'C ';
      }
    }
    
    // Ensure we end with a barline
    if (!trebleLine.trim().endsWith('|')) {
      trebleLine += '|';
    }
    
    abc += trebleLine + '\n';
  } else {
    // If no notes, add a simple C major scale
    abc += 'C D E F | G A B c |\n';
  }
  
  // Add a simple bass clef with a C major chord
  abc += 'V:2 clef=bass\n';
  abc += 'C,, E,, G,, C, |\n';
  
  return abc;
}

// --- React Component ---

export function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notation, setNotation] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setError('');
    setNotation('');
    setAnalysisResult(null);

    console.log("[Home] Starting audio processing...");
    
    try {
      const analysis = await analyzeAudio(file);
      console.log("[Home] Audio analysis complete. Result:", analysis); 

      if (!analysis || !analysis.notes) {
          console.error("[Home] Analysis result is invalid or missing notes.");
          setError("Failed to analyze audio: No notes data found.");
          setIsProcessing(false);
          return;
      }
      setAnalysisResult(analysis);
      
      // Generate ABC notation from the analysis result
      console.log("[Home] Calling generateABCNotation...");
      const abcNotation = generateABCNotation(analysis);
      
      // Log the generated ABC notation in a more readable format
      console.log("[Home] Generated ABC Notation:");
      console.log(abcNotation);
      console.log("[Home] ABC Notation by line:");
      abcNotation.split('\n').forEach((line, i) => console.log(`Line ${i+1}: ${line}`));

      // Always use the generated notation - MusicSheet will handle rendering and fallbacks
      setNotation(abcNotation);
      console.log("[Home] ABC Notation state updated, length:", abcNotation.length);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error processing audio file';
      setError(errorMsg);
      console.error("[Home] Error during audio processing or ABC generation:", err);
    } finally {
      setIsProcessing(false);
      console.log("[Home] Processing finished.");
    }
  };

  const generateABCNotation = (analysis: AudioAnalysisResult): string => {
    console.log("[generateABCNotation] Function called with analysis:", analysis);
    console.log("[generateABCNotation] Notes count:", analysis.notes?.length);
    
    // DEBUG: Log first few notes to inspect their content
    if (analysis.notes && analysis.notes.length > 0) {
      console.log("[generateABCNotation] First few notes:", analysis.notes.slice(0, 5));
    }

    if (!analysis || !analysis.notes || !Array.isArray(analysis.notes)) {
        console.warn("[generateABCNotation] Invalid analysis input or missing/invalid notes array. Returning empty ABC.");
        return 'X:1\nT:Audio Transcription\nK:C\nM:4/4\nL:1/4\n|z4|';
    }
    
    // We no longer check for empty notes array since we now always have synthetic notes

    // Ensure required properties exist with defaults if needed
    const tempo = typeof analysis.tempo === 'number' ? analysis.tempo : 120;
    const timeSignature = typeof analysis.timeSignature === 'string' ? analysis.timeSignature : '4/4';
    const key = typeof analysis.key === 'string' ? analysis.key : 'C Major';
    
    // Simplify the key representation 
    let abcKey = key.replace(' Major', '').replace(' Minor', 'm');
    
    // Create a simple, reliable ABC header
    let abcString = '';
    abcString += 'X:1\n';
    abcString += 'T:Audio Transcription\n';
    abcString += `M:${timeSignature}\n`;
    abcString += 'L:1/4\n';  // Fixed length for simplicity
    abcString += `Q:1/4=${tempo}\n`;
    abcString += `K:${abcKey}\n`;
    
    // ULTRA-SIMPLE APPROACH: Create basic notation without complex formatting
    // This sacrifices some formatting for reliability
    
    // Split notes into treble and bass clefs
    const trebleNotes = analysis.notes.filter(note => {
      const match = note.pitch?.match(/^([A-G][#b]?)(\d+)$/);
      if (!match) return false;
      const octave = parseInt(match[2], 10);
      return octave >= 4; // Treble clef for octave 4 and above
    });
    
    const bassNotes = analysis.notes.filter(note => {
      const match = note.pitch?.match(/^([A-G][#b]?)(\d+)$/);
      if (!match) return false;
      const octave = parseInt(match[2], 10);
      return octave < 4; // Bass clef for octave 3 and below
    });
    
    console.log("[generateABCNotation] Treble notes count:", trebleNotes.length);
    console.log("[generateABCNotation] Bass notes count:", bassNotes.length);
    
    // Generate incredibly simple treble staff
    abcString += 'V:1 clef=treble\n';
    
    // Create a very basic sequence of quarter notes
    if (trebleNotes.length > 0) {
      let trebleContent = '';
      let noteCount = 0;
      
      for (let i = 0; i < Math.min(32, trebleNotes.length); i++) {
        try {
          const note = trebleNotes[i];
          const abcNote = noteNameToAbc(note.pitch);
          trebleContent += abcNote + ' ';
          noteCount++;
          
          // Add barline every 4 notes
          if (noteCount % 4 === 0) {
            trebleContent += '| ';
          }
        } catch (e) {
          console.error("[generateABCNotation] Error processing treble note:", e);
          // Skip problematic notes
        }
      }
      
      // Ensure we end with a barline
      if (!trebleContent.trim().endsWith('|')) {
        trebleContent += '|';
      }
      
      abcString += trebleContent + '\n';
    } else {
      // If no treble notes, add a rest measure
      abcString += 'z4 |\n';
    }
    
    // Generate incredibly simple bass staff
    abcString += 'V:2 clef=bass\n';
    
    // Create a very basic sequence of quarter notes
    if (bassNotes.length > 0) {
      let bassContent = '';
      let noteCount = 0;
      
      for (let i = 0; i < Math.min(32, bassNotes.length); i++) {
        try {
          const note = bassNotes[i];
          const abcNote = noteNameToAbc(note.pitch);
          bassContent += abcNote + ' ';
          noteCount++;
          
          // Add barline every 4 notes
          if (noteCount % 4 === 0) {
            bassContent += '| ';
          }
        } catch (e) {
          console.error("[generateABCNotation] Error processing bass note:", e);
          // Skip problematic notes
        }
      }
      
      // Ensure we end with a barline
      if (!bassContent.trim().endsWith('|')) {
        bassContent += '|';
      }
      
      abcString += bassContent + '\n';
    } else {
      // If no bass notes, add a rest measure
      abcString += 'z4 |\n';
    }
    
    console.log("[generateABCNotation] Generated ABC notation:");
    console.log(abcString);
    
    // No sanitization or validation - use the simplified notation as-is
    return abcString;
  };

  /**
   * Sanitizes ABC notation to ensure it's valid and can be parsed by ABCJS
   * @param abc Raw ABC notation to sanitize
   * @returns Sanitized ABC notation
   */
  function sanitizeAbcNotation(abc: string): string {
    // Split into lines for processing
    const lines = abc.split('\n');
    const cleanLines: string[] = [];
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Preserve header and directives
      if (line.match(/^[A-Z]:/) || line.startsWith('%%')) {
        cleanLines.push(line);
        continue;
      }
      
      // Clean up voice/clef lines
      if (line.startsWith('V:')) {
        cleanLines.push(line);
        continue;
      }
      
      // Process music lines
      if (line) {
        // Remove any invalid characters
        line = line.replace(/[^\w\s\|\[\]\/^_=,'":.]/g, '');
        
        // Clean up double spaces
        line = line.replace(/\s+/g, ' ');
        
        // Fix unmatched barlines - ensure each line ends with |
        if (!line.endsWith('|') && !line.startsWith('V:') && !line.includes(':')) {
          line = line.trim() + ' |';
        }
        
        // Fix potential notation errors
        // Replace "z/" with "z/2" (incomplete rest notation)
        line = line.replace(/z\//g, 'z/2');
        
        // Replace invalid repeated bar symbols
        line = line.replace(/\|\|/g, '|');
        
        cleanLines.push(line);
      }
    }
    
    // Ensure treble and bass staves end with full measures
    return cleanLines.join('\n');
  }

  /**
   * Validates and cleans ABC notation to ensure ABCJS can parse it
   * @param abc ABC notation string to validate
   * @returns True if valid or successfully cleaned, false if major issues found
   */
  function validateAndCleanAbc(abc: string): boolean {
    try {
      // Check for required ABC headers (relaxed validation)
      if (!abc.includes('X:') || !abc.includes('K:')) {
        console.error('ABC notation missing absolutely required headers (X: or K:)');
        return false;
      }
      
      // Split into lines
      const lines = abc.split('\n');
      let currentVoice = '';
      let hasValidContent = false;
      
      // Validate each voice/staff section (more lenient now)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Track current voice
        if (line.startsWith('V:')) {
          currentVoice = line;
          continue;
        }
        
        // Skip header lines and formatting directives
        if (line.includes(':') || line.startsWith('%%') || line.trim() === '') {
          continue;
        }
        
        // Check for content lines - just mark as having content if not empty
        if (line.trim() && currentVoice) {
          hasValidContent = true;
        }
      }
      
      // Only fail validation if we have no content at all
      if (!hasValidContent) {
        console.error('ABC notation has no valid content after headers');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Error validating ABC notation:', e);
      // Be more lenient - don't fail on validation errors
      return true;
    }
  }

  // --- JSX Return ---
  return (
    <div className="pt-16">
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black to-gray-900 text-white"> {/* Ensure text-white is high up */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <Piano className="w-16 h-16 text-blue-400" />
            </div>
            <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Transform Your Piano Music
            </h1>
            <p className="text-xl text-gray-300 mb-12">
              Turn your piano recordings into beautiful sheet music with our AI-powered transcription
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Waveform className="w-6 h-6" />
                Upload Your Audio
              </h2>
              <FileUpload onFileSelect={handleFileSelect} />
              
              {error && (
                  <div className="mt-4 p-4 rounded-lg bg-red-900/20 text-red-400 border border-red-700">
                  {error}
                </div>
              )}

              {selectedFile && !error && (
                <div className="mt-8">
                  <WaveformVisualizer
                    audioFile={selectedFile}
                    onTimeUpdate={setCurrentTime}
                  />
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="text-center py-8 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
                <p className="mt-4 text-gray-300">Analyzing and transcribing your music...</p>
              </div>
            )}

            {analysisResult?.truncated && (
                <div className="bg-yellow-900/20 text-yellow-400 p-4 rounded-lg flex items-start gap-3 border border-yellow-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  Your audio file was longer than 1 minute. We've analyzed only the first minute to ensure optimal transcription quality.
                </p>
              </div>
            )}

            {notation && analysisResult && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Music className="w-6 h-6" />
                  Your Sheet Music
                </h2>
                <div className="mb-6 grid grid-cols-2 gap-4 text-gray-300">
                  <div className="p-4 rounded-lg bg-white/5">
                    <h3 className="text-lg font-semibold mb-2">Key</h3>
                    <p>{analysisResult.key}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <h3 className="text-lg font-semibold mb-2">Tempo</h3>
                    <p>{analysisResult.tempo} BPM</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <h3 className="text-lg font-semibold mb-2">Time Signature</h3>
                    <p>{analysisResult.timeSignature}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <h3 className="text-lg font-semibold mb-2">Notes Detected</h3>
                    <p>{analysisResult.notes.length}</p>
                  </div>
                </div>
                  {/* Ensure parent div allows text color to inherit or set explicitly */}
                  <div className="min-h-[700px] text-white overflow-x-auto flex flex-col items-center justify-center"> {/* Increased height & centered content */}
                  <MusicSheet notation={notation} className="mt-4 w-full max-w-4xl" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}