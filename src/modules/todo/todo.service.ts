import { decryptJson, encryptJson, isSealed } from "../../utils/encryption";
import { userCollection } from "../../utils/firestore";
import type { BoardDoc, BoardInput } from "./todo.types";

// New users start with these empty columns
const DEFAULT_BOARD: BoardInput = {
  columns: [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ],
  cards: [],
};

// The board is always saved as a whole, so it is one document: users/{userId}/todo/board
const boardRef = (userId: string) => userCollection(userId, "todo").doc("board");

export async function getBoard(userId: string): Promise<BoardInput> {
  const doc = await boardRef(userId).get();
  if (!doc.exists) return DEFAULT_BOARD;

  // The data was validated with boardSchema before it was saved
  const raw = doc.data() as BoardDoc | BoardInput;
  return isSealed(raw) ? decryptJson<BoardInput>(raw.data) : raw;
}

// Replaces the whole board (columns and cards are encrypted together)
export async function saveBoard(userId: string, board: BoardInput) {
  const doc: BoardDoc = { data: encryptJson(board) };
  await boardRef(userId).set(doc);
  return board;
}
