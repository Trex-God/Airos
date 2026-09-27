import { spawn } from "node:child_process";

const child = spawn("next", ["lint"], {
  env: {
    ...process.env,
    NEXT_DIST_DIR: ".next-local",
  },
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});