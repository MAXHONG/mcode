import {
  DEFAULT_FEEDBACK_TICKET_FRAMEWORK,
  type McodeProvider,
  type FeedbackTicketFramework,
} from "@mcode/shared";

export function inferFeedbackFrameworkFromAgentProvider(
  _provider: McodeProvider | null | undefined,
): FeedbackTicketFramework {
  return DEFAULT_FEEDBACK_TICKET_FRAMEWORK;
}
