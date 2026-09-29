import { VisualSearchError } from "./visual-search-errors";

interface WaitingTask {
  start: () => void;
  reject: (error: Error) => void;
  cleanup: () => void;
}

/** One native inference at a time; queued buffers have a fixed count and deadline. */
export class VisualSearchQueue {
  private active = false;
  private readonly waiting: WaitingTask[] = [];
  constructor(
    private readonly capacity = 4,
    private readonly waitMs = 2000,
  ) {}

  private busy() {
    return new VisualSearchError(
      429,
      "VISUAL_SEARCH_BUSY",
      "Хайлт ачаалалтай байна. Түр хүлээгээд дахин оролдоорой.",
    );
  }

  async run<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted)
      throw new VisualSearchError(499, "SEARCH_CANCELLED", "Хайлт цуцлагдсан.");
    if (this.active) {
      if (this.waiting.length >= this.capacity) throw this.busy();
      await new Promise<void>((resolve, reject) => {
        const remove = (error: Error) => {
          const index = this.waiting.indexOf(task);
          if (index >= 0) this.waiting.splice(index, 1);
          task.cleanup();
          reject(error);
        };
        const aborted = () =>
          remove(
            new VisualSearchError(499, "SEARCH_CANCELLED", "Хайлт цуцлагдсан."),
          );
        const timer = setTimeout(() => remove(this.busy()), this.waitMs);
        const task: WaitingTask = {
          start: resolve,
          reject,
          cleanup: () => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", aborted);
          },
        };
        this.waiting.push(task);
        signal?.addEventListener("abort", aborted, { once: true });
      });
    } else {
      this.active = true;
    }
    try {
      if (signal?.aborted)
        throw new VisualSearchError(
          499,
          "SEARCH_CANCELLED",
          "Хайлт цуцлагдсан.",
        );
      return await operation();
    } finally {
      const next = this.waiting.shift();
      if (next) {
        next.cleanup();
        next.start();
      } else this.active = false;
    }
  }
}
