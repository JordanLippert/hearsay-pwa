import { useCallback, useRef, useState } from "react";
import {
  AudioRecorder,
  TranscriptionEngine,
  CommandMatcher,
  type IntentDefinition,
  type VoiceResult,
} from "@pwa-voice-interpreter/core";

export type VoiceCommandStatus = "idle" | "recording" | "transcribing" | "done";

export interface UseVoiceCommandOptions {
  intents: IntentDefinition[];
  model?: string;
}

export function useVoiceCommand(options: UseVoiceCommandOptions) {
  const [status, setStatus] = useState<VoiceCommandStatus>("idle");
  const [result, setResult] = useState<VoiceResult | null>(null);

  const recorderRef = useRef<AudioRecorder>();
  const engineRef = useRef<TranscriptionEngine>();
  const matcherRef = useRef<CommandMatcher>();

  if (!recorderRef.current) recorderRef.current = new AudioRecorder();
  if (!engineRef.current) engineRef.current = new TranscriptionEngine({ model: options.model });
  if (!matcherRef.current) matcherRef.current = new CommandMatcher(options.intents);

  const start = useCallback(async () => {
    setStatus("recording");
    setResult(null);
    await engineRef.current!.load(() => {});
    await recorderRef.current!.start();
  }, []);

  const stop = useCallback(async () => {
    setStatus("transcribing");
    const audio = await recorderRef.current!.stop();
    const text = await engineRef.current!.transcribe(audio);
    const matched = matcherRef.current!.match(text);
    setResult(matched);
    setStatus("done");
  }, []);

  const cancel = useCallback(() => {
    recorderRef.current!.cancel();
    setStatus("idle");
  }, []);

  return { start, stop, cancel, status, result };
}
