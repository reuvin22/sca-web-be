import { getExtension } from "../../middlewares/upload.middleware";
import { rolesOf } from "../../utils/roles";
import { decryptAddress, encryptAddress, phoneHash } from "../../utils/address";
import { ApiError } from "../../utils/apiError";
import { nowIso } from "../../utils/date";
import { decryptOptional, encryptOptional, lookupHashes } from "../../utils/encryption";
import { dataOrNotFound, usersCollection } from "../../utils/firestore";
import { deleteObject, readEncryptedObject, saveEncryptedObject } from "../../utils/storage";
import type { UploadedFile } from "../file/file.types";
import { PHOTO_TYPES } from "./profile.photo";
import type { ProfilePhoto, UpdateProfileInput, UserDoc } from "./profile.types";
import { emailQueries, encodeUser, readUser } from "./profile.user";

// Same shape the frontend stores: { user, school }. Never includes the password hash.
// `photoUpdatedAt` is null without a photo; the picture itself is loaded from GET /profile/photo.
function toProfile(id: string, raw: UserDoc) {
  const { name, email, role, school } = readUser(raw);
  return {
    user: {
      id,
      fullName: name,
      email,
      role,
      phone: decryptOptional(raw.phone),
      address: decryptAddress(raw.address), // null until set
      photoUpdatedAt: raw.photo?.updatedAt ?? null,
      accessRoles: rolesOf(raw),
    },
    school,
  };
}

export async function getProfile(userId: string) {
  const user = dataOrNotFound<UserDoc>(await usersCollection.doc(userId).get(), "User");
  return toProfile(userId, user);
}

export async function updateProfile(userId: string, { user, school }: UpdateProfileInput) {
  const sameEmail = await Promise.all(emailQueries(user.email).map((query) => query.get()));
  if (sameEmail.flatMap((snapshot) => snapshot.docs).some((doc) => doc.id !== userId)) {
    throw new ApiError(409, "An account with this email already exists");
  }
  const samePhone = await usersCollection.where("phoneHash", "in", lookupHashes(`phone:${user.phone}`)).limit(2).get();
  if (samePhone.docs.some((doc) => doc.id !== userId)) {
    throw new ApiError(409, "An account with this mobile number already exists");
  }

  const ref = usersCollection.doc(userId);
  await ref.update({
    ...encodeUser({ name: user.fullName, email: user.email, role: user.role, school }),
    phone: encryptOptional(user.phone),
    phoneHash: phoneHash(user.phone),
    address: encryptAddress(user.address),
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
