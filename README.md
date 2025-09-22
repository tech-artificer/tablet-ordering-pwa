## 🐳 Running with Docker

You can run this project in a containerized environment using Docker and Docker Compose. This setup ensures consistency across development and production environments.

### Requirements
- **Docker** and **Docker Compose** installed on your system
- (Optional) `.env` file for environment variables (see below)

### Docker Details
- **Node.js version:** 22.13.1 (as specified in the Dockerfile)
- **Exposed port:** `3000` (the Nuxt app will be available at `http://localhost:3000`)
- **Environment variables:**
  - The application expects environment variables defined in a `.env` file. You can copy `.env.example` to `.env` and adjust as needed.

### Build and Run

1. **Copy the example environment file (if you haven't already):**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

2. **Build and start the application using Docker Compose:**
   ```bash
   docker compose up --build
   ```
   This will build the Docker image and start the `typescript-app` service.

3. **Access the app:**
   - Open [http://localhost:3000](http://localhost:3000) in your browser.

### Notes
- The Docker Compose file defines a single service (`typescript-app`) and a custom bridge network (`appnet`).
- The container runs as a non-root user for improved security.
- If you update your `.env` file, restart the container to apply changes.
- If you need to customize the build (e.g., change the Node.js version), edit the `Dockerfile`'s `ARG NODE_VERSION` line.

---
