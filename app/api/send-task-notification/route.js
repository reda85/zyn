import { render } from '@react-email/components';
import TaskAssignmentEmail from '../../../components/emails/TaskAssignementEmail';


import { NextResponse } from 'next/server';

import { Resend } from 'resend';



const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      assignedUserEmail,
      assignedUserName,
      taskName,
      taskDescription,
      deepLink,
      projectName,
      assignedBy,
      dueDate,
    } = body;

    console.log('body', body)

    // 🔒 Validation minimale
    if (!assignedUserEmail || !taskName || !deepLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },       
        { status: 400 }
      );
    }

    // 📧 Génération du HTML email
   const emailComponent = TaskAssignmentEmail({
  assignedUserName,
  taskName,
  taskDescription,
  deepLink,
  projectName,
  assignedBy,
  dueDate,
});


    // 🚀 Envoi de l’email
    const { error } = await resend.emails.send({
      from: 'Zaynspace <notifications@zaynspace.com>',
      to: [assignedUserEmail],
      subject: `Nouvelle tâche assignée : ${taskName}`,
      react: emailComponent,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Email route error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
