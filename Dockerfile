FROM node:lts-buster

WORKDIR /faas

COPY --from=docker:dind /usr/local/bin/docker /usr/local/bin/

COPY *.json ./
RUN npm install --only=production

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh /

COPY . ./

RUN wget https://dist.ipfs.io/go-ipfs/v0.9.1/go-ipfs_v0.9.1_linux-amd64.tar.gz
RUN tar -xvzf go-ipfs_v0.9.1_linux-amd64.tar.gz
RUN cd go-ipfs && sudo bash install.sh && cd ..
RUN ipfs --version

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
