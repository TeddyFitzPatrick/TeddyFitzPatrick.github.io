import { board, castlingRights, enPassant, isInBounds  } from "./chess.tsx";
import { Color, Piece } from "./consts.ts";

export class Move {
    piece: number;
    fromRank: number;
    fromFile: number;
    toRank: number;
    toFile: number;
    capturedPiece: number;
    priorEnPassant: number;
    priorCastlingRights: number;
    constructor(fromRank: number, fromFile: number, toRank: number, toFile: number) {
        // enPassant/castling rights
        this.priorCastlingRights = castlingRights;
        this.priorEnPassant = enPassant;

        this.fromRank = fromRank;
        this.fromFile = fromFile;
        this.toRank = toRank;
        this.toFile = toFile;
        this.piece = board[fromRank][fromFile];
        this.capturedPiece = board[toRank][toFile];
    }
    
    /**
     * 1. Updates en passant rights (if applicable)
     * 2. Capture opponent's pawn during en passant (if applicable)
     * 3. Updates castling rights (if applicable)
     * 4. Moves a rook during a castling move (if applicable)
     * 5. Moves the piece to the new square and sets the old square to Piece.EMPTY 
     * 
     * @param setCastlingRights setter for castling rights
     * @param setEnPassant setter for en passant rights
     */
    play(setCastlingRights: (newCastlingRights: number) => void, setEnPassant: (newEnPassant: number) => void){  
        // update rights
        if (Math.abs(this.piece) === Piece.WHITE_PAWN){
            const opponentPawn = -Math.sign(this.piece) * Piece.WHITE_PAWN;
            // pawn up two enables en passant (expires after next turn)
            if (Math.abs(this.fromRank - this.toRank) === 2){
                const shamt = ((Math.sign(this.piece) === Color.WHITE) ? 7 : 15) - this.toFile;
                setEnPassant(enPassant | (1 << shamt));
            }
            // en passant
            if (this.fromFile !== this.toFile && this.capturedPiece === Piece.EMPTY){
                board[this.fromRank][this.toFile] = Piece.EMPTY;  // capture adjacent pawn
                const shamt = ((Math.sign(this.piece) === Color.WHITE) ? 7 : 15) - this.toFile;
                setEnPassant(enPassant & ~(1 << shamt));
            }
        }
        // expire en-passant two moves after a pawn is moved up twice
        const mask = ((Math.sign(this.piece) === Color.WHITE) ? 0b0000_0000_1111_1111 : 0b1111_1111_0000_0000)
        setEnPassant(enPassant & mask);
        // update castle rights when capturing a rook
        if (this.capturedPiece === Piece.WHITE_ROOK){
            if (this.toFile === 0){
                setCastlingRights(castlingRights & 0b1011);
            } else if (this.toFile === 7){
                setCastlingRights(castlingRights & 0b0111);
            }
        } else if (this.capturedPiece === Piece.BLACK_ROOK){
            if (this.toFile === 0){
                setCastlingRights(castlingRights & 0b1110);
            } else if (this.toFile === 7){
                setCastlingRights(castlingRights & 0b1101);
            }
        }
        // update castle rights when moving a rook or king
        if (this.piece === Piece.WHITE_KING){
            setCastlingRights(castlingRights & 0b0011);
        } else if (this.piece === Piece.BLACK_KING){
            setCastlingRights(castlingRights & 0b1100);
        } else if (this.piece === Piece.WHITE_ROOK) {
            if (this.fromRank == 7 && this.fromFile  == 7) setCastlingRights(castlingRights & 0b0111);
            if (this.fromRank == 7 && this.fromFile  == 0) setCastlingRights(castlingRights & 0b1011);
        } else if (this.piece === Piece.BLACK_ROOK) {
            if (this.fromRank == 0 && this.fromFile  == 7) setCastlingRights(castlingRights & 0b1101);
            if (this.fromRank == 0 && this.fromFile  == 0) setCastlingRights(castlingRights & 0b1110);
        }
        // move rook during a castling move
        if (this.fromFile + 2 === this.toFile){  /* Kingside castling */
            if (this.piece === Piece.WHITE_KING){
                board[7][5] = Piece.WHITE_ROOK;
                board[7][7] = Piece.EMPTY;
            }
            if (this.piece === Piece.BLACK_KING){
                board[0][5] = Piece.BLACK_ROOK;
                board[0][7] = Piece.EMPTY;
            }
        }
        if (this.fromFile - 2 === this.toFile){  /* Queenside castling */
            if (this.piece === Piece.WHITE_KING){
                board[7][3] = Piece.WHITE_ROOK;
                board[7][0] = Piece.EMPTY;
            }
            if (this.piece === Piece.BLACK_KING){
                board[0][3] = Piece.BLACK_ROOK;
                board[0][0] = Piece.EMPTY;
            }
        }
        // move the piece to the new square and empty the old square
        board[this.toRank][this.toFile] = this.piece;
        board[this.fromRank][this.fromFile] = Piece.EMPTY;        
    }

    /**
     * 1. For castling moves, move the rook back to its original position (if applicable)
     * 2. Restore castling rights to prior state
     * 3. Restore en passant rights to prior state
     * 4. Restore the pawn captured during an en passant move (if applicable)
     * 5. Move the piece back to its original square and restore the captured piece (if applicable)
     *  
     * @param setCastlingRights setter for castling rights
     * @param setEnPassant setter for en passant rights
     */
    undo(setCastlingRights: (newCastlingRights: number) => void, setEnPassant: (newEnPassant: number) => void){
        // Move rook back to original position before castling
        /* Kingside Castling */
        if (this.fromFile + 2 === this.toFile){
            if (this.piece === Piece.WHITE_KING){
                board[7][7] = Piece.WHITE_ROOK;
                board[7][5] = Piece.EMPTY;
            }
            if (this.piece === Piece.BLACK_KING){
                board[0][7] = Piece.BLACK_ROOK;
                board[0][5] = Piece.EMPTY;
            }
        }
        /* Queenside Castling */
        if (this.fromFile - 2 === this.toFile){
            if (this.piece === Piece.WHITE_KING){
                board[7][0] = Piece.WHITE_ROOK;
                board[7][3] = Piece.EMPTY;
            }
            if (this.piece === Piece.BLACK_KING){
                board[0][0] = Piece.BLACK_ROOK;
                board[0][3] = Piece.EMPTY;
            }
        }
        // restore rights
        setCastlingRights(this.priorCastlingRights);
        setEnPassant(this.priorEnPassant);
        // restore pawn captured during an en passant
        if (Math.abs(this.piece) === Piece.WHITE_PAWN && this.fromFile !== this.toFile && this.capturedPiece === Piece.EMPTY){
            board[this.fromRank][this.toFile] = -this.piece;
        }
        // move piece back and restore captured piece
        board[this.toRank][this.toFile] = this.capturedPiece;
        board[this.fromRank][this.fromFile] = this.piece;
    }
}