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

interface AssignedEmailProps {
  recipientName: string;
  commitmentTitle: string;
  deadline: Date;
  role: "виконавець" | "перевіряючий";
  appUrl?: string;
}

export function AssignedEmail({
  recipientName,
  commitmentTitle,
  deadline,
  role,
  appUrl = "http://localhost:3000",
}: AssignedEmailProps) {
  const deadlineStr = format(new Date(deadline), "dd MMMM yyyy, HH:mm", {
    locale: uk,
  });

  return (
    <Html lang="uk">
      <Head />
      <Preview>Вас призначено {role}ом: {commitmentTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Status Check</Heading>
          <Hr style={hr} />
          <Text style={greeting}>Привіт, {recipientName}!</Text>
          <Text style={paragraph}>
            Вас призначено <strong>{role}ом</strong> у зобов'язанні:
          </Text>
          <Section style={commitmentBox}>
            <Text style={titleStyle}>{commitmentTitle}</Text>
            <Text style={deadlineText}>📅 Дедлайн: {deadlineStr}</Text>
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

export default AssignedEmail;

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
  margin: "0 0 6px",
};

const deadlineText = {
  color: "#71717a",
  fontSize: "13px",
  margin: "0",
};

const footer = {
  color: "#a1a1aa",
  fontSize: "12px",
  textAlign: "center" as const,
  margin: "0",
};
