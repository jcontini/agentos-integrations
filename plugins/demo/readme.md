---
id: demo
name: Demo
description: Demos using free public APIs - no API keys needed!
icon: icon.svg
tags: [demo, examples]

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITIES (no adapters/operations — demo is utility-only)
# ═══════════════════════════════════════════════════════════════════════════════

utilities:
  # Command executor
  echo:
    description: Echo back a message (tests command executor)
    params:
      message: { type: string, required: true, description: "Message to echo" }
    returns:
      output: string
    command:
      binary: echo
      args: ["{{params.message}}"]
      response:
        mapping:
          output: "."

  # REST executor - basic GET
  http_get:
    description: Test HTTP GET via httpbin (tests REST executor)
    returns:
      origin: string
      url: string
    rest:
      method: GET
      url: "https://httpbin.org/get"
      response:
        mapping:
          origin: ".origin"
          url: ".url"

  # REST executor - GET with params
  get_ip:
    description: Get your public IP and location
    returns:
      ip: string
      city: string
      country: string
    rest:
      method: GET
      url: "http://ip-api.com/json/"
      response:
        mapping:
          ip: ".query"
          city: ".city"
          country: ".country"

  # REST executor - nested response extraction
  get_iss_position:
    description: Get current position of the International Space Station
    returns:
      latitude: string
      longitude: string
    rest:
      method: GET
      url: "http://api.open-notify.org/iss-now.json"
      response:
        mapping:
          latitude: ".iss_position.latitude"
          longitude: ".iss_position.longitude"

  # REST executor - POST with body
  http_post:
    description: Test HTTP POST via httpbin (tests POST executor)
    params:
      data: { type: string, required: true, description: "Data to send" }
    returns:
      data: string
      url: string
    rest:
      method: POST
      url: "https://httpbin.org/post"
      body:
        message: "{{params.data}}"
      response:
        mapping:
          data: ".json.message"
          url: ".url"

instructions: |
  Demo plugin using free public APIs - no keys needed!
  
  Demonstrates executor types:
  - Command: echo (shell command)
  - REST GET: http_get, get_ip, get_iss_position
  - REST POST: http_post
---

# Demo

Showcase plugin using free public APIs. No API keys required!

## What This Demonstrates

| Tool | Executor | Pattern |
|------|----------|---------|
| `echo` | Command | Shell command execution |
| `http_get` | REST | Basic GET request |
| `get_ip` | REST | GET with response mapping |
| `get_iss_position` | REST | Nested response extraction |
| `http_post` | REST | POST with request body |

## Examples

```bash
# Command executor
UsePlugin(plugin: "demo", tool: "echo", params: {message: "hello"})

# REST GET
UsePlugin(plugin: "demo", tool: "http_get")
UsePlugin(plugin: "demo", tool: "get_ip")
UsePlugin(plugin: "demo", tool: "get_iss_position")

# REST POST
UsePlugin(plugin: "demo", tool: "http_post", params: {data: "test"})
```

## For Contributors

This plugin demonstrates executor types using free public APIs. Use it as a reference when building new plugins.
