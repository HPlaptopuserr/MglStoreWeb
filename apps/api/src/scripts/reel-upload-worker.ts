import "../config/env";
import { startReelUploadWorker } from "../services/reel-upload/worker";

// Optional dedicated worker process. Set REEL_UPLOAD_WORKER_ENABLED=false on
// web instances when this process owns the shared database queue.
const timer = startReelUploadWorker();
timer.ref();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    clearInterval(timer);
  });
}
