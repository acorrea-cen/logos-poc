import PQueue from "p-queue";

// Cola global de transcripciones — 1 video a la vez (CPU limitada)
// El estado de cada job se persiste en SQLite via Job model
const transcriptionQueue = new PQueue({ concurrency: 1 });

export default transcriptionQueue;

export function getQueueStats() {
  return {
    size: transcriptionQueue.size,       // jobs pendientes en cola
    pending: transcriptionQueue.pending, // jobs corriendo ahora
    isPaused: transcriptionQueue.isPaused,
  };
}
