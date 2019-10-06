FROM node:10-alpine

WORKDIR /faas

RUN apk update
RUN apk upgrade
# RUN apk add unzip
RUN apk add curl
RUN apk add git

# RUN  curl -L https://github.com/fahamutech/BFastFunction/archive/v1.4.10.zip > /tmp/app.zip && unzip /tmp/app.zip -d /faas

# RUN cp -r /faas/BFastFunction-1.4.10/* /faas
# RUN rm -r /faas/BFastFunction-1.4.10
COPY *.json ./
RUN npm ci --only=production
# RUN apk del unzip
# RUN rm /tmp/app.zip

COPY . ./

CMD [ "npm","run","start" ]
