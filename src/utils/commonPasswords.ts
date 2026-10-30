// Passwords that are tried first when accounts are attacked (from public breach lists).
// New passwords can't be one of these, ignoring letter case.
export const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword1",
  "12345678", "123456789", "1234567890", "12341234", "11111111", "00000000", "87654321", "123123123",
  "qwerty123", "qwertyuiop", "qwerty12", "1qaz2wsx", "1q2w3e4r", "1q2w3e4r5t", "zaq12wsx", "asdf1234",
  "abc12345", "abcd1234", "abc123456", "iloveyou1", "iloveyou2", "letmein1", "welcome1", "welcome123",
  "admin123", "admin1234", "administrator1", "monkey123", "dragon123", "sunshine1", "princess1", "football1",
  "baseball1", "superman1", "batman123", "trustno1", "master123", "shadow123", "michael1", "charlie1",
  "jesus123", "god12345", "pokemon1", "computer1", "internet1", "starwars1", "whatever1", "freedom1",
  "changeme1", "test1234", "testing123", "guest1234", "user1234", "login123", "secret123", "default1",
  "school123", "teacher1", "student1", "student123", "guidance1", "counselor1", "deped123", "deped2024",
  "deped2025", "deped2026", "philippines1", "pilipinas1", "mahalkita1", "iloveu123", "manila123", "maganda123",
]);

export const isCommonPassword = (password: string) => COMMON_PASSWORDS.has(password.toLowerCase());
