FROM node:latest

RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot


COPY package.json /usr/src/bot
RUN npm install

COPY . /usr/src/bot
ARG TOKEN
ENV discordToken=$TOKEN
CMD ["node", "index.js"]