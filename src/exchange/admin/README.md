## query

### 列出 ws 实例

```graphql
query {
  exWsInstances(input: { exchange: ftx })
}
```

### 查看实例状态

```graphql
query {
  exWsStatus(
    input: {
      exchange: ftx
      wsInstance: {
        # ids: "public-ws:instrument"
        # category: "order-book"
        forSymbol: "DOT-PERP"
      }
      type: subjects
    }
  )
}
```

### 查看实例所运行的 symbol

```graphql
query {
  exWsRunningSymbols(
    input: {
      exchange: ftx
      wsInstance: {
        instanceIndex: 2
        # forSymbol: "ETH/USD"
      }
      channel: "ticker"
    }
  )
}
```

## subscription

### 监控实例的状态

```graphql
subscription {
  exWsObserveStatus(
    input: {
      exchange: ftx
      wsInstance: { ids: "public-ws:1" }
      type: subjects
      interval: 3000
      maxSeconds: 60
    }
  )
}
```

### 监控（抽样）一个频道

```graphql
subscription {
  exWsObserveChannel(
    input: {
      exchange: ftx
      wsInstance: {
        # ids: "public-ws:3"
        forSymbol: "BTC-PERP"
      }
      channel: "ticker"
      minInterval: 1000
      maxTake: 10
      filter: { path: "symbol", value: "BTC-PERP" }
    }
  )
}
```

## mutation
