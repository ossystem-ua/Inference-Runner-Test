FROM node
WORKDIR /w
COPY --chown=node:node ./frontend/package*.json ./
RUN npm ci -q
RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache
COPY --chown=node:node . .
CMD ["npm", "run", "start"]
