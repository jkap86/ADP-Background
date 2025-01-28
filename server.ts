import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  const { default: userUpdate } = await import("./app/tasks/userUpdate.js");
  userUpdate();

  const { default: leagueUpdate } = await import("./app/tasks/leagueUpdate.js");
  leagueUpdate();
});
