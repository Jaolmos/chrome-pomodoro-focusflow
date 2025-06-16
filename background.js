// Background Service Worker for FocusFlow
// Handles timer state persistence and background operations

let timerState = {
    isRunning: false,
    isBreakTime: false,
    isLongBreak: false,
    currentTime: 25 * 60, // 25 minutes in seconds
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsUntilLongBreak: 4,
    sessionsCompleted: 0,
    sessionsInCycle: 0, // Sessions completed in current cycle
    startTime: null,
    intervalId: null,
    // Sound settings
    soundEnabled: true,
    soundVolume: 0.7 // 0.0 to 1.0
};

// Initialize when service worker starts
chrome.runtime.onStartup.addListener(() => {
    loadTimerState();
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    loadTimerState();
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'getTimerState':
            sendResponse(timerState);
            break;
            
        case 'startTimer':
            startTimer();
            sendResponse({ success: true });
            break;
            
        case 'pauseTimer':
            pauseTimer();
            sendResponse({ success: true });
            break;
            
        case 'resetTimer':
            resetTimer();
            sendResponse({ success: true });
            break;
            
        case 'updateSettings':
            updateSettings(message.workTime, message.breakTime, message.longBreakTime, message.sessionsUntilLongBreak);
            sendResponse({ success: true });
            break;
            
        case 'updateSoundSettings':
            updateSoundSettings(message.soundEnabled, message.soundVolume);
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Start the timer
function startTimer() {
    if (!timerState.isRunning) {
        timerState.isRunning = true;
        timerState.startTime = Date.now();
        
        // Start the countdown
        timerState.intervalId = setInterval(() => {
            timerState.currentTime--;
            
            // Save state periodically
            saveTimerState();
            
            // Check if timer completed
            if (timerState.currentTime <= 0) {
                timerComplete();
            }
            
            // Update badge with remaining time
            updateBadge();
            
        }, 1000);
        
        saveTimerState();
    }
}

// Pause the timer
function pauseTimer() {
    if (timerState.isRunning) {
        timerState.isRunning = false;
        
        if (timerState.intervalId) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }
        
        saveTimerState();
        updateBadge();
    }
}

// Reset the timer
function resetTimer() {
    timerState.isRunning = false;
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    // Reset to appropriate duration
    if (timerState.isBreakTime) {
        timerState.currentTime = timerState.isLongBreak ? 
            timerState.longBreakDuration : timerState.breakDuration;
    } else {
        timerState.currentTime = timerState.workDuration;
    }
    
    saveTimerState();
    updateBadge();
}

// Handle timer completion
function timerComplete() {
    timerState.isRunning = false;
    
    if (timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    
    // Play completion sound before showing notification
    playCompletionSound();
    
    // Show notification
    showNotification();
    
    // Switch between work and break
    if (!timerState.isBreakTime) {
        // Work session completed, start break
        timerState.isBreakTime = true;
        timerState.sessionsCompleted++;
        timerState.sessionsInCycle++;
        
        // Check if it's time for a long break
        if (timerState.sessionsInCycle >= timerState.sessionsUntilLongBreak) {
            timerState.isLongBreak = true;
            timerState.currentTime = timerState.longBreakDuration;
            timerState.sessionsInCycle = 0; // Reset cycle
        } else {
            timerState.isLongBreak = false;
            timerState.currentTime = timerState.breakDuration;
        }
        
        saveSessionsCount();
    } else {
        // Break completed, start work
        timerState.isBreakTime = false;
        timerState.isLongBreak = false;
        timerState.currentTime = timerState.workDuration;
    }
    
    saveTimerState();
    
    // Auto-start the next session (break or work)
    startTimer();
}

// Update settings
function updateSettings(workTime, breakTime, longBreakTime, sessionsUntilLongBreak) {
    timerState.workDuration = workTime * 60;
    timerState.breakDuration = breakTime * 60;
    timerState.longBreakDuration = longBreakTime * 60;
    timerState.sessionsUntilLongBreak = sessionsUntilLongBreak;
    
    // If not running, update current time
    if (!timerState.isRunning) {
        if (timerState.isBreakTime) {
            timerState.currentTime = timerState.isLongBreak ? 
                timerState.longBreakDuration : timerState.breakDuration;
        } else {
            timerState.currentTime = timerState.workDuration;
        }
    }
    
    saveTimerState();
    
    // Save settings separately
    chrome.storage.sync.set({
        workDuration: workTime,
        breakDuration: breakTime,
        longBreakDuration: longBreakTime,
        sessionsUntilLongBreak: sessionsUntilLongBreak
    });
}

// Save timer state to storage
function saveTimerState() {
    chrome.storage.local.set({
        timerState: timerState
    });
}

// Load timer state from storage
function loadTimerState() {
    chrome.storage.local.get(['timerState'], (result) => {
        if (result.timerState) {
            timerState = { ...timerState, ...result.timerState };
            
            // If timer was running when extension was closed, calculate elapsed time
            if (timerState.isRunning && timerState.startTime) {
                const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
                timerState.currentTime = Math.max(0, timerState.currentTime - elapsed);
                
                if (timerState.currentTime <= 0) {
                    timerComplete();
                } else {
                    // Resume timer
                    startTimer();
                }
            }
        }
        
        // Load settings
        loadSettings();
        updateBadge();
    });
}

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get(['workDuration', 'breakDuration', 'longBreakDuration', 'sessionsUntilLongBreak', 'soundEnabled', 'soundVolume'], (result) => {
        if (result.workDuration) {
            timerState.workDuration = result.workDuration * 60;
        }
        if (result.breakDuration) {
            timerState.breakDuration = result.breakDuration * 60;
        }
        if (result.longBreakDuration) {
            timerState.longBreakDuration = result.longBreakDuration * 60;
        }
        if (result.sessionsUntilLongBreak) {
            timerState.sessionsUntilLongBreak = result.sessionsUntilLongBreak;
        }
        if (result.soundEnabled !== undefined) {
            timerState.soundEnabled = result.soundEnabled;
        }
        if (result.soundVolume !== undefined) {
            timerState.soundVolume = result.soundVolume;
        }
        
        // Update current time if not running
        if (!timerState.isRunning) {
            if (timerState.isBreakTime) {
                timerState.currentTime = timerState.isLongBreak ? 
                    timerState.longBreakDuration : timerState.breakDuration;
            } else {
                timerState.currentTime = timerState.workDuration;
            }
        }
        
        saveTimerState();
    });
}

// Save sessions count
function saveSessionsCount() {
    const today = new Date().toDateString();
    chrome.storage.local.set({
        sessionsDate: today,
        sessionsCount: timerState.sessionsCompleted
    });
}

// Update extension badge with timer
function updateBadge() {
    if (timerState.isRunning) {
        const minutes = Math.floor(timerState.currentTime / 60);
        chrome.action.setBadgeText({ text: minutes.toString() });
        chrome.action.setBadgeBackgroundColor({ color: timerState.isBreakTime ? '#ed8936' : '#48bb78' });
    } else {
        chrome.action.setBadgeText({ text: '' });
    }
}

// Show notification when timer completes
function showNotification() {
    let message;
    
    if (!timerState.isBreakTime) {
        // Work session just completed
        if (timerState.sessionsInCycle >= timerState.sessionsUntilLongBreak) {
            message = 'Work session completed! Time for a long break.';
        } else {
            message = 'Work session completed! Time for a short break.';
        }
    } else {
        // Break just completed
        message = timerState.isLongBreak ? 
            'Long break over! Ready to start a new cycle?' : 
            'Break time over! Ready to focus again?';
    }
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'FocusFlow',
        message: message
    });
}

