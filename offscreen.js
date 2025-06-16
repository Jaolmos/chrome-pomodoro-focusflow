// Simple audio playback for offscreen document
let audioContext = null;

// Initialize audio context on first use
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'playSound') {
        try {
            playSimpleBeep(message.soundType, message.volume || 0.7);
            sendResponse({ success: true });
        } catch (error) {
            console.log('Audio playback error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
});

// Play a simple beep sound
function playSimpleBeep(soundType, volume) {
    const ctx = getAudioContext();
    
    // Define sound characteristics
    let frequency = 800;
    let duration = 0.3;
    let beepCount = 1;
    
    switch (soundType) {
        case 'shortBreak':
            frequency = 800;
            beepCount = 1;
            break;
        case 'longBreak':
            frequency = 600;
            beepCount = 2;
            break;
        case 'work':
            frequency = 1000;
            beepCount = 3;
            break;
    }
    
    // Play multiple beeps if needed
    for (let i = 0; i < beepCount; i++) {
        setTimeout(() => {
            createBeep(ctx, frequency, duration, volume);
        }, i * 300);
    }
}

// Create a single beep
function createBeep(ctx, frequency, duration, volume) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.1, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
} 