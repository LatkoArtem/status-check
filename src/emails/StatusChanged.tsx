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

const STATUS_LABELS: Record<string, string> = {
  to_check: "Очікує перевірки",
  expired: "Прострочено",
  done: "Виконано",
  not_actual: "Не актуально",
  ideas_backlog: "Ідеї / Беклог",
};

const STATUS_COLORS: Record<string, string> = {
  to_check: "#3b82f6",
  expired: "#ef4444",
  done: "#22c55e",
  not_actual: "#6b7280",
  ideas_backlog: "#a855f7",
};

interface StatusChangedEmailProps {
  recipientName: string;
  commitmentTitle: string;
  newStatus: string;
  changedByName: string;
}

export function StatusChangedEmail({
  recipientName,
  commitmentTitle,
  newStatus,
  changedByName,
}: StatusChangedEmailProps) {
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
  const statusColor = STATUS_COLORS[newStatus] ?? "#6b7280";

  return (
    <Html lang="uk">
      <Head />
      <Preview>Статус змінено: {commitmentTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Status Check</Heading>
          <Hr style={hr} />
          <Text style={greeting}>Привіт, {recipientName}!</Text>
          <Text style={paragraph}>
            Статус зобов'язання було змінено користувачем{" "}
            <strong>{changedByName}</strong>:
          </Text>
          <Section style={commitmentBox}>
            <Text style={titleStyle}>{commitmentTitle}</Text>
            <Text
              style={{
                ...statusBadge,
                color: statusColor,
                backgroundColor: `${statusColor}18`,
              }}
            >
              {statusLabel}
            </Text>
          </Section>
          <Text style={paragraph}>
            Увійдіть до системи, щоб переглянути деталі.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>Status Check — система контролю зобов'язань</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default StatusChangedEmail;

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
  backgroundColor: "#f4f4f5",
  borderRadius: "6px",
  padding: "16px",
  margin: "16px 0",
};

const titleStyle = {
  color: "#09090b",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const statusBadge = {
  display: "inline-block" as const,
  fontSize: "12px",
  fontWeight: "500",
  padding: "2px 10px",
  borderRadius: "999px",
  margin: "0",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
};
