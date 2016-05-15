'use strict';
// Imports
const MessageHandlerPlugin = require('../../lib/MessageHandlerPlugin');
const DB = require("./sqlite");
const $s = require("./simple-seconds");
const util = require("./utilities");
var _interval;

// Logging methods
var debug = function (message) {_log("debug", message);},
  error = function (message) {_log("error", message);},
  info = function (message) {_log("info", message);},
  silly = function (message) {_log("silly", message);},
  _log = function (level, message) {global.logger[level](`IdleRPG: ${message}`);};

// *** Constant values
var config = { // Perhaps allow options to be mutable with config/commands
  enabled: false,
  base: 600,
  step: 1.16,
  pStep: 1.14,
  penaltyLimit: 0 // Set higher than 0 if you want to put a limit to how much of a penalty someone can get at once
  //, clock: 3 // Buffer time in seconds, 1-60 (may not need/want this)
};

var servers = {
  // ID: instance
};

var totalPlayers = 0;

var chanOpts = {
  "start": "noticeStart", // Displays notice when the game starts
  "level": "noticeLevelUps", // Display level ups
  "top": "noticeTopPlayers", // Display notice of top players
  "battle": "noticeBattles", // Display notice of battles
  "login": "noticeLogin", // Displays notice that player was created
  "join": "noticeWelcome", // Displays notice that player was created
  "del": "noticeDel", // Displays notice that player was deleted
  "admin": "noticeAdmin", // Admin command outputs (delete old accounts, delete player, notice adjust)
};

var channels = {
  // ID_name: options
};

var players = {
  // playerName: IdlePlayer
};

// Pass DB and config
const IdlePlayer = require("./player")(config, DB);

// *** Classes
class IdleRPG extends MessageHandlerPlugin {
	constructor(AKP48, _config) {
		super('IdleRPG', AKP48);
    var self = this;
		self.commands = {};
    if (_config) {
      // Merge values from _config into config
      util.forEach(_config, function (key, val) {
        if (config.hasOwnProperty(key)) { config[key] = val; }
        //else if (key === "oldKey") {config["newKey"] = val}
      });
    }
    // Always save, in case of a change in config style
    self.saveConfig();
    
    self._utime = 1; // Setting this to 1 makes it so that we don't list top players when our first user joins
    self._ltime = 1; // When we are setup we set ltime to current time
    
    DB(function init(type, error) {
      debug("Init: " + type);
      if (self._ltime === 1) self._ltime = $s.time();
      if (error) return;
      if (type === "players") {
        // TODO: load "online" players
        DB.getTotalPlayers(function (data) {
          if (data.error) return error(`Error getting total players: ${data.error}`);
          totalPlayers = data.value;
        });
      } else if (type === "channels") {
        // Load channels when we get a server instance
        DB.loadChannels(function (data) {
          if (data.error) return error(`Error loading channel data: ${data.error}`);
          else debug(`Loading ${data.rows.length} channels`);
          data.rows.forEach(function (row) {
            var options = self.getChannelOptions(row.channel);
            util.forEach(row.options, function(o, val) {
              if (options.hasOwnProperty(o)) options[o] = val ? true : false; // Force boolean
            });
          });
        });
      }
    });
    
    AKP48.on("serverConnect", function(id, instance) {
      if (instance._pluginName !== "IRC") return;
      var IRC = instance._client;
      servers[id] = instance; // Store servers, otherwise we can't send game updates
      // TODO: send a notice instead?
      var send = self._sendMessage;
      
      IRC.on("notice", function(nick, to, text, message) {
        if (!config.enabled) return;
        // If channel, and channel is participating in the game
        if (!util.isChannel(to) || !self.getChannelOptions(`${id}_${to}`).enabled) return;
        var uid = `${id}_${nick}`;
        var player = self.findPlayer(uid);
        // If player
        if (!player) return;
        // Penalize based off of text.length
        var penalty = player.penalize(text.length);
        send(instance, nick, `For the discraceful act of sending a message in ${to}, you have been penalized ${util.duration(penalty)}.`);
      });
      IRC.on("nick", function(oldNick, newNick, chans) {
        if (!config.enabled) return;
        // Nick applies server-wide, so if oldNick is a player we penalize them
        var uid = `${id}_${oldNick}`;
        var player = self.findPlayer(uid);
        if (!player) return;
        var users = player.getUsers();
        users.splice(player.getUsers().indexOf(uid));
        users.push(`${id}_${newNick}`);
        var penalty = player.penalize(30);
        send(instance, newNick, `You have been penalized ${util.duration(penalty)} for nick changing.`);
      });
      IRC.on("part", function(channel, nick) {
        if (!config.enabled) return;
        // If channel is playing the game
        if (!self.getChannelOptions(`${id}_${channel}`).enabled) return;
        var uid = `${id}_${nick}`;
        var player = self.findPlayer(uid);
        if (!player) return;
        // Penalize nick if is player
        var penalty = player.penalize(200);
        send(instance, nick, `You have been penalized ${util.duration(penalty)} for parting ${channel}.`);
      });
      IRC.on("kick", function(channel, nick) {
        if (!config.enabled) return;
        // If channel is playing the game
        if (!self.getChannelOptions(`${id}_${channel}`).enabled) return;
        var uid = `${id}_${nick}`;
        var player = self.findPlayer(uid);
        if (!player) return;
        // Penalize nick if is player
        var penalty = player.penalize(250);
        send(instance, nick, `You have been penalized ${util.duration(penalty)} for getting kicked from ${channel}.`);
      });
      IRC.on("quit", function(nick) {
        if (!config.enabled) return;
        var uid = `${id}_${nick}`;
        var player = self.findPlayer(uid);
        if (!player) return;
        // Penalize nick if is player
        var penalty = player.penalize(20);
        // Send messages to all users still logged in
        self.sendPlayerMessage(`${player.getName()} has been penalized ${util.duration(penalty)}`, player);
        player.logout();
      });
    });
    
    // Update every second
    interval(function () {self.update()}, 1000);
    
    require('./commands').then(function(res){
      self.commands = res;
    }, function(err){
      error(err);
    }); 
  }
}

