const { Server } = require("socket.io");

module.exports = (server) => {
  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("joinFriendUpdates", ({ id }) => {
      const roomName = `friendUpdates-${id}`;
      socket.join(roomName);
      console.log(`User ${userId} joined room ${roomName}`);
    });
  });
};
