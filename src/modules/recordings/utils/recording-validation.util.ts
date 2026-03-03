import { ValidationReport } from '@hax-brasil/replay-decoder';

export function hasValidationErrors(report: ValidationReport): boolean {
  return report.issues.some((issue) => issue.severity === 'error');
}
