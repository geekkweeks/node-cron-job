FROM node:21-alpine

WORKDIR /app

# copy all pakckage to app
COPY  package* .

# install all packages
RUN npm i

# install nodedemo
RUN npm install -g nodemon

# Copy all sources code
COPY . .

CMD [ "npm", "start" ]
