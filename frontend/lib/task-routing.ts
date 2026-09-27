import type { TaskType } from "@/lib/domain";

const TASK_TYPE_KEYWORDS: Readonly<
  Array<{ taskType: TaskType; keywords: readonly string[] }>
> = [
  {
    taskType: "client_acquisition",
    keywords: ["lead", "prospect", "client acquisition", "cold outreach"],
  },
  {
    taskType: "proposal",
    keywords: ["proposal", "scope of work", "quote", "pitch"],
  },
  {
    taskType: "communication",
    keywords: ["email", "message", "reply", "respond"],
  },
  {
    taskType: "admin_finance",
    keywords: ["invoice", "expense", "budget", "finance", "payment"],
  },
  {
    taskType: "strategy",
    keywords: ["strategy", "roadmap", "positioning", "business plan"],
  },
  {
    taskType: "research",
    keywords: ["research", "investigate", "compare", "analysis"],
  },
  {
    taskType: "build",
    keywords: ["build", "code", "develop", "implement"],
  },
  {
    taskType: "growth",
    keywords: ["growth", "acquisition", "conversion", "funnel"],
  },
  {
    taskType: "operations",
    keywords: ["operations", "workflow", "process", "sop"],
  },
  {
    taskType: "content_strategy",
    keywords: ["content strategy", "content plan", "editorial calendar"],
  },
  {
    taskType: "script",
    keywords: ["script", "screenplay", "video outline"],
  },
  {
    taskType: "repurpose",
    keywords: ["repurpose", "turn this into", "adapt this"],
  },
  {
    taskType: "monetise",
    keywords: ["monetise", "monetize", "revenue stream", "pricing"],
  },
  {
    taskType: "community",
    keywords: ["community", "audience engagement", "member engagement"],
  },
];

export function classifyTaskLocally(inputText: string): TaskType {
  const normalizedInput = inputText.toLowerCase();

  for (const { taskType, keywords } of TASK_TYPE_KEYWORDS) {
    if (keywords.some((keyword) => normalizedInput.includes(keyword))) {
      return taskType;
    }
  }

  return "delivery";
}
