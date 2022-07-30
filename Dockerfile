FROM node:16-slim AS package-jsons

# Extract package.json of Actions and Tweet Filters from the build context
COPY module_packages/ /opt/app/module_packages/
RUN find /opt/app/module_packages -type f | grep -v -E 'package.json' | xargs rm -rf && \
    rm -R /opt/app/module_packages/*/*/


FROM node:16-slim

WORKDIR /opt/app/

EXPOSE 4200

# Install apt packages
ARG NODE_ENV="production"
ENV NODE_ENV "${NODE_ENV}"
ARG TEST_CHROMIUM_REVISION="848009"
RUN echo "Installing packages..." && \
    export DEBIAN_FRONTEND="noninteractive" && \
    mkdir -p /usr/share/man/man1 && \
    apt-get update --yes && \
    apt-get install --yes --no-install-recommends --quiet \
        build-essential curl default-jre procps python wget \
        || exit 1 && \
    echo "packages installed." && \
    \
    if [ "${NODE_ENV}" = "development" ]; then \
        echo "Install packages for testing..." && \
        apt-get install --yes --no-install-recommends --quiet \
            fonts-ipafont-gothic unzip || exit 1 && \
        cd /tmp/ && \
        wget --no-verbose --output-document=chromium.zip https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/Linux_x64%2F${TEST_CHROMIUM_REVISION}%2Fchrome-linux.zip?alt=media || exit 1 && \
        unzip -q chromium.zip || exit 1 && \
        rm chromium.zip && \
        mv chrome-linux/ /opt/chromium/ && \
        /opt/chromium/chrome --version && \
        echo "packages for testing installed."; \
    fi; \
    \
    apt-get clean

# Install npm modules for app
COPY lerna.json package.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY --from=package-jsons /opt/app/module_packages/ ./module_packages/

RUN echo "Installing npm modules..." && \
    npm install --legacy-peer-deps || exit 1 && \
    npm run postinstall || exit 1 && \
    echo "npm modules installed." && \
    npm cache clean --force

# Copy files for app
COPY . /opt/app/

# Build for production env
RUN if [ "${NODE_ENV}" = "production" ]; then \
    echo "Building app...\n" && \
    export DATABASE_URL="" JWT_TOKEN_SECRET="BUILD" && \
    npm run build || exit 1; \
    echo "build completed." ; \
fi

# Start app
CMD ["npm", "start"]