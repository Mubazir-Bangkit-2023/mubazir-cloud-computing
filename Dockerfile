FROM node:18.18.2

WORKDIR /app


COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["node", "app.js"]

