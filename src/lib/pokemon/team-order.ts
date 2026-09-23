export function moveTeamMember<T>(members: T[], from: number, to: number): T[] {
  if (from < 0 || from >= members.length || to < 0 || to >= members.length || from === to) return members;
  const reordered = [...members];
  const [member] = reordered.splice(from, 1);
  reordered.splice(to, 0, member);
  return reordered;
}

export function movedSelectedIndex(selected: number, from: number, to: number): number {
  if (selected === from) return to;
  if (from < selected && selected <= to) return selected - 1;
  if (to <= selected && selected < from) return selected + 1;
  return selected;
}
