import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioRecorder,
  TranscriptionEngine,
  CommandMatcher,
  computeWaveform,
  type IntentDefinition,
  type VoiceResult,
  type ModelLoadProgress,
} from "@hearsay-pwa/core";

export type VoiceCommandStatus = "idle" | "recording" | "transcribing" | "done";

export interface UseVoiceCommandOptions {
  intents: IntentDefinition[];
  model?: string;
  language?: string;
  waveformBars?: number;
}

export function useVoiceCommand(options: UseVoiceCommandOptions) {
  const [status, setStatus] = useState<VoiceCommandStatus>("idle");
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loadProgress, setLoadProgress] = useState<ModelLoadProgress | null>(null);
  const [level, setLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<AudioRecorder | undefined>(undefined);
  const engineRef = useRef<TranscriptionEngine | undefined>(undefined);
  const matcherRef = useRef<CommandMatcher | undefined>(undefined);
  // Mirrors `status` synchronously so the start()/stop() guards below always see the
  // latest value even though the callbacks have an empty dependency array (React state
  // read via closure would be stale between renders).
  const statusRef = useRef<VoiceCommandStatus>("idle");

  if (!recorderRef.current) recorderRef.current = new AudioRecorder();
  if (!engineRef.current)
    engineRef.current = new TranscriptionEngine({ model: options.model, language: options.language });
  if (!matcherRef.current) matcherRef.current = new CommandMatcher(options.intents);

  // Without this, a component that unmounts mid-recording leaves the mic stream and
  // the live-level AudioContext/rAF loop running forever -- nothing else would ever
  // call stop()/cancel() again. cancel() is safe to call even if nothing was ever
  // started (AudioRecorder's cancel()/releaseStream() are no-ops in that case).
  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
    };
  }, []);

  const updateStatus = useCallback((next: VoiceCommandStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const start = useCallback(async () => {
    // No-op if a recording/transcription is already in flight.
    if (statusRef.current !== "idle" && statusRef.current !== "done") return;
    updateStatus("recording");
    setResult(null);
    setError(null);
    setWaveform(null);
    setAudioBlob(null);
    try {
      await engineRef.current!.load((p) => setLoadProgress(p));
      await recorderRef.current!.start((lvl) => setLevel(lvl));
    } catch (err) {
      updateStatus("idle");
      setLevel(0);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [updateStatus]);

  const stop = useCallback(async () => {
    // Only meaningful once a recording is actually in progress.
    if (statusRef.current !== "recording") return;
    updateStatus("transcribing");
    setLevel(0);
    try {
      const audio = await recorderRef.current!.stop();
      setAudioBlob(audio);
      try {
        const bars = await computeWaveform(audio, options.waveformBars ?? 50);
        setWaveform(bars);
      } catch {
        // Waveform is a visualization nicety -- never let it block transcription.
        setWaveform(null);
      }
      const text = await engineRef.current!.transcribe(audio);
      const matched = matcherRef.current!.match(text);
      setResult(matched);
      updateStatus("done");
    } catch (err) {
      updateStatus("idle");
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [updateStatus, options.waveformBars]);

  const cancel = useCallback(() => {
    recorderRef.current!.cancel();
    setLevel(0);
    updateStatus("idle");
  }, [updateStatus]);

  return {
    start,
    stop,
    cancel,
    status,
    result,
    error,
    loadProgress,
    level,
    waveform,
    audioBlob,
  };
}
