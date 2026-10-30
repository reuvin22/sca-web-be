import { getExtension } from "../../middlewares/upload.middleware";
import { ApiError } from "../../utils/apiError";
import { nowIso } from "../../utils/date";
import { decryptOptional, encryptOptional } from "../../utils/encryption";
import { dataOrNotFound, usersCollection } from "../../utils/firestore";
import { deleteObject, readEncryptedObject, saveEncryptedObject } from "../../utils/storage";
import type { UploadedFile } from "../file/file.types";
import { PHOTO_TYPES } from "./profile.photo";
import type { ProfilePhoto, School, UpdateProfileInput, UserDoc } from "./profile.types";

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
// `photoUpdatedAt` is null without a photo; the picture itself is loaded from GET /profile/photo.
function toProfile(id: string, user: UserDoc) {
  return {
    user: {
      id,
      fullName: user.name,
      email: user.email,
      role: user.role,
      phone: decryptOptional(user.phone),
      photoUpdatedAt: user.photo?.updatedAt ?? null,
    },
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

async function getUserPhoto(userId: string): Promise<ProfilePhoto | null> {
  const user = dataOrNotFound<UserDoc>(await usersCollection.doc(userId).get(), "User");
  return user.photo ?? null;
}

// One photo per user. A new upload replaces the old one (same storage key).
export async function uploadPhoto(userId: string, upload: UploadedFile) {
  const photo: ProfilePhoto = {
    storageKey: `${userId}/profile-photo`,
    mimeType: PHOTO_TYPES[getExtension(upload.originalname)],
    updatedAt: nowIso(),
  };
  await saveEncryptedObject(photo.storageKey, upload.buffer);
  await usersCollection.doc(userId).update({ photo });
  return getProfile(userId);
}

export async function getPhoto(userId: string) {
  const photo = await getUserPhoto(userId);
  if (!photo) throw new ApiError(404, "No profile photo");
  return { mimeType: photo.mimeType, content: await readEncryptedObject(photo.storageKey) };
}

export async function deletePhoto(userId: string) {
  const photo = await getUserPhoto(userId);
  if (photo) {
    await deleteObject(photo.storageKey);
    await usersCollection.doc(userId).update({ photo: null });
  }
  return getProfile(userId);
}