IdleRPG.prototype.handleMessage = function(message, context, resolve) {
  if (!this.processContext(context)) return;
  if (context.isPM) return this._handleCommand(message, context, resolve); // We don't penalize for PM's... even if we don't do anything
  // Disabled in channel, player doesn't exist
  if (!context.irpgEnabled || !context.player) return;
  // Penalize based off of message length
  var penalty = context.player.penalize(message.length);
  // Send message to player // TODO: send a notice instead?
  context.reply(`For the discraceful act of sending a message in ${context.to}, you have been penalized ${this.duration(penalty)} seconds.`, context.nick);
};

IdleRPG.prototype.handleCommand = function(message, context, resolve) {
  if (this.processContext(context)) this._handleCommand(message, context, resolve);
};

IdleRPG.prototype._handleCommand = function(message, context, resolve) {
  var text = message.split(" ");
  // Check if it's the IDLE command
  if (!["idle-rpg", "idle", "irpg"].includes(text.shift().toLowerCase())) return;
  resolve(); // This is OUR command.
  var command = text.shift() || "help";
  
  context.irpgText = text.join(" ");
  context.irpgCommand = command;
  
  util.forEach(this.commands, function(key, cmd) {
    if (!config.enabled && !cmd.admin) return; // Game isn't enabled, and it's not an admin command?
    if (!context.irpgEnabled && !(cmd.bypass || cmd.admin)) return; // Game isn't enabled in channel, and command doesn't bypass?
    silly(`Checking ${key} command for ${command}.`);
    if (!cmd.names.includes(command.toLowerCase())) return;
    if (cmd.perms && cmd.perms.length) {
      if (!context.permissions || !Array.isArray(context.permissions)) {
        return debug(`Command ${command} requires permissions and none were found.`);
      }
      if (!Array.isArray(cmd.perms)) cmd.perms = [cmd.perms]; // Make it an array
      var block = true;
      for (var i = 0; i < cmd.perms.length; i++) {
        if (context.permissions.includes(cmd.perms[i])) {
          block = false;
          break;
        }
      }
      if (block) {
        return debug(`Command ${command} requires permissions and none were found.`);
      }
    }
    // Passed all checks, run the command
    if (cmd.process) cmd.process(context);
  });
};

IdleRPG.prototype.getConfig = function() {
  return config;
};

IdleRPG.prototype.getChannels = function() {
  return channels;
};

IdleRPG.prototype.getChannelOptions = function(channel) {
  if (!this.channelExists(channel)) {
    channels[channel] = {
      enabled: false, // Do not default to enabled. This must be explicitly set!
    };
    util.forEach(chanOpts, function(key, val) {
      channels[channel][val] = true;
    });
  }
  
  return channels[channel];
};

