// content.js
let problemStartTime = null;
let problemDetails = null;
let submissionMonitor = null;

// Function to extract problem details
function extractProblemDetails() {
  // Adjust selectors based on LeetCode's DOM structure
  const titleElement = document.querySelector('[data-cy="question-title"]');
  const difficultyElement = document.querySelector('[diff]');
  const topicsContainer = document.querySelector('[class*="topics-"]');
  
  const title = titleElement ? titleElement.textContent.trim() : '';
  const difficulty = difficultyElement ? difficultyElement.textContent.toLowerCase() : '';
  const topics = [];
  
  if (topicsContainer) {
    const topicElements = topicsContainer.querySelectorAll('a');
    topicElements.forEach(element => {
      topics.push(element.textContent.trim());
    });
  }

  return {
    title,
    difficulty,
    topics,
    url: window.location.href
  };
}

// Function to check if problem is completed
function checkProblemCompletion() {
  // Adjust selector based on LeetCode's success message structure
  const successElements = document.querySelectorAll('[class*="success"]');
  for (const element of successElements) {
    if (element.textContent.includes('Accepted')) {
      return true;
    }
  }
  return false;
}

// Function to start monitoring for submissions
function startSubmissionMonitoring() {
  if (submissionMonitor) {
    submissionMonitor.disconnect();
  }

  submissionMonitor = new MutationObserver(async (mutations) => {
    if (checkProblemCompletion()) {
      submissionMonitor.disconnect();
      await handleProblemCompletion();
    }
  });

  // Observe the entire document for changes
  submissionMonitor.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Function to handle problem completion
async function handleProblemCompletion() {
  chrome.runtime.sendMessage({ action: 'stopTimer' }, async (response) => {
    if (response && response.timerState) {
      const timeSpent = Math.floor(response.timerState.elapsed / 1000 / 60); // Convert to minutes
      
      try {
        const response = await fetch('http://localhost:3000/api/next-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            last_problem: problemDetails.title,
            difficulty: problemDetails.difficulty,
            time_taken: timeSpent,
            topic: problemDetails.topics[0] || 'general'
          })
        });

        const data = await response.json();
        if (data.success) {
          chrome.storage.local.set({
            nextProblem: data.problem,
            lastCompletionTime: Date.now()
          });
        }
      } catch (error) {
        console.error('Error sending completion data:', error);
      }
    }
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  problemDetails = extractProblemDetails();
  
  // Store current problem details
  chrome.storage.local.set({ currentProblem: problemDetails });
  
  // Start timer if this is a new problem
  chrome.storage.local.get(['lastCompletionTime'], (result) => {
    const lastCompletion = result.lastCompletionTime || 0;
    if (Date.now() - lastCompletion > 1000) { // More than 1 second since last completion
      chrome.runtime.sendMessage({ action: 'startTimer' });
      problemStartTime = Date.now();
    }
  });

  // Start monitoring for problem completion
  startSubmissionMonitoring();
});

