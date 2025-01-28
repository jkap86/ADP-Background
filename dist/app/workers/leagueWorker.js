import { pool } from "../lib/pool.js";
import axiosInstance from "../lib/axiosInstance.js";
const leagueUpdate = async () => {
    console.log("Begin League update");
    const leagues_to_update = await pool.query(`SELECT DISTINCT l.league_id, l.updated_at 
    FROM adp__leagues l 
    WHERE l.status != 'in_season'
    OR NOT EXISTS (
      SELECT 1
      FROM adp__drafts d
      WHERE d.league_id = l.league_id
      AND d.status = 'complete'
      AND d.updated_at > d.last_picked
    )
    ORDER BY l.updated_at ASC NULLS FIRST 
    LIMIT 250`);
    const updated_leagues = [];
    const users = [];
    const drafts = [];
    const batch_size = 10;
    for (let i = 0; i < leagues_to_update.rows.length; i += batch_size) {
        const batch = leagues_to_update.rows.slice(i, i + batch_size);
        const league_ids = batch.map((league) => league.league_id);
        await Promise.all(league_ids.map(async (league_id) => {
            try {
                const [updated_league, league_users, league_drafts] = await Promise.all([
                    axiosInstance.get(`https://api.sleeper.app/v1/league/${league_id}`),
                    axiosInstance.get(`https://api.sleeper.app/v1/league/${league_id}/users`),
                    axiosInstance.get(`https://api.sleeper.app/v1/league/${league_id}/drafts`),
                ]);
                league_drafts.data
                    .filter((draft) => draft.status === "complete" &&
                    draft.start_time &&
                    draft.last_picked &&
                    draft.last_picked > draft.start_time)
                    .forEach(async (draft) => {
                    try {
                        const draft_picks = await axiosInstance.get(`https://api.sleeper.app/v1/draft/${draft.draft_id}/picks`);
                        if (draft_picks.data.length ===
                            draft.settings.teams * draft.settings.rounds) {
                            if (draft.type === "auction") {
                                drafts.push({
                                    ...draft,
                                    picks: Object.fromEntries(draft_picks.data.map((pick) => [
                                        pick.player_id,
                                        Math.round((parseInt(pick.metadata.amount) /
                                            draft.settings.budget) *
                                            1000) / 10,
                                    ])),
                                });
                            }
                            else {
                                drafts.push({
                                    ...draft,
                                    picks: Object.fromEntries(draft_picks.data.map((pick) => [
                                        pick.player_id,
                                        pick.pick_no,
                                    ])),
                                });
                            }
                        }
                    }
                    catch (error) {
                        console.error(`Error processing draft ${draft.draft_id}:`, error.message);
                    }
                });
                updated_leagues.push(updated_league.data);
                users.push(...league_users.data
                    .filter((user) => !users.some((u) => u.user_id === user.user_id))
                    .map((user) => ({
                    user_id: user.user_id,
                    username: user.display_name,
                    avatar: user.avatar,
                })));
            }
            catch (error) {
                if (error?.response?.status === 404) {
                    console.log(`League ${league_id} not found`);
                    await pool.query("DELETE FROM adp__leagues WHERE league_id = $1", [
                        league_id,
                    ]);
                }
                else {
                    console.error(error.message);
                }
            }
        }));
    }
    if (updated_leagues.length > 0) {
        await pool.query(`INSERT INTO adp__leagues (league_id, name, avatar, season, settings, scoring_settings, roster_positions, status) VALUES ${updated_leagues
            .map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`)
            .join(", ")} ON CONFLICT (league_id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, season = EXCLUDED.season, settings = EXCLUDED.settings, scoring_settings = EXCLUDED.scoring_settings, roster_positions = EXCLUDED.roster_positions, status = EXCLUDED.status, updated_at = NOW()`, updated_leagues.flatMap((league) => [
            league.league_id,
            league.name,
            league.avatar,
            league.season,
            JSON.stringify(league.settings),
            JSON.stringify(league.scoring_settings),
            JSON.stringify(league.roster_positions),
            league.status,
        ]));
    }
    const user_ids_array = Array.from(new Set(users.map((user) => user.user_id)));
    const existing_users = await pool.query(`SELECT user_id FROM adp__users WHERE user_id = ANY($1)`, [user_ids_array]);
    const new_users = users.filter((user) => !existing_users.rows.some((u) => u.user_id === user.user_id));
    if (new_users.length > 0) {
        console.log(`Inserting ${new_users.length} new users into database`);
        await pool.query(`INSERT INTO adp__users (user_id, username, avatar) VALUES ${new_users
            .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
            .join(", ")}`, new_users.flatMap((user) => [user.user_id, user.username, user.avatar]));
    }
    if (drafts.length > 0) {
        console.log(`Upserting ${drafts.length} drafts into database`);
        await pool.query(`INSERT INTO adp__drafts (draft_id, status, type, settings, start_time, last_picked, league_id, picks, updated_at) VALUES ${drafts
            .map((_, i) => `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`)
            .join(", ")} ON CONFLICT (draft_id) DO UPDATE SET status = EXCLUDED.status, type = EXCLUDED.type, settings = EXCLUDED.settings, start_time = EXCLUDED.start_time, last_picked = EXCLUDED.last_picked, league_id = EXCLUDED.league_id, picks = EXCLUDED.picks, updated_at = NOW()`, drafts.flatMap((draft) => [
            draft.draft_id,
            draft.status,
            draft.type,
            JSON.stringify(draft.settings),
            draft.start_time ? new Date(draft.start_time) : null,
            draft.last_picked ? new Date(draft.last_picked) : null,
            draft.league_id,
            JSON.stringify(draft.picks),
            new Date(),
        ]));
    }
    console.log("League update complete");
    setTimeout(leagueUpdate, 1000 * 60 * 0.5);
};
setTimeout(leagueUpdate, 1000 * 15);
