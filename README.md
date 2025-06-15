# FocusFlow - Chrome Extension

A Pomodoro timer Chrome extension to help you stay focused and productive.

## Features

- **Customizable Timer**: Set your own focus and break durations
- **Visual Feedback**: Beautiful UI with different modes for focus and break time
- **Session Tracking**: Keep track of completed sessions per day
- **Browser Notifications**: Get notified when sessions complete
- **Persistent Settings**: Your preferences are saved automatically
- **Sound Notifications**: Audio alerts for session completion (coming soon)

## Default Settings

- **Focus Time**: 25 minutes
- **Break Time**: 5 minutes

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder
5. The FocusFlow icon should appear in your Chrome toolbar

## Usage

1. Click the FocusFlow icon in your Chrome toolbar
2. Adjust the focus and break times if needed
3. Click "Start" to begin your focus session
4. The timer will automatically switch between focus and break periods
5. Use "Pause" to temporarily stop the timer
6. Use "Reset" to restart the current session

## Project Structure

```
focusflow/
├── manifest.json       # Extension configuration
├── popup.html         # Main UI interface
├── popup.js           # Timer logic and functionality
├── popup.css          # Styling and visual design
├── icons/             # Extension icons (to be added)
├── sounds/            # Audio files (to be added)
└── README.md          # This file
```

## Development Status

- ✅ Basic timer functionality
- ✅ Settings customization
- ✅ Session tracking
- ✅ Visual feedback and animations
- ✅ Browser notifications
- ⏳ Sound notifications (in progress)
- ⏳ Extension icons (in progress)

## Technologies Used

- HTML5
- CSS3 (with modern gradients and animations)
- Vanilla JavaScript
- Chrome Extension APIs (storage, notifications)

## Contributing

This is a learning project. Feel free to suggest improvements or report issues!

## License

This project is for educational purposes. 