FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Remove COPY . . and build steps
# Development server will handle hot reloading

EXPOSE 80

# Run development server instead of nginx
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]