const request = require("supertest");
const app = require("../index");
const userService = require("../services/user_service");

jest.mock("../config/authorize", () => {
  return jest.fn(() => [
    (req, res, next) => next(), // Mock jwt middleware
    (req, res, next) => {
      req.auth = { id: "mockUserId", role: "user" }; // Mock user authentication
      next();
    },
  ]);
});
jest.mock("../services/user_service");
jest.mock("../config/scheduler_init", () => jest.fn());

describe("User endpoints", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
  });

  describe("POST /users/delete-account", () => {
    it("Should delete an account and return 200 on success", async () => {
      // Mock the deleteAccount function
      userService.deleteAccount.mockResolvedValue({ status: "SUCCESS" });

      const response = await request(app)
        .post("/users/delete-account")
        .send({ id: "mockUserId" });

      expect(response.status).toBe(200);
    });
  });
});
