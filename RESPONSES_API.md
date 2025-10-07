# Responses API Integration

This document describes the enhanced Responses API integration in SillyTavern, which provides advanced features for interacting with OpenAI's `/v1/responses` endpoint and compatible servers like LM Studio.

## Overview

The Responses API is a powerful endpoint that combines the best features of the Chat Completions and Assistants APIs, offering:

- **Stateful Conversations**: Track conversation history using `previous_response_id`
- **Built-in Tools**: Web search, code execution, and file search
- **Advanced Reasoning**: Control reasoning depth for o1/o3 models
- **Streaming Support**: Receive responses token by token
- **Enhanced Context Management**: Better handling of instructions and context

## Features

### 1. Reasoning Effort (o1/o3 Models)

Control how deeply the model "thinks" before responding:

- **Low**: Fast responses, less thorough reasoning
- **Medium**: Balanced performance (default)
- **High**: Maximum reasoning depth, slower but more comprehensive

This is particularly useful for:
- Complex problem solving
- Multi-step reasoning tasks
- Mathematical calculations
- Code generation and debugging

### 2. Web Search

Enable the model to search the web for up-to-date information:

- Real-time data retrieval
- Current events and news
- Product information and reviews
- Research and fact-checking

### 3. Code Execution

Allow the model to write and execute code:

- Data analysis and visualization
- Mathematical computations
- File processing
- API testing

### 4. Advanced Parameters

#### Temperature (0.0 - 2.0)
Controls randomness in responses:
- **0.0**: Deterministic, focused responses
- **1.0**: Balanced (default)
- **2.0**: More creative, diverse responses

#### Max Tokens
Set the maximum length of the response (leave empty for auto)

#### Top P (0.0 - 1.0)
Nucleus sampling threshold:
- Lower values make responses more focused
- Higher values increase diversity

#### Streaming
Enable token-by-token streaming for real-time responses

## Configuration

### OpenAI (Official)

1. Select "OpenAI (Official)" as the source
2. Enter your OpenAI API key
3. Click "Connect" to load available models
4. Select a model (e.g., `gpt-4o`, `o1`, `o3-mini`)
5. Configure advanced settings as needed

### Custom (OpenAI-compatible)

For LM Studio, Ollama, or other compatible servers:

1. Select "Custom (OpenAI-compatible)" as the source
2. Enter your API URL (e.g., `http://localhost:1234/v1`)
3. Optionally enter an API key
4. Click "Connect" to load available models
5. Select a model
6. Configure advanced settings

## Usage Examples

### Using with LM Studio

LM Studio supports the Responses API for models with reasoning capabilities:

1. Start LM Studio server
2. Load a compatible model (e.g., o1, o3, or thinking models)
3. Set the API URL to `http://localhost:1234/v1`
4. Enable "Reasoning Effort" for better responses
5. Optionally enable web search or code execution if supported

### Optimizing for Different Tasks

#### Creative Writing
- Temperature: 1.2 - 1.5
- Reasoning Effort: Medium
- Streaming: Enabled

#### Technical Q&A
- Temperature: 0.3 - 0.7
- Reasoning Effort: High
- Web Search: Enabled for current info

#### Code Generation
- Temperature: 0.5 - 0.8
- Reasoning Effort: High
- Code Execution: Enabled for testing

#### Casual Chat
- Temperature: 1.0
- Reasoning Effort: Low to Medium
- Streaming: Enabled

## API Reference

### Request Format

The Responses API sends requests in the following format:

```javascript
{
  "model": "o1",
  "instructions": "System instructions here",
  "input": "User input here",
  "reasoning_effort": "medium", // low, medium, or high
  "tools": [
    { "type": "web_search" },
    { "type": "code_interpreter" }
  ],
  "temperature": 1.0,
  "max_tokens": 2048,
  "top_p": 1.0,
  "stream": false,
  "previous_response_id": "resp-123", // For conversation continuity
  "metadata": {} // Custom metadata
}
```

### Response Format

The API returns responses in a compatible format:

```javascript
{
  "id": "resp-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "o1",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Response text here",
      "reasoning": "Thinking process (for o1/o3 models)",
      "tool_calls": [] // If tools were used
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  },
  "metadata": {}
}
```

## Troubleshooting

### Import Errors

If you see errors like `doesn't provide an export named 'getRequestHeaders'`:
- This has been fixed by importing `getRequestHeaders` from `script.js` instead of `openai.js`

### Connection Issues

- Ensure your API key is correct
- For LM Studio, verify the server is running and accessible
- Check the API URL format (should end with `/v1`)

### Model Compatibility

- Not all models support all features
- Reasoning effort is specific to o1/o3 models
- Web search and code execution depend on server capabilities
- Check your provider's documentation for feature support

## Benefits for Users

1. **Better Roleplay**: Use reasoning models for more coherent, in-character responses
2. **Enhanced Assistants**: Web search for current information, code execution for calculations
3. **Performance**: Streaming for real-time interaction, optimized parameters for speed vs quality
4. **Flexibility**: Works with OpenAI, LM Studio, and other compatible servers
5. **Advanced Models**: Full support for o1, o3, and future reasoning models

## Links

- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [LM Studio](https://lmstudio.ai/)
- [SillyTavern GitHub](https://github.com/SillyTavern/SillyTavern)
