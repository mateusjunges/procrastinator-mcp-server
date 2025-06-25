# Procrastinator MCP

A Model Context Protocol (MCP) server that provides task management capabilities for the Procrastinator application.

## Overview

This MCP server acts as a bridge between Claude and the Procrastinator task management system, allowing users to interact with their tasks through natural language commands. It provides secure, OAuth-authenticated access to task operations.

## Features

- **List Tasks**: View all your tasks with their details
- **Create Tasks**: Add new tasks with title and optional description
- **Update Tasks**: Modify existing tasks and mark them as completed
- **OAuth Authentication**: Secure access using Bearer tokens
- **Session Management**: Maintains persistent connections for efficient communication

## Available Tools

### `list_tasks`
Retrieves all tasks for the authenticated user.

### `create_task`
Creates a new task.
- **Parameters:**
  - `title` (string, required): Task title
  - `description` (string, optional): Task description

### `update_task`
Updates an existing task.
- **Parameters:**
  - `id` (number, required): Task ID
  - `title` (string, required): Updated task title
  - `description` (string, required): Updated task description
  - `completed_at` (string, optional): Completion timestamp (YYYY-MM-DD HH:ii:ss format)

## Authentication

The server uses OAuth 2.0 Bearer token authentication. All requests must include a valid Bearer token in the Authorization header.

### OAuth Metadata

The server exposes OAuth metadata at `/.well-known/oauth-protected-resource` with the following scopes:
- `claudeai`
- `tasks:create`
- `tasks:update`
- `tasks:delete`
- `tasks:view`

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   node build/index.js
   ```

The server will start on port 3000.

## Configuration

The server connects to the Procrastinator API at `https://procrastinator.test`. Make sure your environment has access to this endpoint.
