pub mod constants;
pub mod error;
pub mod state;

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::error::ErrorCode;

pub use constants::*;
pub use state::*;

include!("instructions/open_round.rs");
include!("instructions/lock_pick.rs");
include!("instructions/lock_desk.rs");
include!("instructions/settle_solo.rs");
include!("instructions/settle_versus.rs");
include!("instructions/cancel_versus.rs");

declare_id!("86WQKVP5aG8EWaMQQhFbcKcfhAq4NyQJj43SG29UeNZm");

#[program]
pub mod fade {
    use super::*;

    pub fn open_round(
        ctx: Context<OpenRound>,
        nonce: u64,
        mode: u8,
        prompt: u8,
        mints: [Pubkey; 4],
        price_hash: [u8; 32],
        desk: Pubkey,
    ) -> Result<()> {
        handle_open_round(ctx, nonce, mode, prompt, mints, price_hash, desk)
    }

    pub fn lock_pick(ctx: Context<LockPick>, pick: u8) -> Result<()> {
        handle_lock_pick(ctx, pick)
    }

    pub fn lock_desk(ctx: Context<LockDesk>, pick: u8) -> Result<()> {
        handle_lock_desk(ctx, pick)
    }

    pub fn settle_solo(
        ctx: Context<SettleSolo>,
        marks: [u64; 4],
        tokens: [u64; 4],
    ) -> Result<()> {
        handle_settle_solo(ctx, marks, tokens)
    }

    pub fn settle_versus(
        ctx: Context<SettleVersus>,
        marks: [u64; 4],
        tokens: [u64; 4],
    ) -> Result<()> {
        handle_settle_versus(ctx, marks, tokens)
    }

    pub fn cancel_versus(ctx: Context<CancelVersus>) -> Result<()> {
        handle_cancel_versus(ctx)
    }
}
