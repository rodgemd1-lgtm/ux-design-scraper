/**
 * Abstract base class for all DOM extractor modules.
 * Provides consistent error handling, timing, and result structure.
 */

export interface ExtractorResult<T> {
  success: boolean;
  data: T;
  errors: string[];
  duration: number;
}

export abstract class BaseExtractor<T> {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  async extract(): Promise<ExtractorResult<T>> {
    const start = performance.now();
    try {
      const data = await this.doExtract();
      return {
        success: true,
        data,
        errors: [],
        duration: performance.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        data: this.emptyResult(),
        errors: [(err as Error).message],
        duration: performance.now() - start,
      };
    }
  }

  protected abstract doExtract(): Promise<T>;
  protected abstract emptyResult(): T;
}
