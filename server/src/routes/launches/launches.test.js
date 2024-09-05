const request = require("supertest");
const app = require("../../app");
const { mongoConnect, mongoDisconnect } = require("../../services/mongo");

describe("Launch API", () => {
  beforeAll(async () => {
    await mongoConnect();
  });

  afterAll(async () => {
    mongoDisconnect();
  });

  describe("TEST GET /launches", () => {
    test("It should respond with 200 success", async () => {
      const response = await request(app)
        .get("/v1/launches")
        .expect("Content-Type", /json/)
        .expect(200);
    });
  });

  describe("TEST POST /launch", () => {
    const completedLaunchData = {
      mission: "USS Enterpise",
      rocket: "NCC 1701-D",
      target: "EARTH-123",
      launchDate: "January 4, 2028",
    };

    const completedLaunchDataWithoutDate = {
      mission: "USS Enterpise",
      rocket: "NCC 1701-D",
      target: "EARTH-123",
    };

    test("It should respond with 201 created", async () => {
      const response = await request(app)
        .post("/v1/launches")
        .send(completedLaunchData)
        .expect("Content-Type", /json/)
        .expect(201);

      const requestDate = new Date(completedLaunchData.launchDate).valueOf();
      const responseDate = new Date(response.body.launchDate).valueOf();

      expect(responseDate).toBe(requestDate);
      expect(response.body).toMatchObject(completedLaunchDataWithoutDate);
    });

    test("It should  catch missing required properties", async () => {
      const response = await request(app)
        .post("/v1/launches")
        .send(completedLaunchDataWithoutDate)
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toStrictEqual({
        error: "Missing required launch property",
      });
    });

    test("It should  catch invalid dates", async () => {
      const response = await request(app)
        .post("/v1/launches")
        .send({ ...completedLaunchDataWithoutDate, launchDate: "random date" })
        .expect("Content-Type", /json/)
        .expect(400);

      expect(response.body).toStrictEqual({
        error: "Invalid launch date",
      });
    });
  });
});
