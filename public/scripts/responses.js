/**
 * Responses API integration for SillyTavern
 * Handles the /v1/responses endpoint from OpenAI and compatible servers
 *
 * The Responses API provides advanced features including:
 * - Stateful conversations using previous_response_id
 * - Built-in tools (web search, code execution)
 * - Reasoning effort control for o1/o3 models
 * - Streaming support
 * - Enhanced context management
 *
 * @see https://platform.openai.com/docs/api-reference/responses
 */

import { saveSettingsDebounced, getRequestHeaders } from '../script.js';
import { writeSecret, SECRET_KEYS } from './secrets.js';

export const responses_sources = {
    OPENAI: 'openai',
    CUSTOM: 'custom',
};

export const responses_settings = {
    responses_source: responses_sources.OPENAI,
    custom_url: '',
    model: '',
    reasoning_effort: 'medium', // For o1/o3 models: low, medium, high
    enable_web_search: false,
    enable_code_execution: false,
    temperature: 1.0,
    max_tokens: null,
    top_p: 1.0,
    stream: false,
};

let is_get_status = false;
let is_api_button_press = false;

/**
 * Load Responses API settings from the settings object
 * @param {object} settings - The settings object
 */
export function loadResponsesSettings(settings) {
    if (settings.responses_source !== undefined) {
        responses_settings.responses_source = settings.responses_source;
    }
    if (settings.responses_custom_url !== undefined) {
        responses_settings.custom_url = settings.responses_custom_url;
    }
    if (settings.responses_model !== undefined) {
        responses_settings.model = settings.responses_model;
    }
    if (settings.responses_reasoning_effort !== undefined) {
        responses_settings.reasoning_effort = settings.responses_reasoning_effort;
    }
    if (settings.responses_enable_web_search !== undefined) {
        responses_settings.enable_web_search = settings.responses_enable_web_search;
    }
    if (settings.responses_enable_code_execution !== undefined) {
        responses_settings.enable_code_execution = settings.responses_enable_code_execution;
    }
    if (settings.responses_temperature !== undefined) {
        responses_settings.temperature = settings.responses_temperature;
    }
    if (settings.responses_max_tokens !== undefined) {
        responses_settings.max_tokens = settings.responses_max_tokens;
    }
    if (settings.responses_top_p !== undefined) {
        responses_settings.top_p = settings.responses_top_p;
    }
    if (settings.responses_stream !== undefined) {
        responses_settings.stream = settings.responses_stream;
    }

    $('#responses_source').val(responses_settings.responses_source);
    $('#responses_custom_url').val(responses_settings.custom_url);
    $('#model_responses_select').val(responses_settings.model);
    $('#responses_reasoning_effort').val(responses_settings.reasoning_effort);
    $('#responses_enable_web_search').prop('checked', responses_settings.enable_web_search);
    $('#responses_enable_code_execution').prop('checked', responses_settings.enable_code_execution);
    $('#responses_temperature').val(responses_settings.temperature);
    $('#responses_max_tokens').val(responses_settings.max_tokens || '');
    $('#responses_top_p').val(responses_settings.top_p);
    $('#responses_stream').prop('checked', responses_settings.stream);

    onResponsesSourceChange();
}

/**
 * Handle Responses API source change
 */
function onResponsesSourceChange() {
    const source = String($('#responses_source').val());
    responses_settings.responses_source = source;

    if (source === responses_sources.OPENAI) {
        $('#responses_openai_block').show();
        $('#responses_custom_block').hide();
    } else if (source === responses_sources.CUSTOM) {
        $('#responses_openai_block').hide();
        $('#responses_custom_block').show();
    }

    saveSettingsDebounced();
}

/**
 * Get status of Responses API connection
 */
async function getStatus() {
    if (is_get_status) {
        return;
    }

    const api_url = '/api/backends/responses/status';
    const response_data = {
        responses_source: responses_settings.responses_source,
        custom_url: responses_settings.custom_url,
    };

    is_get_status = true;

    try {
        const response = await fetch(api_url, {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(response_data),
        });

        if (response.ok) {
            $('.online_status').removeClass('neutral_warning');
            $('.online_status').addClass('success');
            $('.online_status_text').text('Connected');

            // Load models
            await loadModels();
        } else {
            $('.online_status').removeClass('success');
            $('.online_status').addClass('neutral_warning');
            $('.online_status_text').text('No connection');
        }
    } catch (error) {
        console.error('Responses API status check failed:', error);
        $('.online_status').removeClass('success');
        $('.online_status').addClass('neutral_warning');
        $('.online_status_text').text('No connection');
    } finally {
        is_get_status = false;
    }
}

/**
 * Load available models from the Responses API
 */
