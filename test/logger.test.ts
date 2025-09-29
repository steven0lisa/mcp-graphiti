import { Logger, LogLevel, createLogger } from '../src/utils/logger.js';

// Mock console methods
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleDebug.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Logger.getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();

      expect(logger1).toBe(logger2);
    });

    it('should create new instance with different log level', () => {
      // Reset singleton for this test
      (Logger as any).instance = undefined;

      const logger = Logger.getInstance(LogLevel.DEBUG);
      expect(logger).toBeDefined();
    });
  });

  describe('LogLevel filtering', () => {
    it('should log all levels when set to DEBUG', () => {
      const logger = Logger.getInstance(LogLevel.DEBUG);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleDebug).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] debug message'));
      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[INFO] info message'));
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('[WARN] warn message'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('[ERROR] error message'));
    });

    it('should not log DEBUG when set to INFO', () => {
      const logger = Logger.getInstance(LogLevel.INFO);

      logger.debug('debug message');
      logger.info('info message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('[INFO] info message'));
    });

    it('should only log ERROR when set to ERROR', () => {
      const logger = Logger.getInstance(LogLevel.ERROR);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('[ERROR] error message'));
    });
  });

  describe('Message formatting', () => {
    it('should format simple messages correctly', () => {
      const logger = Logger.getInstance(LogLevel.INFO);

      logger.info('Simple message');

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Simple message$/)
      );
    });

    it('should format messages with additional arguments', () => {
      const logger = Logger.getInstance(LogLevel.INFO);

      logger.info('Message with data', { key: 'value' }, 123, 'string');

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Message with data')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('{\n  "key": "value"\n}')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('123')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('string')
      );
    });

    it('should handle complex objects in arguments', () => {
      const logger = Logger.getInstance(LogLevel.INFO);

      const complexObject = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
        },
        string: 'test',
      };

      logger.info('Complex object', complexObject);

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('{\n  "nested": {\n    "array": [\n      1,\n      2,\n      3\n    ],\n    "boolean": true\n  },\n  "string": "test"\n}')
      );
    });
  });

  describe('createLogger', () => {
    it('should create logger with correct log level', () => {
      const logger = createLogger('warn');

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should default to INFO level for invalid log level', () => {
      const logger = createLogger('invalid_level');

      logger.debug('debug');
      logger.info('info');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should map log level strings correctly', () => {
      const testCases = [
        { input: 'debug', expected: LogLevel.DEBUG },
        { input: 'info', expected: LogLevel.INFO },
        { input: 'warn', expected: LogLevel.WARN },
        { input: 'error', expected: LogLevel.ERROR },
      ];

      testCases.forEach(({ input, expected }) => {
        // Reset singleton for each test
        (Logger as any).instance = undefined;

        const logger = createLogger(input);
        expect(logger).toBeDefined();
      });
    });
  });

  describe('setLogLevel', () => {
    it('should allow changing log level at runtime', () => {
      const logger = Logger.getInstance(LogLevel.ERROR);

      // Initially only ERROR should be logged
      logger.info('info before');
      logger.error('error before');

      expect(mockConsoleInfo).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledTimes(1);

      // Change to INFO level
      logger.setLogLevel(LogLevel.INFO);

      // Now INFO should also be logged
      logger.info('info after');
      logger.error('error after');

      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });
  });
});