// Timer state variables (now managed by background service worker)
let timerState = {
    isRunning: false,
    isBreakTime: false,
    currentTime: 25 * 60,
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    sessionsCompleted: 0
};
let updateInterval = null;

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
    getTimerStateFromBackground();
    setupEventListeners();
    startUpdateInterval();
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
    chrome.runtime.sendMessage({ action: 'startTimer' }, (response) => {
        if (response.success) {
            getTimerStateFromBackground();
        }
    });
}

// Pause the timer
function pauseTimer() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' }, (response) => {
        if (response.success) {
            getTimerStateFromBackground();
        }
    });
}

// Reset the timer
function resetTimer() {
    chrome.runtime.sendMessage({ action: 'resetTimer' }, (response) => {
        if (response.success) {
            getTimerStateFromBackground();
        }
    });
}

// Update the timer display
function updateDisplay() {
    const minutes = Math.floor(timerState.currentTime / 60);
    const seconds = timerState.currentTime % 60;
    
    // Format time as MM:SS
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timeDisplay.textContent = formattedTime;
    
    // Update session type
    sessionType.textContent = timerState.isBreakTime ? 'Break Time' : 'Focus Time';
}

// Update work time setting
function updateWorkTime() {
    const newWorkTime = parseInt(workTimeInput.value);
    if (newWorkTime >= 1 && newWorkTime <= 60) {
        const newBreakTime = parseInt(breakTimeInput.value);
        chrome.runtime.sendMessage({ 
            action: 'updateSettings', 
            workTime: newWorkTime,
            breakTime: newBreakTime
        }, (response) => {
            if (response.success) {
                getTimerStateFromBackground();
            }
        });
    }
}

// Update break time setting
function updateBreakTime() {
    const newBreakTime = parseInt(breakTimeInput.value);
    if (newBreakTime >= 1 && newBreakTime <= 30) {
        const newWorkTime = parseInt(workTimeInput.value);
        chrome.runtime.sendMessage({ 
            action: 'updateSettings', 
            workTime: newWorkTime,
            breakTime: newBreakTime
        }, (response) => {
            if (response.success) {
                getTimerStateFromBackground();
            }
        });
    }
}

// Update sessions display
function updateSessionsDisplay() {
    sessionsToday.textContent = timerState.sessionsCompleted;
}

// Play completion sound (placeholder for now)
function playCompletionSound() {
    // This will be implemented when we add sound files
    console.log('Timer completed! Sound would play here.');
}

// Get timer state from background service worker
function getTimerStateFromBackground() {
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
        if (response) {
            timerState = response;
            updateDisplay();
            updateButtonStates();
            updateSettingsInputs();
            updateSessionsDisplay();
        }
    });
}

// Start interval to update display regularly
function startUpdateInterval() {
    updateInterval = setInterval(() => {
        getTimerStateFromBackground();
    }, 1000);
}

// Update button states based on timer state
function updateButtonStates() {
    startBtn.disabled = timerState.isRunning;
    pauseBtn.disabled = !timerState.isRunning;
    
    // Update visual feedback
    timerDisplayElement.classList.toggle('running', timerState.isRunning);
    timerDisplayElement.classList.toggle('focus-mode', timerState.isRunning && !timerState.isBreakTime);
    timerDisplayElement.classList.toggle('break-mode', timerState.isRunning && timerState.isBreakTime);
}

// Update settings inputs with current values
function updateSettingsInputs() {
    workTimeInput.value = Math.floor(timerState.workDuration / 60);
    breakTimeInput.value = Math.floor(timerState.breakDuration / 60);
} 