IdleRPG.prototype.isInChannel = function (user) {
  return Object.keys(channels).some(function (cid) {
    if (!channels[cid].enabled) return false; // Channel's not enabled. Don't check users
    var i = cid.indexOf("_"), server = cid.substring(0, i), channel = cid.substring(i + 1);
    if (!servers.hasOwnProperty(server)) return false; // We don't have this server registered
    server = servers[server];
    if (server._pluginName === "IRC") {
      if (server._client.channels) {
        var data = server._client.chanData(channel);
        if (data && data.users && data.users.hasOwnProperty(user)) {
          return true;
        }
      }
    }
    return false;
  });
};

IdleRPG.prototype.channelExists = function (channel) {
  return channels.hasOwnProperty(channel);
};

IdleRPG.prototype.getTotalPlayers = function() {
  return totalPlayers;
};

IdleRPG.prototype.getOnlinePlayers = function() {
  var $p = {};
  Object.keys(players).filter(key => players[key].isOnline()).forEach(key => $p[key] = players[key]);
  return $p;
};

IdleRPG.prototype.loginPlayer = function(player, server_nick) {
  if (!(player || server_nick)) return;
  if (!this.playerLoaded(player.getName())) {
    players[player.getName().toLowerCase()] = player;
  }
  if (!player.isStored()) totalPlayers++;
  player.login(server_nick);
};

// TODO: DB checks and methods
IdleRPG.prototype.playerLoaded = function(name) {
  return players.hasOwnProperty(name.toLowerCase());
};

IdleRPG.prototype.findPlayer = function(server_nick) {
  var player = false;
  util.forEach(players, function (key, _p) {
    // TODO: check if server_nick is connected
    if (_p && _p.isOnline() && _p.getUsers().includes(server_nick)) player = _p;
  });
  return player;
};

IdleRPG.prototype.unload = function() {
  debug("Unloading");
  var self = this;
  clearTimeout(_interval);
  
  return new Promise(function(resolve, reject) {
    self.save(function (saved) {
      debug("Closing DB");
      // Close the database, then resolve
      DB().close(function (error) {
        debug("Closed");
        if(true) { // For now, always save
          resolve(true);
        } else {
          reject(`Database Error: ${saved}`);
        }
      });
    });
  });
};

IdleRPG.prototype.processContext = function(context) {
  // Check if IRC connection TODO: ALL the connections!
  if (context.instanceType !== "irc") return;
  // Check if IRC channel is participating in game (private messages need special handling)
  if (util.isChannel(context.to)) {
    var gameChannel = `${context.instanceId}_${context.to}`;
    context.irpgEnabled = this.getChannelOptions(gameChannel).enabled;
    context.irpgChannel = gameChannel;
    context.isPM = false;
  } else {
    // PM? let it slide
    context.irpgEnabled = true;
    context.isPM = true;
  }
  
  function getDelimiter() {
    var instance = context.instance;
    var _config;
    if (context.instanceType === "irc" && !context.isPM) {
      _config = instance.getChannelConfig(context.to);
      if (_config.commandDelimiters) return _config.commandDelimiters[0];
    }
    return (instance._config.commandDelimiters || instance._defaultCommandDelimiters)[0];
  }
  
  context.delimiter = getDelimiter();
  // Sends a message to the channel if it's not going to be alerted
  context.alert = function(message, chanMessage) {
    var send = this.isPM;
    if (!send) {
      // We're future proofing here, for more use cases
      if (this.instanceType === "irc") {
        send = !this.instance.getChannelConfig(this.to).alert;
      }
    }
    if (send) this.reply(chanMessage || message);
    this.instance._AKP48.emit("alert", message);
  };
  
  var self = this;
  // Replies to sender if PM, channel if not
  context.reply = function (message, target) {
    target = target || this.isPM ? context.nick : context.to; // If no target is specified, target the default
    self._sendMessage(this.instance, target, message);
  };
  
  // Check if sender is a player
  context.player = this.findPlayer(`${context.instanceId}_${context.nick}`); // Players get stored by ServerID+nick...
  context.irpg = this;
  return true;
};

