import express from 'express';
import fetch from 'node-fetch';

import { forwardFetchResponse, tryParse } from '../../util.js';
import { readSecret, SECRET_KEYS } from '../secrets.js';

const API_OPENAI = 'https://api.openai.com/v1';

export const RESPONSES_SOURCES = {
    OPENAI: 'openai',
    CUSTOM: 'custom',
};

export const router = express.Router();

/**
 * Check the status of the Responses API connection
 */
router.post('/status', async function (request, response) {
    if (!request.body) return response.sendStatus(400);

    let apiUrl = '';
    let apiKey = '';

    if (request.body.responses_source === RESPONSES_SOURCES.OPENAI) {
        apiUrl = API_OPENAI;
        apiKey = readSecret(request.user.directories, SECRET_KEYS.OPENAI);
    } else if (request.body.responses_source === RESPONSES_SOURCES.CUSTOM) {
        apiUrl = request.body.custom_url || '';
        apiKey = readSecret(request.user.directories, SECRET_KEYS.RESPONSES);
    } else {
        return response.status(400).send({ error: 'Invalid responses source' });
    }

    if (!apiKey && request.body.responses_source === RESPONSES_SOURCES.OPENAI) {
        console.warn('Responses API key is missing.');
        return response.status(400).send({ error: true });
    }

    try {
        const modelsUrl = `${apiUrl}/models`;
        const statusResponse = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey ? `Bearer ${apiKey}` : '',
            },
            timeout: 5000,
        });

        if (statusResponse.ok) {
            return response.send({ result: 'ok' });
        } else {
            return response.status(statusResponse.status).send({ error: true });
        }
    } catch (error) {
        console.error('Responses API status check failed:', error);
        return response.status(500).send({ error: true });
    }
});

/**
 * Get available models from the Responses API
 */
router.post('/models', async function (request, response) {
    if (!request.body) return response.sendStatus(400);

    let apiUrl = '';
    let apiKey = '';

    if (request.body.responses_source === RESPONSES_SOURCES.OPENAI) {
        apiUrl = API_OPENAI;
        apiKey = readSecret(request.user.directories, SECRET_KEYS.OPENAI);
    } else if (request.body.responses_source === RESPONSES_SOURCES.CUSTOM) {
        apiUrl = request.body.custom_url || '';
        apiKey = readSecret(request.user.directories, SECRET_KEYS.RESPONSES);
    } else {
        return response.status(400).send({ error: 'Invalid responses source' });
    }

    if (!apiKey && request.body.responses_source === RESPONSES_SOURCES.OPENAI) {
        console.warn('Responses API key is missing.');
        return response.status(400).send({ error: true });
    }

    try {
        const modelsUrl = `${apiUrl}/models`;
        const modelsResponse = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': apiKey ? `Bearer ${apiKey}` : '',
            },
        });

        if (modelsResponse.ok) {
            const data = await modelsResponse.json();
            return response.send(data);
        } else {
            const text = await modelsResponse.text();
            console.error('Responses API models request failed:', text);
            return response.status(modelsResponse.status).send({ error: true });
        }
    } catch (error) {
        console.error('Responses API models request failed:', error);
        return response.status(500).send({ error: true });
    }
});

/**
 * Send a request to the Responses API endpoint (/v1/responses).
 * This endpoint is designed for tools, instructions, and structured outputs,
 * compatible with LM Studio and other OpenAI-compatible servers.
 *
 * Key differences from /v1/chat/completions:
 * - Uses /v1/responses endpoint instead of /v1/chat/completions
 * - Request body uses: instructions, input, tools, previous_response_id, metadata
 * - Response includes: output, output_text, tool_calls
 */
router.post('/generate', async function (request, response) {
    if (!request.body) return response.sendStatus(400);

    let apiUrl = '';
    let apiKey = '';

    if (request.body.responses_source === RESPONSES_SOURCES.OPENAI) {
        apiUrl = API_OPENAI;
        apiKey = readSecret(request.user.directories, SECRET_KEYS.OPENAI);
    } else if (request.body.responses_source === RESPONSES_SOURCES.CUSTOM) {
        apiUrl = request.body.custom_url || '';
        apiKey = readSecret(request.user.directories, SECRET_KEYS.RESPONSES);
    } else {
        return response.status(400).send({ error: 'Invalid responses source' });
    }

    if (!apiKey && request.body.responses_source === RESPONSES_SOURCES.OPENAI) {
        console.warn('Responses API key is missing.');
        return response.status(400).send({ error: true });
    }

    const endpointUrl = `${apiUrl}/responses`;

    // Convert chat messages to instructions format for Responses API
    let instructions = '';
    let input = '';

    if (Array.isArray(request.body.messages)) {
        // Extract system messages as instructions
        const systemMessages = request.body.messages.filter(m => m.role === 'system');
        if (systemMessages.length > 0) {
            instructions = systemMessages.map(m => m.content).join('\n\n');
        }

        // Use the last user message as input
        const userMessages = request.body.messages.filter(m => m.role === 'user');
        if (userMessages.length > 0) {
            input = userMessages[userMessages.length - 1].content;
        }
    }

    // Build request body for Responses API
    const requestBody = {
        model: request.body.model,
        instructions: instructions || undefined,
        input: input || undefined,
        tools: Array.isArray(request.body.tools) && request.body.tools.length > 0 ? request.body.tools : undefined,
        previous_response_id: request.body.previous_response_id || undefined,
        metadata: request.body.metadata || undefined,
        stream: request.body.stream || false,
        temperature: request.body.temperature,
        max_tokens: request.body.max_tokens,
        top_p: request.body.top_p,
    };

    const controller = new AbortController();
    request.socket.removeAllListeners('close');
    request.socket.on('close', () => controller.abort());

    const config = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
    };

    console.debug('Responses API request:', requestBody);

    try {
        controller.signal.throwIfAborted();
        const fetchResponse = await fetch(endpointUrl, config);

        if (request.body.stream) {
            console.info('Streaming request in progress (Responses API)');
            forwardFetchResponse(fetchResponse, response);
            return;
        }

        if (fetchResponse.ok) {
            const json = await fetchResponse.json();

            // Transform Responses API response to chat completions format for compatibility
            const transformedResponse = {
                id: json.id || `resp-${Date.now()}`,
                object: 'chat.completion',
                created: json.created || Math.floor(Date.now() / 1000),
                model: json.model || request.body.model,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: json.output_text || json.output || '',
                        tool_calls: json.tool_calls || undefined,
                    },
                    finish_reason: json.finish_reason || 'stop',
                }],
                usage: json.usage || undefined,
            };

            response.send(transformedResponse);
            console.debug('Responses API response (transformed):', transformedResponse);
        } else {
            const text = await fetchResponse.text();
            const data = tryParse(text) || { error: { message: fetchResponse.statusText || 'Unknown error occurred' } };
            return response.status(500).send(data);
        }
    } catch (error) {
        console.error('Responses API request failed', error);
        const message = error.name === 'AbortError'
            ? 'Request was aborted by the client.'
            : (error.message || 'An unknown network error occurred.');

        if (!response.headersSent) {
            response.status(502).send({ error: { message, ...error } });
        } else {
            response.end();
        }
    }
});
