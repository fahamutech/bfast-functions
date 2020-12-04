FROM node:14-alpine

WORKDIR /faas

RUN apk update
RUN apk upgrade
RUN apk add curl
# RUN apk add git
RUN apk add bash

COPY *.json ./
RUN npm ci --only=production

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh / # backwards compat

COPY . ./

#RUN ls /usr/local/bin

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
#CMD [ "npm run start" ]
