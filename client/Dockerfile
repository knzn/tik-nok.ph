FROM node:18-alpine

WORKDIR /usr/src/app

# Copy shared package first
COPY shared ./shared

# Install and build shared dependencies
WORKDIR /usr/src/app/shared
COPY shared/package*.json ./
RUN npm install
RUN npm run build

# Setup client
WORKDIR /usr/src/app/client
COPY client/package*.json ./
COPY client/tsconfig*.json ./
RUN npm install

# Copy client source
COPY client ./

# Create symlink for shared package
RUN npm link ../shared

EXPOSE 5173

CMD ["npm", "run", "dev"] 