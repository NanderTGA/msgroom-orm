import arrayStartsWithExports, { ArrayStartsWith } from "array-starts-with";

let arrayStartsWith: ArrayStartsWith;
if (typeof arrayStartsWithExports == "function") arrayStartsWith = arrayStartsWithExports;
else arrayStartsWith = arrayStartsWithExports.default;

export default arrayStartsWith;