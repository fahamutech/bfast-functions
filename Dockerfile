FROM node:22-bookworm-slim

WORKDIR /faas
ENV NODE_ENV=production

COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh / \
    && chmod 0755 /usr/local/bin/docker-entrypoint.sh

COPY . ./
RUN chown -R node:node /faas
USER node
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
