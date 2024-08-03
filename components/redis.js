require("dotenv").config({ silent: true });

const redis = require("redis");

const createRedisClient = () => {
  const client = redis.createClient({});

  client.on("connect", () => {
    console.log("Connected to Redis");
  });

  client.on("error", (err) => {
    console.error("Redis connection error: ", err);
  });

  return client;
};

module.exports = createRedisClient;
