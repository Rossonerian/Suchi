// Single responsibility: the fixed list of sub-teams. Shared by models,
// routes, and the seed script so the three teams are defined in one place.
const TEAMS = [
  { key: 'core-technical', displayName: 'Core Technical', capacity: 3 },
  { key: 'design-cad', displayName: 'Design & CAD', capacity: null },
  { key: 'social', displayName: 'Social', capacity: 5 },
  { key: 'documentation', displayName: 'Documentation', capacity: null },
];

const TEAM_KEYS = TEAMS.map((t) => t.key);

export { TEAMS, TEAM_KEYS };
