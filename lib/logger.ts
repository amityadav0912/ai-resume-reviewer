type RequestLogSuccess = {
  status: "success";
  route: string;
  role: string;
  yearsOfExperience: number;
  resumeLength: number;
  model: string;
  promptTokens: number;
  thinkingTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  responseId: string;
};

type RequestLogError = {
  status: "error";
  route: string;
  role?: string;
  yearsOfExperience?: number;
  resumeLength?: number;
  latencyMs: number;
  errorType: string;
  errorMessage: string;
};

export function logRequest(entry: RequestLogSuccess | RequestLogError) {
  const line = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  // Structured, single-line JSON — greppable now, drop-in ready for a real
  // sink (Helicone/LangSmith/Datadog) later without changing the call sites.
  console.log(JSON.stringify(line));
}
