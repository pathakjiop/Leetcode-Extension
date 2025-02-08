let timerState = {
  isRunning: false,
  startTime: null,
  elapsed: 0
};

// Initialize timer state
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ timerState: null });
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get('timerState');
  if (data.timerState && data.timerState.isRunning) {
    timerState = {
      isRunning: true,
      startTime: Date.now() - data.timerState.elapsed,
      elapsed: data.timerState.elapsed
    };
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startTimer':
      timerState = {
        isRunning: true,
        startTime: Date.now(),
        elapsed: 0
      };
      chrome.storage.local.set({ timerState });
      sendResponse({ status: 'Timer started', timerState });
      break;

    case 'stopTimer':
      if (timerState.isRunning) {
        timerState = {
          isRunning: false,
          startTime: null,
          elapsed: Date.now() - timerState.startTime
        };
        chrome.storage.local.set({ timerState });
        sendResponse({ status: 'Timer stopped', timerState });
      }
      break;

    case 'getTimerState':
      if (timerState.isRunning) {
        timerState.elapsed = Date.now() - timerState.startTime;
      }
      sendResponse({ timerState });
      break;

    case 'resetTimer':
      timerState = {
        isRunning: false,
        startTime: null,
        elapsed: 0
      };
      chrome.storage.local.set({ timerState });
      sendResponse({ status: 'Timer reset', timerState });
      break;
  }
  return true;
});
