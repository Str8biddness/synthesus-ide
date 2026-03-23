# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_WS_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}

RUN yarn build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Add security headers
RUN echo 'server_tokens off;' >> /etc/nginx/conf.d/security.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
