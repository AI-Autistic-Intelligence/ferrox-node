FROM node:20-alpine

WORKDIR /app
COPY package*.json ./

RUN npm install --production

COPY . .

# Assuming index.js or dist/index.js is the entrypoint
EXPOSE 3000
CMD ["npm", "start"]
