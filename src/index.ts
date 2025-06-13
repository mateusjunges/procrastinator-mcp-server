import express from "express";
import cors from 'cors';
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import authenticationMiddleware from "./authenticationMiddleware";
import { z } from "zod";

const app = express();
app.use(express.json());
app.use(cors());

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post('/mcp', authenticationMiddleware, async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
                transports[sessionId] = transport;
            }
        });

        transport.onclose = () => {
            if (transport.sessionId) {
                delete transports[transport.sessionId];
            }
        };
        const server = new McpServer({
            name: "procrastinator-mcp-server",
            version: "1.0.0"
        });

        // Here's where we'll register our tools
        server.tool(
            'list_tasks',
            {},
            async (message, extra) => {
                const userToken = extra?.authInfo?.token;

                try {
                    const response = await fetch('https://procrastinator.test/api/tasks', {
                        headers: {
                            Authorization: `Bearer ${userToken}`,
                            'Content-Type': 'application/json',
                            'User-Agent': 'procrastinator-mcp/1.0.0',
                            'Accept': 'application/json',
                        }
                    })

                    if (! response.ok) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Failed to list tasks: ${response.status} ${response.statusText}`
                                }
                            ]
                        }
                    }

                    const tasks = await response.json();

                    if (tasks.length === 0) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "No tasks found."
                                }
                            ]
                        };
                    }

                    const formattedTasks = tasks.data.map((task: any) => [
                            `ID: ${task.id}`,
                            `Title: ${task.title}`,
                            `Description: ${task.description || 'No description'}`,
                            `Completed At: ${task.completed_at ? new Date(task.completed_at).toLocaleString() : 'Not completed'}`,
                        ].join('\n')
                    ).join('\n');

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Tasks:\n\n${formattedTasks}`
                            }
                        ]
                    };
                } catch (error) {
                    console.error('Error fetching tasks:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Failed to fetch tasks due to an error."
                            }
                        ]
                    };
                }
            }
        )

        server.tool(
            'create_task',
            {
                title: z.string(),
                description: z.string().optional(),
            },
            async (message, extra) => {
                const userToken = extra?.authInfo?.token;

                try {
                    const response = await fetch('https://procrastinator.test/api/tasks', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${userToken}`,
                            'Content-Type': 'application/json',
                            'User-Agent': 'procrastinator-mcp/1.0.0',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            title: message.title,
                            description: message.description,
                        })
                    });

                    if (! response.ok) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Failed to create task: ${response.status} ${response.statusText}`
                                }
                            ]
                        };
                    }

                    const task = await response.json();

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Task created successfully:\n\nID: ${task.data.id}\nTitle: ${task.data.title}\nDescription: ${task.data.description || 'No description'}\nCompleted At: ${task.data.completed_at ? new Date(task.data.completed_at).toLocaleString() : 'Not completed'}`
                            }
                        ]
                    };
                } catch (error) {
                    console.error('Error creating task:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Failed to create task due to an error."
                            }
                        ]
                    };
                }
            }
        );

        server.tool(
            'update_task',
            {
                id: z.number(),
                title: z.string(),
                description: z.string(),
                completed_at: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Completed at must be in YYYY-MM-DD HH:ii:ss format").optional(),
            },
            async (message, extra) => {
                const userToken = extra?.authInfo?.token;

                try {
                    const response = await fetch(`https://procrastinator.test/api/tasks/${message.id}`, {
                        method: 'PUT',
                        headers: {
                            Authorization: `Bearer ${userToken}`,
                            'Content-Type': 'application/json',
                            'User-Agent': 'procrastinator-mcp/1.0.0',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            title: message.title,
                            description: message.description,
                            completed_at: message.completed_at ? message.completed_at : null,
                        })
                    })

                    if (! response.ok) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: `Failed to update task: ${response.status} ${response.statusText}`
                                }
                            ]
                        };
                    }

                    const task = await response.json();

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Task updated successfully:\n\nID: ${task.data.id}\nTitle: ${task.data.title}\nDescription: ${task.data.description || 'No description'}\nCompleted At: ${task.data.completed_at ? new Date(task.data.completed_at).toLocaleString() : 'Not completed'}`
                            }
                        ]
                    };
                } catch (error) {
                    console.error('Error updating task:', error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Failed to update task due to an error."
                            }
                        ]
                    };
                }
            }
        )

        await server.connect(transport);
    } else {
        res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
            },
            id: null,
        });
        return;
    }

    await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);

app.get('/.well-known/oauth-protected-resource', (req, res) => {
    res.json({
        resource: 'http://localhost:3000',
        authorization_servers: ['https://procrastinator.test'],
        scopes_supported: [
            'claudeai',
            'tasks:create',
            'tasks:update',
            'tasks:delete',
            'tasks:view',
        ],
        bearer_methods_supported: ["header"],
        introspection_endpoint: "none",
        introspection_endpoint_auth_methods_supported: ["none"],
    });
});

app.listen(3000).on('listening', () => {
});