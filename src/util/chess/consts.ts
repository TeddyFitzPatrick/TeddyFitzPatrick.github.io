function loadImage(src: string) {
    const img = new Image();
    img.src = src;
    return img;
}
export const pieceImages: Map<number, HTMLImageElement> = new Map([
    [1, loadImage("/chess/whitePawn.png")],
    [-1, loadImage("/chess/blackPawn.png")],
    [2, loadImage("/chess/whiteKnight.png")],
    [-2, loadImage("/chess/blackKnight.png")],
    [3, loadImage("/chess/whiteBishop.png")],
    [-3, loadImage("/chess/blackBishop.png")],
    [4, loadImage("/chess/whiteRook.png")],
    [-4, loadImage("/chess/blackRook.png")],
    [5, loadImage("/chess/whiteQueen.png")],
    [-5, loadImage("/chess/blackQueen.png")],
    [6, loadImage("/chess/whiteKing.png")],
    [-6, loadImage("/chess/blackKing.png")],
]);
export const pieceMovements: Record<number, Array<[number, number]>> = {
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
} as const;

export const Color = {
    WHITE: 1,
    BLACK: -1,
} as const;
