import { AppError } from '../utils/errors';

export function toolNameValidator(toolName: string) {
    if (toolName.includes('.')) {
        throw new AppError(
            'Tool Invocation',
            'Validation Error',
            false,
            'Modify the tool registry to exclusively use underscores.',
            `Tool name '${toolName}' contains dots. Cerebras schema validation requires underscores only.`
        );
    }
}
