FROM node:18

WORKDIR /app/frontend

COPY frontend/package.json  ./
RUN npm install

COPY frontend/ .

COPY .env /app/.env

ARG DOMAIN
ARG BACKEND_PORT
ARG BONSAI_PORT

ENV DOMAIN=$DOMAIN
ENV BACKEND_PORT=$BACKEND_PORT
ENV BONSAI_PORT=$BONSAI_PORT

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

