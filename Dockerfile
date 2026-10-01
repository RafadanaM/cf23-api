# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3 AS base
WORKDIR /usr/app
RUN apt-get update && apt-get install -y curl

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

FROM base AS release
WORKDIR /usr/app

RUN apt-get update && apt-get install -y curl

COPY --chown=bun:bun --from=prerelease /usr/app/server ./server
COPY --chown=bun:bun --from=prerelease /usr/app/live_data ./live_data

RUN mkdir -p /usr/app/db_data && chown -R bun:bun /usr/app/db_data
RUN chown -R bun:bun /usr/app/live_data

ARG COMMIT_HASH
ENV COMMIT_HASH=${COMMIT_HASH}
ENV APP_PORT=5000
EXPOSE 5000

# run the app
USER bun
ENTRYPOINT [ "./server" ]
