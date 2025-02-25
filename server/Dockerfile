FROM node:18-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

WORKDIR /usr/src/app

# Copy shared package first
COPY shared ./shared

# Install and build shared dependencies
WORKDIR /usr/src/app/shared
COPY shared/package*.json ./
RUN npm install
RUN npm run build

# Setup server
WORKDIR /usr/src/app/server
COPY server/package*.json ./
COPY server/tsconfig*.json ./
RUN npm install

# Copy server source
COPY server ./

# Create symlink for shared package
RUN npm link ../shared

EXPOSE 3000

CMD ["npm", "run", "dev"] 