// timer.go

package main

import (
    "bufio"
    "flag"
    "fmt"
    "os"
    "runtime"
    "strconv"
    "strings"
    "sync"
    "time"
)

// Interval struct holds the ticker and quit channel for intervals
type Interval struct {
    ticker *time.Ticker
    quit   chan struct{}
}

// Mutex and maps to manage timers and intervals concurrently
var timersMutex sync.Mutex
var timers map[string]*Timer
var intervals map[string]*Interval

// Timer struct holds the time.Timer and start time
type Timer struct {
    timer     *time.Timer
    startTime time.Time
}

var debug bool

func main() {
    // Parse command-line flags
    helpFlag := flag.Bool("h", false, "Display help")
    helpFlagLong := flag.Bool("help", false, "Display help")
    flag.BoolVar(&debug, "d", false, "Enable debug output")
    flag.BoolVar(&debug, "debug", false, "Enable debug output")
    flag.Parse()

    if *helpFlag || *helpFlagLong {
        displayHelp()
        return
    }

    if debug {
        fmt.Fprintln(os.Stderr, "Debugging enabled")
        fmt.Fprintf(os.Stderr, "Arguments: %v\n", os.Args)
    }

    // Initialize the maps
    timers = make(map[string]*Timer)
    intervals = make(map[string]*Interval)

    // Create a buffered writer for stdout
    writer := bufio.NewWriter(os.Stdout)

    // Create a scanner to read commands from stdin
    scanner := bufio.NewScanner(os.Stdin)

    if debug {
        fmt.Fprintln(os.Stderr, "Waiting for commands...")
    }

    for scanner.Scan() {
        line := scanner.Text()
        if debug {
            fmt.Fprintf(os.Stderr, "Received line: %s\n", line)
        }
        fields := strings.Fields(line)

        // Skip if the command is invalid
        if len(fields) < 2 {
            if debug {
                fmt.Fprintln(os.Stderr, "Invalid command format")
            }
            continue
        }
        cmd := fields[0]
        timerID := fields[1]

        switch cmd {
        case "setTimeout":
            // Set a new timeout
            if len(fields) < 3 {
                if debug {
                    fmt.Fprintln(os.Stderr, "setTimeout requires 3 arguments")
                }
                continue
            }
            duration, err := parseDuration(fields[2])
            if err != nil {
                if debug {
                    fmt.Fprintf(os.Stderr, "Error parsing duration: %v\n", err)
                }
                continue
            }
            setTimeout(timerID, duration, writer)
        case "clearTimeout":
            // Clear an existing timeout
            clearTimeout(timerID, writer)
        case "setInterval":
            // Set a new interval
            if len(fields) < 3 {
                if debug {
                    fmt.Fprintln(os.Stderr, "setInterval requires 3 arguments")
                }
                continue
            }
            duration, err := parseDuration(fields[2])
            if err != nil {
                if debug {
                    fmt.Fprintf(os.Stderr, "Error parsing duration: %v\n", err)
                }
                continue
            }
            setInterval(timerID, duration, writer)
        case "clearInterval":
            // Clear an existing interval
            clearInterval(timerID, writer)
        default:
            // Unknown command
            if debug {
                fmt.Fprintf(os.Stderr, "Unknown command: %s\n", cmd)
            }
            continue
        }
    }

    if err := scanner.Err(); err != nil {
        if debug {
            fmt.Fprintf(os.Stderr, "Error reading stdin: %v\n", err)
        }
    }
}

// displayHelp prints the usage instructions
func displayHelp() {
    fmt.Println("High-Precision Timer - Go Binary")
    fmt.Println()
    fmt.Println("This program is designed to be used as a subprocess for high-precision timing tasks.")
    fmt.Println("It reads commands from standard input (stdin) and writes events to standard output (stdout).")
    fmt.Println()
    fmt.Println("Usage:")
    fmt.Println("  timer [options]")
    fmt.Println()
    fmt.Println("Options:")
    fmt.Println("  -h, --help       Display this help message")
    fmt.Println("  -d, --debug      Enable debug output")
    fmt.Println()
    fmt.Println("Commands (to be sent via stdin):")
    fmt.Println("  setTimeout <id> <duration>    Set a timeout with a unique ID and duration")
    fmt.Println("  clearTimeout <id>             Clear a timeout with the given ID")
    fmt.Println("  setInterval <id> <duration>   Set an interval with a unique ID and duration")
    fmt.Println("  clearInterval <id>            Clear an interval with the given ID")
    fmt.Println()
    fmt.Println("Duration format:")
    fmt.Println("  An integer followed by a unit:")
    fmt.Println("    s - seconds (e.g., 2s)")
    fmt.Println("    m - milliseconds (e.g., 500m)")
    fmt.Println("    u - microseconds (e.g., 1000u)")
    fmt.Println("    n - nanoseconds (e.g., 500000n)")
    fmt.Println()
    fmt.Println("Example Commands:")
    fmt.Println("  setTimeout 1 500m")
    fmt.Println("  setInterval 2 1s")
    fmt.Println("  clearTimeout 1")
    fmt.Println("  clearInterval 2")
}

