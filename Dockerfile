# Stage 1: Install dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# These are safe to hardcode — they are already exposed to every browser visitor.
ENV NEXT_PUBLIC_SUPABASE_URL=https://qtitkjzialsxqwskfudx.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_I5qeXfLg3ASoaiQ_7RE_Hg_FOCiIcFW
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner (Next.js standalone output)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone server bundle (includes its own node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (.next/static must sit next to server.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]