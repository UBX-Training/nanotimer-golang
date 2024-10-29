
# NanoTimer-Golang

## Overview

The new **NanoTimer** is a high-precision timer designed for reduced CPU usage and minimized drift, achieved through a backend written in **Go**. The Go binary handles all the timing logic, ensuring efficient performance, while the Node.js wrapper provides an easy-to-use interface compatible with existing Node.js applications.

This architecture delivers enhanced precision and offloads the CPU-intensive interval management to Go, reducing the drift and overhead associated with JavaScript timers.

---

## Key Features

- **Go Backend for Precision**: The core timing logic runs on Go, leveraging its efficient runtime and precise time management.
- **Node.js Wrapper for Simplicity**: The Node.js layer wraps the Go binary, providing familiar API functions like `setTimeout` and `setInterval`. So it can be used as a drop in replacement for the original nanotimer js
- **Lower CPU Usage**: Delegating timing logic to Go reduces the CPU load, especially on long-running intervals.
- **Minimized Drift**: Accurate timekeeping ensures that errors do not accumulate over time.
- **Drop-in Replacement**: Use the NanoTimer just like standard Node.js timers.

---

## Installation

To install the Node.js package, first install golang on your host os then run run:

```bash
npm install nanotimer
```

Make sure the Go binary is compiled and located in the correct directory (`bin/timer`). You can compile the Go code yourself:

```bash
cd lib
go build -o ../bin/timer timer.go
```

## Building via docker.

You can also install/build via docker like so:

```
FROM debian:bullseye as builder

# Build nanotimer binary
RUN cd / && \
    git clone https://github.com/UBX-Training/nanotimer-golang.git && \
    cd nanotimer-golang && \
    mkdir bin ; go build -o bin/timer lib/timer.go
```

Then in your actual docker file you can just copy the build files directly into your node_modules directory - ie:

```
# Copy in previously compiled nanotimer sources to node_modules.
COPY --from=builder /nanotimer-golang /usr/src/app/node_modules/
```

---

## Usage

Below is an example demonstrating how to use `NanoTimer` with its updated architecture:

### Example: Basic Usage

```javascript
const NanoTimer = require('nanotimer-golang');
const timer = new NanoTimer();

// Simple Interval Example
timer.setInterval(() => {
  console.log('Running every 1 second');
}, '', '1s');

// Stop after 5 seconds
setTimeout(() => {
  timer.clearInterval();
  console.log('Interval stopped');
}, 5000);
```

---

## API Reference

### `.setTimeout(task, args, timeout, [callback])`

Schedules a function to run after the specified timeout.

```javascript
timer.setTimeout(() => {
  console.log('Executed after 2 seconds');
}, '', '2s');
```

- **`task`**: Function to execute.
- **`args`**: Array of arguments or `''` if none.
- **`timeout`**: String specifying the timeout (e.g., `'2s'`).
- **`callback`**: Optional callback to run after the timeout.

---

### `.setInterval(task, args, interval, [callback])`

Runs a function repeatedly at the specified interval.

```javascript
timer.setInterval(() => {
  console.log('Repeating every 1 second');
}, '', '1s');
```

- **`interval`**: Time between executions, formatted as a string.

---

### `.clearInterval()`

Clears the currently running interval.

```javascript
timer.clearInterval();
console.log('Interval cleared');
```

---

### Drift Comparison Example

The following example compares the drift between a standard JavaScript `setInterval` and the `NanoTimer`:

```javascript
const { ExampleTimer } = require('./ExampleTimer');
const nanoTimer = new ExampleTimer();
const startTime = Date.now();

let jsCounter = 0;
let nanoCounter = 0;

setInterval(() => {
  const drift = Date.now() - startTime - jsCounter * 1000;
  console.log(`JS Timer Drift: ${drift}ms`);
  jsCounter++;
}, 1000);

nanoTimer.start();

setTimeout(() => {
  nanoTimer.stop();
  console.log('Timers stopped after 30 seconds');
}, 30000);
```

---

## Example drift comparison between regular setInterval vs using the golang nanotimer version:

```
=== Summary of Results ===

NanoTimer Stats:
Count: 299
Average Drift: 25.619 ms
Min Drift: 20.000 ms
Max Drift: 40.000 ms
Standard Deviation: 2.478 ms

Regular Timer Stats:
Count: 299
Average Drift: 155.649 ms
Min Drift: 9.000 ms
Max Drift: 311.000 ms
Standard Deviation: 83.953 ms

Difference in Average Drift (NanoTimer - Regular Timer):
-130.030 ms
```

---

## Performance

This version of NanoTimer shows a significant improvement in CPU efficiency and drift reduction. Thanks to the Go backend, the timer operates with nanosecond precision without accumulating drift over time. 

---

## Tests

Use Mocha to run the test suite:

```bash
mocha -R spec -t 10000
```

---

## License

MIT License
