use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Mode must be solo or versus")]
    BadMode,
    #[msg("Prompt must be cheapest or richest")]
    BadPrompt,
    #[msg("Mint is not a PreStocks mint")]
    BadMint,
    #[msg("Hand contains a duplicate mint")]
    DuplicateMint,
    #[msg("Pick is out of range")]
    BadPick,
    #[msg("Pick is already locked")]
    AlreadyPicked,
    #[msg("Desk has not locked a pick")]
    DeskNotReady,
    #[msg("Price hash does not match the committed hand")]
    HashMismatch,
    #[msg("Mark price must be greater than zero")]
    BadPrice,
    #[msg("This instruction does not match the round mode")]
    WrongMode,
}
