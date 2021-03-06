# Build static files
FROM alpine:3.8 as front
RUN apk add yarn
WORKDIR /app
COPY front/package.json front/yarn.lock ./
RUN yarn --pure-lockfile
COPY front/ ./
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
RUN REACT_APP_FIREBASE_API_KEY="$REACT_APP_FIREBASE_API_KEY" \
    REACT_APP_FIREBASE_AUTH_DOMAIN="$REACT_APP_FIREBASE_AUTH_DOMAIN" \
    REACT_APP_FIREBASE_PROJECT_ID="$REACT_APP_FIREBASE_PROJECT_ID" \
    yarn build

# Build jar
FROM hseeberger/scala-sbt as jar
WORKDIR /app
COPY project ./project
RUN sbt version
COPY build.sbt ./
RUN sbt version
COPY . .
COPY --from=front /app/build/ /app/src/main/resources/static
RUN sbt assembly

# App
FROM openjdk:10-jre
WORKDIR /app
COPY --from=jar /app/target/scala-2.12/stayed-assembly-0.0.1.jar app.jar
EXPOSE 80
CMD /usr/bin/java -Xms128M -Xmx128M -jar app.jar
