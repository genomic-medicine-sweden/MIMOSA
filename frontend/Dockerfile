FROM node:18

WORKDIR /app/frontend

COPY frontend/package.json  ./
RUN npm install

COPY frontend/ .

COPY config.json ./src/config.json

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

