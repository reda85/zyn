import { render } from '@react-email/components';
import TaskAssignmentEmail from '../../../components/emails/TaskAssignementEmail';


const html = render(TaskAssignmentEmail({
  assignedUserName,
  taskName,
  taskDescription,
  deepLink,
  projectName,
  assignedBy,
  dueDate,
}));

await resend.emails.send({
  from: 'Zaynspace <notifications@zaynspace.com>',
  to: [assignedUserEmail],
  subject: `Nouvelle tâche assignée : ${taskName}`,
  html,
});