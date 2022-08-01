import { Address, BigDecimal, BigInt, Bytes, store } from '@graphprotocol/graph-ts';
import { constants, decimals, events, transactions } from '@amxx/graphprotocol-utils';
import { Account, Erc20Approval, Erc20Balance, Erc20Contract, Erc20Transfer, Transaction } from '../generated/schema';
import { TestCoin as TestCoinContract, Transfer as TransferEvent, Approval as ApprovalEvent } from '../generated/TestCoin/TestCoin';

function fetchAccount(address: Address): Account {
  const accountId = address.toHexString();
  let account = Account.load(accountId);

  if (account == null) {
    account = new Account(accountId);
    account.save();
  }

  return account as Account;
}

function fetchErc20(address: Address): Erc20Contract {
  const contractId = address.toHexString();
  let contract = Erc20Contract.load(contractId);

  if (contract == null) {
    const endpoint = TestCoinContract.bind(address);
    const name = endpoint.try_name();
    const symbol = endpoint.try_symbol();
    const decimals = endpoint.try_decimals();

    contract = new Erc20Contract(contractId);
    contract.name = name.reverted ? null : name.value;
    contract.symbol = symbol.reverted ? null : symbol.value;
    contract.decimals = decimals.reverted ? 18 : decimals.value;
    contract.totalSupply = fetchErc20Balance(contract as Erc20Contract, null).id;
    contract.asAccount = contractId;
    contract.save();

    let account = fetchAccount(address);
    account.asErc20 = contractId;
    account.save();
  }

  return contract as Erc20Contract;
}

function fetchErc20Balance(contract: Erc20Contract, account: Account | null): Erc20Balance {
  const balanceId = contract.id + '-' + (account ? account.id : 'totalSupply');
  let balance = Erc20Balance.load(balanceId);

  if (balance == null) {
    balance = new Erc20Balance(balanceId);
    balance.contract = contract.id;
    balance.account = account ? account.id : null;
    balance.value = constants.BIGDECIMAL_ZERO;
    balance.valueExact = constants.BIGINT_ZERO;
    balance.save();
  }

  return balance as Erc20Balance;
}

function fetchErc20Approval(contract: Erc20Contract, owner: Account, spender: Account): Erc20Approval {
  const approvalId = contract.id + '-' + owner.id + '-' + spender.id;
  let approval = Erc20Approval.load(approvalId);

  if (approval == null) {
    approval = new Erc20Approval(approvalId);
    approval.contract = contract.id;
    approval.owner = owner.id;
    approval.spender = spender.id;
    approval.value = constants.BIGDECIMAL_ZERO;
    approval.valueExact = constants.BIGINT_ZERO;
  }

  return approval as Erc20Approval;
}

function fetchTransaction(hash: Bytes, timestamp: BigInt, blockNumber: BigInt): Transaction {
  const transactionId = hash.toHexString();
  let trx = Transaction.load(transactionId);

  if (trx == null) {
    trx = new Transaction(transactionId);
    trx.timestamp = timestamp;
    trx.blockNumber = blockNumber;
    trx.save();
  }

  return trx as Transaction;
}

// event Transfer(address indexed from, address indexed to, uint256 value);
export function handleTransfer(event: TransferEvent): void {
  const contract = fetchErc20(event.address);
  const trx = fetchTransaction(event.transaction.hash, event.block.timestamp, event.block.number);

  const erc20TransferId = trx.id + '-' + event.logIndex.toString();
  let erc20Transfer = new Erc20Transfer(erc20TransferId);
  erc20Transfer.emitter = contract.id;
  erc20Transfer.transaction = trx.id;
  erc20Transfer.timestamp = event.block.timestamp;
  erc20Transfer.contract = contract.id;
  erc20Transfer.value = decimals.toDecimals(event.params.value, contract.decimals);
  erc20Transfer.valueExact = event.params.value;

  if (event.params.from == Address.zero()) {
    let totalSupply = fetchErc20Balance(contract, null);
    totalSupply.valueExact = totalSupply.valueExact.plus(event.params.value);
    totalSupply.value = decimals.toDecimals(totalSupply.valueExact, contract.decimals);
    totalSupply.save();
  } else {
    const fromAccount = fetchAccount(event.params.from);
    let balance = fetchErc20Balance(contract, fromAccount);
    balance.valueExact = balance.valueExact.minus(event.params.value);
    balance.value = decimals.toDecimals(balance.valueExact, contract.decimals);
    balance.save();

    erc20Transfer.from = fromAccount.id;
    erc20Transfer.fromBalance = balance.id;
  }

  if (event.params.to == Address.zero()) {
    let totalSupply = fetchErc20Balance(contract, null);
    totalSupply.valueExact = totalSupply.valueExact.minus(event.params.value);
    totalSupply.value = decimals.toDecimals(totalSupply.valueExact, contract.decimals);
    totalSupply.save();
  } else {
    const toAccount = fetchAccount(event.params.to);
    let balance = fetchErc20Balance(contract, toAccount);
    balance.valueExact = balance.valueExact.plus(event.params.value);
    balance.value = decimals.toDecimals(balance.valueExact, contract.decimals);
    balance.save();

    erc20Transfer.to = toAccount.id;
    erc20Transfer.toBalance = balance.id;
  }

  erc20Transfer.save();
}

// event Approval(address indexed owner, address indexed spender, uint256 value);
export function handleApproval(event: ApprovalEvent): void {
  const contract = fetchErc20(event.address);
  const owner = fetchAccount(event.params.owner);
  const spender = fetchAccount(event.params.spender);

  let approval = fetchErc20Approval(contract, owner, spender);
  approval.valueExact = event.params.value;
  approval.value = decimals.toDecimals(event.params.value, contract.decimals);
  approval.save();
}
