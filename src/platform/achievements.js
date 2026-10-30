/* Achievements adapter: where earned badges go. The badge rules live in src/achievements.js; this only
   records and reports. Interface: load(map), unlock(id) -> true if newly earned, has(id), earned() -> map.

   web (today): the local trophy shelf. The map of { id: earnedAt } is persisted inside the save, so an
   exported save carries its trophies.
   TODO(steam): wrap the local provider and also call steamworks.js
   (client.achievement.activate(id)) on unlock; badge ids map one to one onto Steam achievement ids. */
export function createLocalAchievements() {
  let earned = {};
  return {
    kind: 'local',
    load(map) { earned = { ...(map || {}) }; },
    unlock(id, at = Date.now()) { if (earned[id]) return false; earned[id] = at; return true; },
    has(id) { return !!earned[id]; },
    earned() { return { ...earned }; },
    count() { return Object.keys(earned).length; },
  };
}
