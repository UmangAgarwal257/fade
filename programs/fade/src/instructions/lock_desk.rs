#[derive(Accounts)]
pub struct LockDesk<'info> {
    #[account(mut)]
    pub desk: Signer<'info>,
    #[account(mut, has_one = desk)]
    pub round: Account<'info, Round>,
    pub system_program: Program<'info, System>,
}

pub fn handle_lock_desk(ctx: Context<LockDesk>, pick: u8) -> Result<()> {
    require!(ctx.accounts.round.mode == MODE_VERSUS, ErrorCode::WrongMode);
    require!(pick < 4, ErrorCode::BadPick);
    require!(ctx.accounts.round.desk_pick == UNSET_PICK, ErrorCode::AlreadyPicked);
    ctx.accounts.round.desk_pick = pick;
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.desk.to_account_info(),
                to: ctx.accounts.round.to_account_info(),
            },
        ),
        STAKE_LAMPORTS,
    )?;
    Ok(())
}
