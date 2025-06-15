// Timer state variables
let timerInterval = null;
let currentTime = 25 * 60; // Default 25 minutes in seconds
let isRunning = false;
let isBreakTime = false;
let workDuration = 25 * 60; // 25 minutes in seconds
let breakDuration = 5 * 60; // 5 minutes in seconds
let sessionsCompleted = 0;

// DOM elements
const timeDisplay = document.getElementById('timeDisplay');
const sessionType = document.getElementById('sessionType');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const workTimeInput = document.getElementById('workTime');
const breakTimeInput = document.getElementById('breakTime');
const sessionsToday = document.getElementById('sessionsToday');
const timerDisplayElement = document.querySelector('.timer-display');

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadSessionsCount();
    updateDisplay();
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    workTimeInput.addEventListener('change', updateWorkTime);
    breakTimeInput.addEventListener('change', updateBreakTime);
}

// Start the timer
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        // Add visual feedback
        timerDisplayElement.classList.add('running');
        if (isBreakTime) {
            timerDisplayElement.classList.add('break-mode');
        } else {
            timerDisplayElement.classList.add('focus-mode');
        }
        
        // Start the countdown
        timerInterval = setInterval(function() {
            currentTime--;
            updateDisplay();
            
            // Check if timer reached zero
            if (currentTime <= 0) {
                timerComplete();
            }
        }, 1000);
    }
}

// Pause the timer
function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timerInterval);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        
        // Remove visual feedback
        timerDisplayElement.classList.remove('running');
    }
}

// Reset the timer
function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    
    // Reset to appropriate duration
    currentTime = isBreakTime ? breakDuration : workDuration;
    
    // Reset button states
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // Remove visual classes
    timerDisplayElement.classList.remove('running', 'focus-mode', 'break-mode');
    
    updateDisplay();
}

// Handle timer completion
function timerComplete() {
    isRunning = false;
    clearInterval(timerInterval);
    
    // Play completion sound (will be implemented later)
    playCompletionSound();
    
    // Show notification
    showNotification();
    
    // Switch between work and break
    if (!isBreakTime) {
        // Work session completed, start break
        isBreakTime = true;
        currentTime = breakDuration;
        sessionsCompleted++;
        saveSessionsCount();
        updateSessionsDisplay();
        sessionType.textContent = 'Break Time';
    } else {
        // Break completed, start work
        isBreakTime = false;
        currentTime = workDuration;
        sessionType.textContent = 'Focus Time';
    }
    
    // Reset button states
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    // Remove visual classes and update display
    timerDisplayElement.classList.remove('running', 'focus-mode', 'break-mode');
    updateDisplay();
}

// Update the timer display
function updateDisplay() {
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    
    // Format time as MM:SS
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timeDisplay.textContent = formattedTime;
    
    // Update session type
    sessionType.textContent = isBreakTime ? 'Break Time' : 'Focus Time';
}

// Update work time setting
function updateWorkTime() {
    const newWorkTime = parseInt(workTimeInput.value);
    if (newWorkTime >= 1 && newWorkTime <= 60) {
        workDuration = newWorkTime * 60;
        
        // If currently in work mode and not running, update current time
        if (!isBreakTime && !isRunning) {
            currentTime = workDuration;
            updateDisplay();
        }
        
        saveSettings();
    }
}

// Update break time setting
function updateBreakTime() {
    const newBreakTime = parseInt(breakTimeInput.value);
    if (newBreakTime >= 1 && newBreakTime <= 30) {
        breakDuration = newBreakTime * 60;
        
        // If currently in break mode and not running, update current time
        if (isBreakTime && !isRunning) {
            currentTime = breakDuration;
            updateDisplay();
        }
        
        saveSettings();
    }
}

// Save settings to Chrome storage
function saveSettings() {
    chrome.storage.sync.set({
        workDuration: workDuration / 60,
        breakDuration: breakDuration / 60
    });
}

// Load settings from Chrome storage
function loadSettings() {
    chrome.storage.sync.get(['workDuration', 'breakDuration'], function(result) {
        if (result.workDuration) {
            workDuration = result.workDuration * 60;
            workTimeInput.value = result.workDuration;
        }
        
        if (result.breakDuration) {
            breakDuration = result.breakDuration * 60;
            breakTimeInput.value = result.breakDuration;
        }
        
        // Set initial time based on current mode
        currentTime = isBreakTime ? breakDuration : workDuration;
        updateDisplay();
    });
}

// Save sessions count to Chrome storage
function saveSessionsCount() {
    const today = new Date().toDateString();
    chrome.storage.local.set({
        sessionsDate: today,
        sessionsCount: sessionsCompleted
    });
}

// Load sessions count from Chrome storage
function loadSessionsCount() {
    const today = new Date().toDateString();
    chrome.storage.local.get(['sessionsDate', 'sessionsCount'], function(result) {
        if (result.sessionsDate === today && result.sessionsCount) {
            sessionsCompleted = result.sessionsCount;
        } else {
            // New day, reset counter
            sessionsCompleted = 0;
            saveSessionsCount();
        }
        updateSessionsDisplay();
    });
}

// Update sessions display
function updateSessionsDisplay() {
    sessionsToday.textContent = sessionsCompleted;
}

// Play completion sound (placeholder for now)
function playCompletionSound() {
    // This will be implemented when we add sound files
    console.log('Timer completed! Sound would play here.');
}

// Show browser notification
function showNotification() {
    const message = isBreakTime ? 
        'Work session completed! Time for a break.' : 
        'Break time over! Ready to focus again?';
    
    // Check if notifications are supported
    if ('Notification' in window) {
        // Request permission if needed
        if (Notification.permission === 'granted') {
            new Notification('FocusFlow', {
                body: message,
                icon: 'icons/icon48.png'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(function(permission) {
                if (permission === 'granted') {
                    new Notification('FocusFlow', {
                        body: message,
                        icon: 'icons/icon48.png'
                    });
                }
            });
        }
    }
} 