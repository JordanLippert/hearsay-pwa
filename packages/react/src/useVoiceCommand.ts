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

  // Tracks whether the component is still mounted so start()/stop() can bail out of
  // their own continuations after an `await` if the component unmounted in the
  // meantime -- e.g. mid-model-load. Without this, only the recorder/stream that
  // already exist at unmount time get released (via the cleanup below); a call to
  // recorder.start() that resolves AFTER unmount would still open the mic for a
  // component that's gone, with no cleanup effect left to fire again.
  const isMountedRef = useRef(true);

  // Without this, a component that unmounts mid-recording leaves the mic stream and
  // the live-level AudioContext/rAF loop running forever -- nothing else would ever
  // call stop()/cancel() again. cancel() is safe to call even if nothing was ever
  // started (AudioRecorder's cancel()/releaseStream() are no-ops in that case).
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
      await engineRef.current!.load((p) => {
        if (isMountedRef.current) setLoadProgress(p);
      });
      if (!isMountedRef.current) {
        // Unmounted while the model was loading -- nothing rendered this update
        // anymore, and starting the recorder now would open the mic for a component
        // that no longer exists with no cleanup effect left to release it later.
        return;
      }
      await recorderRef.current!.start((lvl) => {
        if (isMountedRef.current) setLevel(lvl);
      });
      if (!isMountedRef.current) {
        // Unmounted while getUserMedia() was pending -- the recorder is now live
        // for a gone component; release it ourselves since the cleanup effect
        // already ran before this resolved.
        recorderRef.current!.cancel();
      }
    } catch (err) {
      if (!isMountedRef.current) return;
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
      if (!isMountedRef.current) return;
      setAudioBlob(audio);
      try {
        const bars = await computeWaveform(audio, options.waveformBars ?? 50);
        if (isMountedRef.current) setWaveform(bars);
      } catch {
        // Waveform is a visualization nicety -- never let it block transcription.
        if (isMountedRef.current) setWaveform(null);
      }
      const text = await engineRef.current!.transcribe(audio);
      if (!isMountedRef.current) return;
      const matched = matcherRef.current!.match(text);
      setResult(matched);
      updateStatus("done");
    } catch (err) {
      if (!isMountedRef.current) return;
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
