import { AppError } from '../utils/errors';

export function formatValidator(content: string) {
    if (!content.includes('## Sources')) {
        throw new AppError(
            'Format Validator',
            'Validation Error',
            true,
            'Ensure the LLM appends a strict "## Sources" block at the bottom containing all fetched documents.',
            'Document missing required ## Sources attribution block.'
        );
    }
}
