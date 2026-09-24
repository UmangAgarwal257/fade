use anchor_lang::prelude::*;

pub const STAKE_LAMPORTS: u64 = 50_000_000;
pub const UNSET_PICK: u8 = 255;
pub const MODE_SOLO: u8 = 0;
pub const MODE_VERSUS: u8 = 1;
pub const PROMPT_CHEAPEST: u8 = 0;
pub const PROMPT_RICHEST: u8 = 1;

pub const ALLOWED_MINTS: [Pubkey; 8] = [
    pubkey!("PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB"),
    pubkey!("Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw"),
    pubkey!("PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd"),
    pubkey!("PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua"),
    pubkey!("PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S"),
    pubkey!("PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF"),
    pubkey!("Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP"),
    pubkey!("PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh"),
];
