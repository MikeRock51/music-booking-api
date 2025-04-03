FROM node:20-alpine

COPY package.json ./
COPY yarn.lock ./

WORKDIR /app

COPY . .

RUN yarn

# Expose port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["yarn", "start"]