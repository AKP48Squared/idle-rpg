// Show game status with channel context
function Command() {
  this.names = ["status"];
  this.perms = [];
}

Command.prototype.process = function(context) {
};

module.exports = Command;