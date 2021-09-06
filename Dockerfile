FROM node:lts-buster

WORKDIR /faas

COPY --from=docker:dind /usr/local/bin/docker /usr/local/bin/

COPY *.json ./
RUN npm install --only=production
RUN npm install -g ipfs

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh /

COPY . ./

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
