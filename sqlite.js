'use strict';
const sqlite = require("sqlite3").verbose();
const SELECT_PLAYER = "SELECT name, pass, class as clazz, online, level, next, idled, penalties, lastLogin, items FROM players";

var db;
module.exports = function (callback) {
  if (!db) {
    db = new sqlite.Database(require('path').resolve(__dirname, '.database'), function (error) {
      setupDatabase(error, callback);
    });
  }
  return db;
};
// TODO: Call this when the bot starts
module.exports.getOnlinePlayers = function (callback) {
  if (typeof callback !== "function") return; // This isn't valid, don't process
  
  db.all(`${SELECT_PLAYER} WHERE online = 1`, function (error, rows) {
    // Wrap into a single object
    callback({rows: rows, error: error});
  });
};

module.exports.getTotalPlayers = function (callback) {
  if (typeof callback !== "function") return 0;
  db.get("SELECT COUNT(*) as value FROM players", function (error, row) {
    callback({value: row ? row.value : 0, error: error});
  });
};

module.exports.getTopPlayers = function (limit, callback) {
  if (typeof limit === "function") {
    callback = limit;
    limit = 3;
  } else if (!limit || limit < 1) {
    limit = 3;
  }
  if (typeof callback !== "function") return; // This isn't valid, don't process
  
  // Highest 'level' first, followed by lowest 'next' (means they have more "exp")
  db.all(`${SELECT_PLAYER} ORDER BY level DESC, next ASC LIMIT ${limit}`, function (error, rows) {
    // Wrap into an object
    callback({rows: rows, error: error});
  });
};

module.exports.getPlayer = function (name, callback) {
  if (typeof callback !== "function") return; // This isn't valid, don't process
  
  db.get(`${SELECT_PLAYER} WHERE name = ?`, name, function (error, row) {
    if (row) row.fromDB = true;
    callback({data: row, error: error});
  });
};

// Pass player to provide more information without needing to change the signature
module.exports.deletePlayer = function (player, callback) {
  // Callback isn't required here
  db.run("DELETE FROM players WHERE name = ?", player.name, function (error) {
    if (typeof callback !== "function") return; // This isn't valid, don't process
    callback({error: error, deletions: this.changes});
  });
};

module.exports.savePlayer = function (player, callback) {
  // Callback isn't required here
  if (player.isStored()) db.run("UPDATE players SET pass = $pass, class = $class, online = $online, level = $level, next = $next, idled = $idled, penalties = $penalties, lastLogin = $lastLogin, itemSum = $itemSum, items = $items WHERE name = $name", function(error) {
    if (typeof callback !== "function") return; // This isn't valid, don't process
    callback({error: error, saved: error ? false : this.changes});
  });
  else db.run("INSERT INTO players VALUES ($name, $pass, $class, $online, $level, $next, $idled, $penalties, $lastLogin, $itemSum, $items)", player.save(), function (error) {
    if (typeof callback !== "function") return; // This isn't valid, don't process
    callback({error: error, saved: error ? false : this.lastID});
  });
};

module.exports.updatePlayer = function (player, what, callback) {
  // Callback isn't required here
  // TODO
};

module.exports.loadChannels = function (callback) {
  if (typeof callback !== "function") return; // This isn't valid, don't process
  db.all("SELECT channel, options FROM channels", function (error, rows) {
    if (rows) rows.forEach(function (row) {
      row.options = JSON.parse(row.options);
    });
    callback({rows: rows, error: error});
  });
};

module.exports.saveChannels = function (channels) {
  var statement = db.prepare("INSERT OR REPLACE INTO channels VALUES ($channel, $options)");
  
  Object.keys(channels).forEach(function (key) {
    var options = JSON.stringify(channels[key]);
    if (!options) return;
    statement.run({
      $channel: key,
      $options: options
    }, function (error) {
      if (error) global.logger.error(`IdleRPG: Error saving ${key}: ${error}`);
    });
  });
};

// *** Setup goes down here
var player_columns = [
  "name TEXT UNIQUE COLLATE NOCASE",
  "pass TEXT",
  "class TEXT",
  "online INT",
  "level INT",
  "next INT",
  "idled INT",
  "penalties INT",
  "lastLogin INT",
  "itemSum INT",
  "items TEXT", // Store all items in a giant blob
];
function setupDatabase(error, callback) {
  if (error) return global.logger.error(error);
  global.logger.debug("Setting up IdleRPG database");
  var player_def = player_columns.join(", ");
  // Sadly CREATE TABLE doesn't return any way to varify if it created or not
  db.run(`CREATE TABLE IF NOT EXISTS players (${player_def})`, function (error) {
    if (error) global.logger.error(error);
    if (typeof callback === "function") callback("players", error);
    db.run("CREATE TABLE IF NOT EXISTS channels (channel TEXT UNIQUE, options TEXT)", function (error) {
      if (error) global.logger.error(error);
      if (typeof callback === "function") callback("channels", error);
    });
  });
}
