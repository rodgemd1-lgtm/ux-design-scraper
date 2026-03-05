import '@testing-library/jest-dom';

// Mock chrome APIs globally
const mockStorage: Record<string, unknown> = {};

const chromeMock = {
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`),
    id: 'mock-extension-id',
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn((keys: string | string[] | null) => {
        if (keys === null) return Promise.resolve({ ...mockStorage });
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] });
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          result[key] = mockStorage[key];
        }
        return Promise.resolve(result);
      }),
      set: jest.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: jest.fn((keys: string | string[]) => {
        const keyArr = typeof keys === 'string' ? [keys] : keys;
        for (const key of keyArr) {
          delete mockStorage[key];
        }
        return Promise.resolve();
      }),
    },
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
  scripting: {
    executeScript: jest.fn().mockResolvedValue([{ result: true }]),
  },
  debugger: {
    attach: jest.fn().mockResolvedValue(undefined),
    detach: jest.fn().mockResolvedValue(undefined),
    sendCommand: jest.fn().mockResolvedValue({}),
  },
  downloads: {
    download: jest.fn().mockResolvedValue(1),
  },
  sidePanel: {
    setOptions: jest.fn(),
    setPanelBehavior: jest.fn(),
  },
  action: {
    onClicked: {
      addListener: jest.fn(),
    },
  },
};

Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
});

// Mock fetch globally
globalThis.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  headers: new Headers(),
});

// Mock URL.createObjectURL
globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = jest.fn();
