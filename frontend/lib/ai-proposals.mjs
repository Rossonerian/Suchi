const FIELD_LABELS = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  priority: 'Priority',
  assigneeId: 'Assignee',
  assigneeMembershipId: 'Assignee',
  projectId: 'Project',
  dueAt: 'Due date',
  startAt: 'Start date',
};

export function proposalFields(proposal) {
  const args = proposal?.arguments || {};
  return Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, label: FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()), value: typeof value === 'object' ? JSON.stringify(value) : String(value) }));
}

export function proposalSummary(proposal) {
  return proposalFields(proposal).map((field) => `${field.label}: ${field.value}`).join(' · ');
}
