// testExampleTimer.js

const { ExampleTimer } = require('./ExampleTimer');

// Arrays to store drift data
const nanoTimerDrifts = [];
const regularTimerDrifts = [];

// Start time for regular timer
const regularStartTime = Date.now();
let regularCounter = 1;

// Instantiate the ExampleTimer
const myTimer = new ExampleTimer();

// Start the NanoTimer
myTimer.start((drift, step) => {
  // Record the drift
  nanoTimerDrifts.push(drift);

  console.log(`NanoTimer - STEP: ${step}, Drift: ${drift.toFixed(3)} ms`);
});

// Start the regular timer
const regularInterval = setInterval(() => {
  const expectedTime = regularStartTime + regularCounter * 1000;
  const actualTime = Date.now();
  const drift = actualTime - expectedTime;

  // Record the drift
  regularTimerDrifts.push(drift);

  console.log(`RegularTimer - STEP: ${regularCounter}, Drift: ${drift.toFixed(3)} ms`);

  regularCounter++;
}, 1000);

// Run the test for a few minutes
setTimeout(() => {
  // Stop the NanoTimer
  myTimer.stop();

  // Stop the regular timer
  clearInterval(regularInterval);

  // Summarize the results
  summarizeResults(nanoTimerDrifts, regularTimerDrifts);
}, 5 * 60000); // 5 mins

function summarizeResults(nanoDrifts, regularDrifts) {
  console.log('\n=== Summary of Results ===');

  function calculateStats(drifts) {
    const count = drifts.length;
    const sum = drifts.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const min = Math.min(...drifts);
    const max = Math.max(...drifts);
    const variance = drifts.reduce((a, b) => a + Math.pow(b - average, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    return { count, sum, average, min, max, stdDev };
  }

  const nanoStats = calculateStats(nanoDrifts);
  const regularStats = calculateStats(regularDrifts);

  console.log('\nNanoTimer Stats:');
  console.log(`Count: ${nanoStats.count}`);
  console.log(`Average Drift: ${nanoStats.average.toFixed(3)} ms`);
  console.log(`Min Drift: ${nanoStats.min.toFixed(3)} ms`);
  console.log(`Max Drift: ${nanoStats.max.toFixed(3)} ms`);
  console.log(`Standard Deviation: ${nanoStats.stdDev.toFixed(3)} ms`);

  console.log('\nRegular Timer Stats:');
  console.log(`Count: ${regularStats.count}`);
  console.log(`Average Drift: ${regularStats.average.toFixed(3)} ms`);
  console.log(`Min Drift: ${regularStats.min.toFixed(3)} ms`);
  console.log(`Max Drift: ${regularStats.max.toFixed(3)} ms`);
  console.log(`Standard Deviation: ${regularStats.stdDev.toFixed(3)} ms`);

  console.log('\nDifference in Average Drift (NanoTimer - Regular Timer):');
  console.log(`${(nanoStats.average - regularStats.average).toFixed(3)} ms`);
}