FROM node:21.2.0

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 5000

CMD ["npm", "start"]

