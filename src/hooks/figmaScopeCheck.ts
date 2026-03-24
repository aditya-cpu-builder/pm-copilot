import { AppError } from '../utils/errors';

export function figmaScopeCheck() {
    const hasAccess = true; // Placeholder for strict OAuth check
    if (!hasAccess) {
        throw new AppError(
            'Figma Scope Checks',
            'Permission Error',
            false,
            'Navigate to https://figma.com/request-access to unlock this domain.',
            "Figma edit access denied. Please request access."
        );
    }
}
