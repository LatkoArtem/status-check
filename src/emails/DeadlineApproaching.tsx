import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

interface DeadlineApproachingEmailProps {
  recipientName: string;
  commitmentTitle: string;
  deadline: Date;
  authorName: string;
}

export function DeadlineApproachingEmail({
  recipientName,
  commitmentTitle,
  deadline,
  authorName,
}: DeadlineApproachingEmailProps) {
  const deadlineStr = format(new Date(deadline), "dd MMMM yyyy, HH:mm", {
    locale: uk,
  });

  return (
    <Html lang="uk">
      <Head />
      <Preview>⚠️ Дедлайн завтра: {commitmentTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Status Check</Heading>
          <Hr style={hr} />
          <Text style={greeting}>Привіт, {recipientName}!</Text>
          <Text style={paragraph}>
            Нагадуємо: до дедлайну зобов'язання залишилось менше{" "}
            <strong>24 годин</strong>.
          </Text>
          <Section style={commitmentBox}>
            <Text style={commitmentTitleStyle}>{commitmentTitle}</Text>
            <Text style={deadlineText}>📅 Дедлайн: {deadlineStr}</Text>
            <Text style={authorText}>Автор: {authorName}</Text>
          </Section>
          <Text style={paragraph}>
            Будь ласка, перевірте статус виконання та оновіть його в системі.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Status Check — система контролю зобов'язань</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DeadlineApproachingEmail;

const body = {
  backgroundColor: "#f4f4f5",
  fontFamily: "Inter, system-ui, sans-serif",
};

const container = {
  margin: "40px auto",
  padding: "32px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  maxWidth: "560px",
};

const h1 = {
  color: "#09090b",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "16px 0",
};

const greeting = {
  color: "#09090b",
  fontSize: "15px",
  margin: "0 0 8px",
};

const paragraph = {
  color: "#71717a",
  fontSize: "14px",
  margin: "0 0 16px",
  lineHeight: "1.6",
};

const commitmentBox = {
  backgroundColor: "#fff7ed",
  borderLeft: "3px solid #f97316",
  borderRadius: "4px",
  padding: "16px",
  margin: "16px 0",
};

const commitmentTitleStyle = {
  color: "#09090b",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 6px",
};

const deadlineText = {
  color: "#ea580c",
  fontSize: "13px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const authorText = {
  color: "#71717a",
  fontSize: "12px",
  margin: "0",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
};
