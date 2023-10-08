declare module "array-starts-with" {
    export type ArrayStartsWith = (base: unknown[], start: unknown[]) => boolean;

    const arrayStartsWith: {
        default: ArrayStartsWith;
    } | ArrayStartsWith;
    export default arrayStartsWith;
}