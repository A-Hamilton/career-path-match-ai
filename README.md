# Career Path Match AI

A modern web application that empowers users to optimize their resumes, explore personalized career paths, and discover job opportunities using AI-powered tools.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-ui, React Query, React Router, Sonner
- **Backend:** Node.js, Express, TypeScript, Multer, Firebase Admin (Auth)
- **Authentication:** Firebase Authentication (Email/Password, Google Sign-In)
- **AI Integration:** Placeholder for resume analysis engine (e.g., OpenAI, Vertex AI)
- **Storage & Database:** Local file uploads & future database integration (e.g., Firestore, PostgreSQL)

## Getting Started

### Prerequisites

- Node.js (>=16)
- npm or yarn
- Firebase project with Auth enabled and service account JSON

### Installation

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   cd career-path-match-ai
   ```

2. Install dependencies:
   ```sh
   npm install
   npm install --prefix server
   ```

3. Create `.env.local` in the project root with your Firebase web config:
   ```env
   VITE_FIREBASE_API_KEY=YOUR_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID=YOUR_APP_ID
   VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
   ```

4. Set up Firebase Admin credentials in your shell:
   ```sh
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
   ```

### Development

Run both frontend and backend concurrently:
```sh
npm run dev
```
- Frontend: http://localhost:8080 (or next available port)
- Backend API: http://localhost:4000

### Available Scripts

- `dev`        Run both client and server concurrently
- `dev:client` Start the Vite dev server
- `dev:server` Start the Express backend (`ts-node-dev`)
- `build`      Build the frontend for production
- `preview`    Preview the production build

## Usage

1. Sign up or sign in (Email/Password or Google)
2. Navigate to **Resume Analyzer** to upload a resume
3. View your AI-powered analysis and download results
4. Explore **Career Paths** and **Job Search** modules

## Deployment

- **Frontend:** Deploy the `dist` folder to Netlify, Vercel, or any static host
- **Backend:** Deploy the `server/src/index.ts` via Heroku, AWS, or Vercel Functions

## Contributing

Contributions, issues, and feature requests are welcome. Please submit a pull request or open an issue to discuss changes.

## License

This project is licensed under the MIT License.
