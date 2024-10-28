// ExampleTimer.js

const NanoTimer = require('../lib/nanotimer');

class ExampleTimer {
  constructor() {
    // Create a new NanoTimer instance
    this.timer = new NanoTimer();
    this.active = false;
    this.counter = 1;
    this.startTime = null;
  }

  start(callback) {
    if (this.active) {
      console.log('Timer is already running.');
      return;
    }

    this.active = true;
    this.startTime = Date.now();

    // Use NanoTimer to set an interval
    this.timer.setInterval(() => {
      const expectedTime = this.startTime + this.counter * 1000;
      const actualTime = Date.now();
      const drift = actualTime - expectedTime;

      if (callback) {
        callback(drift, this.counter);
      }

      // Uncomment if you want to log from here
      // console.log(`NanoTimer - STEP: ${this.counter}, Drift: ${drift} ms`);

      this.counter++;
    }, '', '1s'); // Run every 1 second
  }

  stop() {
    if (!this.active) {
      console.log('Timer is not running.');
      return;
    }

    // Clear the interval
    this.timer.clearInterval();
    this.active = false;
    console.log('Timer stopped.');
  }
}

module.exports = {
  ExampleTimer
};