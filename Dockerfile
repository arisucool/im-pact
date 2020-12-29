# 開発環境および本番環境を構築するための Dockerfile

FROM node:14-slim

WORKDIR /opt/app/

EXPOSE 4200

# Install apt packages
RUN echo "Installing packages..." && \
    export DEBIAN_FRONTEND="noninteractive" && \
    apt-get update --yes && \
    apt-get install --yes --no-install-recommends --quiet \
        build-essential curl procps \
        ${ADDITIONAL_PACKAGES} && \
    echo "packages installed." || exit 1 && \
    apt-get clean

# Install npm modules for app
COPY lerna.json package.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

RUN echo "Installing npm modules..." && \
    npm install || exit 1 && \
    npm run postinstall || exit 1 && \
    echo "npm modules installed." && \
    npm cache clean --force

# Copy files for app
COPY . /opt/app/

# Build for production env
ARG NODE_ENV="production"
ENV NODE_ENV "${NODE_ENV}"
RUN if [ "${NODE_ENV}" = "production" ]; then \
    echo "Building app...\n" && \
    npm run build || exit 1; \
    echo "build was completed." ; \
fi

# Start app
CMD ["npm", "start"]