'use strict';
// MultiStageInput or MSI for short
/*
MSI
  .setup(user)
    return true if user is now set in this instance
      false if already setup
  .isSetup(user)
    return true if user is set in this instance
  .handle(user, context)
    calls the handler
  .start
    
Data
  .allData
    
  .getData
    
  .getStep(step)
    
  .store(data) .setData(data)  
    
  .finish .end
    
*/
class MultiStageInput {
  constructor(handler) {
    if (typeof handler !== "function") throw new Error("MSI requires a handler function");
    this.users = {};
    this.handler = handler;
  }
}

MultiStageInput.prototype.setup = function (user) {
  if (this.isSetup(user)) return false;
  this.users[user] = new Data(this, user);
  return true;
};

MultiStageInput.prototype.isSetup = function (user) {
  return this.users.hasOwnProperty(user);
};

MultiStageInput.prototype.handle = function (user, context) {
  if (!this.isSetup(user)) return; // Not setup yet. Shouldn't get here but oh well
  var data = this.users[user];
  if (data.done) return delete this.users[user]; // Are we done, but still exist?
  if (data.pending) return; // Don't handle if we're pending an answer
  var ret = this.handler.call(data, data.stage, context); // this is data
  if (ret) {
    if (ret === true) data.stage++;
    // Call the next step
    if (!data.done) return data.run(context);
  }
  // Are we finished? Delete the data
  if (data.done) {
    delete this.users[user];
  }
};

MultiStageInput.prototype.start = function (context) {
  if (!context) return;
  var user = `${context.instanceId}_${context.user}_${context.to}`;
  if (!this.setup(user)) return;
  this.handle(user, context); // Initialize the event
};

class Data {
  constructor(owner, user) {
    this.owner = owner;
    this.done = false;
    this.pending = false; // Set to true if pending a response
    this.user = user;
    this.stage = 0;
    this.data = [];
  }
}

Data.prototype.allData = function () {
  return this.data;
};

Data.prototype.getData = function (step) {
  step = step || this.stage;
  if (!this.data.hasOwnProperty(step)) return false;
  return this.data[step];
};

Data.prototype.getLast = function () {
  var step = Math.max(this.stage - 1, 0);
  if (!this.data.hasOwnProperty(step)) return false;
  return this.data[step];
};

Data.prototype.store = Data.prototype.setData = function (data) {
  this.data[this.stage] = data;
};

Data.prototype.run = function (context) {
  this.owner.handle(this.user, {
    irpg: context.irpg,
    text: "",
    reply: context.reply,
    instance: context.instance,
    isPM: context.isPM,
    nick: context.nick,
    to: context.to,
  });
};

Data.prototype.remove = function (step) {
  step = step === 0 ? 0 : step || this.stage;
  if (!this.data.hasOwnProperty(step)) return;
  delete this.data[step];
};

Data.prototype.finish = Data.prototype.end = function () {
  this.done = true;
};

module.exports = MultiStageInput;