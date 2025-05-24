import { board } from "./chess.js";
import { Piece } from "./consts.js";

export class Move {
    /* Contains basic move data */
    constructor(fromRank, fromFile, toRank, toFile) {
        // Piece moved
        this.piece = board[fromRank][fromFile];
        // Coordinates
        this.fromRank = fromRank;
        this.fromFile = fromFile;
        this.toRank = toRank;
        this.toFile = toFile;
        // Piece captured on move
        this.capturedPiece = board[toRank][toFile];
    }
    
    /* Apply the move on the board */
    apply(){
        board[this.toRank][this.toFile] = this.piece;
        board[this.fromRank][this.fromFile] = Piece.EMPTY;
    }

    /* Undo the move from the board */
    undo(){
        board[this.toRank][this.toFile] = this.capturedPiece;
        board[this.fromRank][this.fromFile] = this.piece;
    }
}