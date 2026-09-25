#[derive(Accounts)]
pub struct CancelVersus<'info> {
    pub player: Signer<'info>,
    #[account(mut, close = player, has_one = player)]
    pub round: Account<'info, Round>,
}

pub fn handle_cancel_versus(ctx: Context<CancelVersus>) -> Result<()> {
    require!(ctx.accounts.round.mode == MODE_VERSUS, ErrorCode::WrongMode);
    require!(ctx.accounts.round.desk_pick == UNSET_PICK, ErrorCode::DeskLocked);
    Ok(())
}
