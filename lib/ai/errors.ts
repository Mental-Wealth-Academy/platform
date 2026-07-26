export type AiGatewayErrorCode =
  | 'ai_input_invalid'
  | 'ai_input_budget_exceeded'
  | 'ai_output_budget_exceeded'
  | 'ai_safety_gate_required'
  | 'ai_safety_blocked'
  | 'ai_deadline_exceeded'
  | 'ai_provider_unavailable'
  | 'ai_schema_invalid'
  | 'ai_request_failed';

export class AiGatewayError extends Error {
  readonly code: AiGatewayErrorCode;
  readonly status: number;

  constructor(code: AiGatewayErrorCode, message: string, status = 500) {
    super(message);
    this.name = 'AiGatewayError';
    this.code = code;
    this.status = status;
  }
}

export class AiProviderError extends Error {
  readonly providerCode: string;
  readonly status: number | null;
  readonly transient: boolean;

  constructor(args: {
    providerCode: string;
    message: string;
    status?: number | null;
    transient: boolean;
  }) {
    super(args.message);
    this.name = 'AiProviderError';
    this.providerCode = args.providerCode;
    this.status = args.status ?? null;
    this.transient = args.transient;
  }
}