IdleRPG.prototype.update = function() {
  if (!config.enabled) return;
  var self = this;
  // We haven't joined any channels
  if (self._ltime === 1) return;
  // Do we have any players online?
  var online = Object.keys(players).filter(key => players[key].isOnline()).length;
  if (online === 0) return self._ltime = $s.time(); // Gotta update the time or we'll witness timeskips
  var nTime = $s.time();
  var uTime = nTime - self._ltime;
  // Report the top (3) players every 10 hours
  if (self._utime % $s.inHours(10) === 0) {
    self.getTopPlayers(function (players) {
      var msgs = ["Top Players:"];
      var i = 0;
      players.forEach(function (player) {
        i++;
        var name = player.getName(),
          clazz = player.getClass(),
          level = player.getLevel();
        msgs.push(`#${i}: ${name}, the level ${level} ${clazz}!`);
      });
      if (i === 0) msgs.push("No players found!"); // return;
      self.sendMessages(msgs, "top");
    });
  }
  
  if (self._utime % $s.inMinutes(10) === 0) {
    self.save(function () {
      //this._AKP48.emit("alert", "IdleRPG: Auto saved game");
    });
  }
  
  // Update players
  util.forEach(players, function(key, player) {
    if (player.update(uTime)) {
      // Send the player a message?
      self.sendMessages(`${player.getName()}, the ${player.getClass()}, has reached level ${player.getLevel()}! Next level in ${util.duration(player.getNext())}`, "level"); // Give a notice to channels that don't have announcements blocked
      self.findItem(player); // The player now has a chance to find an item...!
      self.doBattle(player); // The player may now battle an opponent
    }
  });
  self._utime += uTime;
  self._ltime = nTime;
};

// Oh my god sending messages (out of context) is a headache!
IdleRPG.prototype.sendMessages = function (messages, type, filter) {
  var force = type === "force";
  if (type && chanOpts.hasOwnProperty(type)) type = chanOpts[type];
  else type = false;
  if (!Array.isArray(messages)) {
    messages = [messages];
  }
  var chans = Object.keys(channels).filter(key => channels[key].enabled); // Send to all (enabled) channels
  if (!force && type) {
    chans = chans.filter(key => channels[key][type]); // Send to type enabled channels
  }
  if (filter) {
    chans = chans.filter(key => {
      var value = filter.call(null, channels[key]);
      return typeof value === undefined || value ? true : false; // If it's undefined or truthy we keep it
    });
  }
  
  var self = this;
  chans.forEach(function (chan) {
    var server = chan.substring(0, chan.indexOf("_"));
    var channel = chan.substring(chan.indexOf("_") + 1)
    if (!servers.hasOwnProperty(server)) return;
    server = servers[server];
    messages.forEach(function (msg) {
      self._sendMessage(server, channel, msg);
    });
  });
};

IdleRPG.prototype.sendPlayerMessage = function (player, message) {
  var self = this;
  player.getUsers().forEach(function (uid) {
    var server = uid.substring(uid.indexOf("_"));
    var user = uid.substring(uid.indexOf("_") + 1);
    if (!servers.hasOwnProperty(server)) return;
    server = servers[server];
    self._sendMessage(server, user, message);
  });
};

// Send supplied message on specified server, to specified target
IdleRPG.prototype._sendMessage = function(server, target, message) {
  if (!server) return error("Tried to send message without a server");
  if (!target) return error("Tried to send message without a target");
  if (!message) return error("Tried to send message without a message");
  server._client.say(target, "IdleRPG: " + message); // Prefix all messages with IdleRPG so they know what the message is about.
  this._AKP48.sentMessage(target, message, {myNick: server._client.nick, instanceId: server._id});
};

IdleRPG.prototype.findItem = function(player) {
  var type = util.item_types[util.random(util.item_types.length)];
  var level = 1;
  for (var n = 2; n <= Math.floor(player.getLevel() * 1.5); n++) {
    if (util.random(Math.floor(Math.pow(1.4, n))) === 1) {
      level = n;
    }
  }
  
  var current_item = player.getItem(type), better = level > current_item;
  var msg = `You found a level ${level} ${type}, way ${better ? "better" : "worse"} than a level ${current_item} ${type}.`;
  if (better) {
    msg += ` You toss your old ${type} on the ground.`;
    player.setItem(type, level);
  } else {
    msg += " You toss it on the ground.";
  }
  this.sendPlayerMessage(player, msg);
};

