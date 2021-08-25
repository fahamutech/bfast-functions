FROM node:lts-alpine

WORKDIR /faas

RUN apk update
RUN apk upgrade
RUN apk add curl
# RUN apk add git
RUN apk add bash
RUN apk add docker
RUN #addgroup username docker
RUN rc-update add docker boot
RUN service docker start

COPY *.json ./
RUN npm install --only=production

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh / # backwards compat

COPY . ./

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
#CMD [ "npm run start" ]
