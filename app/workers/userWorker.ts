import { pool } from "../lib/pool.js";
import axiosInstance from "../lib/axiosInstance.js";
import { League } from "../lib/types.js";

const userUpdate = async () => {
  console.log("Begin User update");

  const users_to_update = await pool.query(
    "SELECT user_id FROM adp__users ORDER BY updated_at ASC NULLS FIRST LIMIT 250"
  );

  const updated_users: {
    user_id: string;
    username: string;
    avatar: string | null;
  }[] = [];

  const leagues: League[] = [];

  const batch_size = 10;

  for (let i = 0; i < users_to_update.rows.length; i += batch_size) {
    const batch = users_to_update.rows.slice(i, i + batch_size);

    const user_ids = batch.map((user) => user.user_id);

    await Promise.all(
      user_ids.map(async (user_id) => {
        try {
          const [updated_user, user_leagues] = await Promise.all([
            axiosInstance.get(`https://api.sleeper.app/v1/user/${user_id}`),
            axiosInstance.get(
              `https://api.sleeper.app/v1/user/${user_id}/leagues/nfl/${process.env.SEASON}`
            ),
          ]);

          updated_users.push({
            user_id: updated_user.data.user_id,
            username: updated_user.data.display_name,
            avatar: updated_user.data.avatar,
          });

          leagues.push(
            ...user_leagues.data.filter(
              (l: League) =>
                !leagues.some((league) => league.league_id === l.league_id)
            )
          );
        } catch (error) {
          if ((error as any)?.response?.status === 404) {
            console.log(`User ${user_id} not found`);
            await pool.query("DELETE FROM adp__users WHERE user_id = $1", [
              user_id,
            ]);
          } else {
            console.error((error as any).message);
          }
        }
      })
    );
  }

  if (updated_users.length > 0) {
    await pool.query(
      `INSERT INTO adp__users (user_id, username, avatar) 
     VALUES ${updated_users
       .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
       .join(", ")} 
     ON CONFLICT (user_id) 
     DO UPDATE SET 
        username = EXCLUDED.username, 
        avatar = EXCLUDED.avatar,
        updated_at = CURRENT_TIMESTAMP`,
      updated_users.flatMap((user) => [
        user.user_id,
        user.username,
        user.avatar,
      ])
    );
  }

  const league_ids_array = Array.from(
    new Set(leagues.map((league) => league.league_id))
  );

  // Check which league_ids already exist in database
  const existing_leagues = await pool.query(
    `SELECT league_id 
         FROM adp__leagues 
         WHERE league_id = ANY($1)`,
    [league_ids_array]
  );

  const new_leagues = leagues.filter(
    (league) =>
      !existing_leagues.rows.some((l) => l.league_id === league.league_id)
  );

  if (new_leagues.length > 0) {
    console.log(`Inserting ${new_leagues.length} new leagues into database`);

    await pool.query(
      `INSERT INTO adp__leagues (league_id, name, avatar, season, settings, scoring_settings, roster_positions, status) 
     VALUES ${new_leagues
       .map(
         (_, i) =>
           `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${
             i * 8 + 5
           }, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
       )
       .join(", ")} 
     ON CONFLICT (league_id) 
     DO UPDATE SET 
       name = EXCLUDED.name, 
       avatar = EXCLUDED.avatar, 
       season = EXCLUDED.season, 
       settings = EXCLUDED.settings, 
       scoring_settings = EXCLUDED.scoring_settings, 
       roster_positions = EXCLUDED.roster_positions, 
       status = EXCLUDED.status;`,
      new_leagues.flatMap((league) => [
        league.league_id,
        league.name,
        league.avatar,
        league.season,
        JSON.stringify(league.settings),
        JSON.stringify(league.scoring_settings),
        JSON.stringify(league.roster_positions),
        league.status,
      ])
    );
  }

  console.log("User update complete");

  setTimeout(() => {
    userUpdate();
  }, 1000 * 60 * 0.5);
};

userUpdate();
