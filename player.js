const util = require("./utilities");

module.exports = function (config, db) {
  function IdlePlayer() { 
    var name, pass, clazz; // player name, password, class
    var online = false; // Is the user online?
    var level = 1, next = config.base, idled; // Current level, time until next level, total time idled
    var penalties = 0;
    var lastLogin; // last login time
    var items = {}; // Current equipment
    util.item_types.forEach(type => items[type] = 0);
    var users = []; // Keep a record of identified users
    var stored = false;
    
    // *** Method declarations
    this.update = function update(time) {
      // Is owner online and idling?
      if (!online) return false;
      idled += time;
      return this.adjust(time);
    }
    
    this.isOnline = function isOnline() {
      return online;
    }
    
    this.getName = function getName() {
      return name;
    }
    
    this.getNext = function getNext() {
      return next;
    }
    
    this.getClass = function getClass() {
      return clazz;
    }
    
    this.getLevel = function getLevel() {
      return level;
    }
    
    this.getItem = function getItem(type) {
      return items[type];
    }
    
    this.setItem = function setItem(type, level) {
      if (items.hasOwnProperty(type)) items[type] = level;
    }
    
    this.getItemCount = function getItemCount() {
      var count = 0;
      Object.keys(items).forEach(key => count += items[key]);
      return count;
    }
    
    this.isPassword = function isPassword(password) {
      // TODO: crypt password
      return password === pass;
    }
    
    this.setPassword = function (password) {
      // TODO: crypt password
      pass = password;
    };
    
    // Mark as online
    this.login = function login(server_nick, time) {
      // Already online?
      if (online && users.includes(server_nick)) {
        return false;
      }
      online = true;
      lastLogin = time;
      users.push(server_nick);
      return true;
    }
    
    this.logout = function logout(server_nick) {
      if (!server_nick || !users.includes(server_nick)) return online;
      users.splice(users.indexOf(uid));
      return online = users.length > 0;
    }
    
    this.getUsers = function () {
      return users;
    };
    
    // Penalize a user for X base * variable amount
    this.penalize = function penalize(time) {
      time = Math.floor(time * Math.pow(config.pStep, level));
      var limit = config.penaltyLimit;
      if (limit) time = Math.min(time, limit);
      next += time;
      penalties += time;
      return time;
    }
    
    // +time = lower time, -time = increase time
    // Return true if leveled
    this.adjust = function adjust(time) {
      next -= time;
      if (next <= 0) {
        next += Math.floor(config.base * Math.pow(config.step, level++));
        return true;
      }
      return false;
    }
    
    this._load = function _load(data) {
      // Don't load if there's no data, or a name is already set
      if (!data || name) return this;
      if (data.name) name = data.name;
      if (data.pass) pass = data.pass;
      if (data.clazz) clazz = data.clazz;
      if (data.online) online = data.online;
      if (data.level) level = data.level;
      if (data.next) next = data.next;
      if (data.idled) idled = data.idled;
      if (data.penalties) penalties = data.penalties;
      if (data.lastLogin) lastLogin = data.lastLogin;
      if (data.items) {
        // Loop through item keys, only set what exists
        var $items = JSON.parse(data.items);
        Object.keys($items).forEach(function (item) {
          this.setItem(item, $items[item]);
        }, this);
      }
      if (data.fromDB) stored = true;
      return this;
    }
    
    this.isStored = function() {
      return stored;
    };
    
    this.save = function save() {
      return {
        $name: name,
        $pass: pass,
        $class: clazz,
        $online: online,
        $level: level,
        $next: next,
        $idled: idled,
        $penalties: penalties,
        $lastLogin: lastLogin,
        $itemSum: this.getItemCount(),
        $items: JSON.stringify(items)
      };
    }
  }
  
  IdlePlayer.prototype.toString = function() {
    var types = {
      helm: "Helmet",
      shirt: "Shirt",
      pants: "Pants",
      shoes: "Shoes",
      gloves: "Gloves",
      weapon: "Weapon",
      shield: "Shield",
      ring: "Ring",
      amulet: "Amulet",
      charm: "Charm",
    };
    var items = [];
    for (var key of Object.keys(types)) {
      items.push(`${types[key]}(${this.getItem(key)})`);
    }
    return `${this.getName()}(${this.getLevel()}) the ${this.getClass()}, will level in ${util.duration(player.getNext())}. Items(${player.getItemCount()}): ${items.join(", ")}`;
  };
  
  IdlePlayer.createPlayer = function (data) {
    if (!data) return null;
    return new IdlePlayer()._load(data);
  };
  
  IdlePlayer.newPlayer = function (name, password, $class) {
    // TODO: Crypt password
    return new IdlePlayer()._load({name: name, pass: password, clazz: $class});
  };
  
  return IdlePlayer;
};
