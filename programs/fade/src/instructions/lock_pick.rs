#[derive(Accounts)]
pub struct LockPick<'info> {
    pub player: Signer<'info>,
    #[account(mut, has_one = player)]
    pub round: Account<'info, Round>,
}

pub fn handle_lock_pick(ctx: Context<LockPick>, pick: u8) -> Result<()> {
    require!(pick < 4, ErrorCode::BadPick);
    require!(ctx.accounts.round.player_pick == UNSET_PICK, ErrorCode::AlreadyPicked);
    ctx.accounts.round.player_pick = pick;
    Ok(())
}
