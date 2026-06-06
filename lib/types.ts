// Valores de enums para SQLite (que no soporta enums nativos en Prisma)

export const VideoStatus = {
  UPLOADED: "UPLOADED",
  EXTRACTING_AUDIO: "EXTRACTING_AUDIO",
  TRANSCRIBING: "TRANSCRIBING",
  GENERATING_EMBEDDINGS: "GENERATING_EMBEDDINGS",
  READY: "READY",
  ERROR: "ERROR",
} as const;

export type VideoStatus = (typeof VideoStatus)[keyof typeof VideoStatus];

export const JobType = {
  EXTRACT_AUDIO: "EXTRACT_AUDIO",
  TRANSCRIBE: "TRANSCRIBE",
  GENERATE_EMBEDDINGS: "GENERATE_EMBEDDINGS",
  GENERATE_THUMBNAIL: "GENERATE_THUMBNAIL",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

// Labels legibles para mostrar en la UI
export const VideoStatusLabel: Record<VideoStatus, string> = {
  UPLOADED: "Subido",
  EXTRACTING_AUDIO: "Extrayendo audio",
  TRANSCRIBING: "Transcribiendo",
  GENERATING_EMBEDDINGS: "Generando embeddings",
  READY: "Listo",
  ERROR: "Error",
};

export const JobStatusLabel: Record<JobStatus, string> = {
  PENDING: "Pendiente",
  RUNNING: "En progreso",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};
