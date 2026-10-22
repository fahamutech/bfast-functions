FROM node:22-bookworm-slim

WORKDIR /faas
ENV NODE_ENV=production

COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh / \
    && chmod 0755 /usr/local/bin/docker-entrypoint.sh

COPY . ./
RUN chown -R node:node /faas
USER node
# /functions-health is served by the engine itself. The start period covers the clone and
# npm ci a start does first. BFAST_HEALTHCHECK=off disables it (for a START_SCRIPT server
# that is not on PORT).
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
    CMD node -e "if(process.env.BFAST_HEALTHCHECK==='off')process.exit(0);fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/functions-health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
