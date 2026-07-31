# 🎙 Voice Assistant

eIsland supports a voice assistant feature powered by Tencent Cloud ASR services, with high recognition accuracy and multi-language support.

## ⌨️ How to Trigger

### Steps
1. Press `Alt + P` to trigger the voice assistant
2. Speak your voice command
3. Press `Alt + P` again to end voice input
4. The voice assistant displays the recognized command in the eIsland window, requiring user confirmation before execution

### Prerequisites
- eIsland account login required
- Sufficient account balance

## 🚀 Supported Features

The voice assistant can convert voice commands into computer operations, including:

- Basic operations: Open apps, close apps, switch windows, etc.
- Complex tasks: Open system environment variable window and add environment variables
- File operations: Requires workspace configuration first (see below)

## ⚠️ Precautions

1. **Environment**: Recommended to use in a quiet environment; noisy environments may cause recognition errors
2. **Hardware**: Requires a working microphone; virtual sound cards may cause recognition failure
3. **Security**: Sensitive operations will immediately notify the user for authorization
4. **File Operations**: Workspace must be configured before file-related operations can be executed

## 📂 Workspace Configuration

### Standard Method
1. Enter the maximum expanded state
2. Click **AI Agent** in the **left sidebar**
3. Scroll down to find the **Agent Workspace** option
4. Add your workspace path

### Quick Method
1. Enter the maximum expanded state
2. Click **Quick Nav** in the **left sidebar**
3. Type **Agent Workspace** or **Workspace** in the top-right search box
4. Jump directly to the configuration page
