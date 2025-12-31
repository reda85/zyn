import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export default function TaskAssignmentEmail({
  assignedUserName = 'Utilisateur',
  taskName = 'Nouvelle tâche',
  taskDescription = '',
  deepLink = '',
  projectName = 'Votre projet',
  assignedBy = 'Un membre',
  dueDate = null,
}) {
  return (
    <Html>
      <Head />
      <Preview>Nouvelle tâche assignée : {taskName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Zaynspace</Heading>
          <Heading style={h2}>Nouvelle tâche assignée</Heading>
          
          <Text style={text}>Bonjour {assignedUserName},</Text>
          
          <Text style={text}>
            {assignedBy} vous a assigné une nouvelle tâche dans le projet{' '}
            <strong>{projectName}</strong>.
          </Text>

          <Section style={taskCard}>
            <Heading style={taskName}>{taskName}</Heading>
            {taskDescription && <Text style={taskDesc}>{taskDescription}</Text>}
            
            {dueDate && (
              <Text style={meta}>
                📅 Échéance :{' '}
                {new Date(dueDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={deepLink}>
              Voir la tâche
            </Button>
          </Section>

          <Text style={footer}>
            Vous recevez cet email car vous êtes membre du projet sur Zaynspace.
          </Text>
          
          <Text style={footer}>
            <Link href="https://zaynspace.com" style={link}>
              zaynspace.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f5f7fa',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px',
  borderRadius: '16px',
  maxWidth: '600px',
};

const h1 = {
  color: '#6D28D9',
  fontSize: '28px',
  fontWeight: 'bold',
  textAlign: 'center',
  margin: '0 0 10px',
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center',
  margin: '0 0 30px',
};

const text = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 20px',
};

const taskCard = {
  backgroundColor: '#F9FAFB',
  borderLeft: '4px solid #6D28D9',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const taskName = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 10px',
};

const taskDesc = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 15px',
};

const meta = {
  color: '#6B7280',
  fontSize: '14px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center',
  margin: '30px 0',
};

const button = {
  backgroundColor: '#6D28D9',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '14px 32px',
};

const footer = {
  color: '#9CA3AF',
  fontSize: '14px',
  textAlign: 'center',
  margin: '40px 0 0',
};

const link = {
  color: '#6D28D9',
  textDecoration: 'none',
};