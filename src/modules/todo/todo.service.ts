import { userCollection } from "../../utils/firestore";
import type { BoardInput } from "./todo.types";

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
  // The data was validated with boardSchema before it was saved
  return doc.exists ? (doc.data() as BoardInput) : DEFAULT_BOARD;
}

// Replaces the whole board
export async function saveBoard(userId: string, board: BoardInput) {
  await boardRef(userId).set(board);
  return board;
}