IdleRPG.prototype.doBattle = function(player) {
  // 25% chance to battle until you're level 25
  if (player.getLevel() < 25 && util.random(4) !== 0) return debug(`${player.getName()} wasn't lucky enough to battle`);
  // Get online players, that aren't current player
  var opps = Object.keys(players).filter(key => players[key].isOnline() && players[key] !== player);
  if (opps.length === 0) return;
  var opp = players[opps[util.random(opps.length)]];
  var oppSum = opp.getItemCount(true);
  var playerSum = player.getItemCount(true);
  var playerRoll = playerSum === 0 ? 0 : util.random(playerSum) + 1, oppRoll = oppSum === 0 ? 0 : util.random(oppSum) + 1, won = playerRoll >= oppRoll;
  var gain = Math.floor(Math.max(Math.floor(opp.getLevel() / (won ? 4 : 7)), 7) / 100 * player.getNext());
  debug(`${player.getName()} ${won} oppLevel:${opp.getLevel()} perc_raw:${Math.floor(opp.getLevel() / (won ? 4 : 7))} perc:${Math.max(Math.floor(opp.getLevel() / (won ? 4 : 7)), 7)} gain: ${gain}.`);
  var message = `${player.getName()} ${playerRoll}(${playerSum}) challenged ${opp.getName()} ${oppRoll}(${oppSum}) and ${won ? "won" : "lost"}! ${this.duration(gain)} is ${won ? "removed from" : "added to"} ${player.getName()}'s clock.`;
  if (!won) { // You freaking lost
    gain = -gain;
  }
  player.adjust(gain);
  message += ` Next level in ${this.duration(player.getNext())}`;
  this.sendMessages(message, "battle");
};

IdleRPG.prototype.save = function(callback) {
  debug("Saving config");
  this.saveConfig();
  debug(`Saving ${Object.keys(channels).length} channels`);
  return Promise.all([DB.saveChannels(channels), this.savePlayers()]).then(callback);
};

IdleRPG.prototype.savePlayers = function(callback) {
  var $players = util.values(players);
  debug(`Saving ${$players.length} players`);
  var promises = [];
  $players.forEach(player => promises.push(new Promise(function (resolve, reject) {
    DB.savePlayer(player, function(data) {
      if (data.error) error(`Couldn't save ${player.getName()}`);
      // Player is offline and we saved? delete from memory
      if (!player.isOnline() && !data.error) delete players[player.getName()];
      resolve(data);
    });
  })));
  return Promise.all(promises).then(callback);
};

IdleRPG.prototype.saveConfig = function() {
  this._AKP48.saveConfig(config, "idle-rpg");
};

IdleRPG.prototype.getPlayer = function(name, callback) {
  if (typeof callback !== "function") return;
  if (this.playerLoaded(name)) return callback(players[name.toLowerCase()]);
  DB.getPlayer(name, function (data) {
    if (data.error) {
      error(data.error);
      return callback(false);
    }
    callback(IdlePlayer.createPlayer(data.data));
  });
};

IdleRPG.prototype.getNewPlayer = function(name, password, $class) {
  return IdlePlayer.newPlayer(name, password, $class);
};

IdleRPG.prototype.getTopPlayers = function(count, callback) {
  if (typeof count === "function") {
    callback = count;
    count = null;
  }
  if (typeof callback !== "function") return;
  // Save current player data
  this.savePlayers(function (saved) {
    // After saving get the top players
    DB.getTopPlayers(count, function (data) {
      if (data.error) return error(data.error);
      // If there's no error, let's callback to home with the top players :D
      callback(makePlayersFromData(data.rows));
    });
  });
};

function makePlayersFromData(data) {
  var arr = [];
  // Create users, what happens with these users is up to the caller
  data.forEach(function (raw) {
    var player = IdlePlayer.createPlayer(raw);
    // Future proof my sillyness
    if (player) arr.push(player);
  });
  return arr;
}

// Calls func after X time, X amount of times (or until an error)
function interval(func, wait, times, _this) {
  var inner = function (t) {
    return function () {
      if (typeof t !== "undefined" && t-- > 0) {
        return;
      }
      _interval = setTimeout(inner, wait);
      try {
        func.call(_this);
      } catch (e) {
        t = 0; // Don't call again
        throw e; // Throw orriginal error
      }
    };
  }(times);
  setTimeout(inner, wait);
}

module.exports = IdleRPG;
