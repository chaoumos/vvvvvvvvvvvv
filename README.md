# Firebase Studio - HugoHost

This is a Next.js starter project in Firebase Studio designed to create and manage Hugo blogs.

## Getting Started

### 1. Prerequisites
- Node.js (version 18 or later recommended)
- npm or yarn

### 2. Setup Firebase Project
Before you can run this application, you need to have a Firebase project.
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project or use an existing one.
3. In your project, go to **Project settings** (click the gear icon).
4. Under the **General** tab, find your project's Firebase configuration (API Key, Auth Domain, etc.). You will need these for the next step.
5. Enable **Email/Password** authentication:
   - Go to **Authentication** in the Firebase console.
   - Click on the **Sign-in method** tab.
   - Enable the **Email/Password** provider.
6. Set up Firestore:
   - Go to **Firestore Database** in the Firebase console.
   - Click **Create database**.
   - Choose **Start in production mode** or **Start in test mode**. For development, test mode is fine, but remember to secure your rules before deploying.
   - Select a Firestore location.

### 3. Configure Environment Variables
The application requires Firebase credentials to connect to your project.
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file.
3. Replace the placeholder values (like `YOUR_API_KEY`) with your actual Firebase project configuration values obtained in the previous step.

   Your `.env` file should look something like this:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
   NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcd1234efgh5678"
   ```
   
4. **Optional: Genkit/Google AI API Key**
   If you plan to use the AI features (like the AI Hugo Configuration Assistant), you'll need a Google AI API key with access to the Gemini API.
   - Create an API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Add this key to your `.env` file:
     ```
     GOOGLE_API_KEY="YOUR_GOOGLE_AI_STUDIO_API_KEY"
     ```

### 4. Install Dependencies
```bash
npm install
# or
yarn install
```

### 5. Run the Development Server
```bash
npm run dev
# or
yarn dev
```
This will start the Next.js development server, typically on `http://localhost:9002`.

If you are using AI features, you also need to run the Genkit development server in a separate terminal:
```bash
npm run genkit:watch
# or
yarn genkit:watch
```
This usually starts on `http://localhost:3400`.

### 6. Open the Application
Open [http://localhost:9002](http://localhost:9002) in your browser to see the application.

## Project Structure
- `src/app/`: Contains the Next.js App Router pages and layouts.
  - `src/app/dashboard/`: Pages for the authenticated user dashboard.
  - `src/app/login/`, `src/app/signup/`: Authentication pages.
- `src/components/`: Reusable React components.
  - `src/components/auth/`: Authentication-related forms.
  - `src/components/dashboard/`: Components used within the dashboard.
  - `src/components/layout/`: Layout components like sidebar and user avatar.
  - `src/components/ui/`: ShadCN UI components.
- `src/contexts/`: React context providers (e.g., `AuthProvider`).
- `src/hooks/`: Custom React hooks (e.g., `useAuth`, `useToast`).
- `src/lib/`: Core libraries and utilities.
  - `src/lib/firebase/`: Firebase configuration and Firestore interaction logic.
  - `src/lib/themes.ts`: Predefined Hugo themes.
  - `src/lib/types.ts`: TypeScript type definitions.
  - `src/lib/utils.ts`: Utility functions.
- `src/ai/`: Genkit related code for AI features.
  - `src/ai/flows/`: Genkit flows (e.g., `generate-hugo-config.ts`).
  - `src/ai/genkit.ts`: Genkit initialization.
  - `src/ai/dev.ts`: Genkit development server entry point.
- `public/`: Static assets.
- `.env.example`: Example environment variables file.
- `next.config.ts`: Next.js configuration.
- `tailwind.config.ts`: Tailwind CSS configuration.
- `tsconfig.json`: TypeScript configuration.

## Available Scripts

- `npm run dev`: Starts the Next.js development server (with Turbopack).
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
- `npm run typecheck`: Runs TypeScript type checking.
- `npm run genkit:dev`: Starts the Genkit development server once.
- `npm run genkit:watch`: Starts the Genkit development server and watches for changes.

## Key Features
- User authentication (Sign Up, Login, Logout) with Firebase.
- Dashboard to view and manage Hugo blogs.
- Create new Hugo blogs:
  - Specify site name, blog title, description.
  - Choose from predefined themes or provide a custom Git URL for a theme.
  - Optional GitHub Personal Access Token (PAT) for repository creation (handled server-side).
- Real-time updates for blog creation status using Firestore listeners.
- AI-powered Hugo configuration (`hugo.toml`) generation using Genkit and Google AI.
- Responsive design with ShadCN UI components and Tailwind CSS.

## Important Notes
- **GitHub PAT Security**: The form allows users to input a GitHub PAT. In this example, it's passed to a server action. For a production application, consider more secure methods like a GitHub App integration instead of relying on user-provided PATs. The PAT is mentioned as not being stored long-term after its initial use.
- **Firebase Rules**: Ensure your Firestore security rules are properly configured for production to protect user data.
- **Error Handling**: The application includes basic error handling and toasts for user feedback.

To get started, take a look at `src/app/page.tsx` and follow the setup instructions above.
