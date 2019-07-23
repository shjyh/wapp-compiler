type WatchItem = string | {
    path: string, watches: WatchItem[], key?: string
}

export default WatchItem;