export function antigravity(scope) {
  return {
    commands:scope==='user'?'.gemini/config/global_workflows':'.agents/workflows',
    rules:scope==='project'?'.agents/rules':null,
    capabilities:{skills:'instruction-only',agents:'instruction-only',commands:'native',rules:scope==='project'?'native':'instruction-only',hooks:'explicit-call',security:'unavailable'},
  };
}
