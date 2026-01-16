---
id: demo
name: Demo
description: Fun demos using free public APIs - no API keys needed!
icon: icon.svg
tags: [demo, fun, examples]

actions:
  weather:
    description: Get current weather for a city
    readonly: true
    params:
      city: { type: string, description: "City name", example: "Austin" }
    rest:
      method: GET
      url: "https://wttr.in/{{params.city}}?format=j1"
      response:
        root: "current_condition[0]"
        mapping:
          location: "'{{params.city}}'"
          temp_f: ".temp_F"
          temp_c: ".temp_C"
          condition: ".weatherDesc[0].value"
          humidity: ".humidity"
          wind_mph: ".windspeedMiles"

  ip:
    description: Get your public IP and location info
    readonly: true
    rest:
      method: GET
      url: "http://ip-api.com/json/"
      response:
        mapping:
          ip: ".query"
          city: ".city"
          region: ".regionName"
          country: ".country"
          isp: ".isp"
          lat: ".lat"
          lon: ".lon"

  iss:
    description: Get current position of the International Space Station
    readonly: true
    rest:
      method: GET
      url: "http://api.open-notify.org/iss-now.json"
      response:
        mapping:
          latitude: ".iss_position.latitude"
          longitude: ".iss_position.longitude"
          timestamp: ".timestamp"

  space:
    description: Get info about the next SpaceX launch
    readonly: true
    rest:
      method: GET
      url: "https://api.spacexdata.com/v5/launches/next"
      response:
        mapping:
          name: ".name"
          date_utc: ".date_utc"
          rocket: ".rocket"
          details: ".details"
          webcast: ".links.webcast"

  joke:
    description: Get a random programming joke
    readonly: true
    rest:
      method: GET
      url: "https://official-joke-api.appspot.com/jokes/programming/random"
      response:
        root: "[0]"
        mapping:
          setup: ".setup"
          punchline: ".punchline"

  fact:
    description: Get a random useless fact
    readonly: true
    rest:
      method: GET
      url: "https://uselessfacts.jsph.pl/api/v2/facts/random"
      response:
        mapping:
          fact: ".text"
          source: ".source"

  echo:
    description: Echo back a message (for testing)
    readonly: true
    params:
      message: { type: string, description: "Message to echo" }
    command:
      binary: echo
      args: ["{{params.message}}"]

  http_get:
    description: Test HTTP GET request via httpbin
    readonly: true
    rest:
      method: GET
      url: "https://httpbin.org/get"

instructions: |
  Demo app for testing AgentOS and showcasing what's possible.
  All actions use free public APIs - no API keys needed!
  
  Try these:
  - weather: Get weather for any city
  - ip: See your public IP and location
  - iss: Track the International Space Station
  - space: See the next SpaceX launch
  - joke: Get a programming joke
  - fact: Learn a useless fact
---

# Demo

A fun showcase app using free public APIs. No API keys required!

## Actions

| Action | What it does |
|--------|--------------|
| `weather` | Current weather for any city (wttr.in) |
| `ip` | Your public IP and location (ip-api.com) |
| `iss` | Current ISS position (open-notify.org) |
| `space` | Next SpaceX launch (spacexdata.com) |
| `joke` | Random programming joke |
| `fact` | Random useless fact |
| `echo` | Echo a message (for testing) |
| `http_get` | Test HTTP via httpbin |

## Examples

```
Apps(app: "demo", action: "weather", params: {city: "Austin"})
Apps(app: "demo", action: "iss")
Apps(app: "demo", action: "joke")
```

## For Contributors

This app demonstrates how to build connectors using different executors:
- `rest:` - REST API calls with response mapping
- `command:` - Shell commands

Use this as a template for building your own connectors!
