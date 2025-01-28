import express from "express";
import dotenv from "dotenv";
import https from "https";

dotenv.config();

const app = express();

app.use(express.json());

if (process.env.NODE_ENV === "production") {
  const interval = 25 * 60 * 1000;
  const url = "https://adp-background-de9ea0eff9b9.herokuapp.com/";

  setInterval(() => {
    https
      .get(url, (res) => {
        console.log(`Pinged ${url}. Status: ${res.statusCode}`);
      })
      .on("error", (err) => {
        console.error(`Error pinging ${url}: ${err.message}`);
      });
  }, interval);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  const { default: userUpdate } = await import("./app/tasks/userUpdate.js");
  userUpdate();

  const { default: leagueUpdate } = await import("./app/tasks/leagueUpdate.js");
  leagueUpdate();
});