// Update sound settings
function updateSoundSettings(soundEnabled, soundVolume) {
    timerState.soundEnabled = soundEnabled;
    timerState.soundVolume = Math.max(0, Math.min(1, soundVolume)); // Clamp between 0 and 1
    
    saveTimerState();
    
    // Save sound settings separately
    chrome.storage.sync.set({
        soundEnabled: soundEnabled,
        soundVolume: soundVolume
    });
}

// Play completion sound based on transition type
function playCompletionSound() {
    if (!timerState.soundEnabled) return;
    
    // Create audio context
    try {
        // Use OffscreenCanvas audio context for service workers
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        let frequency1, frequency2, duration;
        
        if (!timerState.isBreakTime) {
            // Work session completed - going to break
            if (timerState.sessionsInCycle >= timerState.sessionsUntilLongBreak - 1) {
                // Going to long break - special sound (lower, longer)
                frequency1 = 523.25; // C5
                frequency2 = 392.00; // G4
                duration = 0.8;
            } else {
                // Going to short break - gentle sound
                frequency1 = 523.25; // C5
                frequency2 = 659.25; // E5
                duration = 0.5;
            }
        } else {
            // Break completed - back to work (energetic sound)
            frequency1 = 659.25; // E5
            frequency2 = 783.99; // G5
            duration = 0.4;
        }
        
        playChime(audioContext, frequency1, frequency2, duration);
        
    } catch (error) {
        console.log('Audio not available in service worker, using notification sound fallback');
        // Fallback: just show notification
    }
}

// Create and play a chime sound
function playChime(audioContext, freq1, freq2, duration) {
    const gainNode = audioContext.createGain();
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    
    // Configure oscillators
    oscillator1.frequency.setValueAtTime(freq1, audioContext.currentTime);
    oscillator1.type = 'sine';
    
    oscillator2.frequency.setValueAtTime(freq2, audioContext.currentTime);
    oscillator2.type = 'sine';
    
    // Configure gain (volume with fade out)
    gainNode.gain.setValueAtTime(timerState.soundVolume * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    // Connect nodes
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play sound
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    
    oscillator1.stop(audioContext.currentTime + duration);
    oscillator2.stop(audioContext.currentTime + duration);
} 