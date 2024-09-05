const axios = require("axios");
const launchesDb = require("./launches.mongo");
const planets = require("./planets.mongo");

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = "https://api.spacexdata.com/v4/launches/query";

async function populateLaunches() {
  console.log("dowloading launch data");
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      pagination: false,
      populate: [
        {
          path: "rocket",
          select: {
            name: 1,
          },
        },
        {
          path: "payloads",
          select: {
            customers: 1,
          },
        },
      ],
    },
  });

  if (response.status !== 200) {
    console.log("Problem dlowaing launch data");
    throw new Error("Problem dlowaing launch data");
  }

  const launchDocs = response.data.docs;
  for (const launchDoc of launchDocs) {
    const payloads = launchDoc["payloads"];
    const customers = payloads.flatMap((payload) => {
      return payload["customers"];
    });

    const launch = {
      flightNumber: launchDoc["flight_number"],
      mission: launchDoc["name"],
      rocket: launchDoc["rocket"]["name"],
      launchDate: launchDoc["date_local"],
      upcoming: launchDoc["upcoming"],
      success: launchDoc["success"],
      customers: customers,
    };

    await saveLaunch(launch);
  }
}

async function loadLaunchData() {
  const firestLaunch = await findLauch({ flightNumber: 1, rocket: "Falcon 1" });

  if (firestLaunch) {
    console.log("Laundh data already loaded");
  } else {
    await populateLaunches();
  }
}

async function findLauch(filter) {
  return await launchesDb.findOne(filter);
}

async function existLaunchWithId(launchId) {
  return await findLauch({ flightNumber: launchId });
}

async function getlatestFlightNumber() {
  const latestLaunch = await launchesDb.findOne().sort("-flightNumber");

  if (!latestLaunch) {
    return DEFAULT_FLIGHT_NUMBER;
  }

  return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
  return await launchesDb
    .find({}, { _id: 0, __v: 0 })
    .sort({ flightNumber: 1 })
    .skip(skip)
    .limit(limit);
}

async function saveLaunch(launch) {
  await launchesDb.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  );
}

async function scheduleNewLaunch(launch) {
  const planet = planets.findOne({
    kepler_name: launch.target,
  });

  if (!planet) {
    throw new Error("No matching planet found!");
  }

  const newFlightNumber = (await getlatestFlightNumber()) + 1;

  const newLaunch = Object.assign(launch, {
    upcoming: true,
    success: true,
    customers: ["NASA", "ZTM"],
    flightNumber: newFlightNumber,
  });
  await saveLaunch(newLaunch);
}

async function abortLaunchById(launchId) {
  const aborted = await launchesDb.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      success: false,
    }
  );

  return aborted.modifiedCount === 1;
}

module.exports = {
  existLaunchWithId,
  getAllLaunches,
  scheduleNewLaunch,
  abortLaunchById,
  loadLaunchData,
};
