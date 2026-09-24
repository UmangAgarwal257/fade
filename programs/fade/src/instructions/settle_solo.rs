#[derive(Accounts)]
pub struct SettleSolo<'info> {
    #[account(mut, close = player, has_one = player)]
    pub round: Account<'info, Round>,
    /// CHECK: lamports destination. Must match the player stored on the round.
    #[account(mut)]
    pub player: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"score", round.player.as_ref()], bump = score.bump)]
    pub score: Account<'info, Score>,
}

pub fn handle_settle_solo(ctx: Context<SettleSolo>, marks: [u64; 4], tokens: [u64; 4]) -> Result<()> {
    let round = &ctx.accounts.round;
    require!(round.mode == MODE_SOLO, ErrorCode::WrongMode);
    require!(round.player_pick != UNSET_PICK, ErrorCode::DeskNotReady);
    for mark in marks {
        require!(mark > 0, ErrorCode::BadPrice);
    }
    let digest = hash_prices(&round.mints, &marks, &tokens);
    require!(digest == round.price_hash, ErrorCode::HashMismatch);

    let player_points = points_for(round.prompt, round.player_pick, &marks, &tokens);
    let score = &mut ctx.accounts.score;
    score.points = score.points.saturating_add(player_points as u32);
    score.rounds = score.rounds.saturating_add(1);

    emit!(RoundSettled {
        player: round.player,
        nonce: round.nonce,
        player_points,
        desk_points: 0,
    });
    Ok(())
}
