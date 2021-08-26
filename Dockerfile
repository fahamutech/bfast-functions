FROM node:lts

WORKDIR /faas

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y curl

COPY --from=docker:dind /usr/local/bin/docker /usr/local/bin/

COPY *.json ./
RUN npm install --only=production

COPY ./docker-entrypoint.sh /usr/local/bin/
RUN ln -s /usr/local/bin/docker-entrypoint.sh /

COPY . ./

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
