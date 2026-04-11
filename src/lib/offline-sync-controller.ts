class OfflineSyncController {
  private processors = new Set<() => Promise<void>>();

  registerProcessor(processor: () => Promise<void>): () => void {
    this.processors.add(processor);

    return () => {
      this.processors.delete(processor);
    };
  }

  async runNow(): Promise<void> {
    for (const processor of this.processors) {
      await processor();
    }
  }
}

export const offlineSyncController = new OfflineSyncController();
