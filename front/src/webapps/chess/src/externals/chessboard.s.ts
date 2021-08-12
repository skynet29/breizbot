declare namespace ChessBoard {

    type Orientation =  'black' | 'white';

    interface Options {
        draggable: boolean; 
        pieceTheme: (pieceCode: string) => string;
        onDragStart: (source: string, piece: string, position: string, orientation: Orientation) => void;
        onDrop: (source: string, target: string, piece: string, newPos: string, oldPos: string, orientation: Orientation) => void;
    }
    
    interface Interface {
        clear(): void;
        orientation(o: Orientation): void;
        start(): void;
        move(pos: string): void;
    }

}


declare function Chessboard(id: string, options?: ChessBoard.Options): ChessBoard.Interface;