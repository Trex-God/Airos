import type { TaskType, UserType } from "@/lib/domain";

export interface AgentDefinition {
  id: TaskType;
  name: string;
  description: string;
  userType: UserType;
}

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: "client_acquisition",
    name: "Client Acquisition",
    description: "Research prospects and prepare focused outreach.",
    userType: "freelancer",
  },
  {
    id: "proposal",
    name: "Proposal and Sales",
    description: "Create proposals, scopes, and sales material.",
    userType: "freelancer",
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "Plan and produce professional client deliverables.",
    userType: "freelancer",
  },
  {
    id: "communication",
    name: "Communication",
    description: "Draft clear client updates, replies, and follow-ups.",
    userType: "freelancer",
  },
  {
    id: "admin_finance",
    name: "Admin and Finance",
    description: "Support invoices, budgets, and administrative work.",
    userType: "freelancer",
  },
  {
    id: "strategy",
    name: "Strategy",
    description: "Develop positioning, priorities, and company roadmaps.",
    userType: "founder",
  },
  {
    id: "research",
    name: "Research",
    description: "Investigate markets, competitors, and opportunities.",
    userType: "founder",
  },
  {
    id: "build",
    name: "Build",
    description: "Turn product requirements into implementation plans.",
    userType: "founder",
  },
  {
    id: "growth",
    name: "Growth",
    description: "Improve acquisition, activation, and conversion.",
    userType: "founder",
  },
  {
    id: "operations",
    name: "Operations",
    description: "Create repeatable workflows and operating procedures.",
    userType: "founder",
  },
  {
    id: "content_strategy",
    name: "Content Strategy",
    description: "Plan themes, formats, and publishing calendars.",
    userType: "creator",
  },
  {
    id: "script",
    name: "Script",
    description: "Write structured scripts and production outlines.",
    userType: "creator",
  },
  {
    id: "repurpose",
    name: "Repurpose",
    description: "Adapt existing work into channel-specific content.",
    userType: "creator",
  },
  {
    id: "monetise",
    name: "Monetise",
    description: "Develop offers, pricing, and revenue opportunities.",
    userType: "creator",
  },
  {
    id: "community",
    name: "Community",
    description: "Plan audience engagement and member experiences.",
    userType: "creator",
  },
];
