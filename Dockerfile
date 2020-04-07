FROM arm32v7/node:latest
COPY bin/ /usr/bin/
RUN [ "cross-build-start" ]
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot


COPY package.json /usr/src/bot
RUN npm install
COPY . /usr/src/bot
ARG TOKEN
RUN echo $TOKEN
RUN [ "cross-build-end" ]  
CMD node index.js $TOKEN
