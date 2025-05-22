# Setup Instructions for Animation Generator

## Project Structure
Create the following directory structure:

animation_generator/
├── microservice/
├── backend/
├── frontend/
├── output/



## Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- Manim Community Edition (install via pip install manim)
- OpenAI API key (obtain from https://platform.openai.com)
- Git (optional for version control)

## Installation

### 1. Python Microservice
1. Navigate to the microservice directory:
   

bash
   cd animation_generator/microservice


2. Create a virtual environment:
   

bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate


3. Install dependencies:
   

bash
   pip install fastapi uvicorn openai manim


4. Ensure Manim is installed correctly by running:
   

bash
   manim --version



### 2. Node.js Backend
1. Navigate to the backend directory:
   

bash
   cd animation_generator/backend


2. Initialize a Node.js project:
   

bash
   npm init -y


3. Install dependencies:
   

bash
   npm install express axios cors uuid



### 3. React Frontend
1. Navigate to the frontend directory:
   

bash
   cd animation_generator/frontend


2. Create a new React app:
   

bash
   npx create-react-app .


3. Install additional dependencies:
   

bash
   npm install axios tailwindcss postcss autoprefixer uuid


4. Initialize Tailwind CSS:
   

bash
   npx tailwindcss init -p


5. Create src/index.css with:
   

css
   @import 'tailwindcss/base';
   @import 'tailwindcss/components';
   @import 'tailwindcss/utilities';


6. Update tailwind.config.js:
   

javascript
   module.exports = {
     content: ["./src/**/*.{js,jsx,ts,tsx}"],
     theme: { extend: {} },
     plugins: [],
   }



## Running the Application

### 1. Python Microservice
1.  Navigate to the `microservice` directory from the project root (`animation_generator`):
    ```bash
    cd microservice
    ```
2.  Activate the virtual environment (if you created one as per installation):
    ```bash
    source venv/bin/activate  # On Linux/macOS
    # On Windows: venv\Scripts\activate
    ```
3.  Set the `OPENAI_API_KEY` environment variable:
    Replace `"YOUR_ACTUAL_OPENAI_API_KEY"` with your real OpenAI API key.
    On Linux/macOS:
    ```bash
    export OPENAI_API_KEY="YOUR_ACTUAL_OPENAI_API_KEY"
    ```
    On Windows Command Prompt:
    ```bash
    set OPENAI_API_KEY="YOUR_ACTUAL_OPENAI_API_KEY"
    ```
    On Windows PowerShell:
    ```bash
    $env:OPENAI_API_KEY="YOUR_ACTUAL_OPENAI_API_KEY"
    ```
    **Important**: The application relies on this environment variable for OpenAI API calls. The `main.py` script in the microservice will attempt to read this key.
4.  Run the FastAPI application:
    ```bash
    python main.py
    ```
    The microservice should now be running and accessible at `http://localhost:8000`. You can typically stop it by pressing `Ctrl+C` in the terminal.

- Instructions for running the Node.js backend and React frontend will be added in subsequent steps.

## Notes
- Ensure your `OPENAI_API_KEY` is correctly set as an environment variable before running the microservice.
- The `output/` directory at the project root will be used to store generated Manim scripts and videos, organized by session ID.
- The Python microservice (`main.py`) currently uses mocked responses for OpenAI code generation and Manim video rendering. Full integration will occur in later steps.
- **Do not proceed to Step 3 until feedback is received on the completion of Step 2.**