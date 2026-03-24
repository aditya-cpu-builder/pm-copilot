import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

/**
 * Cerebras API Client via HydraProxy
 * The SDK completely intercepts the standard calls internally via the `ANTHROPIC_BASE_URL` 
 * env var dynamically routing them to Cerebras infrastructure.
 */
export const cerebras = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy_key'
});
