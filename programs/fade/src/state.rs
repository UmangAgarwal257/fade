use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};
use std::cmp::Ordering;

use crate::constants::{PROMPT_CHEAPEST, PROMPT_RICHEST};

#[account]
#[derive(InitSpace)]
pub struct Round {
    pub player: Pubkey,
    pub desk: Pubkey,
    pub nonce: u64,
    pub mode: u8,
    pub prompt: u8,
    pub mints: [Pubkey; 4],
    pub price_hash: [u8; 32],
    pub player_pick: u8,
    pub desk_pick: u8,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Score {
    pub player: Pubkey,
    pub points: u32,
    pub rounds: u32,
    pub bump: u8,
}

#[event]
pub struct RoundSettled {
    pub player: Pubkey,
    pub nonce: u64,
    pub player_points: u8,
    pub desk_points: u8,
}

pub fn price_message(mints: &[Pubkey; 4], marks: &[u64; 4], tokens: &[u64; 4]) -> String {
    let mut out = String::new();
    for i in 0..4 {
        if i > 0 {
            out.push('|');
        }
        out.push_str(&mints[i].to_string());
        out.push(':');
        out.push_str(&marks[i].to_string());
        out.push(':');
        out.push_str(&tokens[i].to_string());
    }
    out
}

pub fn hash_prices(mints: &[Pubkey; 4], marks: &[u64; 4], tokens: &[u64; 4]) -> [u8; 32] {
    Sha256::digest(price_message(mints, marks, tokens).as_bytes()).into()
}

fn premium_cmp(mark_a: u64, token_a: u64, mark_b: u64, token_b: u64) -> Ordering {
    let left = (token_a as i128 - mark_a as i128) * mark_b as i128;
    let right = (token_b as i128 - mark_b as i128) * mark_a as i128;
    left.cmp(&right)
}

pub fn points_for(prompt: u8, pick: u8, marks: &[u64; 4], tokens: &[u64; 4]) -> u8 {
    let pick = pick as usize;
    let mut best = 0usize;
    for i in 1..4 {
        let ord = premium_cmp(marks[i], tokens[i], marks[best], tokens[best]);
        let better = if prompt == PROMPT_CHEAPEST {
            ord == Ordering::Less
        } else {
            ord == Ordering::Greater
        };
        if better {
            best = i;
        }
    }
    let tied = premium_cmp(marks[pick], tokens[pick], marks[best], tokens[best]) == Ordering::Equal;
    if tied {
        return 2;
    }
    let right = if prompt == PROMPT_CHEAPEST {
        tokens[pick] < marks[pick]
    } else {
        tokens[pick] > marks[pick]
    };
    if right {
        1
    } else {
        0
    }
}

pub fn validate_prompt(prompt: u8) -> bool {
    prompt == PROMPT_CHEAPEST || prompt == PROMPT_RICHEST
}

#[cfg(test)]
mod tests {
    use super::*;

    fn prices() -> ([u64; 4], [u64; 4]) {
        (
            [100_000_000, 100_000_000, 100_000_000, 100_000_000],
            [90_000_000, 110_000_000, 100_000_000, 130_000_000],
        )
    }

    #[test]
    fn cheapest_is_the_discount() {
        let (marks, tokens) = prices();
        assert_eq!(points_for(PROMPT_CHEAPEST, 0, &marks, &tokens), 2);
        assert_eq!(points_for(PROMPT_CHEAPEST, 2, &marks, &tokens), 0);
        assert_eq!(points_for(PROMPT_CHEAPEST, 1, &marks, &tokens), 0);
    }

    #[test]
    fn richest_rewards_the_premium_and_the_right_side() {
        let (marks, tokens) = prices();
        assert_eq!(points_for(PROMPT_RICHEST, 3, &marks, &tokens), 2);
        assert_eq!(points_for(PROMPT_RICHEST, 1, &marks, &tokens), 1);
        assert_eq!(points_for(PROMPT_RICHEST, 0, &marks, &tokens), 0);
    }
}
