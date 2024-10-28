// NanoTimer.js

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

function NanoTimer(log) {
    this.logging = !!log;

    // Path to the Go timer binary
    const timerPath = path.join(__dirname, '../bin/timer'); // Update the path if necessary

    // Start the Go process
    this.goProcess = spawn(timerPath, []);

    // Map timerIds to tasks
    this.tasks = {};

    // Timer ID counter
    this.timerIdCounter = 1;

    // Stores the current interval and timeout IDs
    this.intervalId = null;
    this.timeoutId = null;

    // Read output from the Go process
    this.rl = readline.createInterface({
        input: this.goProcess.stdout
    });

    const thisTimer = this;

    this.rl.on('line', function(line) {
        const fields = line.trim().split(' ');
        const cmd = fields[0];
        const timerId = fields[1];
        const taskInfo = thisTimer.tasks[timerId];
        if (taskInfo) {
            const task = taskInfo.task;
            const args = taskInfo.args;
            const callback = taskInfo.callback;

            if (cmd === 'timeout') {
                const waitTimeNs = parseInt(fields[2], 10);
                const data = { waitTime: waitTimeNs };
                if (args) {
                    task.apply(null, args);
                } else {
                    task();
                }
                if (callback) {
                    callback(data);
                }
                delete thisTimer.tasks[timerId];
                thisTimer.timeoutId = null; // Clear the timeout ID

                // Check if we need to destroy the NanoTimer
                thisTimer.checkAndDestroy();
            } else if (cmd === 'clearedTimeout') {
                const waitTimeNs = parseInt(fields[2], 10);
                const data = { waitTime: waitTimeNs };
                if (callback) {
                    callback(data);
                }
                delete thisTimer.tasks[timerId];
                thisTimer.timeoutId = null; // Clear the timeout ID

                // Check if we need to destroy the NanoTimer
                thisTimer.checkAndDestroy();
            } else if (cmd === 'interval') {
                if (args) {
                    task.apply(null, args);
                } else {
                    task();
                }
                // For intervals, callback is called after each execution
                if (callback) {
                    callback();
                }
            }
        }
    });

    // Handle Go process errors
    this.goProcess.stderr.on('data', (data) => {
        console.error(`Go process error: ${data}`);
    });

    this.goProcess.on('close', (code) => {
        if (this.logging) {
            console.log(`Go process exited with code ${code}`);
        }
    });
}

NanoTimer.prototype.checkAndDestroy = function() {
    if (!this.hasInterval() && !this.hasTimeout()) {
        this.destroy();
    }
};

// Timing function remains unchanged
NanoTimer.prototype.time = function(task, args, format, callback) {
    const t1 = process.hrtime();
    if (callback) {
        if (args) {
            args.push(function() {
                const time = process.hrtime(t1);
                callback(formatTime(time, format));
            });
            task.apply(null, args);
        } else {
            task(function() {
                const time = process.hrtime(t1);
                callback(formatTime(time, format));
            });
        }
    } else {
        if (args) {
            task.apply(null, args);
        } else {
            task();
        }
        const time = process.hrtime(t1);
        return formatTime(time, format);
    }
};

function formatTime(time, format) {
    if (format === 's') {
        return time[0] + time[1] / 1e9;
    } else if (format === 'm') {
        return time[0] * 1e3 + time[1] / 1e6;
    } else if (format === 'u') {
        return time[0] * 1e6 + time[1] / 1e3;
    } else if (format === 'n') {
        return time[0] * 1e9 + time[1];
    } else {
        return time;
    }
}

NanoTimer.prototype.setTimeout = function(task, args, delay, callback) {
    validateTaskAndDelay(task, delay, 'setTimeout');
    if (callback && typeof callback !== 'function') {
        console.log("Callback argument to setTimeout must be a function reference");
        process.exit(1);
    }

    // Clear any existing timeout
    if (this.timeoutId) {
        this.clearTimeout();
    }

    const timerId = (this.timerIdCounter++).toString();
    this.tasks[timerId] = { task: task, args: args, callback: callback, type: 'timeout' };
    this.goProcess.stdin.write(`setTimeout ${timerId} ${delay}\n`);
    this.timeoutId = timerId; // Store the timeout ID
};

NanoTimer.prototype.clearTimeout = function() {
    const timerId = this.timeoutId;
    if (timerId && this.tasks[timerId] && this.tasks[timerId].type === 'timeout') {
        this.goProcess.stdin.write(`clearTimeout ${timerId}\n`);
        // Do not delete the task yet; wait for 'clearedTimeout' message
        this.timeoutId = null; // Clear the timeout ID

        // Check if we need to destroy the NanoTimer
        thisTimer.checkAndDestroy();
    }
};

NanoTimer.prototype.setInterval = function(task, args, interval, callback) {
    validateTaskAndDelay(task, interval, 'setInterval');
    if (callback && typeof callback !== 'function') {
        console.log("Callback argument to setInterval must be a function reference");
        process.exit(1);
    }

    // Clear any existing interval
    if (this.intervalId) {
        this.clearInterval();
    }

    const timerId = (this.timerIdCounter++).toString();
    this.tasks[timerId] = { task: task, args: args, callback: callback, type: 'interval' };
    this.goProcess.stdin.write(`setInterval ${timerId} ${interval}\n`);
    this.intervalId = timerId; // Store the interval ID
};

NanoTimer.prototype.clearInterval = function() {
    const timerId = this.intervalId;
    if (timerId && this.tasks[timerId] && this.tasks[timerId].type === 'interval') {
        this.goProcess.stdin.write(`clearInterval ${timerId}\n`);
        delete this.tasks[timerId];
        this.intervalId = null; // Clear the interval ID

        // Check if we need to destroy the NanoTimer
        this.checkAndDestroy();
    }
};

NanoTimer.prototype.hasTimeout = function() {
    return !!this.timeoutId;
};

NanoTimer.prototype.hasInterval = function() {
    return !!this.intervalId;
};

NanoTimer.prototype.destroy = function() {
    // Clear any existing timers
    this.timeoutId = null;
    this.intervalId = null;

    // Close the Go process's stdin to signal EOF
    if (this.goProcess && !this.goProcess.killed) {
        this.goProcess.stdin.end();

        // Kill the Go process after a brief delay to allow it to exit gracefully
        setTimeout(() => {
            if (!this.goProcess.killed) {
                this.goProcess.kill();
            }
        }, 50);
    }

    // Close the readline interface
    if (this.rl) {
        this.rl.close();
    }
};

function validateTaskAndDelay(task, delay, functionName) {
    if (!task || typeof task !== 'function') {
        console.log(`Task argument to ${functionName} must be a function reference`);
        process.exit(1);
    }
    if (!delay || typeof delay !== 'string') {
        console.log(`Delay argument to ${functionName} must be a string specified as an integer followed by 's', 'm', 'u', or 'n'`);
        process.exit(1);
    }
}

module.exports = NanoTimer;