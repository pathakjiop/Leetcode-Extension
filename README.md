# Leetcode-Extension
## Overview

Leetcode-Extension is a Chrome extension that recommends personalized LeetCode problems based on your performance. It tracks your progress, suggests new problems, and helps you improve your problem-solving skills.

## Features

- Personalized problem recommendations
- Timer to track time spent on problems
- Progress tracking and performance evaluation
- Integration with LeetCode

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/Leetcode-Extension.git
    ```
2. Navigate to the `extension` directory:
    ```sh
    cd Leetcode-Extension/extension
    ```
3. Load the extension in Chrome:
    - Open Chrome and go to `chrome://extensions/`
    - Enable "Developer mode"
    - Click "Load unpacked" and select the `extension` directory

## Backend Setup

1. Navigate to the `backend` directory:
    ```sh
    cd ../backend
    ```
2. Install dependencies:
    ```sh
    npm install
    ```
3. Create a `.env` file and add your Gemini API key:
    ```
    GEMINI_API_KEY=your_api_key
    ```
4. Start the backend server:
    ```sh
    npm start
    ```

## Usage

1. Open the extension popup in Chrome.
2. Click "Start Your Journey" to begin receiving problem recommendations.
3. Use the timer to track your progress and mark problems as complete.
4. View your next recommended problem and continue practicing.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.