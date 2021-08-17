declare namespace chess {
    interface Movement {
        from: string;
        to: string;
        promotion: string;
    }
}

declare class Chess {
    constructor();

    game_over(): boolean;
    in_checkmate(): boolean;
    in_draw(): boolean;
    in_check(): booolean;
    turn(): 'b' | 'w';

    moves(p: {
        square: string,
        verbose: boolean
      }): Array<chess.Movement>;

    move(m: chess.Movement): void;
} 