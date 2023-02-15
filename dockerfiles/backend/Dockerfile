FROM node
WORKDIR /w
COPY --chown=node:node ./backend/package*.json ./
RUN npm ci -q
COPY --chown=node:node ./backend/tsconfig.json ./
COPY --chown=node ./backend/src ./src
CMD npm run dev