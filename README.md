# Tik-Nok Video Sharing App

A modern video sharing platform built with React, Node.js, and MongoDB.

## Features

- User authentication and profile management
- Video upload and processing
- HLS video streaming
- Comments and likes
- Responsive design
- Real-time notifications

## Tech Stack

### Frontend
- React with TypeScript
- TanStack Query for data fetching
- Tailwind CSS for styling
- Shadcn UI components
- Vite for bundling

### Backend
- Node.js with Express
- MongoDB for database
- FFmpeg for video processing
- JWT for authentication
- Socket.io for real-time features

## Deployment to Render

### Prerequisites

1. Create a [Render](https://render.com/) account
2. Create a MongoDB database (using MongoDB Atlas or Render's MongoDB service)

### Deploying the Backend

1. In Render dashboard, click "New" and select "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - Name: `tik-nok-api`
   - Root Directory: `video-sharing-app/server`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Add the following environment variables:
     ```
     NODE_ENV=production
     PORT=8080
     MONGO_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret
     JWT_EXPIRES_IN=7d
     CORS_ORIGIN=https://your-frontend-url.onrender.com
     ```

### Deploying the Frontend

1. In Render dashboard, click "New" and select "Static Site"
2. Connect your GitHub repository
3. Configure the service:
   - Name: `tik-nok-client`
   - Root Directory: `video-sharing-app/client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Add the following environment variables:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com/api
     ```

### Setting Up Persistent Storage

For video storage, you'll need to set up a persistent disk:

1. In Render dashboard, go to "Disks"
2. Create a new disk with at least 10GB of storage
3. Attach the disk to your backend service
4. Update your backend environment variables:
   ```
   UPLOAD_DIR=/opt/render/project/disk/uploads
   PUBLIC_DIR=/opt/render/project/disk/public
   CACHE_DIR=/opt/render/project/disk/cache
   ```

## Performance Optimizations

The codebase has been optimized for deployment with:

1. Reduced video quality presets to save processing time and storage
2. Optimized API endpoints for status checking
3. Improved caching for video processing status
4. Memory and CPU usage monitoring to prevent resource exhaustion
5. React component optimizations with useMemo and useCallback
6. Removed unused code and duplicate functions

## Maintenance

- Run `npm run cleanup` on the server to clear all videos and reset the database
- Monitor server logs in the Render dashboard for any issues
- Check MongoDB Atlas dashboard for database performance

## Local Development

1. Clone the repository
2. Install dependencies:
   ```
   cd video-sharing-app
   npm install
   cd client
   npm install
   cd ../server
   npm install
   ```
3. Create `.env` files in both client and server directories
4. Start the development servers:
   ```
   # In the server directory
   npm run dev
   
   # In the client directory
   npm run dev
   ```

## License

MIT 