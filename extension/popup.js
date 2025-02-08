let currentProblemData = null;
let isTimerRunning = false;

document.addEventListener('DOMContentLoaded', async function () {
  const API_URL = 'http://localhost:3000/api/next-problem';

  // Initialize UI based on storage
  chrome.storage.local.get(['firstTime', 'currentProblem', 'timerState'], function (result) {
    if (!result.firstTime) {
      document.getElementById('firstTime').style.display = 'block';
      document.getElementById('problemTracking').style.display = 'none';
    } else {
      document.getElementById('firstTime').style.display = 'none';
      document.getElementById('problemTracking').style.display = 'block';
      if (result.currentProblem) {
        updateCurrentProblem(result.currentProblem);
      }
      isTimerRunning = result.timerState?.isRunning || false;
      updateTimerButtonState(isTimerRunning);
    }
  });

  // Timer button event listener
  document.getElementById('startTimer')?.addEventListener('click', function () {
    if (!isTimerRunning) {
      chrome.runtime.sendMessage({ action: 'startTimer' });
      isTimerRunning = true;
    } else {
      chrome.runtime.sendMessage({ action: 'stopTimer' });
      isTimerRunning = false;
    }
    updateTimerButtonState(isTimerRunning);
  });

  // Mark problem as complete
  document.getElementById('markComplete')?.addEventListener('click', async function () {
    try {
      const timerResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'stopTimer' }, resolve);
      });

      if (timerResponse?.timerState) {
        const timeSpent = Math.floor(timerResponse.timerState.elapsed / 1000 / 60); // Convert to minutes
        const currentProblem = await chrome.storage.local.get('currentProblem');

        if (!currentProblem.currentProblem) {
          throw new Error('No current problem found');
        }

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            last_problem: currentProblem.currentProblem.title,
            difficulty: currentProblem.currentProblem.difficulty,
            time_taken: timeSpent,
            topic: currentProblem.currentProblem.topics[0] || 'general',
          }),
        });

        const data = await response.json();
        if (data.success) {
          displayNextProblem(data.problem);
          document.getElementById('status').textContent = 'Problem completed!';
          isTimerRunning = false;
          updateTimerButtonState(false);
        } else {
          throw new Error(data.error || 'Failed to get next problem');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('status').textContent = 'Error: ' + error.message;
    }
  });

  // Start journey button
  document.getElementById('startJourney')?.addEventListener('click', async function () {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_problem: '',
          difficulty: 'easy',
          time_taken: 0,
          topic: 'arrays',
        }),
      });

      const data = await response.json();
      if (data.success) {
        chrome.storage.local.set({ firstTime: true });
        document.getElementById('firstTime').style.display = 'none';
        document.getElementById('problemTracking').style.display = 'block';
        displayNextProblem(data.problem);
      } else {
        throw new Error(data.error || 'Failed to start journey');
      }
    } catch (error) {
      console.error('Error:', error);
      document.getElementById('status').textContent = 'Error: ' + error.message;
    }
  });

  // Go to next problem button
  document.getElementById('goToNext')?.addEventListener('click', function () {
    if (currentProblemData) {
      chrome.tabs.create({ url: currentProblemData.url }, function (tab) {
        chrome.storage.local.set({ currentProblem: currentProblemData });
        chrome.runtime.sendMessage({ action: 'startTimer' });
      });
    }
  });

  // Initialize timer
  updateTimer();
  setInterval(updateTimer, 1000);
});

// Helper functions
function updateTimerButtonState(isRunning) {
  const startButton = document.getElementById('startTimer');
  const completeButton = document.getElementById('markComplete');

  if (startButton) {
    startButton.textContent = isRunning ? 'Stop Timer' : 'Start Timer';
    startButton.style.backgroundColor = isRunning ? '#dc3545' : '#1a73e8';
  }

  if (completeButton) {
    completeButton.disabled = !isRunning;
  }
}

function updateTimer() {
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (response?.timerState) {
      const { isRunning, startTime, elapsed } = response.timerState;
      const totalSeconds = isRunning ? Math.floor((Date.now() - startTime) / 1000) : Math.floor(elapsed / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      document.getElementById('timer').textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
      document.getElementById('status').textContent = isRunning ? 'Timer running' : 'Timer stopped';
    }
  });
}

function padZero(num) {
  return num.toString().padStart(2, '0');
}

function updateCurrentProblem(problem) {
  const titleElement = document.getElementById('currentProblemTitle');
  titleElement.textContent = problem.title;

  const topicsDiv = document.getElementById('problemTopics');
  topicsDiv.innerHTML = '';
  if (problem.topics && problem.topics.length > 0) {
    problem.topics.forEach((topic) => {
      const topicTag = document.createElement('span');
      topicTag.className = 'topic-tag';
      topicTag.textContent = topic;
      topicsDiv.appendChild(topicTag);
    });
  }
}

function displayNextProblem(problem) {
  currentProblemData = problem;
  const problemCard = document.getElementById('problemCard');
  problemCard.innerHTML = `
    <h4>${problem.title}</h4>
    <p>Difficulty: ${problem.difficulty}</p>
    <p>Topic: ${problem.topic}</p>
    <p>Focus Area: ${problem.focus_area}</p>
  `;
  document.getElementById('nextProblem').style.display = 'block';
}