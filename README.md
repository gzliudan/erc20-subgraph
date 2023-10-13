# erc20-subgraph

The subgraph for ERC20.

## 1. Setup work environment

### 1.1 Resolve host name `graph-node` by edit hosts file:

-   Linux: `/etc/hosts`
-   Windows: `C:\Windows\System32\drivers\etc\hosts`

### 1.2 Install node and yarn

Suggest to use node v16, the package.json requires:

-   node >= 14.0.0
-   yarn >= 1.22.0

## 2. Clone this repo

```shell
git clone https://github.com/gzliudan/erc20-subgraph
cd erc20-subgraph
yarn
```

## 3. Build and deploy

### For apothem chain

```shell
yarn make:apothem && yarn create:apothem && yarn deploy:apothem
```

### For xinfin chain

```shell
yarn make:xinfin && yarn create:xinfin && yarn deploy:xinfin
```

## 3. Query

Endpoints: 

- apothem network: http://<GRAPH-NODE-IP>:8000/subgraphs/name/gzliudan/test-coin-subgraph-apothem
- xinfin network:  http://<GRAPH-NODE-IP>:8000/subgraphs/name/gzliudan/test-coin-subgraph-xinfin

with language:

```graphql
{
    erc20Contracts(first: 5) {
        id
        asAccount {
            id
        }
        name
        symbol
        decimals
        totalSupply {
            value
            valueExact
        }
    }
    accounts(first: 5) {
        id
        asErc20 {
            id
        }
        Erc20balances {
            id
            value
            valueExact
        }
    }
}
```
