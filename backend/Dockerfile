FROM node:20

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install

COPY backend/ .

COPY geodata /app/geodata
COPY scripts/constants.py /app/scripts/constants.py

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/main"]
