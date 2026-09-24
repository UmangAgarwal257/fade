#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct OpenRound<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        init,
        payer = player,
        space = 8 + Round::INIT_SPACE,
        seeds = [b"round", player.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub round: Account<'info, Round>,
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + Score::INIT_SPACE,
        seeds = [b"score", player.key().as_ref()],
        bump
    )]
    pub score: Account<'info, Score>,
    pub system_program: Program<'info, System>,
}

pub fn handle_open_round(
    ctx: Context<OpenRound>,
    nonce: u64,
    mode: u8,
    prompt: u8,
    mints: [Pubkey; 4],
    price_hash: [u8; 32],
    desk: Pubkey,
) -> Result<()> {
    require!(mode == MODE_SOLO || mode == MODE_VERSUS, ErrorCode::BadMode);
    require!(validate_prompt(prompt), ErrorCode::BadPrompt);
    if mode == MODE_SOLO {
        require!(desk == Pubkey::default(), ErrorCode::WrongMode);
    } else {
        require!(desk != Pubkey::default() && desk != ctx.accounts.player.key(), ErrorCode::WrongMode);
    }
    for (i, mint) in mints.iter().enumerate() {
        require!(ALLOWED_MINTS.contains(mint), ErrorCode::BadMint);
        require!(!mints[..i].contains(mint), ErrorCode::DuplicateMint);
    }

    let round = &mut ctx.accounts.round;
    round.player = ctx.accounts.player.key();
    round.desk = desk;
    round.nonce = nonce;
    round.mode = mode;
    round.prompt = prompt;
    round.mints = mints;
    round.price_hash = price_hash;
    round.player_pick = UNSET_PICK;
    round.desk_pick = UNSET_PICK;
    round.bump = ctx.bumps.round;

    let score = &mut ctx.accounts.score;
    if score.player == Pubkey::default() {
        score.player = ctx.accounts.player.key();
        score.bump = ctx.bumps.score;
    }

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.round.to_account_info(),
            },
        ),
        STAKE_LAMPORTS,
    )?;
    Ok(())
}
