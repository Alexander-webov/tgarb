FROM node:20-alpine

# Install OpenSSL - required by Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
