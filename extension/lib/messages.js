// Message type constants used across background, sidepanel, and content scripts.

export const MSG = {
  RUN_START: 'RUN_START',
  RUN_STOP: 'RUN_STOP',
  RUN_PROGRESS: 'RUN_PROGRESS',
  RUN_COMPLETE: 'RUN_COMPLETE',
  RUN_STATUS_QUERY: 'RUN_STATUS_QUERY',

  // Cookie warm-up
  COOKIE_START: 'COOKIE_START',
  COOKIE_STOP: 'COOKIE_STOP',
  COOKIE_PROGRESS: 'COOKIE_PROGRESS',
  COOKIE_COMPLETE: 'COOKIE_COMPLETE',
  COOKIE_STATUS_QUERY: 'COOKIE_STATUS_QUERY',

  // Content-script bound
  DETECT_AND_SUBMIT: 'DETECT_AND_SUBMIT',
  DETECT_AND_SUBMIT_RESULT: 'DETECT_AND_SUBMIT_RESULT',
};

export const RUN_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  DONE: 'done',
};
