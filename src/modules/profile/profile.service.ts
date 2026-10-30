import { ApiError } from "../../utils/apiError";
import { decryptOptional, encryptOptional } from "../../utils/encryption";
import { dataOrNotFound, usersCollection } from "../../utils/firestore";
import type { School, UpdateProfileInput, UserDoc } from "./profile.types";

export const EMPTY_SCHOOL: School = {
  name: "",
  schoolId: "",
  region: "",
  division: "",
  schoolYear: "",
  reportingMonth: "",
  schoolHead: "",
  privacy: "",
};

// Same shape the frontend stores: { user, school }. Never includes the password hash.
function toProfile(id: string, user: UserDoc) {
  return {
    user: { id, fullName: user.name, email: user.email, role: user.role, phone: decryptOptional(user.phone) },
    school: { ...EMPTY_SCHOOL, ...user.school },
  };
}

export async function getProfile(userId: string) {
  const user = dataOrNotFound<UserDoc>(await usersCollection.doc(userId).get(), "User");
  return toProfile(userId, user);
}

export async function updateProfile(userId: string, { user, school }: UpdateProfileInput) {
  const sameEmail = await usersCollection.where("email", "==", user.email).limit(1).get();
  if (sameEmail.docs.some((doc) => doc.id !== userId)) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const ref = usersCollection.doc(userId);
  await ref.update({
    name: user.fullName,
    email: user.email,
    role: user.role,
    phone: encryptOptional(user.phone),
    school,
  });
  return getProfile(userId);
}
