const express = require("express"),
  app = express(),
  cookieParser = require("cookie-parser"),
  cors = require("cors"),
  cron = require("node-cron"),
  errorHandler = require("./config/error_handler"),
  scheduler = require("./config/scheduler"),
  helmet = require("helmet"),
  rateLimit = require("express-rate-limit"),
  morgan = require("morgan"),
  server = require("http").createServer(app),
  port = process.env.PORT || 5000;

var environment = process.env.NODE_ENV || "development";

if (environment == "development") require("dotenv").config({ silent: true });

app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/users", require("./controllers/user_controller"));
// app.use("/map", require("./controllers/map_controller"));

app.use(errorHandler);
app.use(helmet());
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  message: "Too many requests, please try again later.",
});

app.use(limiter);
app.set("trust proxy", 1);

// cron.schedule("*/5 * * * *", scheduler);

server.listen(port, () => {
  scheduler();
  console.log(`Listening to port: ${port}`);
});
