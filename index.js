require("dotenv").config({ silent: true });

const express = require("express"),
  app = express(),
  helmet = require("helmet"),
  morgan = require("morgan"),
  cookieParser = require("cookie-parser"),
  cors = require("cors"),
  cron = require("node-cron"),
  errorHandler = require("./config/error_handler"),
  scheduler = require("./config/scheduler"),
  rateLimit = require("express-rate-limit"),
  path = require("path"),
  server = require("http").createServer(app),
  // socket = require("./services/socket_service"),
  port = process.env.PORT || 5000;

app.use(helmet());
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500,
  message: "Too many requests, please try again later",
});

app.use(limiter);
app.set("trust proxy", 1);

app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5000",
      "https://www.distans.app",
      "https://admin.distans.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use("/users", require("./controllers/user_controller"));
app.use("/maps", require("./controllers/map_controller"));
app.use("/admin", require("./controllers/admin_controller"));

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// socket(server);

app.use(errorHandler);

cron.schedule("*/5 * * * *", scheduler);

server.listen(port, () => {
  scheduler();
  console.log(`Listening to port: ${port}`);
});
