# AI Animation Generator

This project is a web application that allows users to generate short animations based on textual prompts. It uses a Large Language Model (LLM) to convert user input into Manim animation scripts, which are then rendered into videos. The frontend is built with React (Vite + TypeScript) and shadcn/ui, and the backend is a FastAPI microservice.

## Features

*   **Text-to-Animation:** Users can type a description of an animation, and the system will generate a corresponding video.
*   **Manim Integration:** Leverages the Manim library for programmatic animation generation.
*   **LLM-Powered Scripting:** An LLM (GPT-4 or similar, via an API) translates natural language prompts into Python code for Manim.
*   **React Frontend:** A modern, responsive user interface built with React, TypeScript, Vite, and shadcn/ui.
*   **FastAPI Backend:** A Python-based microservice handles API requests, LLM interaction, and Manim script execution.
*   **Video Preview & Download:** Users can preview the generated animation directly in the browser and download the video file.
*   **Customizable Theming:** The frontend supports custom color themes.

## Tech Stack

**Frontend:**

*   React
*   TypeScript
*   Vite
*   Tailwind CSS
*   shadcn/ui (for UI components)
*   Lucide React (for icons)

**Backend (Microservice):**

*   Python
*   FastAPI
*   Manim
*   OpenAI API (or other LLM provider)
*   Uvicorn (ASGI server)

**Video Hosting/CDN (Optional):**

*   Cloudinary (for hosting and transforming videos)
*   Cloudflare CDN (for caching and delivery)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Python (v3.10 or later recommended)
*   pip
*   Manim and its dependencies (including LaTeX, FFmpeg)
*   An API key for an LLM provider (e.g., OpenAI)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd animation-generator
    ```

2.  **Setup Frontend:**
    ```bash
    cd frontend
    npm install
    # or
    # yarn install
    ```

3.  **Setup Backend (Microservice):**
    ```bash
    cd ../microservice
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
    *   Ensure Manim is correctly installed and configured in this environment or globally. Refer to the [official Manim installation guide](https://docs.manim.community/en/stable/installation/index.html).

4.  **Environment Variables:**
    *   **Backend:** Create a `.env` file in the `microservice` directory and add your LLM API key:
        ```env
        OPENAI_API_KEY=your_openai_api_key_here
        ```
    *   The backend will also need to know where Manim outputs files if it's not the default. This is currently handled by relative paths in `main.py`.

### Running the Project

1.  **Start the Backend Microservice:**
    Navigate to the `microservice` directory:
    ```bash
    cd microservice
    # If you created a virtual environment and it's not active:
    # source venv/bin/activate 
    uvicorn main:app --reload --port 8000
    ```
    The backend will be available at `http://localhost:8000`.

2.  **Start the Frontend Development Server:**
    Navigate to the `frontend` directory (in a new terminal):
    ```bash
    cd frontend
    npm run dev
    # or
    # yarn dev
    ```
    The frontend will be available at `http://localhost:5173` (or another port if 5173 is busy). The Vite development server is configured to proxy API requests from `/api` to `http://localhost:8000`.

## Project Structure

```
animation-generator/
├── frontend/                   # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/         # Reusable UI components (ChatBox, VideoPlayer, SideBar, shadcn/ui)
│   │   ├── lib/                # Utility functions (e.g., shadcn/ui utils)
│   │   ├── pages/              # Main page views (e.g., Main.tsx)
│   │   ├── App.tsx             # Main App component, routing
│   │   ├── main.tsx            # Entry point for React app
│   │   └── index.css           # Global styles, Tailwind directives
│   ├── vite.config.ts          # Vite configuration (proxy setup)
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── package.json
│
├── microservice/               # FastAPI backend service
│   ├── media/                  # Manim output (videos, images, Tex) - .gitignore this
│   │   ├── videos/
│   │   └── images/
│   ├── main.py                 # FastAPI application logic, LLM interaction, Manim execution
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables (API keys) - .gitignore this
│
├── README.md                   # This file
└── setup.md                    # Initial setup notes (if any)
```

## API Endpoints (Backend)

The backend microservice exposes the following API endpoint:

*   **`POST /api/generate-animation`**
    *   **Request Body:**
        ```json
        {
          "prompt": "A red square rotating around a blue circle"
        }
        ```
    *   **Success Response (200 OK):**
        ```json
        {
          "video_url": "/media/videos/YourSceneName/1080p60/YourSceneName.mp4",
          "download_url": "/media/videos/YourSceneName/1080p60/YourSceneName.mp4",
          "scene_name": "YourSceneName",
          "script": "python script generated by LLM..."
        }
        ```
        *(Note: `video_url` and `download_url` are relative to the backend server. The frontend accesses them via the proxy.)*
    *   **Error Response (e.g., 500 Internal Server Error):**
        ```json
        {
          "detail": "Error message"
        }
        ```

## How it Works

1.  **User Input:** The user types a prompt into the `ChatBox` component in the frontend.
2.  **API Request:** The frontend sends the prompt to the backend `/api/generate-animation` endpoint.
3.  **LLM Processing:** The FastAPI backend receives the prompt and sends it to an LLM (e.g., GPT-4) with a specific system prompt instructing it to generate a Manim Python script.
4.  **Manim Script Generation:** The LLM returns a Python script designed to create the requested animation using Manim.
5.  **Manim Execution:** The backend saves this script to a temporary file and executes Manim to render the animation. This involves:
    *   Generating a unique scene name (class name in Manim).
    *   Running the `manim render <script_file> <SceneName>` command.
    *   Polling for the output video file.
6.  **Video URL Response:** Once the video is rendered, the backend returns a JSON response to the frontend containing the URL to access the video (e.g., `/media/videos/SceneName/1080p60/SceneName.mp4`) and a download URL.
7.  **Display Video:** The frontend receives the video URL and updates the `VideoPlayer` component to display the animation. A download button is also made available.

## Customization

### Frontend Theme

The frontend uses `shadcn/ui` which is built on Tailwind CSS. To customize the theme:

1.  **Update CSS Variables:** Modify the CSS color variables in `frontend/src/index.css` (or your global CSS file). These variables define the color palette for `shadcn/ui` components.
2.  **Update Tailwind Config:** Adjust `frontend/tailwind.config.js` to reflect your new color names if you changed them in the CSS variables.
    Refer to the [shadcn/ui theming documentation](https://ui.shadcn.com/docs/theming) for more details.

### Manim Output

*   **Quality:** You can adjust Manim rendering quality (e.g., `-ql` for low quality, `-qm` for medium, `-qh` for high) in the `run_manim` function in `microservice/main.py` to speed up rendering during development.
*   **Output Directory:** Manim's output directory is configured in its library files or can be overridden with command-line flags. The backend currently expects videos in `microservice/media/videos/<SceneName>/<quality>/<SceneName>.mp4`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License - see the `LICENSE` file for details (if one is created).

---

*This README was generated with assistance from an AI coding agent.*
