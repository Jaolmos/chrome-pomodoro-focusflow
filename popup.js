// Timer state variables (now managed by background service worker)
let timerState = {
    isRunning: false,
    isBreakTime: false,
    isLongBreak: false,
    currentTime: 25 * 60,
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsUntilLongBreak: 4,
    sessionsCompleted: 0,
    sessionsInCycle: 0
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
const longBreakTimeInput = document.getElementById('longBreakTime');
const sessionsUntilLongBreakInput = document.getElementById('sessionsUntilLongBreak');
const sessionsToday = document.getElementById('sessionsToday');
const progressToLongBreak = document.getElementById('progressToLongBreak');
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
    workTimeInput.addEventListener('change', updateSettings);
    breakTimeInput.addEventListener('change', updateSettings);
    longBreakTimeInput.addEventListener('change', updateSettings);
    sessionsUntilLongBreakInput.addEventListener('change', updateSettings);
    
    // Add focus event listeners to select all text when clicking on inputs
    workTimeInput.addEventListener('focus', selectAllText);
    breakTimeInput.addEventListener('focus', selectAllText);
    longBreakTimeInput.addEventListener('focus', selectAllText);
    sessionsUntilLongBreakInput.addEventListener('focus', selectAllText);
    
    // Add click event listeners to select all text when clicking on inputs
    workTimeInput.addEventListener('click', selectAllText);
    breakTimeInput.addEventListener('click', selectAllText);
    longBreakTimeInput.addEventListener('click', selectAllText);
    sessionsUntilLongBreakInput.addEventListener('click', selectAllText);
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
    if (timerState.isBreakTime) {
        sessionType.textContent = timerState.isLongBreak ? 'Long Break Time' : 'Short Break Time';
    } else {
        sessionType.textContent = 'Focus Time';
    }
}

// Update all settings
function updateSettings() {
    const newWorkTime = parseInt(workTimeInput.value);
    const newBreakTime = parseInt(breakTimeInput.value);
    const newLongBreakTime = parseInt(longBreakTimeInput.value);
    const newSessionsUntilLongBreak = parseInt(sessionsUntilLongBreakInput.value);
    
    // Validate inputs
    if (newWorkTime >= 1 && newWorkTime <= 60 &&
        newBreakTime >= 1 && newBreakTime <= 30 &&
        newLongBreakTime >= 5 && newLongBreakTime <= 60 &&
        newSessionsUntilLongBreak >= 2 && newSessionsUntilLongBreak <= 8) {
        
        chrome.runtime.sendMessage({ 
            action: 'updateSettings', 
            workTime: newWorkTime,
            breakTime: newBreakTime,
            longBreakTime: newLongBreakTime,
            sessionsUntilLongBreak: newSessionsUntilLongBreak
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
    progressToLongBreak.textContent = `${timerState.sessionsInCycle}/${timerState.sessionsUntilLongBreak}`;
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
    longBreakTimeInput.value = Math.floor(timerState.longBreakDuration / 60);
    sessionsUntilLongBreakInput.value = timerState.sessionsUntilLongBreak;
}

// Select all text in input field when focused/clicked
function selectAllText(event) {
    // Use setTimeout to ensure the selection happens after the focus event
    setTimeout(() => {
        event.target.select();
    }, 0);
} 