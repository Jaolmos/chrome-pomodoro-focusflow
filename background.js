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
    
    // Service workers can't use Web Audio API, so we'll use offscreen document approach
    // or send message to popup if it's open
    try {
        // Try to send message to popup to play sound
        chrome.runtime.sendMessage({ 
            action: 'playSound',
            soundType: getSoundType()
        }).catch(() => {
            // Popup not open, create offscreen document for audio
            createOffscreenDocument();
        });
    } catch (error) {
        console.log('Could not play sound:', error);
    }
}

// Get sound type based on current transition
function getSoundType() {
    if (!timerState.isBreakTime) {
        // Work session completed - going to break
        if (timerState.sessionsInCycle >= timerState.sessionsUntilLongBreak - 1) {
            return 'longBreak'; // Going to long break
        } else {
            return 'shortBreak'; // Going to short break
        }
    } else {
        return 'work'; // Break completed - back to work
    }
}

// Create offscreen document for playing audio (Chrome 109+)
async function createOffscreenDocument() {
    try {
        // Check if offscreen document already exists
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });

        if (existingContexts.length > 0) {
            // Document exists, send message to play sound
            chrome.runtime.sendMessage({
                action: 'playSound',
                soundType: getSoundType(),
                volume: timerState.soundVolume
            });
            return;
        }

        // Create offscreen document
        await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('offscreen.html'),
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Playing notification sounds for Pomodoro timer'
        });

        // Send message to play sound
        setTimeout(() => {
            chrome.runtime.sendMessage({
                action: 'playSound',
                soundType: getSoundType(),
                volume: timerState.soundVolume
            });
        }, 100);

    } catch (error) {
        console.log('Offscreen document not supported, using silent notifications');
    }
} 