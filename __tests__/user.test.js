const request = require("supertest"),
  app = require("../index"),
  userService = require("../services/user_service");

jest.mock("../services/user_service");
jest.mock("../config/scheduler_init", () => jest.fn()); // Mock the scheduler initialization

describe("User endpoints", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
  });

  describe("POST /users/login-with-phone-number", () => {
    it("Should return 200 on correct US phone number", async () => {
      // Mock the loginWithPhoneNumber service to avoid real API calls
      userService.loginWithPhoneNumber.mockResolvedValue({ status: "SUCCESS" });

      const response = await request(app)
        .post("/users/login-with-phone-number")
        .send({ phoneNumber: "5553478267" });

      expect(response.status).toBe(200);
    });

    it("Should return 404 on invalid phone format", async () => {
      // Mock the loginWithPhoneNumber service to return a failed status
      userService.loginWithPhoneNumber.mockResolvedValue({ status: "WRONG" });

      const response = await request(app)
        .post("/users/login-with-phone-number")
        .send({ phoneNumber: "1234567890" });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /users/verify-pin-number", () => {
    it("Should return 200 and user data on successful pin verification", async () => {
      const mockUser = { id: "123", phoneNumber: "1234567890" },
        mockRefreshToken = { token: "new-refresh-token" },
        mockJwtToken = "new-jwt-token";

      userService.verifyPinNumber.mockResolvedValue({
        status: "SUCCESS",
        data: {
          user: mockUser,
          refreshToken: mockRefreshToken,
          jwtToken: mockJwtToken,
        },
      });

      const response = await request(app)
        .post("/users/verify-pin-number")
        .send({ phoneNumber: "1234567890", pinNumber: "1234" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: mockUser,
        refreshToken: mockRefreshToken,
        jwtToken: mockJwtToken,
      });
    });

    it("Should return 404 if user does not exist", async () => {
      userService.verifyPinNumber.mockResolvedValue({
        status: "NONEXISTENT",
        data: null,
      });

      const response = await request(app)
        .post("/users/verify-pin-number")
        .send({ phoneNumber: "1234567890", pinNumber: "1234" });

      expect(response.status).toBe(404);
      expect(response.text).toBe("User does not exist yet");
    });

    it("Should return 401 for wrong pin number", async () => {
      userService.verifyPinNumber.mockResolvedValue({
        status: "UNAUTHORIZED",
        data: null,
      });

      const response = await request(app)
        .post("/users/verify-pin-number")
        .send({ phoneNumber: "1234567890", pinNumber: "1234" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /users/create-account", () => {
    it("Should return 200 on all correct fields", async () => {
      const mockUser = { id: "123", phoneNumber: "1234567890" },
        mockRefreshToken = { token: "new-refresh-token" },
        mockJwtToken = "new-jwt-token";

      userService.createAccount.mockResolvedValue({
        status: "SUCCESS",
        data: {
          user: mockUser,
          refreshToken: mockRefreshToken,
          jwtToken: mockJwtToken,
        },
      });

      const response = await request(app).post("/users/create-account").send({
        firstName: "Mock",
        lastName: "User",
        phoneNumber: "1234567890",
        birthday: "06112024",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: mockUser,
        refreshToken: mockRefreshToken,
        jwtToken: mockJwtToken,
      });
    });

    it("Should return 404 on invalid fields", async () => {
      userService.createAccount.mockResolvedValue({ status: "WRONG" });

      const response = await request(app).post("/users/create-account").send({
        firstName: "Mock",
        lastName: "User",
        phoneNumber: "1234567890",
        birthday: "06112024",
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /users/check-in", () => {
    it("Should return 200 on successful check-in", async () => {
      const place = "123456789",
        time = new Date();

      userService.checkIn.mockResolvedValue({
        status: "IN",
        data: {
          placeId: place,
          checkedInTime: time.toISOString(),
        },
      });

      const response = await request(app).post("/users/check-in").send({
        token: "123456789",
        longitude: "123.456",
        latitude: "-123.456",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        placeId: place,
        checkedInTime: time.toISOString(),
      });
    });

    it("Should return 404 if no place exists", async () => {
      userService.checkIn.mockResolvedValue({ status: "OUT" });

      const response = await request(app).post("/users/check-in").send({
        token: "123456789",
        longitude: "123.456",
        latitude: "-123.456",
      });

      expect(response.status).toBe(404);
      expect(response.text).toBe("No place exists");
    });
  });
});
