export interface TranscriptionSegment {
  index: number;
  start: number;    // segundos
  end: number;      // segundos
  text: string;
  confidence: number;  // avg_logprob de Whisper (negativo; más cerca de 0 = mejor)
}

export interface TranscriptionResult {
  language: string;
  duration: number;         // segundos
  segments: TranscriptionSegment[];
  full_text: string;
}
