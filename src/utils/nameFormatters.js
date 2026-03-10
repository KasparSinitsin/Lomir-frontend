export const formatDisplayName = (member) => {
  const first = member.firstName || member.first_name || "";
  const last = member.lastName || member.last_name || "";
  const username = member.username || "";

  // fallback if no names exist
  if (!first && !last) return username || "Unknown";

  const fullName = `${first} ${last}`.trim();

  // If the name is short enough, use it directly
  if (fullName.length <= 18) return fullName;

  // If long → shorten middle names to initials
  const parts = fullName.split(" ");

  if (parts.length >= 3) {
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    const middleInitials = parts
      .slice(1, -1)
      .map((n) => `${n.charAt(0)}.`)
      .join(" ");

    return `${firstName} ${middleInitials} ${lastName}`;
  }

  // fallback
  return fullName;
};