use crate::engine::workflow_step::WorkflowStep;
use crate::engine::workflow_step::WorkflowStepResult;
use crate::utils::get_mint_address;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{account_info::AccountInfo, msg, pubkey::Pubkey};

// pub type Address = [u8; 32];
pub type ChainID = u16;
// pub type ForeignAddress = [u8; 32];

#[cfg(feature = "devnet")]
pub mod wormhole_core {
    solana_program::declare_id!("3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5");
}

#[cfg(feature = "devnet")]
pub mod wormhole_token {
    solana_program::declare_id!("DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe");
}

#[cfg(feature = "mainnet")]
pub mod wormhole_core {
    solana_program::declare_id!("worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth");
}

#[cfg(feature = "mainnet")]
pub mod wormhole_token {
    solana_program::declare_id!("wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb");
}

#[derive(BorshDeserialize, BorshSerialize, Default, Debug, Copy, Clone)]
pub struct WormholeArgs {
    pub from_account_index: u16, // from token address
    pub nonce: u32,              // it's hard to generate random numbers on-chain
    pub from_idx: u16,           // either the user's account our fmp escrow account
    pub payer_idx: Pubkey,       // I think payer can pay feeds instead so probably not needed
    pub target_address_idx: u16,
    pub target_chain: ChainID,
    pub token_address_idx: Pubkey, // pub message_key: Pubkey,  I think this can be generated by wfe or should it be ForeignAddress,
    pub token_chain: u16,

    // below probably not needed
    pub from_owner: Pubkey,             // forget what this is
    pub fee_collector_account_idx: u16, // index of the fee collector within the accounts array
    pub fee: u64,                       // fee to relayers (how does the caller set this?)
}

#[derive(Default, Debug, Copy, Clone)]
pub struct WormholeStep {
    pub args: Option<WormholeArgs>,
}

impl WorkflowStep for WormholeStep {
    fn name(&self) -> &'static str {
        return "WormholeStep";
    }

    fn deserialize_step_data(&mut self, step_args: &Vec<u8>) {
        self.args = Some(WormholeArgs::try_from_slice(&step_args).unwrap());
    }

    fn get_from_mint_address(&self, accounts: &[AccountInfo]) -> Pubkey {
        let args = self.args.as_ref().unwrap();
        let from_idx: usize = args.from_account_index.into();
        return get_mint_address(&accounts[from_idx]);
    }

    fn execute(&self, _program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> WorkflowStepResult {
        msg!("entering wormhole");
        let args = self.args.as_ref().unwrap();
        msg!("nonce {}", args.nonce);
        let from_idx: usize = args.from_account_index.into();
        // let associated_address = get_associated_token_address(&x.from, &x.token_address);
        // msg!("got associated address {}", associated_address);
        return WorkflowStepResult {
            from_mint_address: Some(get_mint_address(&accounts[from_idx])),
            to_mint_address: None,
            amount,
        };
    }
}

pub static WORMHOLE_STEP: WormholeStep = WormholeStep { args: None };

pub fn instance() -> Box<dyn WorkflowStep> {
    return Box::new(WORMHOLE_STEP);
}

// from javascript sdk
//   : transfer_wrapped_ix(
// 1      tokenBridgeAddress,
// 2      bridgeAddress,   <-- core bridge
// 3      payerAddress,
// 4      messageKey.publicKey.toString(),
// 5      fromAddress,
// 6      fromOwnerAddress || payerAddress,
// 7      originChainId as number, // checked by isSolanaNative
// 8      originAddress as Uint8Array, // checked by throw
// 9      nonce,
// 0      amount.valueOf(),
// 1      relayerFee.valueOf(),
// 2      targetAddress,
// 3      coalesceChainId(targetChain)
//     )

// this takes strings instead of Pubkey's etc because it's actually a js wasm thing
// in rust:

// let ix = transfer_wrapped(
// 1    program_id,
// 2    bridge_id,
// 3    payer,
// 4    message,
// 5    from,
// 6    from_owner,
// 7    token_chain,
// 8    token_addr,
// 9    TransferWrappedData {
//         nonce,
//         amount,
//         fee,
//         target_address: target_addr,
//         target_chain,
//     },
// )

// THIS IS WHAT WE CALL TO CREATE THE IX
// pub fn transfer_wrapped(
//     program_id: Pubkey,
//     bridge_id: Pubkey,
//     payer: Pubkey,
//     message_key: Pubkey,
//     from: Pubkey,
//     from_owner: Pubkey,
//     token_chain: u16,
//     token_address: ForeignAddress,
//     data: TransferWrappedData,
// ) -> solitaire::Result<Instruction> {

// pub struct TransferWrappedData {
//     pub nonce: u32,
//     pub amount: u64,
//     pub fee: u64,
//     pub target_address: Address,
//     pub target_chain: ChainID,
// }

// in transferFromSolana:
// I guess this is  a fee charged by wh
//   const transferIx = await getBridgeFeeIx(
//     connection,
//     bridgeAddress,
//     payerAddress
//   );
// approveIx is a normal spl approve
// ix basically comes back from wasm, and

//   const transaction = new SolanaTransaction().add(transferIx, approvalIx, ix);