// setTimeout sets a new timeout with the given ID and duration
func setTimeout(timerID string, duration time.Duration, writer *bufio.Writer) {
    timersMutex.Lock()
    defer timersMutex.Unlock()

    // Check if the timer ID already exists
    if _, exists := timers[timerID]; exists {
        if debug {
            fmt.Fprintf(os.Stderr, "Timer with ID %s already exists\n", timerID)
        }
        return
    }

    if debug {
        fmt.Fprintf(os.Stderr, "Setting timeout with ID %s for duration %v\n", timerID, duration)
    }

    startTime := time.Now()
    timer := time.AfterFunc(duration, func() {
        waitTime := time.Since(startTime).Nanoseconds()
        timersMutex.Lock()
        delete(timers, timerID)
        timersMutex.Unlock()
        // Write to stdout
        fmt.Fprintf(writer, "timeout %s %d\n", timerID, waitTime)
        writer.Flush()
    })
    timers[timerID] = &Timer{timer: timer, startTime: startTime}
}

// clearTimeout stops and removes the timeout with the given ID
func clearTimeout(timerID string, writer *bufio.Writer) {
    timersMutex.Lock()
    defer timersMutex.Unlock()

    if timerStruct, exists := timers[timerID]; exists {
        if debug {
            fmt.Fprintf(os.Stderr, "Clearing timeout with ID %s\n", timerID)
        }
        timerStruct.timer.Stop()
        waitTime := time.Since(timerStruct.startTime).Nanoseconds()
        // Write to stdout
        fmt.Fprintf(writer, "clearedTimeout %s %d\n", timerID, waitTime)
        writer.Flush()
        delete(timers, timerID)
    } else if debug {
        fmt.Fprintf(os.Stderr, "No timeout found with ID %s\n", timerID)
    }
}

// setInterval sets a new interval with the given ID and duration
func setInterval(timerID string, duration time.Duration, writer *bufio.Writer) {
    timersMutex.Lock()
    defer timersMutex.Unlock()

    // Check if the interval ID already exists
    if _, exists := intervals[timerID]; exists {
        if debug {
            fmt.Fprintf(os.Stderr, "Interval with ID %s already exists\n", timerID)
        }
        return
    }

    if debug {
        fmt.Fprintf(os.Stderr, "Setting interval with ID %s for duration %v\n", timerID, duration)
    }

    quit := make(chan struct{})
    if duration > 0 {
        // Create a new ticker
        ticker := time.NewTicker(duration)
        intervals[timerID] = &Interval{ticker: ticker, quit: quit}

        // Start a goroutine to send interval events
        go func(id string, ticker *time.Ticker, quit chan struct{}) {
            for {
                select {
                case <-ticker.C:
                    // Write to stdout
                    fmt.Fprintf(writer, "interval %s\n", id)
                    writer.Flush()
                case <-quit:
                    if debug {
                        fmt.Fprintf(os.Stderr, "Interval with ID %s stopped\n", id)
                    }
                    return
                }
            }
        }(timerID, ticker, quit)
    } else {
        // Handle zero-duration interval
        intervals[timerID] = &Interval{ticker: nil, quit: quit}

        // Start a goroutine that sends interval events as fast as possible
        go func(id string, quit chan struct{}) {
            for {
                select {
                case <-quit:
                    if debug {
                        fmt.Fprintf(os.Stderr, "Interval with ID %s stopped\n", id)
                    }
                    return
                default:
                    // Write to stdout
                    fmt.Fprintf(writer, "interval %s\n", id)
                    writer.Flush()
                    runtime.Gosched() // Yield to other goroutines
                }
            }
        }(timerID, quit)
    }
}

// clearInterval stops and removes the interval with the given ID
func clearInterval(timerID string, writer *bufio.Writer) {
    timersMutex.Lock()
    defer timersMutex.Unlock()

    if interval, exists := intervals[timerID]; exists {
        if debug {
            fmt.Fprintf(os.Stderr, "Clearing interval with ID %s\n", timerID)
        }
        if interval.ticker != nil {
            interval.ticker.Stop()
        }
        close(interval.quit)
        delete(intervals, timerID)
    } else if debug {
        fmt.Fprintf(os.Stderr, "No interval found with ID %s\n", timerID)
    }
}

// parseDuration parses a duration string (e.g., "500m") into a time.Duration
func parseDuration(s string) (time.Duration, error) {
    if len(s) < 2 {
        return 0, fmt.Errorf("invalid duration")
    }
    unit := s[len(s)-1]
    valueStr := s[:len(s)-1]
    value, err := strconv.ParseInt(valueStr, 10, 64)
    if err != nil {
        return 0, err
    }
    switch unit {
    case 's':
        return time.Duration(value) * time.Second, nil
    case 'm':
        return time.Duration(value) * time.Millisecond, nil
    case 'u':
        return time.Duration(value) * time.Microsecond, nil
    case 'n':
        return time.Duration(value) * time.Nanosecond, nil
    default:
        return 0, fmt.Errorf("invalid duration unit")
    }
}