async function loadModels() {
    const api_url = '/api/backends/responses/models';
    const response_data = {
        responses_source: responses_settings.responses_source,
        custom_url: responses_settings.custom_url,
    };

    try {
        const response = await fetch(api_url, {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(response_data),
        });

        if (response.ok) {
            const data = await response.json();
            const models = data.data || [];

            const select = $('#model_responses_select');
            select.empty();
            select.append('<option value="">Select a model</option>');

            for (const model of models) {
                const option = $('<option>', {
                    value: model.id,
                    text: model.id,
                });
                select.append(option);
            }

            // Restore saved model selection
            if (responses_settings.model) {
                select.val(responses_settings.model);
            }
        }
    } catch (error) {
        console.error('Failed to load models:', error);
    }
}

/**
 * Handle API button press
 */
async function onApiButtonPress() {
    if (is_api_button_press) {
        return;
    }

    is_api_button_press = true;

    try {
        await getStatus();
    } finally {
        is_api_button_press = false;
    }
}

/**
 * Initialize Responses API UI handlers
 */
export function initResponsesApi() {
    // Source selector
    $('#responses_source').on('change', onResponsesSourceChange);

    // Custom URL
    $('#responses_custom_url').on('input', function () {
        responses_settings.custom_url = String($(this).val());
        saveSettingsDebounced();
    });

    // Model selector
    $('#model_responses_select').on('change', function () {
        responses_settings.model = String($(this).val());
        saveSettingsDebounced();
    });

    // Reasoning effort (for o1/o3 models)
    $('#responses_reasoning_effort').on('change', function () {
        responses_settings.reasoning_effort = String($(this).val());
        saveSettingsDebounced();
    });

    // Web search toggle
    $('#responses_enable_web_search').on('change', function () {
        responses_settings.enable_web_search = Boolean($(this).prop('checked'));
        saveSettingsDebounced();
    });

    // Code execution toggle
    $('#responses_enable_code_execution').on('change', function () {
        responses_settings.enable_code_execution = Boolean($(this).prop('checked'));
        saveSettingsDebounced();
    });

    // Temperature slider
    $('#responses_temperature').on('input', function () {
        responses_settings.temperature = Number($(this).val());
        $('#responses_temperature_value').text(responses_settings.temperature.toFixed(2));
        saveSettingsDebounced();
    });

    // Max tokens
    $('#responses_max_tokens').on('input', function () {
        const value = String($(this).val());
        responses_settings.max_tokens = value ? Number(value) : null;
        saveSettingsDebounced();
    });

    // Top P slider
    $('#responses_top_p').on('input', function () {
        responses_settings.top_p = Number($(this).val());
        $('#responses_top_p_value').text(responses_settings.top_p.toFixed(2));
        saveSettingsDebounced();
    });

    // Stream toggle
    $('#responses_stream').on('change', function () {
        responses_settings.stream = Boolean($(this).prop('checked'));
        saveSettingsDebounced();
    });

    // Connect button
    $('#api_button_responses').on('click', onApiButtonPress);

    // API key handlers
    $('#api_key_responses_openai').on('input', async function () {
        const key = String($(this).val());
        await writeSecret(SECRET_KEYS.OPENAI, key);
    });

    $('#api_key_responses').on('input', async function () {
        const key = String($(this).val());
        await writeSecret(SECRET_KEYS.RESPONSES, key);
    });

    // Initialize UI display values
    $('#responses_temperature_value').text(responses_settings.temperature.toFixed(2));
    $('#responses_top_p_value').text(responses_settings.top_p.toFixed(2));

    console.log('Responses API initialized');
}

/**
 * Send a request to the Responses API
 * @param {string} type - The request type ('normal', 'continue', 'quiet', etc.)
 * @param {any} messages - The messages array
 * @param {AbortSignal} signal - Abort signal
 * @param {object} options - Additional options for the request
 * @returns {Promise<any>} - The response data
 */
export async function sendResponsesRequest(type, messages, signal, options = {}) {
    const generate_data = {
        type: type,
        messages: messages,
        model: responses_settings.model,
        responses_source: responses_settings.responses_source,
        custom_url: responses_settings.custom_url,
        reasoning_effort: responses_settings.reasoning_effort,
        enable_web_search: responses_settings.enable_web_search,
        enable_code_execution: responses_settings.enable_code_execution,
        temperature: responses_settings.temperature,
        max_tokens: responses_settings.max_tokens,
        top_p: responses_settings.top_p,
        stream: responses_settings.stream,
        ...options, // Allow override of settings with explicit options
    };

    const generate_url = '/api/backends/responses/generate';
    const response = await fetch(generate_url, {
        method: 'POST',
        body: JSON.stringify(generate_data),
        headers: getRequestHeaders(),
        signal: signal,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Got response status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Transform the response to match expected format
    return {
        choices: data.choices || [],
        usage: data.usage || {},
        reasoning: data.reasoning || null, // For o1/o3 models
        metadata: data.metadata || {},
        response_id: data.id || null, // For conversation tracking
    };
}
