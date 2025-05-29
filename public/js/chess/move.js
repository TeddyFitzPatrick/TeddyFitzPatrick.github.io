import { board, castlingRights, enPassant } from "./chess.js";
import { Piece } from "./consts.js";

export class Move {
    /* Contains basic move data */
    constructor(fromRank, fromFile, toRank, toFile) {
        // Piece moved
        this.piece = board[fromRank][fromFile];
        // Store the prior en passant rights if the pawn is moved up twice
        if (Math.abs(this.piece) === Piece.WHITE_PAWN && Math.abs(this.fromRank - this.toRank) === 2){
            this.priorEnPassant = enPassant;
        }
        // Store the prior castling rights if the king or rook moved
        if (Math.abs(this.piece) === Piece.WHITE_ROOK || Math.abs(this.piece) === Piece.WHITE_KING){
            this.priorCastlingRights = structuredClone(castlingRights);
        }
        // Coordinates
        this.fromRank = fromRank;
        this.fromFile = fromFile;
        this.toRank = toRank;
        this.toFile = toFile;
        // Algebraic Coordinates
        this.algebraicNotation = `${String.fromCharCode(97 + toFile)}${8-toRank}`;
        // Piece captured on move
        this.capturedPiece = board[toRank][toFile];
    }
    
    /* Apply the move to the board */
    play(){           
        /* Keep track if a pawn moved up twice for en passant rights */
        if (Math.abs(this.piece) === Piece.WHITE_PAWN && Math.abs(this.fromRank - this.toRank) === 2){
            
        }

        /* Keep track if the king or rook moved to update castling rights */
        // King moved
        castlingRights.white.kingMoved = (this.piece === Piece.WHITE_KING);
        castlingRights.black.kingMoved = (this.piece === Piece.BLACK_KING);
        // Rook moved
        if (this.piece == Piece.WHITE_ROOK) {
            if (this.fromRank == 7 && this.fromFile  == 7) castlingRights.white.shortRookMoved = true;
            if (this.fromRank == 7 && this.fromFile  == 0) castlingRights.white.longRookMoved = true;
        } else if (this.piece == Piece.BLACK_ROOK) {
            if (this.fromRank == 0 && this.fromFile  == 7) castlingRights.black.shortRookMoved = true;
            if (this.fromRank == 0 && this.fromFile  == 0) castlingRights.black.longRookMoved = true;
        }
        /* Move the rook during a castling move*/
        /* Short Castling */
        if (this.fromFile + 2 === this.toFile){
            // White
            if (this.piece === Piece.WHITE_KING){
                board[7][5] = Piece.WHITE_ROOK;
                board[7][7] = Piece.EMPTY;
            }
            // Black
            if (this.piece === Piece.BLACK_KING){
                board[0][5] = Piece.BLACK_ROOK;
                board[0][7] = Piece.EMPTY;
            }
        }
        /* Long Castling */
        if (this.fromFile - 2 === this.toFile){
            // White
            if (this.piece === Piece.WHITE_KING){
                board[7][3] = Piece.WHITE_ROOK;
                board[7][0] = Piece.EMPTY;
            }
            // Black
            if (this.piece === Piece.BLACK_KING){
                board[0][3] = Piece.BLACK_ROOK;
                board[0][0] = Piece.EMPTY;
            }
        }
        /* Exchange the pieces */
        board[this.toRank][this.toFile] = this.piece;
        board[this.fromRank][this.fromFile] = Piece.EMPTY;        
    }

    /* Undo the move from the board */
    undo(){
        /* Move the rook back before castling*/
        /* Short Castling */
        if (this.fromFile + 2 === this.toFile){
            // White
            if (this.piece === Piece.WHITE_KING){
                board[7][7] = Piece.WHITE_ROOK;
                board[7][5] = Piece.EMPTY;
            }
            // Black
            if (this.piece === Piece.BLACK_KING){
                board[0][7] = Piece.BLACK_ROOK;
                board[0][5] = Piece.EMPTY;
            }
        }
        /* Long Castling */
        if (this.fromFile - 2 === this.toFile){
            // White
            if (this.piece === Piece.WHITE_KING){
                board[7][0] = Piece.WHITE_ROOK;
                board[7][3] = Piece.EMPTY;
            }
            // Black
            if (this.piece === Piece.BLACK_KING){
                board[0][0] = Piece.BLACK_ROOK;
                board[0][3] = Piece.EMPTY;
            }
        }
        /* Reset en passant rights to its state before the move */
        Object.assign(enPassant, structuredClone(this.priorEnPassant));

        /* Reset castling rights to its state before the move */
        Object.assign(castlingRights, structuredClone(this.priorCastlingRights));

        /* Move the pieces back */
        board[this.toRank][this.toFile] = this.capturedPiece;
        board[this.fromRank][this.fromFile] = this.piece;
    }
}