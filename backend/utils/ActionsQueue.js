
/**
 * ensures that no more than one of the enqueued
 * actions will be running at same time
 *
 * useful in reactive workflow to ensure data consistency from parallel writes
 */
const ActionsQueue = () => {
    let lastPromise = Promise.resolve();

    /**
     * @template T
     * @param {() => Promise<T> | T} action
     * @return {Promise<T>}
     */
    const enqueue = async (action) => {
        const promise = lastPromise
            .catch(() => {}).then(action);
        lastPromise = promise;
        return promise;
    };

    return {
        enqueue: enqueue,
    };
};

module.exports = ActionsQueue;