/**
 * Responses API integration for SillyTavern
 * Handles the /v1/responses endpoint from OpenAI and compatible servers
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

    $('#responses_source').val(responses_settings.responses_source);
    $('#responses_custom_url').val(responses_settings.custom_url);
    $('#model_responses_select').val(responses_settings.model);

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

    console.log('Responses API initialized');
}

/**
 * Send a request to the Responses API
 * @param {string} type - The request type ('normal', 'continue', 'quiet', etc.)
 * @param {any} messages - The messages array
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<any>} - The response data
 */
export async function sendResponsesRequest(type, messages, signal) {
    const generate_data = {
        type: type,
        messages: messages,
        model: responses_settings.model,
        responses_source: responses_settings.responses_source,
        custom_url: responses_settings.custom_url,
    };

    const generate_url = '/api/backends/responses/generate';
    const response = await fetch(generate_url, {
        method: 'POST',
        body: JSON.stringify(generate_data),
        headers: getRequestHeaders(),
        signal: signal,
    });

    if (!response.ok) {
        throw new Error(`Got response status ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to match expected format
    return {
        choices: data.choices || [],
        usage: data.usage || {},
    };
}
