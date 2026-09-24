#[derive(Accounts)]
pub struct SettleVersus<'info> {
    #[account(mut, close = player, has_one = player, has_one = desk)]
    pub round: Account<'info, Round>,
    /// CHECK: rent and the player's stake return here.
    #[account(mut)]
    pub player: UncheckedAccount<'info>,
    /// CHECK: the desk's stake returns here, or both stakes when the desk wins.
    #[account(mut)]
    pub desk: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"score", round.player.as_ref()], bump = score.bump)]
    pub score: Account<'info, Score>,
}

pub fn handle_settle_versus(ctx: Context<SettleVersus>, marks: [u64; 4], tokens: [u64; 4]) -> Result<()> {
    let round = &ctx.accounts.round;
    require!(round.mode == MODE_VERSUS, ErrorCode::WrongMode);
    require!(round.player_pick != UNSET_PICK, ErrorCode::DeskNotReady);
    require!(round.desk_pick != UNSET_PICK, ErrorCode::DeskNotReady);
    for mark in marks {
        require!(mark > 0, ErrorCode::BadPrice);
    }
    let digest = hash_prices(&round.mints, &marks, &tokens);
    require!(digest == round.price_hash, ErrorCode::HashMismatch);

    let player_points = points_for(round.prompt, round.player_pick, &marks, &tokens);
    let desk_points = points_for(round.prompt, round.desk_pick, &marks, &tokens);
    let score = &mut ctx.accounts.score;
    score.points = score.points.saturating_add(player_points as u32);
    score.rounds = score.rounds.saturating_add(1);

    let desk_payout = if desk_points > player_points {
        STAKE_LAMPORTS.saturating_mul(2)
    } else if desk_points == player_points {
        STAKE_LAMPORTS
    } else {
        0
    };
    if desk_payout > 0 {
        move_lamports(
            &ctx.accounts.round.to_account_info(),
            &ctx.accounts.desk.to_account_info(),
            desk_payout,
        )?;
    }

    emit!(RoundSettled {
        player: round.player,
        nonce: round.nonce,
        player_points,
        desk_points,
    });
    Ok(())
}

fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    let mut from_lamports = from.try_borrow_mut_lamports()?;
    let mut to_lamports = to.try_borrow_mut_lamports()?;
    **from_lamports = from_lamports
        .checked_sub(amount)
        .ok_or(ErrorCode::BadPrice)?;
    **to_lamports = to_lamports
        .checked_add(amount)
        .ok_or(ErrorCode::BadPrice)?;
    Ok(())
}
