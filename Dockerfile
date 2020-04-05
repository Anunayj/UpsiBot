FROM hypriot/rpi-node:latest
COPY bin/ /usr/bin/
RUN [ "cross-build-start" ]
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot


COPY package.json /usr/src/bot
RUN npm install
RUN [ "cross-build-end" ]  
COPY . /usr/src/bot
ARG TOKEN
ENV discordToken=$TOKEN
CMD ["node", "index.js"]