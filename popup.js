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
const soundEnabledInput = document.getElementById('soundEnabled');
const soundVolumeInput = document.getElementById('soundVolume');
const volumeValueDisplay = document.querySelector('.volume-value');
const testSoundBtn = document.getElementById('testSound');

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    getTimerStateFromBackground();
    setupEventListeners();
    startUpdateInterval();
    
    // Listen for sound playback messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'playSound') {
            playSound(message.soundType, message.volume || 0.7);
            sendResponse({ success: true });
        }
    });
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
    
    // Add blur event listeners to save settings when user finishes editing
    workTimeInput.addEventListener('blur', updateSettings);
    breakTimeInput.addEventListener('blur', updateSettings);
    longBreakTimeInput.addEventListener('blur', updateSettings);
    sessionsUntilLongBreakInput.addEventListener('blur', updateSettings);
    
    // Sound settings event listeners
    soundEnabledInput.addEventListener('change', updateSoundSettings);
    soundVolumeInput.addEventListener('input', updateVolumeDisplay);
    soundVolumeInput.addEventListener('change', updateSoundSettings);
    testSoundBtn.addEventListener('click', testSound);
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
        
        console.log('Updating settings:', { newWorkTime, newBreakTime, newLongBreakTime, newSessionsUntilLongBreak });
        
        chrome.runtime.sendMessage({ 
            action: 'updateSettings', 
            workTime: newWorkTime,
            breakTime: newBreakTime,
            longBreakTime: newLongBreakTime,
            sessionsUntilLongBreak: newSessionsUntilLongBreak
        }, (response) => {
            if (response && response.success) {
                console.log('Settings updated successfully');
                // Force immediate update
                setTimeout(() => {
                    getTimerStateFromBackground();
                }, 100);
            } else {
                console.error('Failed to update settings:', response);
            }
        });
    } else {
        console.warn('Invalid settings values:', { newWorkTime, newBreakTime, newLongBreakTime, newSessionsUntilLongBreak });
        // Reset to previous valid values
        setTimeout(() => {
            updateSettingsInputs();
        }, 100);
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

// Update settings inputs with current values (only if not focused)
function updateSettingsInputs() {
    // Only update inputs if they're not currently being edited
    if (document.activeElement !== workTimeInput) {
        workTimeInput.value = Math.floor(timerState.workDuration / 60);
    }
    if (document.activeElement !== breakTimeInput) {
        breakTimeInput.value = Math.floor(timerState.breakDuration / 60);
    }
    if (document.activeElement !== longBreakTimeInput) {
        longBreakTimeInput.value = Math.floor(timerState.longBreakDuration / 60);
    }
    if (document.activeElement !== sessionsUntilLongBreakInput) {
        sessionsUntilLongBreakInput.value = timerState.sessionsUntilLongBreak;
    }
    
    // Update sound settings
    if (timerState.soundEnabled !== undefined) {
        soundEnabledInput.checked = timerState.soundEnabled;
    }
    if (timerState.soundVolume !== undefined) {
        soundVolumeInput.value = Math.round(timerState.soundVolume * 100);
        volumeValueDisplay.textContent = Math.round(timerState.soundVolume * 100) + '%';
    }
}

// Update sound settings
function updateSoundSettings() {
    const soundEnabled = soundEnabledInput.checked;
    const soundVolume = soundVolumeInput.value / 100; // Convert to 0-1 range
    
    chrome.runtime.sendMessage({ 
        action: 'updateSoundSettings', 
        soundEnabled: soundEnabled,
        soundVolume: soundVolume
    }, (response) => {
        if (response && response.success) {
            console.log('Sound settings updated successfully');
            getTimerStateFromBackground();
        } else {
            console.error('Failed to update sound settings:', response);
        }
    });
}

// Update volume display
function updateVolumeDisplay() {
    volumeValueDisplay.textContent = soundVolumeInput.value + '%';
}

// Test sound function
function testSound() {
    if (soundEnabledInput.checked) {
        const volume = soundVolumeInput.value / 100;
        playSound('shortBreak', volume);
    }
}

// Play notification sound in popup
function playSound(soundType, volume) {
    try {
        // Create simple beep sounds using HTML5 Audio and data URIs
        const audio = createBeepAudio(soundType, volume);
        audio.play().catch(console.error);
    } catch (error) {
        console.log('Could not play sound in popup:', error);
    }
}

// Create audio element with beep sound
function createBeepAudio(soundType, volume) {
    let pattern, frequency;
    
    switch (soundType) {
        case 'shortBreak':
            pattern = 1;
            frequency = 800;
            break;
        case 'longBreak':
            pattern = 2;
            frequency = 600;
            break;
        case 'work':
            pattern = 3;
            frequency = 1000;
            break;
        default:
            pattern = 1;
            frequency = 800;
    }
    
    // Create a simple beep WAV file as data URI
    const wavData = generateBeepWAV(frequency, 0.2, volume);
    const audio = new Audio(wavData);
    audio.volume = Math.min(volume, 1.0);
    
    // For multiple beeps, play them in sequence
    if (pattern > 1) {
        let count = 0;
        const playNext = () => {
            count++;
            if (count < pattern) {
                setTimeout(() => {
                    const nextAudio = new Audio(wavData);
                    nextAudio.volume = Math.min(volume, 1.0);
                    nextAudio.play().then(playNext).catch(console.error);
                }, 300);
            }
        };
        audio.addEventListener('ended', playNext);
    }
    
    return audio;
}

// Generate a simple beep WAV file as data URI
function generateBeepWAV(frequency, duration, volume) {
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV file header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;
        let amplitude = Math.sin(2 * Math.PI * frequency * time);
        
        // Apply fade in/out to avoid clicks
        const fadeTime = 0.01;
        if (time < fadeTime) {
            amplitude *= time / fadeTime;
        } else if (time > duration - fadeTime) {
            amplitude *= (duration - time) / fadeTime;
        }
        
        const sample = Math.floor(amplitude * volume * 0.3 * 32767);
        view.setInt16(44 + i * 2, sample, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
}

// Play beep pattern
function playBeepPattern(ctx, frequency, duration, pattern, volume) {
    for (let i = 0; i < pattern; i++) {
        setTimeout(() => {
            playSimpleBeep(ctx, frequency, duration, volume);
        }, i * (duration * 1000 + 100));
    }
}

// Play simple beep
function playSimpleBeep(ctx, frequency, duration, volume) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.1, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
}

// Fallback HTML5 audio
function playHTMLAudio(soundType, volume) {
    // Create a simple data URL audio
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const frequency = soundType === 'work' ? 1000 : soundType === 'longBreak' ? 600 : 800;
    
    // Simple fallback beep
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume * 0.1;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}



// Select all text in input field when focused/clicked
function selectAllText(event) {
    // Use setTimeout to ensure the selection happens after the focus event
    setTimeout(() => {
        event.target.select();
    }, 0);
} 