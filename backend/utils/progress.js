// Single responsibility: pure function that turns a list of tasks into
// progress stats. No DB or Express dependency, so it's trivially unit-testable.
function computeProgress(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return { total, done, inProgress, blocked, todo, percent };
}

export { computeProgress };
