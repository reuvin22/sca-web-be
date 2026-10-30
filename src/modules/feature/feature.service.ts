import { db } from "../../config/firebase";
import { ApiError } from "../../utils/apiError";
import { includesText } from "../../utils/firestore";
import { paginateArray, type PaginationQuery } from "../../utils/pagination";
import { supportCollection } from "../support/support.service";
import type { SupportRequestDoc } from "../support/support.types";
import type { FeatureQuery } from "./feature.types";

// Feature requests page: every user can see them and vote on approved ones.
// They are the "feature" reports from Contact Support (reviewed by developers on their board).

type FeatureDoc = SupportRequestDoc & { id: string };

const reviewOf = (feature: FeatureDoc) => feature.review ?? "under-review";
const votesOf = (feature: FeatureDoc) => feature.votes ?? 0;

// Most votes first; on a tie, the request sent first comes first
const byVotes = (a: FeatureDoc, b: FeatureDoc) => votesOf(b) - votesOf(a) || a.createdAt.localeCompare(b.createdAt);

// All feature requests. Small enough to sort and rank in code (votes change all the time).
async function loadFeatures(): Promise<FeatureDoc[]> {
  const snapshot = await supportCollection.where("type", "==", "feature").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as SupportRequestDoc) }));
}

// Rank (#1, #2, …) of each approved request by votes
function rankApproved(features: FeatureDoc[]) {
  const approved = features.filter((feature) => reviewOf(feature) === "approved").sort(byVotes);
  return new Map(approved.map((feature, index) => [feature.id, index + 1]));
}

// Safe for any user: no reporter details except whether it is yours, no voter list
function toFeature(feature: FeatureDoc, userId: string, ranks: Map<string, number>) {
  return {
    id: feature.id,
    subject: feature.subject,
    description: feature.description,
    review: reviewOf(feature),
    votes: votesOf(feature),
    voted: (feature.voterIds ?? []).includes(userId),
    rank: ranks.get(feature.id) ?? null, // approved only
    mine: feature.reporter.userId === userId,
    column: feature.status, // board column; "done" = built
    updateId: feature.updateId, // the published system update, once implemented
    createdAt: feature.createdAt,
  };
}

// Review filter ("all" = everything except rejected), then optionally the board column
function matchesFilters(feature: FeatureDoc, { status, progress }: Pick<FeatureQuery, "status" | "progress">) {
  const reviewMatches = status === "all" ? reviewOf(feature) !== "rejected" : reviewOf(feature) === status;
  return reviewMatches && (!progress || feature.status === progress);
}

// Requests matching the filters, most votes first, with search
export async function listFeatures(userId: string, { status, progress, search, page, limit }: FeatureQuery) {
  const features = await loadFeatures();
  const ranks = rankApproved(features);
  const matching = features
    .filter((feature) => matchesFilters(feature, { status, progress }))
    .filter((feature) => includesText(`${feature.subject} ${feature.description}`, search))
    .sort(byVotes);
  const { items, pagination } = paginateArray(matching, { page, limit });
  return { features: items.map((feature) => toFeature(feature, userId, ranks)), pagination };
}

// The signed-in user's own requests (every status), most votes first
export async function listMyFeatures(userId: string, pagination: PaginationQuery) {
  const features = await loadFeatures();
  const ranks = rankApproved(features);
  const mine = features.filter((feature) => feature.reporter.userId === userId).sort(byVotes);
  const { items, pagination: meta } = paginateArray(mine, pagination);
  return { features: items.map((feature) => toFeature(feature, userId, ranks)), pagination: meta };
}

// One vote per user: votes when not voted yet, otherwise takes the vote back.
// A transaction keeps the count right when many people vote at once.
export async function toggleVote(userId: string, id: string) {
  const ref = supportCollection.doc(id);
  return db.runTransaction(async (transaction) => {
    const feature = (await transaction.get(ref)).data() as SupportRequestDoc | undefined;
    if (!feature || feature.type !== "feature") throw new ApiError(404, "Feature request not found");
    if ((feature.review ?? "under-review") !== "approved") {
      throw new ApiError(400, "Only approved feature requests can be voted on");
    }

    const voters = feature.voterIds ?? [];
    const voted = !voters.includes(userId);
    const voterIds = voted ? [...voters, userId] : voters.filter((voter) => voter !== userId);
    transaction.update(ref, { voterIds, votes: voterIds.length });
    return { id, votes: voterIds.length, voted };
  });
}
