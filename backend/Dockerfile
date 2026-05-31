FROM node:20-alpine

WORKDIR /app

RUN mkdir -p /app/uploads && chown -R node:node /app

COPY --chown=node:node package*.json ./
USER node
RUN npm ci

COPY --chown=node:node . .
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "start:dev"]
