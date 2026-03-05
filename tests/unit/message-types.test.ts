import { MSG } from '@shared/message-types';

describe('Message Types (MSG)', () => {
  it('should export a non-empty MSG object', () => {
    expect(MSG).toBeDefined();
    expect(typeof MSG).toBe('object');
    expect(Object.keys(MSG).length).toBeGreaterThan(0);
  });

  it('all message type values should be non-empty strings', () => {
    for (const [key, value] of Object.entries(MSG)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all message type values should be unique', () => {
    const values = Object.values(MSG);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('each key should equal its value (convention check)', () => {
    for (const [key, value] of Object.entries(MSG)) {
      expect(key).toBe(value);
    }
  });

  describe('Chat message types', () => {
    it('should have all chat-related types', () => {
      expect(MSG.CHAT_SEND).toBeDefined();
      expect(MSG.CHAT_STREAM_CHUNK).toBeDefined();
      expect(MSG.CHAT_STREAM_DONE).toBeDefined();
      expect(MSG.CHAT_ERROR).toBeDefined();
    });
  });

  describe('Scrape pipeline message types', () => {
    it('should have start and stop', () => {
      expect(MSG.START_SCRAPE).toBeDefined();
      expect(MSG.STOP_SCRAPE).toBeDefined();
    });

    it('should have step lifecycle types', () => {
      expect(MSG.SCRAPE_STEP_START).toBeDefined();
      expect(MSG.SCRAPE_STEP_PROGRESS).toBeDefined();
      expect(MSG.SCRAPE_STEP_COMPLETE).toBeDefined();
      expect(MSG.SCRAPE_STEP_ERROR).toBeDefined();
      expect(MSG.SCRAPE_ALL_COMPLETE).toBeDefined();
    });
  });

  describe('Output and sync message types', () => {
    it('should have file output types', () => {
      expect(MSG.GENERATE_OUTPUT).toBeDefined();
      expect(MSG.OUTPUT_PROGRESS).toBeDefined();
      expect(MSG.OUTPUT_COMPLETE).toBeDefined();
    });

    it('should have supabase sync types', () => {
      expect(MSG.SYNC_TO_SUPABASE).toBeDefined();
      expect(MSG.SYNC_PROGRESS).toBeDefined();
      expect(MSG.SYNC_COMPLETE).toBeDefined();
    });
  });

  describe('Multi-site and batch message types', () => {
    it('should have multi-site types', () => {
      expect(MSG.MULTI_SITE_SCRAPE).toBeDefined();
      expect(MSG.MULTI_SITE_PROGRESS).toBeDefined();
      expect(MSG.MULTI_SITE_COMPLETE).toBeDefined();
    });

    it('should have batch queue types', () => {
      expect(MSG.BATCH_QUEUE_ADD).toBeDefined();
      expect(MSG.BATCH_QUEUE_START).toBeDefined();
      expect(MSG.BATCH_QUEUE_STATUS).toBeDefined();
      expect(MSG.BATCH_QUEUE_PROGRESS).toBeDefined();
    });
  });

  describe('AI generation message types', () => {
    it('should have design critique types', () => {
      expect(MSG.CRITIQUE_DESIGN).toBeDefined();
      expect(MSG.CRITIQUE_RESULT).toBeDefined();
    });

    it('should have persona generation types', () => {
      expect(MSG.GENERATE_PERSONAS).toBeDefined();
      expect(MSG.PERSONAS_RESULT).toBeDefined();
    });

    it('should have copy rewriting types', () => {
      expect(MSG.REWRITE_COPY).toBeDefined();
      expect(MSG.COPY_RESULT).toBeDefined();
    });

    it('should have A/B test types', () => {
      expect(MSG.GENERATE_AB_TESTS).toBeDefined();
      expect(MSG.AB_TESTS_RESULT).toBeDefined();
    });
  });
});
