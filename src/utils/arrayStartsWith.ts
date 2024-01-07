export default function arrayStartsWith(array: unknown[], subArray: unknown[]): boolean {
    /**
     * TODO Will this improve performance?
     * TODO I should investigate the flow of the command resolution algorithm a bit more to figure this out
     * Big O notations:
     * with check: O(min(array.length, subArray.length))
     * without it: O(subArray.length)
     */
    // if (subArray.length > array.length) return false;
    for (let i = 0; i < subArray.length; i++) {
        if (subArray[i] !== array[i]) return false;
    }
    return true;
}