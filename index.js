require("dotenv").config({ silent: true });

const express = require("express"),
  app = express(),
  helmet = require("helmet"),
  morgan = require("morgan"),
  cookieParser = require("cookie-parser"),
  cors = require("cors"),
  errorHandler = require("./config/error_handler"),
  // rateLimit = require("express-rate-limit"),
  path = require("path");

// Middleware setup
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   max: 500,
//   message: "Too many requests, please try again later",
// });

// app.use(limiter);

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

// Error handling middleware
app.use(errorHandler);

// Export the app for testing
module.exports = app;

// Separate server setup for running the app
if (require.main === module) {
  const port = process.env.PORT || 5000,
    server = require("http").createServer(app),
    initScheduler = require("./config/scheduler_init");

  // Initialize the scheduler
  initScheduler();

  // socket(server);

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    scheduler();
  });
}
