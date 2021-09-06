FROM node:lts-buster

WORKDIR /faas

ENV NPM_CONFIG_PREFIX=/home/$USER/.npm-global
# optionally if you want to run npm global bin without specifying path
ENV PATH=$PATH:/home/$USER/.npm-global/bin


COPY --from=docker:dind /usr/local/bin/docker /usr/local/bin/

COPY *.json ./
RUN npm install --only=production
RUN export NPM_CONFIG_PREFIX=/home/$USER/.npm-global && npm i -g ipfs

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh /

COPY . ./

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
