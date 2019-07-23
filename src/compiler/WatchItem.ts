export interface ArrayWatchItem {
    path: string;
    watches: WatchItem[]|NestedArrayWatchItem;
    key?: string
};

export interface NestedArrayWatchItem extends ArrayWatchItem {
    path: ''
}

export type WatchItem = string | ArrayWatchItem

export default WatchItem;