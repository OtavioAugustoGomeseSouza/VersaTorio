FROM node:20-alpine

WORKDIR /app

RUN chown -R node:node /app

COPY --chown=node:node package*.json ./
USER node
RUN npm ci

COPY --chown=node:node . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
