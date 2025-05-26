import { loadImage } from "./chess.js";

export const pieceImages = new Map([
    [1, loadImage("../assets/chessAssets/whitePawn.png")],
    [-1, loadImage("../assets/chessAssets/blackPawn.png")],
    [2, loadImage("../assets/chessAssets/whiteKnight.png")],
    [-2, loadImage("../assets/chessAssets/blackKnight.png")],
    [3, loadImage("../assets/chessAssets/whiteBishop.png")],
    [-3, loadImage("../assets/chessAssets/blackBishop.png")],
    [4, loadImage("../assets/chessAssets/whiteRook.png")],
    [-4, loadImage("../assets/chessAssets/blackRook.png")],
    [5, loadImage("../assets/chessAssets/whiteQueen.png")],
    [-5, loadImage("../assets/chessAssets/blackQueen.png")],
    [6, loadImage("../assets/chessAssets/whiteKing.png")],
    [-6, loadImage("../assets/chessAssets/blackKing.png")],
]);
export const pieceMovements = {
    2: [
        [-2, -1],
        [-2, 1], // Knight
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
    ],
    3: [
        [-1, -1],
        [-1, 1], // Bishop
        [1, -1],
        [1, 1],
    ],
    4: [
        [-1, 0],
        [1, 0], // Rook
        [0, -1],
        [0, 1],
    ],
    5: [
        [-1, -1],
        [-1, 1], // Queen
        [1, -1],
        [1, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ],
    6: [
        [-1, -1],
        [-1, 1], // King
        [1, -1],
        [1, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
    ],
};
export const pieceValues = new Map([
    [1, 1],
    [2, 3],
    [3, 3],
    [4, 5],
    [5, 9],
    [6, 1000000]
]);
/* Piece Encodings */
export const Piece = {
    EMPTY: 0,
    WHITE_PAWN: 1,
    BLACK_PAWN: -1,
    WHITE_KNIGHT: 2,
    BLACK_KNIGHT: -2,
    WHITE_BISHOP: 3,
    BLACK_BISHOP: -3,
    WHITE_ROOK: 4,
    BLACK_ROOK: -4,
    WHITE_QUEEN: 5,
    BLACK_QUEEN: -5,
    WHITE_KING: 6,
    BLACK_KING: -6,
};

export const Color = {
    WHITE: 1,
    BLACK: -1,
};
